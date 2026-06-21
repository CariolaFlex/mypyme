# Plan de pendientes — Etapa 1 (cierre) + Etapa 2 (OCR)

**Fecha:** 2026-06-21 · **Objetivo:** dejar todo construido para testear en una sola pasada.
**Orden:** primero lo automatizable (Claude), las tareas manuales de Andrés al final.

> Contexto: stack Supabase/Next 16 (webpack)/Base UI. El motor OCR se trasplanta de
> LegisEnterprise (`C:\LegisEnterprise\Legis-enterprise\src\lib\ocr-engine.ts`, Tesseract.js
> 100% client-side). La persistencia Firestore de Legis NO se reusa: se reescribe a Supabase.
> Riesgo técnico #1 = extracción de **ítems de línea** (Tesseract da texto plano, no tabla) →
> best-effort + tabla editable obligatoria antes de guardar.

---

## A. Cierre de Etapa 1 (pendientes chicos)

- **A1 — Prerellenar imagen desde Open Food Facts.** Al escanear, si OFF trae `image_front_url`,
  usarla como `imagen_url` del producto (es URL pública remota, sin re-subir). Lift de estado de
  imagen a `ProductoForm`. Esfuerzo: S.
- **A2 — Plantilla CSV en /importar.** Botón «Descargar plantilla» (CSV con BOM es-CL) + permitir
  **subir archivo** además de pegar. Bajo valor (pegar desde Excel ya sirve). Esfuerzo: S. *Opcional.*

---

## B. Etapa 2 — OCR de factura de proveedor (acotado a 1 tipo)

Scope inicial: **factura de proveedor**. El resto de documentos (boletas servicios, guías, cartolas)
se suman después reusando la misma fundación. Ruta de trabajo: `/compras/escanear-factura`.

### B1 — Fundación del motor (sin UI)
- Trasplantar `lib/ocr/engine.ts` desde Legis (Tesseract client-side, dynamic import). Quitar `uuid`
  → `crypto.randomUUID()`. Reusar extractores de RUT/monto/fecha (ya sirven para Chile).
- Tipos `lib/ocr/types.ts` (adaptados: `OCRResultFactura`).
- Instalar `tesseract.js`.
- **Punto de atención:** verificar que el dynamic import de Tesseract no rompa el build webpack ni el
  precache de Serwist (service worker). Es el riesgo del análisis de factibilidad.

### B2 — Persistencia Supabase (migración #33)
- Tabla `ocr_scans`: `empresa_id` (FK, RLS por tenant), `archivo_nombre`, `texto_plano`,
  `datos jsonb` (proveedor/rut/folio/fecha/neto/iva/total/items), `estado`
  (`borrador`|`revisado`|`importado`), `factura_id` (FK al registro creado, nullable),
  `creado_en`. RLS: SELECT tenant / escritura del tenant. GRANT a `authenticated`.
- Helpers `lib/ocr/store.ts` (guardar/listar/actualizar/borrar) — reemplazo del `firestore-sync.ts`.

### B3 — Extracción de datos de factura
- Cabecera (regex, reusa Legis): RUT proveedor, razón social, folio/N° factura, fecha, neto/IVA/total.
- **Ítems de línea (RIESGO ALTO):** heurística desde líneas/bbox → `{descripción, cantidad, precio,
  total}`. Empezar best-effort; SIEMPRE editable. No prometer precisión.

### B4 — UI escanear
- Página `/compras/escanear-factura`: foto con cámara (`<input capture>`) o subir imagen → barra de
  progreso de Tesseract → resultado. Reusar estética PageHeader/glass.

### B5 — UI revisar/editar (la clave)
- Cabecera editable (proveedor [autocompletar/crear], RUT, folio, fecha, neto/IVA/total).
- **Tabla de ítems editable** (agregar/quitar/editar filas) + validación (totales cuadran).
- Estado `borrador` → `revisado`.

### B6 — Ejecutar (destinos configurables)
- **Destino principal:** registrar en Cuentas por pagar → RPC `crear_factura_proveedor`
  (+ `tipo_documento='factura'`). Marca el scan como `importado` + link a la factura.
- **Destino opcional:** cargar ítems a inventario → `importar_catalogo` o `registrar_movimiento`.
- Proveedor inexistente → crearlo al vuelo (reusa alta de proveedor).

### B7 — Historial
- `/compras/escanear-factura/historial`: lista de scans con filtros por estado/fecha, reabrir un
  borrador, ver el documento registrado.

### B8 — Verificación
- e2e `scripts/verify-ocr.mjs`: tabla `ocr_scans` (RLS, estados), y que el resultado mapeado dispare
  `crear_factura_proveedor` correctamente (con limpieza). El OCR sobre imagen real se confirma en
  navegador (no auto-testeable, como la cámara).

---

## C. Checklist consolidado

### Etapa 1 — cierre
- [ ] A1 · Prerellenar imagen desde Open Food Facts
- [ ] A2 · Plantilla CSV descargable + subir archivo en /importar *(opcional)*

### Etapa 2 — OCR factura proveedor
- [ ] B1 · Trasplante motor Tesseract (`lib/ocr/`) + instalar `tesseract.js` + build webpack/Serwist OK
- [ ] B2 · Migración #33 `ocr_scans` + RLS + grants + helpers `store.ts`
- [ ] B3 · Extractores de cabecera + ítems de línea (best-effort)
- [ ] B4 · UI `/compras/escanear-factura` (cámara/upload + progreso)
- [ ] B5 · UI revisar/editar (cabecera + tabla de ítems editable + validación)
- [ ] B6 · Ejecutar → `crear_factura_proveedor` (+ opción inventario) + marcar importado
- [ ] B7 · Historial con filtros/estados
- [ ] B8 · `scripts/verify-ocr.mjs` + build/lint/tsc

### Descartado por ahora (over-scope beta 1 cliente)
- [ ] OCR de boletas de servicios / guías / cartolas / liquidaciones (Fase posterior)
- [ ] Clasificación multi-documento automática
- [ ] DTE/SII real (Fase 9, aparte)

---

## D. Tareas manuales de Andrés (AL FINAL)

- [ ] **DB password** (session pooler) para aplicar la migración #33 `ocr_scans`.
- [ ] **Testear en celular** con facturas reales (foto): medir qué tan bien salen cabecera e ítems.
- [ ] **Decidir destino de los ítems:** ¿solo Cuentas por pagar, o también cargar stock a inventario?
- [ ] Confirmar si querés A2 (plantilla CSV) o se deja.
