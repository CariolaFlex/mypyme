# Estado Actual — Punto de Continuación

**Fecha:** 2026-06-16 · **Rama:** `main` (todo pusheado a `CariolaFlex/mypyme`)

> Documento de handoff. Resume qué está hecho, cómo funciona y qué sigue.
> Verificado: build OK, ESLint 0 errores, TypeScript OK, deploy Vercel sano, npm audit 0 vulns.

## ⭐ Punto de continuación (2026-06-18)

**El producto ahora se llama "Gestionala"** (antes "mypyme"; ver `docs/10-marca-gestionala.md`).
"mypyme" persiste SOLO como identificador técnico (repo, proyecto Vercel `mypyme-blond`, Supabase,
Dexie DB, Flow plan IDs `mypyme_emprende`/`mypyme_pyme`) — NO cambiar eso.

**Estado: app completa, cobrando de verdad, rediseñada, en prod.**

- **Desarrollo (Sprints 1–4)** ✅ — multi-tenant+roles+auditoría, POS+offline, caja, inventario, compras,
  gastos, reportes+F29, suscripciones Flow. 28 migraciones en cloud.
- **Deuda técnica** ✅ — tests+CI (GitHub Actions: job static siempre + job e2e gated por secrets),
  rate-limit del webhook Flow, comprobante imprimible del POS, `npm audit` en 0 vulns.
- **Flow / monetización** ✅ **PROBADO END-TO-END** — Cargo Automático activado en la cuenta Vectium;
  enroll real probado (tarjeta RedCompra ****5160); suscripción `sus_s19353175e` activa con trial 12d,
  **primer cobro real agendado 2026-06-27** ($0 cobrado ahora). El webhook registra los cobros. Fix:
  la suscripción arranca con los días de trial restantes (no cobra durante el trial).
- **Rebrand + rediseño** ✅ — nombre→Gestionala en toda la UI/legal/email; paleta navy/azul/slate
  (`app/globals.css`); logos (favicon/PWA/OG + isotipo G en sidebar/auth); sistema visual glass/mesh/
  blobs/glow/degradados (Framer Motion 12); login + dashboard (stat cards con contador animado) +
  TODAS las pantallas operativas (vía PageHeader/EmptyState) + auth + POS al nuevo estándar.
