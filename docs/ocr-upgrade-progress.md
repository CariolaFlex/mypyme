# OCR Upgrade — Motor universal de documentos comerciales

Tracking de la misión descrita en `prompt_claude_ocr_upgrade.md`. Este archivo se
actualiza al cerrar cada fase; si la sesión se corta, retomar desde la primera fase
no marcada como ✅.

## Estado global

| Fase | Descripción | Estado |
|------|-------------|--------|
| 1 | Tipos + utilidades de montos multi-moneda (`lib/ocr/types.ts`, `lib/ocr/montos.ts`) | ⏳ en curso |
| 2 | Preprocesado pro: Sauvola + deskew + perspectiva + variantes (`lib/ocr/preprocess.ts`) | ⬜ |
| 3 | Engine v2: variantes + bbox de palabras + entidades multi-país (`lib/ocr/engine.ts`) | ⬜ |
| 4 | Clasificador de tipo de documento (`lib/ocr/clasificador.ts`) | ⬜ |
| 5 | DocumentParser con estrategias + layout + confianza por campo (`lib/ocr/parser/`) | ⬜ |
| 6 | Scanner ampliado: formatos + QR inteligente (`components/scanner/`, `lib/scanner/`) | ⬜ |
| 7 | Perfiles de negocio: migración + config + inyección al parser | ⬜ |
| 8 | Integración UI (confianza por campo) + validación final | ⬜ |

## Decisiones de arquitectura

- **Retrocompatibilidad dura**: `extraerFactura(raw, tipo)` conserva firma y
  comportamiento (es la estrategia "factura" del nuevo parser). El shape
  `FacturaExtraida` sigue siendo lo que se persiste en `ocr_scans.datos`.
- **Nuevo API**: `parseDocument(raw, ctx)` en `lib/ocr/parser/` devuelve
  `DocumentoExtraido` (campos con confianza individual + validación de cuadre).
  La UI lo usa para resaltar campos dudosos, pero persiste `FacturaExtraida`.
- **Variantes de preprocesado**: el preprocesador genera N variantes (contraste,
  Sauvola, deskew); el engine corre OCR reutilizando el mismo worker y se queda
  con la de mayor confidence. Corte temprano si la primera supera un umbral.
- **Perspectiva**: best-effort con guardas — si la detección de esquinas no da un
  cuadrilátero razonable, se salta (nunca degrada el flujo actual).
- **Coordenadas**: `worker.recognize(img, {}, { blocks: true })` (Tesseract.js v7)
  para obtener palabras con bbox → detección de columnas e ítems por proximidad
  espacial. Fallback a texto plano si `blocks` no viene.
- **Multi-país**: entidades TAX_ID por patrón (RUT CL, NIT CO, RFC MX, RUC PE,
  CNPJ/CPF BR) + genérico por etiqueta ("TAX ID", "NIF", "VAT"). Montos con
  decimales y detección de formato (1.234,56 vs 1,234.56) + moneda.
- **Perfil de negocio**: columna `tipo_negocio` en `configuracion_negocio`
  (migración nueva), select en Configuración → Negocio, y se inyecta como
  `ParserContext` en la página de escaneo.
- **Fuera de alcance** (por instrucción explícita): POS / Mercado Pago.

## Comandos de validación por fase

```
npm run lint && npm run typecheck && npm run build
```

## Log de avance

- (pendiente)
