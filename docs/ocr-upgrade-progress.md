# OCR Upgrade — Motor universal de documentos comerciales

Tracking de la misión descrita en `prompt_claude_ocr_upgrade.md`.

## Estado global — ✅ COMPLETADO (2026-07-04)

| Fase | Descripción | Estado | Commit |
|------|-------------|--------|--------|
| 1 | Tipos + montos multi-moneda (`lib/ocr/types.ts`, `lib/ocr/montos.ts`) | ✅ | 256947a |
| 2 | Preprocesado pro: perspectiva + deskew + Sauvola + variantes (`lib/ocr/preprocess.ts`) | ✅ | 5e81f38 |
| 3 | Engine v2: multi-variante + bbox de palabras + entidades multi-país (`lib/ocr/engine.ts`) | ✅ | c5468b3 |
| 4 | Clasificador de tipo de documento (`lib/ocr/clasificador.ts`) | ✅ | 78c81ff |
| 5 | DocumentParser con estrategias + layout + confianza por campo (`lib/ocr/parser/`) | ✅ | 501be9f |
| 6 | Scanner ampliado: formatos industriales + QR inteligente + dedupe de sesión | ✅ | 6f9848e |
| 7 | Perfiles de negocio: migración + config + onboarding | ✅ | c71b8f2 |
| 8 | Integración UI (confianza por campo, tipo detectado) + validación final | ✅ | (este commit) |

Validación por fase: `npm run lint && npm run typecheck && npm run build` — todo verde.

## ⚠ Pendiente manual

- **Aplicar la migración** `supabase/migrations/20260704000000_tipo_negocio.sql`
  (columna `configuracion_negocio.tipo_negocio`). El repo YA está linkeado al
  proyecto Supabase `mypyme` (ref `igpplasotoshtuwbdzmf`) y el token de acceso
  quedó en la env var de usuario `SUPABASE_ACCESS_TOKEN`. El `db push` fue
  confirmado por dry-run (única migración pendiente) pero el guardián de Claude
  Code bloquea aplicar migraciones a producción en modo auto → correr a mano:
  `npx supabase db push`  (o agregar la regla de permiso `Bash(npx supabase db push:*)`).
- Probar en terreno con las fotos reales de facturas que ya funcionaban
  (retrocompatibilidad garantizada por diseño, pero conviene verificar) y con
  un ticket de restaurante / presupuesto para las estrategias nuevas.

## Arquitectura final

```
lib/ocr/
  types.ts        Tipos universales (DocumentoExtraido, CampoExtraido, ParserContext…)
  montos.ts       Parsing de montos con decimales + detección de moneda (8 monedas)
  preprocess.ts   generarVariantes(): perspectiva → deskew → contraste | Sauvola
  engine.ts       runOCRInBrowser(): OCR por variante (mejor confidence, corte
                  temprano), blocks→palabras con bbox, entidades multi-país
  clasificador.ts clasificarDocumento(): 8 tipos por puntaje de señales es/pt/en
  factura.ts      Estrategia factura formal (histórica, INTACTA en valores);
                  extraerFacturaDetallada() expone fuente por campo
  parser/
    comun.ts       Helpers compartidos (movidos verbatim desde factura.ts)
    layout.ts      Columnas por bbox + ítems por proximidad espacial
    estrategias.ts factura | ticket | servicio (horas×tarifa, m²/m³, "+ IVA")
    index.ts       parseDocument(raw, ctx) + aFacturaExtraida(doc)
lib/scanner/qr-parse.ts  QR inteligente (URL/JSON/GTIN embebido)
lib/tipos-negocio.ts     Catálogo de 9 rubros (comparte types con el parser)
```

## Decisiones de arquitectura

- **Retrocompatibilidad dura**: `extraerFactura(raw, tipo)` conserva firma y
  cascada EXACTA (misma secuencia de candidatos de total/neto/iva). El shape
  `FacturaExtraida` sigue siendo lo que se persiste en `ocr_scans.datos`.
- **Confianza por campo**: cada estrategia reporta la FUENTE del valor
  (etiqueta 0.9 · letra 0.85 · suma_items 0.7 · derivado 0.6 · fallback 0.35) y
  la cross-validation ajusta (cuadre aritmético sube, descuadre castiga). La UI
  resalta en ámbar los campos bajo 0.6.
- **Layout espacial**: solo REEMPLAZA los ítems de texto plano si su suma cuadra
  mejor con el total (guarda anti-regresión).
- **Perspectiva/deskew**: best-effort con guardas; cualquier fallo devuelve la
  imagen sin tocar. Sauvola es la 2ª variante; la 1ª es el pipeline histórico.
- **Selector de la UI vs clasificador**: el hint del usuario manda cuando la
  clasificación tiene confianza < 0.45.
- **Perfil de negocio**: `configuracion_negocio.tipo_negocio` → `ParserContext`
  (usaIva/tasa/rubro). Tickets y servicios derivan IVA según el perfil.
- **Fuera de alcance** (por instrucción explícita): POS / Mercado Pago.

## Ideas futuras (no comprometidas)

- Resaltar ítems individuales con confianza baja (hoy solo campos de cabecera).
- Usar `dedupeSesion` del scanner en un modo continuo de `escaneo-rapido`
  (hoy el loop es modal-por-producto y no lo necesita).
- Calibrar el umbral CONF_SUFICIENTE (0.82) del corte temprano con métricas
  reales de fotos de usuarios.