- **Fix de sesión** ✅ — el middleware perdía cookies refrescadas en los redirects ("la sesión se
  cerraba sola"); corregido (helper `redirigir()` que copia las cookies).
- **Fix onboarding "se queda en el registro"** ✅ — tras crear la empresa, el token refrescado podía
  no propagar a `/inicio` (carrera de rotación del refresh-token) → rebotaba a `/onboarding` y el RPC
  decía "ya tiene empresa"; recargar lo arreglaba. Fix: **autocuración del claim en el middleware**
  (si hay sesión sin `empresa_id` en ruta del dashboard → un `refreshSession()` y propaga cookies →
  `/inicio` a la primera, determinista). Verificado e2e real en navegador. + **revalidación cruzada**
  en guardar/editar (recibir orden→stock+dashboard; efectivo→caja; importar→stock+dashboard; caja→pos).
- **Fix navegación auth/onboarding** ✅ — link «← Volver al inicio» (→ `/`) en `/login` y `/register`; botón «Cancelar y volver al inicio» en `/onboarding` que elimina el usuario recién creado vía admin API (service_role) para no dejar cuentas huérfanas sin empresa. Commit `8435091`.
- **Cancelar suscripción + Eliminar cuenta** ✅ (`3215d7f`) — «Zona de peligro» en `/configuracion/suscripcion` (admin). Cancelar: `POST /subscription/cancel` en Flow (`at_period_end`) + estado `cancelada` (pega a Flow real). Eliminar cuenta: type-to-confirm «ELIMINAR» → cancela sub, borra empresa (cascada) + cuentas de usuario, signOut → landing. Irreversible.
- **Auditoría UX/UI (capturas + Z.ai) — Bloques A y B** ✅ (2026-06-18). Andrés mandó un
  docx con 127 hallazgos sobre 18 pantallas. **Verifiqué contra código: varios eran falsos
  positivos** (capturas estáticas): el botón Cobrar SÍ está disabled sin caja; Inventario SÍ
  tiene Entrada/Merma/Ajuste±; «1 sola categoría de gasto» era el select colapsado (hay 5).
  - **Bloque A** (`7313809`): footgun de **Importar** (el textarea precargaba el ejemplo con
    `defaultValue` + `required` → un clic registraba 5 productos basura; ahora vacío con
    `placeholder`, ejemplo movido al callout); **«Reporte IVA (F29)» agregado al sidebar**
    (antes solo desde el dashboard); terminología (Gastos «egresos»→«gastos», métodos sin
    sufijo redundante «· tipo»).
  - **Bloque B — CRUD real** (`7ad9076`, `4b6c25a`, `638e336`): nuevas primitivas
    `components/ui/modal.tsx` + `components/confirm-submit.tsx` (modal inline SIN portal para
    que el submit siga dentro del `<form>` de la server action). **Editar/Eliminar por fila**
    en productos, proveedores, categorías (rename), métodos de pago y gastos + **CRUD de
    categorías de gasto** (gestor en `/gastos`). **Política de borrado:** editar siempre;
    eliminar real solo si la entidad NO tiene historial (ventas/órdenes/facturas/movimientos,
    FK RESTRICT) — si lo tiene, se archiva (desactiva) con mensaje claro y confirmación modal.
    Gastos pagados de caja: monto NO editable y NO eliminable (descuadraría la caja).
  - **Bloque B2b** ✅ (`98112e6`, migración `20260613019000` aplicada en cloud) — vendedor/
    contacto opcional en proveedores (columnas `contacto_nombre/telefono/email`); sección
    colapsable en alta y edición; vendedor mostrado bajo el nombre en la tabla.
  - **Bloque C** ✅ (`63c4458`, migración `20260613020000` aplicada en cloud) — selector
    **tipo de documento** (factura/boleta/factura_exenta/boleta_exenta/sin_documento) en
    alta+edición de gastos y alta de facturas de proveedor (componente reutilizable
    `components/doc-tributario.tsx`; exenta/sin-doc fuerzan IVA 0). **F29: el crédito fiscal
    ahora cuenta SOLO facturas** (`reporte_iva_credito_mensual` filtra `tipo_documento='factura'`);
    las filas históricas quedan default 'factura' → el F29 no cambia retroactivamente.
  - **Bloque D** ✅ (`6cccfa6`) — **glosario + tooltips de términos**. `lib/glosario.ts`
    (fuente única, ~45 términos con definición+ejemplo); `components/termino.tsx`
    (`<Termino slug>` muestra la definición al hover/focus, hereda tipografía, prop `align`);
    sección «Glosario» con buscador en `/ayuda`; tooltips cableados en Reporte IVA (F29) y Caja.
  - **Auditoría UX/UI: A·B·B2b·C·D cerrados.** NO se hará (over-scope beta 1 cliente): Cmd+K
    global, gamificación, tour Driver.js, WCAG XL, unificar Productos+Inventario en tabs.
    **Verificación e2e:** `scripts/verify-audit-crud.mjs` (17/17 ✅, token de tenant real,
    RLS aplicada, self-clean, ya en la suite `test:e2e`) — editar/eliminar en las 6 entidades,
    borrado bloqueado por historial (FK 23503), categorías SET NULL, contacto B2b, tipo_documento
    y F29 crédito solo facturas. Falta (opcional): click-through en navegador de los modales +
    ampliar tooltips `<Termino>` a más pantallas.
- **Ayuda contextual** ✅ — componente `HelpTip` (botón "?" con globo) enchufado al `PageHeader`
  (props `help`/`helpTitle`) en 10 pantallas; **Centro de ayuda `/ayuda`** (guía por módulo + FAQ
  acordeón `<details>`); link en sidebar. Lenguaje simple para dueños no técnicos.
- **Sprint 6 — Landing pública + SEO** ✅ — landing de marketing en `/` (estática, sistema navy:
  hero/features/planes/CTA/footer). **El dashboard se movió de `/` a `/inicio`** (la home `/` ahora
  es pública). `app/sitemap.ts` + `app/robots.ts` (indexa landing+legales, bloquea el app),
  `metadataBase`+`title.template` en root layout, OG/keywords. PWA `start_url=/inicio`. ⚠️ El matcher
  del middleware excluye `robots.txt`/`sitemap.xml` (si no, los botaba a `/login`).

- **Escáner de cámara — Etapa 1 (código de barras en productos)** ✅ (`871192b`, migración
  `20260620000000` aplicada en cloud = 32 migraciones). Nace de un plan con Perplexity (arquitecto
  externo) para ingreso rápido sin tipear; **Etapa 1 = barcode/QR por cámara**, Etapa 2 (OCR de
  facturas, motor de LegisEnterprise) queda para después. Perplexity creía que mypyme era Firebase/
  Next14 → **es Supabase/Next16/Base UI** (corregido). **Nueva columna `productos.codigo_barras`**
  TEXT nullable + índice único PARCIAL por empresa (`WHERE codigo_barras IS NOT NULL` → productos a
  granel sin código conviven; EAN/UPC único cuando existe). Primitivas reusables en
  `components/scanner/`: `useBarcodeScanner` (hook: `BarcodeDetector` nativo Chrome/Android →
  fallback `@zxing/browser` WASM para iOS/Safari que NO soporta BarcodeDetector ni en iOS 17; cámara
  trasera `facingMode:environment`; apaga la cámara al desmontar), `BarcodeScanner` (vista), 
  `BarcodeScannerModal`, e island `CodigoConEscaner` (campo + botón cámara + **lookup anti-duplicado**
  por toast, vive dentro del `<form>` de la server action). Cableado en alta+edición de producto;
  `actions.ts` distingue 23505 SKU vs código. **Dep nueva `@zxing/browser`** (0 vulns). e2e
  `scripts/verify-codigo-barras.mjs` **6/6** (RLS, unicidad por empresa, índice parcial, edición).
  La cámara en sí se confirma en celular (no auto-testeable). El scanner quedó arquitectado para
  reusar en el **POS** (escanear→carrito) a futuro; el «prefill nombre/precio desde la DB» va ahí,
  no en el alta (donde duplicar no sirve).

- **Fix crash al subir imagen de producto desde móvil** ✅ (`50426fd`). Reportado en el test de
  Etapa 1 en iPhone/Safari: escanear OK, pero al adjuntar una foto del celular → «server error» y se
  perdía el formulario. **Causa raíz:** sin `serverActions.bodySizeLimit`, Next usa **1MB** por
  defecto; las fotos de móvil (2–5MB) excedían el body de la server action y Next lo rechazaba ANTES
  del `try/catch` → crash. **Fix:** nuevo island `imagen-producto.tsx` que sube la foto **directo a
  Storage desde el navegador** (downscale a 1200px + JPEG 0.85; bucket `productos` ya con RLS por
  carpeta=empresa_id) y mete solo la URL pública en un input oculto. El archivo nunca pasa por la
  action → crash eliminado de raíz, más rápido en móvil, y un fallo de upload solo muestra toast (no
  rompe el alta). `crearProducto` ahora lee `imagen_url` (string) en vez del File.

- **Form de producto mejorado (reporte del test de Etapa 1)** ✅ (`431e4a3`). El alta de producto
  pasó a client component `producto-form.tsx`. Agregado: **unidad de medida** (la columna
  `unidad_medida` YA EXISTÍA, solo se cableó; sin migración), **selector IVA** Afecto/Exento(0%)/
  Personalizado (el precio se rotula «sin IVA» en exento), **crear categoría inline** (mini-modal +
  action `crearCategoriaRapida` que devuelve id, sin salir del form), **stock inicial** opcional
  (registra un movimiento de ajuste en la bodega default, igual que el import) + **label de stock
  mínimo más claro** («Alerta de stock mínimo» + subtexto) al final, **calculadora de presentación/
  lotes** colapsable (costo unitario y margen en vivo para packs/mangas/docenas; **NO se persiste**,
  solo ayuda a fijar el precio — scope reducido a propósito), y **autosave de borrador** en
  sessionStorage (lazy-init, sin setState en effect; en error conserva lo escrito, tras alta exitosa
  limpia). Del reporte: **import CSV ya existe** (`/inventario/importar`, solo le falta plantilla
  descargable/subir-archivo vs pegar → bajo valor); **lookup EAN→Open Food Facts** y **modo escáner
  rápido walk-through** quedan pendientes (no construidos). La edición (row-actions) NO tiene aún el
  selector de unidad/IVA (consistencia futura, no bloquea).
- **Lookup EAN → Open Food Facts** ✅ (`c6ae2f3`). Al escanear en el alta, consulta Open Food Facts
  (API pública, sin key, CORS abierto, client-side) y prerellena nombre (+marca) y unidad SOLO si
  están vacíos. `lib/openfoodfacts.ts` (`buscarPorCodigo`); `CodigoConEscaner` ganó callback
  `onScanned` (solo dispara al escanear, no al tipear). Best-effort; cobertura chilena irregular.
- **Modo escáner rápido (walk-through de bodega)** ✅ (`e734ad3`). Nueva ruta
  `/inventario/escaneo-rapido` (link en sidebar → Catálogo): escanear → mini-form (nombre/precio/
  cantidad, nombre prerellenado por OFF) → «Guardar y escanear siguiente» reabre la cámara, sin
  recargar; lista de agregados de la sesión; si el código ya existe, avisa (no duplica). Action
  `agregarRapido` (insert SIN redirect, devuelve `{id,nombre}`; deriva neto/tasa, SKU con sufijo si
  colisiona, registra stock inicial).
- **Unidad de medida también en edición** ✅ (`7b2c717`). El modal de editar producto ahora tiene el
  selector de unidad (antes solo el alta); `editarProducto` lee `unidad_medida`.
- **A1 imagen desde Open Food Facts + A2 plantilla/subir CSV** ✅ (`da595ef`). A1: al escanear, si OFF
  trae imagen, prerellena la foto (`ImagenProducto` ahora controlable; usa la URL pública de OFF
  directo). A2: `/inventario/importar` con botón «Descargar plantilla» (CSV BOM es-CL) + «Subir
  archivo .csv» además de pegar (`ImportarForm` client, textarea controlado). **Cierre de Etapa 1
  completo.** Plan de lo que falta (Etapa 2 OCR + checklist): `docs/11-plan-pendientes-ocr.md`.
- **Etapa 2 — OCR escanear factura de proveedor** ✅ (`86022c7`, migración `20260621000000` aplicada
  = 33 migraciones). Módulo OCR 100% client-side (Tesseract.js), foco: factura proveedor → Cuentas por
  pagar. `lib/ocr/` (engine.ts dynamic import + extractores RUT/monto/fecha/org; factura.ts extracción
  heurística best-effort de cabecera + ítems; types.ts). Tabla `ocr_scans` (RLS tenant, estados
  borrador/revisado/importado, factura_id). `/compras/escanear-factura`: foto/cámara → progreso OCR →
  form editable (cabecera + tabla de ítems) → «Registrar en Cuentas por pagar» (resuelve proveedor por
  RUT o lo crea + `crear_factura_proveedor` + `tipo_documento=factura` + marca scan importado) o
  «Guardar borrador»; historial con estados + link a la factura + borrar. Link en sidebar. **Build con
  Tesseract OK** (no rompe Serwist/webpack). e2e `scripts/verify-ocr.mjs` **8/8**. El OCR sobre imagen
  real se confirma en celular (no auto-testeable); ítems de línea = best-effort (texto plano), siempre
  editable. **Siguiente post-test:** si los ítems salen bien → integrar carga a inventario.

- **Test en celular #2 — Fase 1 (UX global) + Fase 2 (bugs de producto)** ✅ (2026-06-21). Andrés
  testeó todo junto. Decisiones del feedback: motor OCR = **seguir con Tesseract** (mejorar parser +
  apoyarse en captura guiada + tabla editable; NO se fue a visión LLM); orden = **quick wins primero**.
  - **Fase 1 — UX global** (commits de campos + responsive): *(1)* **Campos visibles** — los inputs/
    selects eran `bg-transparent` sobre cards claras = casi invisibles. Token `--input` `#e5e7eb`→`#cbd5e1`
    (borde visible en TODOS los campos, usan `border-input`); `bg-transparent`→`bg-input/50 backdrop-blur-sm`
    (relleno glass) en componentes base `Input`/`Select` + ~15 selects/inputs/textarea nativos; foco
    visible global para campos nativos (`@layer base`). `--border` queda claro (divisores). *(2)*
    **Responsive móvil** — grids fijos colapsan: forms `grid-cols-2/3`→`grid-cols-1 sm:`, stock
    `grid-cols-5`→`grid-cols-2 sm:`, ítems OCR `grid-cols-12`→`grid-cols-2 sm:grid-cols-12`. POS (2 paneles)
    queda para rework aparte.
  - **Fase 2 — bugs de producto:** *(3)* edición de producto ahora tiene **selector IVA Afecto/Exento/
    Personalizado** (deriva el modo de la tasa: 0=exento, default=afecto, otra=custom) + **«+ Nueva
    categoría» inline** (reusa `crearCategoriaRapida`); antes solo el alta los tenía. `ProductoRowActions`
    recibe `tasaDefault`. *(4)* **Contenido por unidad** (ej. 1,5 L · 500 g) — **migración #34**
    `20260621010000_producto_contenido.sql` (`productos.contenido NUMERIC` nullable, **aplicada en cloud
    = 34 migraciones**); campo en alta+edición junto al select de unidad; se muestra «nombre 1,5 L» en la
    tabla. `crear/editarProducto` leen `contenido` (null si vacío).
  - **Fase 3 — diseño validado por Andrés (2026-06-21):** modelo de compras = **compra directa primero**
    (atajo «Ingresar compra» escanear/manual → Cuentas por pagar + inventario opcional + pago opcional;
    proveedor se resuelve/crea en el escaneo; Orden de compra = avanzado/plegado; sidebar agrupada en
    «Compras»). Arranque = **mejorar el OCR primero**.
  - **Fase 3A — mejorar OCR (Tesseract) ✅** (commit de preprocess+total+cuadre). El test mostró cabecera
    ~ok pero TOTAL mal (6.000 vs 11.881 Andina). *(1)* `lib/ocr/preprocess.ts`: gris + estiramiento de
    contraste por percentiles + upscale, 100% canvas client-side best-effort, cableado en `engine.ts`
    antes de `recognize()`. *(2)* `factura.ts` `montoTotalFactura()`: prioriza etiquetas fuertes (TOTAL
    FACTURA/A PAGAR/VALOR TOTAL), excluye neto/iva/subtotal/exento/descuento; neto/iva mutuamente
    excluyentes. *(3)* UI: **validación de cuadre en vivo** (neto+IVA vs total; suma ítems vs total) con
    check verde / aviso ámbar, se recalcula al editar. El OCR sobre imagen real se confirma en celular.
  - **Fase 3B — captura guiada ✅** (commit). Antes de escanear: selector **tipo de documento**
    (Factura/Boleta/Guía/Otro) + instrucciones de captura (luz, plano, que se vean RUT/N°/TOTAL). El tipo
    *(a)* ajusta la extracción (boleta/guía/otro derivan neto+IVA del total, no suelen desglosarlo) y
    *(b)* mapea al **`tipo_documento` tributario real** de la factura registrada (factura→factura,
    boleta→boleta, guía/otro→sin_documento) — corrige el F29 (crédito solo cuenta 'factura'; antes
    quedaba 'factura' fijo). `extraerFactura(raw, tipo)`.
  - **Fase 3C — proveedor en el review ✅** (commit). Select de proveedores existentes (auto-vincula si el
    RUT escaneado coincide, normalizado sin puntos/guion) o **«+ Crear proveedor nuevo»** prerellenado del
    OCR (razón social + RUT) + **Vendedor/contacto opcional**. `registrarFactura` acepta `proveedorId`
    (usa el existente) o crea con `contacto_nombre`. e2e verify-ocr 8/8.
  - **Fase 3F — flujo + sidebar ✅** (commit). Modelo validado (compra directa primero). Sidebar: grupo
    «Compras y gastos»→«Compras», orden acción-primero (Ingresar compra · Cuentas por pagar · Proveedores ·
    Órdenes de compra · Gastos). «Escanear factura»→**«Ingresar compra»** (la foto es el camino principal);
    la página enlaza «Ingresar a mano (sin foto)» (→ `/compras/facturas/nueva`) y la factura manual enlaza
    de vuelta «o escanear el documento» → entrada unificada en ambos sentidos.
  - **Fase 3D — parser de ítems por tokens ✅** (commit). El regex estricto («desc cant precio total» en
    una línea) daba ~0 ítems. Nuevo `parseItems` por tokens: aísla la **cola de montos** al final de la
    línea (la descripción puede tener números: 250X12, 1.5LT), descarta códigos de posición iniciales,
    último monto=total, penúltimo=precio, entero corto=cantidad. **Validado con líneas reales (Andina +
    soporte Coca-Cola): descripción y total OK, cantidad OK en tablas claras**, descarta dirección/total/
    cliente. Best-effort y editable (columnas de descuento → precio unitario aprox).
  - **Fase 3E — cargar ítems al inventario ✅** (commit). Decisión Andrés = **selector explícito por fila**.
    Cada ítem del review tiene un select «Cargar a:» → producto existente / «+ Crear producto nuevo» (usa
    descripción+precio) / «no cargar». Botón «Cargar al inventario» registra un movimiento `'compra'`
    (`costo_unitario`=precio) en la bodega principal solo para las filas elegidas. `cargarInventario` crea
    el producto si se pidió (SKU autogenerado con reintento, neto derivado del IVA del negocio). Seguro:
    cero productos basura (no auto-crea de nombres crudos). e2e verify-ocr 8/8; carga real se confirma en
    navegador.
  - **✅ FASE 3 COMPLETA (A–F) en prod.** Bbox column-reconstruction descartado (alto riesgo/bajo retorno
    vs el parser por tokens).
  - **Fase 3A-v2 — extracción de montos reescrita ✅** (commit). 2º test de Andrés con **5 facturas reales**:
    total/neto salían mal (tomaba folio/RUT/precio unitario). Causa raíz: el RUT «parece» monto grande, el
    fallback era «el mayor monto de toda la hoja», y no usaba que los **totales van al final de la hoja**.
    Reescritura (`lib/ocr/factura.ts`): `montosDeTexto` saca RUTs (`99.x.x-d`) y el folio antes de leer
    montos; prioriza la **zona inferior** (`lines.slice(45%)`); `montoTrasEtiqueta` toma el valor pegado a
    la etiqueta (resuelve «TOTAL NETO 9.146 IVA 1.646…» en una línea OCR); total = etiqueta fuerte →
    `total` sin neto/iva → mayor monto del bloque inferior sin RUT. **Validado con node contra los 5 docs
    (ACG/CCU/DSV/Coca/Andina): TOTAL correcto en los 5; neto/IVA exactos donde hay etiquetas.**
  - **Fase 3A-v3 — leer enteros sin separador + fix folio ✅** (commit). Foto real (DSV-GL, escaneo gris 60%)
    daba todos los montos en 0: (1) el OCR pierde el separador de miles («35700» no «35.700») y `MONEY_RE`
    solo aceptaba con separador/`$` → ahora acepta enteros planos ≥4 díg (≥1000 sin etiqueta, ≥100 pegados
    a etiqueta); +quita fechas. (2) el folio `factura\D{0,6}(\d+)` agarraba «TOTAL FACTURA 11881» (el total)
    y lo borraba de los montos → ahora exige marcador real (N°/Nº/Nro/Folio/#). Validado simulando OCR sin
    separadores: total OK en los 5. Andrés: «no inventa nada» (✓), le gustó el % de confianza.
  - **Fase 3A-v4 — total por monto-en-letra + suma de ítems ✅** (`7d41c39`). Test real Andrés con Coca-Cola
    «soporte de entrega» (doc colombiano, buen test de adaptabilidad): el OCR **no leyó la caja «VALOR
    TOTAL 115.500»** (desapareció del texto) → el fallback `maxMonto` agarró el **código de material 135760**
    del ítem 1 como total. Causa raíz verificada con test importando el `.ts` real (Node 24 type-strip) contra
    el **texto OCR pegado del visor**. Fix en `factura.ts`: tras las etiquetas fuertes (los 4 docs chilenos
    resuelven ahí → cero regresión), nuevos fallbacks `montoEnLetra` (parser español de palabras→número,
    «CIENTO QUINCE MIL PESOS»→115000, OCR-estable porque las palabras no pierden separadores; generaliza al
    «SON: … PESOS» chileno) y `sumaItems` (≥1000), ANTES de `maxMonto`. Items se parsean primero (su suma es
    candidato + cross-check). Validado: caso real total=115000 ✓; regresión (etiqueta «TOTAL A PAGAR» gana,
    prosa «un … pesos» NO inventa). Tests `/tmp/test-cocacola.mjs` + `/tmp/test-regresion.mjs`.
    **Pendiente del mismo doc (NO hecho, bajo ROI/riesgo):** razón social tomó la línea del teléfono
    («© Nacional 018000912580») — el proveedor real (Coca-Cola) está en el LOGO=imagen, irrecuperable por OCR;
    cantidad de ítems = 1 (real 10/12) porque la palabra «BOT» (unidad) corta la cola de montos — diferir hasta
    tener el texto OCR de los otros 4 docs (no tocar `parseItems` sin validar contra ellos = riesgo de regresión).
  - **Fase 3A-v5 — RUT con espacios + ítems basura + maxMonto sin cuentas ✅** (`f4394c5`). Test real DSV-GL
    (factura **cancelada/timbrada/fax, USD+CLP**, ~60% confianza — caso pésimo): RUT vacío, total **2.008**
    (venía de un timbre que el OCR leyó como ítem «a \ 2% M9» → envenenaba el total por suma de ítems),
    cuadre **verde pero confiadamente erróneo**. 3 fixes generalizables, validados contra el texto OCR real
    (DSV + Coca-Cola, sin regresión): *(1)* `engine.ts` el regex de RUT tolera espacios alrededor del guion
    («96.570.750 - 6») → RUT recuperado; *(2)* `factura.ts parseItems` la descripción necesita una **palabra
    real** (≥3 letras seguidas) → descarta timbres/anotaciones que se colaban como ítem; *(3)* `maxMonto`
    (último recurso) salta líneas de **banco/cuenta/teléfono/folio** → no agarra números de cuenta como total.
    Resultado DSV: RUT ok, ítem basura fuera, **total 25.700** (lo que el OCR leyó de la hoja; real 35.700 —
    el motor confundió un dígito, **no recuperable por heurística**) en vez de 2.008. Tests
    `/tmp/test-ocr-real.mjs` (lee `/tmp/dsv.txt`+`/tmp/coca.txt`). **Lección: el techo en facturas
    canceladas/fax es el MOTOR, no el parser; la red de seguridad es la edición + el cuadre.**
  - **Fase 3A-v6 — cantidad por unidad + fechas + test con fixtures reales ✅** (`8de1162`, `3706b00`).
    Sesión nocturna autónoma; Andrés pidió «máxima potencia» con 5 facturas de ejemplo, pero **solo tengo
    el texto OCR real de 2** (DSV + Coca; las otras 3 = solo imagen, no puedo correr Tesseract sobre adjuntos).
    Decisión disciplinada: **solo mejoras estructurales validadas contra texto OCR real** (no tunear a
    reconstrucciones idealizadas = el error histórico) + infra de test para los 3 que faltan. Hecho:
    *(1)* `parseItems` recupera la **cantidad de la columna unidad** («... 10 BOT») cuando la cola de montos
    no la trae (el OCR aplana columnas); solo si la cola no dio cantidad (no pisa «Aceite 1 LT 2 …» donde el 2
    es la qty). Fix del bug visible en Coca: cantidad 1→**10 y 12** (el total de línea no cambia).
    *(2)* `fechaISO` parsea **fechas escritas** («22 de Enero del 2024»); `fechaFactura` prioriza la fecha
    pegada a etiqueta de emisión/factura (evita fechas de tránsito/vigencia como en DSV). *(3)* **Test
    permanente** `scripts/verify-ocr-parser.mjs` + `scripts/ocr-fixtures/{dsv,coca}.txt`: corre contra el
    texto OCR REAL, queda en la suite `test:e2e` (no necesita DB), valida total/ítems/cantidad/RUT/fecha sin
    regresión. **Para sumar facturas: pegar su texto OCR real del visor en un `.txt` y agregar el caso.**
    Verificado: parser test + verify-ocr 8/8 + tsc/lint/build. **NO hecho a propósito (riesgo sin texto OCR
    real):** RUT proveedor-vs-cliente (el «primer RUT» ya suele ser el proveedor, arriba), razón social en
    docs con logo (irrecuperable), tuning por-doc de ABC/Andina/CCU. **Techo confirmado: en fax/cancelado el
    error es del MOTOR (lee mal dígitos: DSV 35.700→«25.700»), no del parser → red de seguridad = edición + cuadre.**
  - **Fase 3A-v7 — 6 facturas reales (PDF de Andrés) ✅** (`da26629`). Andrés pasó un PDF con el **texto OCR
    real** de 6 facturas (visor). Extraído con `pdftotext -layout -enc UTF-8`; fixtures
    `scripts/ocr-fixtures/{coca,andina,abc,dsv,panama,ccu}.txt`. Baseline medido contra las 6 → 3 fixes
    estructurales validados (sin regresión): *(1)* `montoTrasEtiqueta` acepta **separador de miles con
    espacio** pegado a etiqueta («TOTAL FACTURA 11 901» → 11901; Andina pasó de 901→11.901, real 11.881 que
    el OCR leyó «11 901»); anclado a etiqueta = no merge-ea números sueltos. *(2)* **Folio**: `\b` antes de
    cada marcador (deja de tomar el «no» de «teléfoNo» → ABC ya no agarra «Telefono 111111111») + `*` para
    «Nº» leído «N*» (Andina folio → 0000155241). *(3)* **Neto** matchea «MONTO NETO»/«MONTONETO» pegado (ABC
    neto 0 → 7.307.927). **Resultado por doc:** coca ✓ (115.000, cant 10/12), andina (total 11.901/OCR, RUT
    91.144.000-8, folio ok), abc (total/neto 7.307.927, RUT 77.777.777-0, fecha 2024-01-22, IVA 1.388.506;
    es factura de COMPRA con IVA retenido → neto+IVA no cuadra con total pero el total es correcto = neto),
    dsv (25.700/OCR, RUT, 0 ítems). **panama y ccu = OCR del MOTOR ilegible** (Panamá import raro; CCU nota
    de crédito con tabla vacía) → total basura/0, se corrigen a mano (informativo en el test, sin asertar).
    `verify-ocr-parser.mjs` cubre las 6 con ground-truth. **Confirma la lección: lo recuperable depende del
    MOTOR; el parser ya entiende los formatos legibles (DTE chilena, soporte, factura compra).**
  - **Fase 3B-UX — claridad del review (no motor) ✅** (`d0cebce`). Feedback de Andrés (el OCR ya le sirve;
    quiere claridad): *(1)* **Encabezados de columna** en los ítems (Descripción/Cantidad/Precio unit./Total):
    fila de títulos en desktop (`hidden sm:grid`) + label por campo en móvil (`sm:hidden`); antes las casillas
    no decían qué eran. Botón borrar a ancho completo en móvil. *(2)* **Selector con/sin IVA** en el monto:
    «Incluye IVA / Sin IVA (neto) / Exento» + **tasa %** (default `configuracion_negocio.tasa_iva_default`,
    editable) → deriva neto/IVA/total automático (`derivarMontos`), con «ajustar neto/IVA a mano». Reemplaza
    el trío crudo total/neto/iva. `page.tsx` pasa `tasaDefault`. *(3)* **`components/aviso-herramienta.tsx`**
    (reusable, amigable/profesional: «en mejora continua, puede equivocarse, revisa») en escaneo (idle+review)
    y en el **modal del escáner de barras/QR** (cubre alta/edición de producto + escaneo rápido). Verificado
    tsc/lint/build; **falta verificar interacción en navegador (Andrés)**. **PENDIENTE: replicar el selector
    con/sin IVA a factura manual (`/compras/facturas/nueva`) y gastos (`/gastos`)** — ya tienen tasa% vía
    `DocTributario`, falta el toggle con/sin; son forms de server action (requieren island, hacer tras OK de Andrés).
- **Escáner en el POS + venta a granel/por peso** ✅ (`7382c33`, **migración #35 `20260621020000_producto_granel.sql`
  aplicada en cloud = 35 migraciones**). Plan aprobado (3 fases). *(1)* **Producto a granel**: nueva columna
  `productos.granel BOOLEAN`; checkbox «Se vende a granel / por peso» en alta (`producto-form.tsx`) y edición
  (`row-actions.tsx`), con etiqueta de precio dinámica («Precio por kg»); `crear/editarProducto` guardan `granel`.
  Semántica: si `granel`, `precio_total` = precio por `unidad_medida`. *(2)* **Escáner en el POS**: botón
  «Escanear» junto al buscador → busca el código en el catálogo cacheado **en memoria (offline)**; encontrado→
  carrito, no→aviso. **Modo continuo** (toggle en el modal): varios seguidos, ignora repetidos ~1,5s.
  `useBarcodeScanner` ganó opción `{ continuo }`; `BarcodeScanner`/`BarcodeScannerModal` lo propagan. `ProductoCache`
  (Dexie) ganó `codigo_barras/granel/unidad_medida` (el POS `page.tsx` los trae; sin subir versión de Dexie).
  *(3)* **Venta a granel en el POS**: tocar/escanear un producto granel abre modal con **toggle Peso↔Monto**
  («$1.000 de queso» calcula el peso, o se ingresa kg); el carrito muestra «0,350 kg ✎» (tocar para corregir),
  unitarios con +/−. **`process_sale` NO cambió** (`ventas_lineas.cantidad` ya es `NUMERIC(14,3)`; calcula
  `precio_total × cantidad`). e2e `scripts/verify-granel.mjs` **5/5** (venta 0,350 kg → línea $2.800, stock
  4,650 kg). tsc/lint/build OK. **Falta verificación en navegador (cámara/continuo/granel) de Andrés** (cerrar/
  reabrir PWA ×2 para el bundle nuevo). Fuera de alcance: API de pago de códigos, balanza por hardware, EAN-13 de balanza con peso embebido.
  - **✅ Selector con/sin IVA en factura manual + gastos** (`279df43`). Island `components/monto-tributario.tsx`
    (tipo doc + Incluye IVA/Sin IVA neto/Exento + tasa% default + desglose en vivo) que emite los hidden que ya
    leen las actions (`monto_total` bruto, `tasa_iva`, `tipo_documento`) → drop-in. Reemplaza «Monto total» +
    `DocTributario` en `/compras/facturas/nueva` y `/gastos` (DocTributario queda para `TIPOS_DOC`/`esExento` + edición).
  - **✅ Reabrir borrador del historial** (`3b0f9df`). Scans no-importados → «Reabrir» →
    `?scan=<id>`; `EscanearFactura` arranca en el review precargado (prop `inicial`). Guardar actualiza el
    mismo registro; registrar lo marca importado.
  - **✅ Botón «Empezar de cero» en alta de producto** (`9ebdea3`). Al escanear, OFF prerellena
    nombre/imagen solo si están vacíos + autosave del borrador en sessionStorage → re-escanear
    cambiaba solo el código y dejaba nombre/imagen del producto anterior (borrar a mano no bastaba).
    Botón bajo el escáner (`producto-form.tsx`) + modal de confirmación que `setF(vacio)`, limpia
    `sessionStorage` (`borrador-producto`) y cierra secciones auxiliares. No toca la lógica de
    `enriquecer` (intencional «no pisar lo tipeado»). escaneo-rápido/edición no lo necesitan.
- **Presentación / marketing / centro de ayuda** ✅ (4 commits: `37ac181`, `afc32d3`, `6d22d66`, `d0e81c0`).
  Rework de la capa de presentación, por fases:
  - **Fase A** (`37ac181`): `lib/planes.ts` = **fuente única de marketing** (`PLAN_BENEFICIOS` +
    `COMPARATIVA`, precio/nombre re-exportados de `subscription.ts`). La página `/configuracion/suscripcion`
    ahora lista beneficios por plan (antes solo precio). Fecha legal → 22-jun.
  - **Fase B** (`afc32d3`): **centro de ayuda moderno**. `/ayuda` reescrita = hub (flujo recomendado de 6
    pasos para nuevos + grid de manual por módulo + glosario + FAQ). **Manual detallado por módulo** en
    `/ayuda/[slug]` (10: productos, inventario, pos, caja, escaner-ocr, compras, gastos, reportes-iva,
    usuarios, suscripcion) con paso a paso, tips, FAQ y términos relacionados. Registro único
    `lib/ayuda/manual.tsx` (type-safe). Primitivas `components/help/primitives.tsx` (HelpFigure, Pasos,
    Callout, ModuleCard) + **10 ilustraciones SVG theme-aware** `components/help/ilustraciones.tsx`
    (mini-pantallas con CSS vars de la marca, sirven también a la landing). NO screenshots reales (Andrés
    puede sustituir después).
  - **Fase C** (`6d22d66`): **landing rework** (`app/page.tsx`). Tira de confianza, «Empieza en 3 pasos»,
    sección «Míralo en acción» con ilustraciones SVG (POS/reportes/escáner), planes con beneficios +
    **tabla comparativa** (de `lib/planes`) + FAQ de planes. Verificado visualmente en navegador (preview).
  - **Fase D** (`d0e81c0`): **refresco ligero de legales**. Layout con **TOC lateral sticky** (`app/legal/toc.tsx`,
    lee `h2[id]` del artículo — sirve T&C y privacidad sin duplicar) + link Inicio; secciones con anclas;
    descripción del servicio (T&C) y datos operacionales (privacidad) mencionan escáner/OCR/granel. Fondo
    legal NO reescrito.
  - Todo verificado tsc/lint/build webpack. Sin migraciones/RPCs (solo presentación). Decisiones de Andrés:
    ilustraciones SVG (no screenshots) · hub+página por módulo · refresco legal ligero.
  - **Próximo (lista):** afinar RUT proveedor (vs cliente)/folio/razón social — **bloqueado: necesita el texto
    OCR real de más facturas** (pegar del visor); POS responsive (layout 2 paneles fijo, rework con navegador);
    pintar baja confianza OCR (hoy solo hay confianza global, no por campo). **GOTCHA: tras cada deploy, la PWA
    (Serwist) sirve el JS cacheado → cerrar/reabrir la PWA 2 veces para ver el código nuevo.**

### Pendiente (manual de Andrés, NO bloquea el uso)
1. ~~Confirmar RUT legal~~ ✅ confirmado 78.312.836-5 (publicado en la página legal de Farmateca, misma SpA).
   Domicilio fijado a El Trovador 4280 Of 307, RM (jurisdicción Santiago).
2. ~~WhatsApp de soporte~~ ✅ activado: +56 9 4033 7486 (`lib/legal.ts` SOPORTE.whatsapp='56940337486').
3. ~~Aprobar textos legales~~ ✅ T&C (15 secciones) + privacidad (13) reescritos para el producto real
   (B2B POS), datos reales de Vectium, contacto `vectiumspa@gmail.com`. Sin banner borrador. Recomendado:
   revisión por abogado antes de escalar más allá de la beta. Correo de soporte dedicado vendrá con el dominio.
4. **`FLOW_ENFORCE=true`** en Vercel cuando se quiera bloquear acceso sin suscripción (ahora apagado → todos
   usan libre durante su trial; con suscripción que pase el gate ya se puede encender). **Cuentas de cortesía
   (commit `3d15cba`, migración `20260613021000`):** `empresas.acceso_cortesia_hasta DATE` → una empresa con
   cortesía vigente NO se bloquea aunque el cobro esté encendido (gratis sin Flow, para testing/beta/regalos).
   Setear por SQL: `UPDATE empresas SET acceso_cortesia_hasta='2099-12-31' WHERE rut='…';`. **Antes de encender
   `FLOW_ENFORCE`, marcar como cortesía las cuentas de testing y la de la beta tester.** Códigos promo masivos
   (concursos) = feature aparte, no construida.
5. **Dominio definitivo** → habilita Fase D: Resend (email bienvenida/recuperación) + reactivar "Confirm email"
   en Supabase + Plausible. Hasta entonces se usa la URL de Vercel y el email queda inerte.
6. **Secrets de Supabase en GitHub** (opcional) para que corra la suite e2e en CI.

> Env vars YA puestas en Vercel: `FLOW_API_KEY`/`FLOW_SECRET_KEY`/`FLOW_API_URL`/`NEXT_PUBLIC_SITE_URL`/
> `FLOW_ENROLL_ENABLED`. Faltan (Fase D): `RESEND_*`/`NEXT_PUBLIC_PLAUSIBLE_DOMAIN`/`FLOW_ENFORCE`.

---

## Qué es
**Gestionala** — SaaS POS genérico para micro-comercios chilenos (almacenes, minimarkets, kioscos).
POS táctil con **offline**, caja con cuadratura, inventario, compras, gastos, reportes, multi-tenant.
Cliente confirmado: mini almacén de una amiga (vende galletas, dulces, bebidas, jugos, café; beta).

## Stack (excepción consciente a la regla Firebase global → este repo usa Supabase)
- Next.js 16 (App Router) + React 19 + TypeScript strict + Tailwind v4
- **shadcn/ui** (Base UI, NO Radix) en `components/ui/`
- Supabase: Postgres + Auth + RLS + Storage (proyecto `igpplasotoshtuwbdzmf`, São Paulo)
- Dexie (IndexedDB) + Serwist (PWA) para offline
- Deploy: Vercel `https://mypyme-blond.vercel.app` (auto-deploy desde `main`)
- **UI / marca:** identidad **Gestionala** — paleta **navy/azul real/slate** (tokens hex en
  `app/globals.css`; ver `docs/10-marca-gestionala.md`). Sistema visual: `.glass`/`.mesh-bg`/`.blob`/
  `.glow-brand`/`.grad-brand`/`.grad-brand-vivid`/`.text-grad-brand`/`.shine-card` + **Framer Motion 12**
  (animaciones de entrada/contadores). Sidebar con logo G + item activo en degradado; PageHeader/EmptyState
  con icono en degradado; dashboard con stat cards (glass+orbe+contador animado); login + auth con hero
  mesh/blobs/glass. **Gráficos** (Recharts 3.x, dynamic `ssr:false` en `components/charts/`) en paleta navy.
  Logos en `public/brand/` (favicon=`app/icon.png`, OG, PWA manifest).

## Recursos
- Repo: https://github.com/CariolaFlex/mypyme
- Supabase ref: `igpplasotoshtuwbdzmf` · URL `https://igpplasotoshtuwbdzmf.supabase.co`
- Vercel: team Hobby "Andres Cariola's projects", proyecto `mypyme`
- Claves: en `.env.local` (gitignored). Supabase usa keys nuevas `sb_publishable_*` / `sb_secret_*`.

---

## Fases completas (0 → 5, incl. Fase 4 completa), todas verificadas e2e + navegador

| Fase | Contenido |
|------|-----------|
| 0 | Scaffold Next.js + Supabase + Serwist + deploy Vercel |
| 1 | Auth (login/register), onboarding (RPC `crear_empresa_y_membresia`), middleware, `/configuracion/negocio` |
| 2 | Catálogo (productos/categorías), inventario (movimientos + vista stock), métodos de pago, imagen de producto (Storage), badge stock bajo |
| 3A | POS online: `/pos`, RPC `process_sale` idempotente, descuento de stock atómico |
| 3B | Caja: `/caja`, RPCs `abrir_caja`/`cerrar_caja` (cuadratura), POS gated por sesión, vuelto efectivo |
| 3C | Offline: Dexie (`lib/db.ts`) cola de ventas + `lib/sync.ts` (`flushQueue`), indicador online/offline, sync al reconectar |
| 5  | Reportes: dashboard real (`/`), `/reportes/ventas`, `/reportes/iva` (F29). 5 RPCs en `20260613007000_reportes.sql`, helpers de fecha Santiago en `lib/reportes.ts` |
| 4A | Proveedores + Gastos: `/compras/proveedores`, `/gastos`. RPC `registrar_gasto` (gasto efectivo descuenta caja). Migración `20260613008000_compras_gastos.sql` |
| 4B | Órdenes de compra: `/compras/ordenes` (crear/aprobar/recibir parcial→total/cancelar). RPCs `crear/aprobar/recibir/cancelar_orden_compra`; recepción genera inventario. Migración `20260613010000_ordenes_compra.sql` |
| 4C | Cuentas por pagar: `/compras/facturas` (factura proveedor + pagos parciales; pago efectivo descuenta caja). RPCs `crear_factura_proveedor`/`registrar_pago_proveedor`. Migración `20260613011000_facturas_proveedor.sql` |

## Modelo de datos (en `public`, todo bajo RLS multi-tenant)
`empresas`, `usuarios_empresa`, `configuracion_negocio`, `categorias_producto`, `productos`,
`bodegas`, `metodos_pago`, `movimientos_inventario` (+ vista `vw_stock_actual`), `cajas`,
`sesiones_caja`, `movimientos_caja`, `ventas`, `ventas_lineas`, `ventas_pagos`.
Migraciones en `supabase/migrations/` (23 archivos, todas aplicadas en cloud).
Reportes: las RPCs agregan sobre `ventas`/`ventas_lineas`/`ventas_pagos` (sin tablas nuevas).

---

## Cómo funciona (gotchas importantes)
1. **Multi-tenant por RLS + JWT.** Auth Hook `custom_access_token_hook` inyecta `empresa_id`
   y `user_rol` en el JWT. Helpers `public.get_tenant_id()` / `public.get_rol()` (STABLE).
   El hook corre como `supabase_auth_admin` → requiere política `usuarios_empresa_auth_admin_read USING(true)`.
   Patrón de políticas: SELECT para el tenant; escritura `FOR ALL` solo `admin`.
2. **"Confirm email" está DESACTIVADO** en Supabase (dev) para probar registro→onboarding sin SMTP.
   Reactivar (o configurar SMTP) antes de producción real.
3. **Build/dev forzados a webpack** (`next dev/build --webpack`) porque Serwist + Turbopack es
   inestable en Next 16. No quitar los flags.
4. **Auto-expose new tables = OFF** en Supabase → cada tabla nueva necesita `GRANT` explícito a
   `authenticated` (y `service_role` lo hereda por ALTER DEFAULT PRIVILEGES de la migración 000200).
5. **Vistas con `security_invoker = true`** (ej. `vw_stock_actual`) — sin esto correrían como owner
   y filtrarían NADA (fuga multi-tenant).
6. **`process_sale` es idempotente** por UUID de cliente (`ON CONFLICT`/early-return). Precios
   autoritativos desde la DB. Solo el efectivo (`tipo='cash'`) entra a `movimientos_caja`.
7. **POS offline-first**: `process_sale` se llama desde el **cliente** (browser supabase client),
   no server action. Si `!navigator.onLine` → encola en Dexie y confirma optimista.
8. **shadcn**: selects y checkboxes se dejaron **nativos** (estilados) para no romper el submit con
   server actions; submit usa `<Button type="submit">` de Base UI.
9. **Reportes (Fase 5)**: RPCs `security invoker` → la RLS de las tablas base filtra por tenant sola
   (no exponen datos nuevos). Cortes de día/mes/año en `America/Santiago` tanto en SQL (`AT TIME ZONE`)
   como en JS (`lib/reportes.ts`). **No formatear fechas date-only con `new Date(s)`** (retrocede un día
   en tz negativa) → usar `fmtFecha` de `lib/reportes.ts` que reformatea el string.

## Cómo correr / probar
- Local: `npm run dev` (webpack) → http://localhost:3000
- Build: `npm run build` · Lint: `npm run lint` · Types: `npm run typecheck`
- **Suite e2e completa:** `npm run test:e2e` (corre los 13 `verify-*.mjs` en serie contra la DB
  cloud, self-clean; filtros: `npm run test:e2e roles iva`). Baseline 13/13 verde (2026-06-15).
- **CI** (`.github/workflows/ci.yml`): job *static* (lint+typecheck+build) en cada push/PR; job
  *e2e* (la suite) solo en `main`+manual con `concurrency` single-flight. El e2e salta si faltan
  los 3 secrets de Supabase en el repo (pendiente de Andrés agregarlos en GitHub Settings → Secrets).
  CI usa `npm install` (no `npm ci`): el lock de Windows no trae optionals nativas de Linux (`@emnapi/*`).
  CI corre en **Node 24** (type-stripping nativo: `verify-flow` importa lib `.ts` directo).
- **Webhook de Flow con rate-limit:** `lib/rate-limit.ts` (ventana fija en memoria), 20 req/min por
  IP → 429, tras el no-op `flowConfigurado()` (inerte intacto). Test `verify-ratelimit.mjs`.
- **Comprobante imprimible (POS):** `lib/boleta.ts` (térmico 80mm, iframe oculto). Acción "Imprimir
  boleta" en el toast tras cobrar (online y offline). NO es DTE/SII (Fase 9); sin folio real aún
  (ref del UUID). Test `verify-boleta.mjs`.

## Sprint 5 (go-live) — Flow COBRANDO ✅
Sin dominio aún (se usa `mypyme-blond.vercel.app`). Email/Plausible diferidos hasta tener dominio (Fase D).
- ✅ Env vars Flow en Vercel + `NEXT_PUBLIC_SITE_URL` + `FLOW_ENROLL_ENABLED=true` (verificado: webhook
  ya no inerte). ✅ `urlCallback` de los planes → webhook (`scripts/flow-set-callback.mjs`).
- ✅ **COBRO PROBADO END-TO-END** (15-jun noche). Cargo Automático activado (Flow → Medios de pago →
  Editar datos → fila Cargo automático → Guardar → código por correo). Enroll real: tarjeta RedCompra
  ****5160 registrada. Suscripción `sus_s19353175e` (plan Emprende, trial 12d, 1er cobro **27-jun**,
  $0 ahora). Empresa `estado=activa`. El webhook registrará el cobro real el 27-jun.
- **Fix cobro-en-trial:** `crearSubscription` pasa `trial_period_days` = días restantes → no cobra en trial.
- **Fix sesión que se cae:** middleware copiaba mal las cookies refrescadas en los redirects → corregido
  (helper `redirigir()`). Era lo que rompía el `/retorno` (se perdía la sesión en el viaje a Flow).
- Herramientas Flow reutilizables: `scripts/flow-setup.mjs` (crea planes), `flow-plan-inspect.mjs`
  (lee planes), `flow-set-callback.mjs` (setea urlCallback). Ninguna cobra.
- **Opcional:** encender `FLOW_ENFORCE=true` para bloquear acceso sin suscripción (hoy off → libre en trial).
- Aplicar migraciones nuevas: `npx supabase db push --db-url "<session pooler URI>"`
  (host `aws-1-sa-east-1.pooler.supabase.com:5432`, pedir DB password a Andrés).
- Testing e2e de backend: crear usuario confirmado vía admin API (`/auth/v1/admin/users`),
  login (`/auth/v1/token?grant_type=password`), refresh para traer el claim, llamar RPCs/REST.
  **Siempre limpiar** los datos de prueba al final (delete empresa + user).

---

## Pendientes (próximas fases)
- ~~Pendientes menores 3B~~ ✅ cerrados: multi-pago en POS, movimientos de caja manuales
  (entrada/salida en `/caja`), búsqueda + filtro por categoría en POS.
- **Fase 6 — Suscripciones Flow.cl** (fundación lista, verificada 23/23): migraciones
  `20260613015000` + fix `015100` (`flow_customer_id`/`flow_subscription_id`/`trial_termina_en`,
  onboarding setea trial 14d), `lib/flow/{signature,subscription,client}.ts`, webhook
  `/api/webhooks/flow` (doble fase, **inerte sin credenciales**, excluido del gate en middleware),
  `/configuracion/suscripcion` + banner de trial. **Falta** (requiere cuenta Flow, en curso contra
  sandbox): crear planes, widget enroll de tarjeta, crear customer/subscription, enforcement real
  (`FLOW_ENFORCE`), email post-pago. Ver `docs/04-flow-integracion.md`.
  ⚠️ Regresión corregida esta sesión: `015000` recreó el onboarding desde la versión original y
  borró el sembrado (métodos/caja/categorías); `015100` lo restauró. **Lección: al CREATE OR REPLACE
  una función que migraciones posteriores extendieron, partir de la ÚLTIMA versión, no de la original.**
- **Fase 6 — cableado con Flow producción (cuenta VECTIUM, vectiumspa@gmail.com):** llaves en
  `.env.local` (gitignored, NO en Vercel todavía → prod sigue inerte). `scripts/flow-setup.mjs` creó
  los planes `mypyme_emprende`/`mypyme_pyme` por API (idempotente, sin cobro) — confirma firma+creds OK.
  Enroll de tarjeta (`/configuracion/suscripcion` + `/retorno`) **construido pero SIN probar contra la
  API real**, apagado tras `FLOW_ENROLL_ENABLED` (default off) para evitar cobros accidentales. Para
  probar enroll: habilitar el flag y asumir un cobro real (o usar sandbox). Planes/cliente verificados;
  el handshake de registro de tarjeta (campos de respuesta de Flow) se confirma al habilitar el enroll.
- **Fase 7 — Beta privada** (parcial): ✅ carga inicial de datos vía import masivo
  (`/inventario/importar`, RPC `importar_catalogo`, migración `20260613014000`, e2e 14/14 + navegador);
  ✅ onboarding guiado = tarjeta "Primeros pasos" en el dashboard (flag-free: visible cuando no hay
  productos, se va al cargar el catálogo). Falta: sesión de uso real con la clienta, T&C/privacidad, dominio.
- ~~Reporte de ventas por cajero~~ ✅ cerrado: RPC `reporte_ventas_por_cajero`
  (SECURITY DEFINER, filtra por `get_tenant_id()` manual, resuelve email desde `auth.users`) +
  tarjeta "Por cajero" en `/reportes/ventas`. Migración `20260613012000`. Verificado e2e 14/14
  (`scripts/verify-cajero.mjs`, 2 cajeros + aislamiento tenant) + navegador.
- **Fase 6 — Suscripciones Flow.cl** (ver `docs/04-flow-integracion.md`).
- **Fase 9 — SII/DTE** (OpenFactura, v2).
- ~~`/configuracion/usuarios`~~ ✅ cerrado (sin SMTP): gestión de miembros (listar/crear/rol/quitar).
  RPCs `listar_usuarios_empresa` (DEFINER, email desde auth.users), `cambiar_rol_usuario_empresa`,
  `quitar_usuario_empresa` (INVOKER + guardas de último admin/auto-quita). Alta vía server action con
  service_role (crea o vincula cuenta existente). Migración `20260613013000`. La invitación por email
  (link) queda para cuando haya SMTP — opcional, el alta directa cubre el caso del negocio.
- Setear `NEXT_PUBLIC_SITE_URL` / reactivar Confirm email para producción.

> Roadmap detallado con checkboxes: `docs/06-roadmap.md`.
