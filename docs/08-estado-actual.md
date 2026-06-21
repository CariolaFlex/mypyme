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
