'use client';

import { useState } from 'react';
import { Download, FileUp } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { importarCatalogo } from './actions';

const PLACEHOLDER = `Pega aquí tus productos, uno por línea.
Ejemplo:
Cappuccino; 2500; Cafés;
Agua mineral; 1200; Bebidas; 48`;

// Plantilla con BOM UTF-8 para que Excel es-CL la abra bien.
const PLANTILLA =
  '﻿' +
  ['Nombre;Precio;Categoría;Stock', 'Cappuccino;2500;Cafés;', 'Agua mineral;1200;Bebidas;48'].join(
    '\r\n'
  );

export function ImportarForm() {
  const [datos, setDatos] = useState('');

  function descargarPlantilla() {
    const blob = new Blob([PLANTILLA], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla-productos.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function cargarArchivo(file: File) {
    try {
      const texto = await file.text();
      // Quita el BOM si viene de la plantilla y descarta líneas de encabezado.
      setDatos(texto.replace(/^﻿/, '').trim());
      toast.success('Archivo cargado. Revisa y luego importa.');
    } catch {
      toast.error('No se pudo leer el archivo.');
    }
  }

  return (
    <form action={importarCatalogo} className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={descargarPlantilla}>
          <Download className="size-4" /> Descargar plantilla
        </Button>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-1.5 text-sm shadow-xs hover:bg-muted">
          <FileUp className="size-4" /> Subir archivo (.csv)
          <input
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void cargarArchivo(f);
            }}
          />
        </label>
      </div>

      <textarea
        name="datos"
        required
        rows={12}
        placeholder={PLACEHOLDER}
        spellCheck={false}
        value={datos}
        onChange={(e) => setDatos(e.target.value)}
        className="w-full rounded-md border border-input bg-transparent p-3 font-mono text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
      />

      <div className="flex items-center gap-3">
        <Button type="submit">Importar</Button>
        <span className="text-xs text-muted-foreground">
          Se importa todo o nada: si una línea falla, no se crea ninguna.
        </span>
      </div>
    </form>
  );
}
