# Estado Actual — Punto de Continuación

**Fecha:** 2026-06-13 · **Rama:** `main` (todo pusheado a `CariolaFlex/mypyme`)

> Documento de handoff. Resume qué está hecho, cómo funciona y qué sigue.
> Verificado: build OK, ESLint 0 errores, TypeScript OK, 16/16 checks e2e, deploy Vercel sano.

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

## Recursos
- Repo: https://github.com/CariolaFlex/mypyme
- Supabase ref: `igpplasotoshtuwbdzmf` · URL `https://igpplasotoshtuwbdzmf.supabase.co`
- Vercel: team Hobby "Andres Cariola's projects", proyecto `mypyme`
- Claves: en `.env.local` (gitignored). Supabase usa keys nuevas `sb_publishable_*` / `sb_secret_*`.

---

## Fases completas (0 → 3), todas verificadas e2e + navegador

| Fase | Contenido |
|------|-----------|
| 0 | Scaffold Next.js + Supabase + Serwist + deploy Vercel |
| 1 | Auth (login/register), onboarding (RPC `crear_empresa_y_membresia`), middleware, `/configuracion/negocio` |
| 2 | Catálogo (productos/categorías), inventario (movimientos + vista stock), métodos de pago, imagen de producto (Storage), badge stock bajo |
| 3A | POS online: `/pos`, RPC `process_sale` idempotente, descuento de stock atómico |
| 3B | Caja: `/caja`, RPCs `abrir_caja`/`cerrar_caja` (cuadratura), POS gated por sesión, vuelto efectivo |
| 3C | Offline: Dexie (`lib/db.ts`) cola de ventas + `lib/sync.ts` (`flushQueue`), indicador online/offline, sync al reconectar |

## Modelo de datos (en `public`, todo bajo RLS multi-tenant)
`empresas`, `usuarios_empresa`, `configuracion_negocio`, `categorias_producto`, `productos`,
`bodegas`, `metodos_pago`, `movimientos_inventario` (+ vista `vw_stock_actual`), `cajas`,
`sesiones_caja`, `movimientos_caja`, `ventas`, `ventas_lineas`, `ventas_pagos`.
Migraciones en `supabase/migrations/` (8 archivos, todas aplicadas en cloud).

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

## Cómo correr / probar
- Local: `npm run dev` (webpack) → http://localhost:3000
- Build: `npm run build` · Lint: `npm run lint` · Types: `npx tsc --noEmit`
- Aplicar migraciones nuevas: `npx supabase db push --db-url "<session pooler URI>"`
  (host `aws-1-sa-east-1.pooler.supabase.com:5432`, pedir DB password a Andrés).
- Testing e2e de backend: crear usuario confirmado vía admin API (`/auth/v1/admin/users`),
  login (`/auth/v1/token?grant_type=password`), refresh para traer el claim, llamar RPCs/REST.
  **Siempre limpiar** los datos de prueba al final (delete empresa + user).

---

## Pendientes (próximas fases)
- **Pendientes menores 3B:** movimientos de caja manuales (entrada/salida), multi-pago simultáneo
  (el RPC ya acepta array de pagos), búsqueda/filtro por categoría en POS.
- **Fase 4 — Compras/Proveedores/Gastos** (esquema en `docs/02-modelo-datos.md`).
- **Fase 5 — Reportes** (ventas, caja, inventario, **IVA débito/crédito para F29**) + dashboard real.
- **Fase 6 — Suscripciones Flow.cl** (ver `docs/04-flow-integracion.md`).
- **Fase 9 — SII/DTE** (OpenFactura, v2).
- `/configuracion/usuarios` (invitaciones — requiere SMTP).
- Setear `NEXT_PUBLIC_SITE_URL` / reactivar Confirm email para producción.

> Roadmap detallado con checkboxes: `docs/06-roadmap.md`.
