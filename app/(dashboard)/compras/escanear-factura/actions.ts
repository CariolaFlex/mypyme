'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { FacturaExtraida, TipoDocOCR } from '@/lib/ocr/types';

/** Mapea el tipo del escáner al tipo_documento tributario (afecta el F29: el
 *  crédito fiscal cuenta solo 'factura'). */
const TIPO_DOC: Record<TipoDocOCR, string> = {
  factura: 'factura',
  boleta: 'boleta',
  guia: 'sin_documento',
  otro: 'sin_documento',
};

async function getEmpresaId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const empresaId = (data?.claims as Record<string, unknown> | undefined)?.empresa_id as
    | string
    | undefined;
  const usuarioId = (data?.claims as Record<string, unknown> | undefined)?.sub as string | undefined;
  return { supabase, empresaId, usuarioId };
}

/** Guarda/actualiza un escaneo como borrador o revisado. Devuelve el id. */
export async function guardarScan(input: {
  scanId?: string;
  datos: FacturaExtraida;
  textoPlano?: string;
  confianza?: number;
  estado?: 'borrador' | 'revisado';
}): Promise<{ id: string } | { error: string }> {
  const { supabase, empresaId, usuarioId } = await getEmpresaId();
  if (!empresaId) return { error: 'Sesión expirada' };

  const fila = {
    empresa_id: empresaId,
    usuario_id: usuarioId ?? null,
    datos: input.datos,
    texto_plano: input.textoPlano ?? null,
    confianza: input.confianza ?? null,
    estado: input.estado ?? 'borrador',
    actualizado_en: new Date().toISOString(),
  };

  if (input.scanId) {
    const { error } = await supabase.from('ocr_scans').update(fila).eq('id', input.scanId);
    if (error) return { error: error.message };
    revalidatePath('/compras/escanear-factura/historial');
    return { id: input.scanId };
  }
  const { data, error } = await supabase.from('ocr_scans').insert(fila).select('id').single();
  if (error) return { error: error.message };
  revalidatePath('/compras/escanear-factura/historial');
  return { id: data.id };
}

/**
 * Registra la factura en Cuentas por pagar a partir de los datos revisados:
 * resuelve el proveedor (por RUT, o lo crea), llama crear_factura_proveedor,
 * marca el documento como 'factura' y deja el scan en estado 'importado'.
 */
export async function registrarFactura(input: {
  scanId?: string;
  datos: FacturaExtraida;
  textoPlano?: string;
  confianza?: number;
  tipo?: TipoDocOCR;
  /** Si viene, usa ese proveedor existente (no resuelve ni crea). */
  proveedorId?: string;
  /** Vendedor/contacto al crear un proveedor nuevo. */
  vendedor?: string;
}): Promise<{ facturaId: string } | { error: string }> {
  const { supabase, empresaId, usuarioId } = await getEmpresaId();
  if (!empresaId) return { error: 'Sesión expirada' };

  const d = input.datos;
  if (!(d.total > 0)) return { error: 'El total debe ser mayor a 0' };

  // ── Proveedor: usar el elegido, o resolver por RUT/nombre, o crearlo ───
  let proveedorId: string | null = input.proveedorId ?? null;
  if (!proveedorId) {
    const nombreProv = d.razonSocial.trim();
    if (!nombreProv) return { error: 'Elige un proveedor o escribe la razón social' };
    const rut = d.rut.trim();
    if (rut) {
      const { data } = await supabase.from('proveedores').select('id').eq('rut', rut).limit(1);
      proveedorId = data?.[0]?.id ?? null;
    }
    if (!proveedorId) {
      const { data: ins, error: insErr } = await supabase
        .from('proveedores')
        .insert({
          empresa_id: empresaId,
          nombre: nombreProv,
          rut: rut || null,
          contacto_nombre: input.vendedor?.trim() || null,
        })
        .select('id')
        .single();
      if (insErr) {
        // Nombre duplicado → recuperar el existente.
        if (insErr.code === '23505') {
          const { data } = await supabase.from('proveedores').select('id').eq('nombre', nombreProv).limit(1);
          proveedorId = data?.[0]?.id ?? null;
        }
        if (!proveedorId) return { error: `No se pudo crear el proveedor: ${insErr.message}` };
      } else {
        proveedorId = ins.id;
      }
    }
  }

  // ── Crear la factura (la RPC deriva neto/IVA del total + tasa) ─────────
  const tasa = d.neto > 0 ? Math.round((d.iva / d.neto) * 100) : 0;
  const { data: facturaId, error: rpcErr } = await supabase.rpc('crear_factura_proveedor', {
    p_proveedor_id: proveedorId,
    p_numero_factura: d.folio.trim() || 'S/N',
    p_monto_total: d.total,
    p_tasa_iva: tasa,
    p_fecha: d.fecha || null,
  });
  if (rpcErr) return { error: rpcErr.message };

  await supabase
    .from('facturas_proveedor')
    .update({ tipo_documento: TIPO_DOC[input.tipo ?? 'factura'] })
    .eq('id', facturaId);

  // ── Marcar el scan como importado ─────────────────────────────────────
  const scanFila = {
    empresa_id: empresaId,
    usuario_id: usuarioId ?? null,
    datos: d,
    texto_plano: input.textoPlano ?? null,
    confianza: input.confianza ?? null,
    estado: 'importado' as const,
    factura_id: facturaId,
    actualizado_en: new Date().toISOString(),
  };
  if (input.scanId) {
    await supabase.from('ocr_scans').update(scanFila).eq('id', input.scanId);
  } else {
    await supabase.from('ocr_scans').insert(scanFila);
  }

  revalidatePath('/compras/facturas');
  revalidatePath('/compras/escanear-factura/historial');
  return { facturaId };
}

export async function eliminarScan(scanId: string): Promise<{ ok: true } | { error: string }> {
  const { supabase, empresaId } = await getEmpresaId();
  if (!empresaId) return { error: 'Sesión expirada' };
  const { error } = await supabase.from('ocr_scans').delete().eq('id', scanId);
  if (error) return { error: error.message };
  revalidatePath('/compras/escanear-factura/historial');
  return { ok: true };
}
