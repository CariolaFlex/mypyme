# Estado Actual — Punto de Continuación

**Fecha:** 2026-06-15 · **Rama:** `main` (todo pusheado a `CariolaFlex/mypyme`)

> Documento de handoff. Resume qué está hecho, cómo funciona y qué sigue.
> Verificado: build OK, ESLint 0 errores, TypeScript OK, deploy Vercel sano.

## ⭐ Punto de continuación (2026-06-15): Sprints 1–4 COMPLETOS

Todo el desarrollo puro autónomo (Claude, 0 manual) está hecho y en prod. **28 migraciones** aplicadas en cloud.
Lo único que falta es el **Sprint 5 — sesión manual de Andrés** (dominio, Resend/SMTP, env vars en Vercel,
aprobar textos legales, cuenta Plausible, prueba de 1 cobro real). Detalle por sprint en `docs/09-plan-modulos-sprints.md`.

- **Sprint 1 — Robustez multi-tenant & roles** ✅ (bitácora/auditoría + roles admin/empleado con RLS).
- **Sprint 2 — Pulido UI** ✅ (marca índigo, sidebar responsive, dark mode, gráficos Recharts, headers, skeletons, empty states).
- **Sprint 3 — Beta-ready** ✅ (6/6): export CSV/Excel en reportes (BOM es-CL), páginas legales `/legal/*`,
  canal de soporte `/soporte`, recuperación de contraseña (UI: `/recuperar` + `/auth/callback` + `/actualizar-clave`),
  analytics Plausible gated (`NEXT_PUBLIC_PLAUSIBLE_DOMAIN`), onboarding guiado consciente del progreso.
- **Sprint 4 — Monetización lista para activar** ✅ (4/4): enforcement de acceso en middleware gated por
  `FLOW_ENFORCE` (→ `/suscripcion-requerida`), página de suscripción con estados contextuales, revisión del
  handshake de enroll de Flow + hardening (idempotencia), historial de pagos (tabla `pagos_suscripcion`
  escrita por el webhook; tarjeta en `/configuracion/suscripcion`).

**Pendiente de Andrés (Sprint 5), todo dejado construido/gated e inerte:** textos legales + placeholders en
`lib/legal.ts` (razón social/RUT/dominio/email + WhatsApp/email de soporte); cuenta Plausible + dominio;
SMTP en Supabase (para que salga el correo de recuperación + reactivar Confirm email); cuenta Resend; env vars
en Vercel (`FLOW_API_KEY`/`FLOW_SECRET_KEY`/`FLOW_API_URL`/`RESEND_API_KEY`/`RESEND_FROM`/`NEXT_PUBLIC_SITE_URL`/
`NEXT_PUBLIC_PLAUSIBLE_DOMAIN`); encender `FLOW_ENFORCE=true` y `FLOW_ENROLL_ENABLED=true`; probar 1 cobro real.

---

## Qué es
SaaS POS para micro-PyMEs gastronómicas chilenas. POS táctil con **offline**, caja con
cuadratura, inventario, multi-tenant. Cliente confirmado: cafetería de un amigo (beta).

## Stack (excepción consciente a la regla Firebase global → este repo usa Supabase)
- Next.js 16 (App Router) + React 19 + TypeScript strict + Tailwind v4
- **shadcn/ui** (Base UI, NO Radix) en `components/ui/`
- Supabase: Postgres + Auth + RLS + Storage (proyecto `igpplasotoshtuwbdzmf`, São Paulo)
- Dexie (IndexedDB) + Serwist (PWA) para offline
- Deploy: Vercel `https://mypyme-blond.vercel.app` (auto-deploy desde `main`)
- **UI:** color de marca **índigo** (tokens en `app/globals.css`, oklch hue 277). Sidebar
  rediseñado (`components/app-sidebar.tsx`, client: iconos Lucide, secciones, estado activo por
  `usePathname`). Dashboard con KPI cards (icono+acento+hover), POS con chips de precio, login/registro
  con logo+blobs. **Gráficos (Recharts 3.x, dynamic import `ssr:false` en `components/charts/`):**
  barras de ventas por día + dona por método en `/reportes/ventas`; tendencia 7 días en el dashboard.
  Animaciones vía CSS/tw-animate-css (fade-in, hover lift); **sin framer-motion** (reduce scope).

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

## Sprint 5 (go-live) — EN CURSO, bloqueado por Flow
Sin dominio (se usa `mypyme-blond.vercel.app`). Email/Plausible diferidos hasta tener dominio.
- ✅ Env vars Flow en Vercel + `NEXT_PUBLIC_SITE_URL` + `FLOW_ENROLL_ENABLED=true` (verificado: webhook
  ya no inerte). ✅ `urlCallback` de los planes → webhook (`scripts/flow-set-callback.mjs`).
- ✅ **COBRO PROBADO END-TO-END** (15-jun noche). Cargo Automático activado (Flow → Medios de pago →
  Editar datos → fila Cargo automático → Guardar → código por correo). Enroll real: tarjeta RedCompra
  ****5160 registrada. Suscripción `sus_s19353175e` (plan Emprende, trial 12d, 1er cobro **27-jun**,
  $0 ahora). Empresa `estado=activa`. El webhook registrará el cobro real el 27-jun.
- **Fix cobro-en-trial:** `crearSubscription` pasa `trial_period_days` = días restantes → no cobra en trial.
- **Fix sesión que se cae:** middleware copiaba mal las cookies refrescadas en los redirects → corregido
  (helper `redirigir()`). Era lo que rompía el `/retorno` (se perdía la sesión en el viaje a Flow).
- Herramientas Flow: `flow-plan-inspect`, `flow-set-callback`, `flow-diag-enroll`, `flow-verify-sub`,
  `flow-create-sub`.
- **Falta para go-live:** encender `FLOW_ENFORCE=true` (Fase B) + verificar enforcement.
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
  productos, se va al cargar el menú). Falta: sesión de uso real con el cafetero, T&C/privacidad, dominio.
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
  (link) queda para cuando haya SMTP — opcional, el alta directa cubre el caso de la cafetería.
- Setear `NEXT_PUBLIC_SITE_URL` / reactivar Confirm email para producción.

> Roadmap detallado con checkboxes: `docs/06-roadmap.md`.
