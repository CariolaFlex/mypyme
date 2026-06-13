# Decisiones Técnicas Definitivas

**Versión:** 1.0 · **Fecha:** 2026-06-13

> Decisiones cerradas, basadas en las 7 investigaciones previas. No se re-discuten.

---

## ⚠️ Excepción de stack registrada

El CLAUDE.md global de Andrés establece "**Firebase primero. NO sugerir PostgreSQL,
Prisma ni Supabase salvo que yo lo pida explícitamente.**"

Para **este proyecto** se hace una **excepción consciente y aprobada**: el backend es
**Supabase (PostgreSQL)**. Justificación:

- Las 7 investigaciones del proyecto se hicieron sobre Supabase.
- Multi-tenant por **RLS con custom claims en JWT** es nativo de Postgres y se evalúa
  en RAM sin subconsultas → más barato y simple que replicarlo en Firestore Rules.
- **Idempotencia offline** con `ON CONFLICT (id) DO NOTHING` y **decrementos atómicos
  de stock** vía RPC PL/pgSQL son naturales en SQL.
- Realtime, Auth y Storage incluidos en un solo servicio.

Esta excepción aplica **solo a `mypyme`**. El resto de proyectos sigue en Firebase.

---

## Stack

| Capa | Tecnología | Justificación |
|------|------------|---------------|
| Frontend | Next.js 15 (App Router) + React 19 + TS strict | SSR/SSG, routing y API routes en uno |
| Estilos | Tailwind CSS v4 (`@theme`, sin config.ts) | Estándar del usuario |
| Componentes | shadcn/ui (copiado en `components/ui/`, NUNCA como paquete) | Estándar del usuario |
| Backend/DB | Supabase (PostgreSQL + Auth + RLS + Realtime) | Multi-tenant nativo, JWT custom claims |
| Hosting | Vercel | Deploy automático desde GitHub, edge, free tier |
| Pagos/Suscripciones | Flow.cl | Sin fee mensual, 2.89%+IVA por transacción, subscriptions con trial |
| Control de versiones | GitHub | CI/CD con Vercel |
| Offline POS | Dexie.js + Serwist | Cola local IndexedDB, sync idempotente con UUIDs |
| SII / DTE (v2+) | OpenFactura / Haulmer | REST JSON, sandbox público, ~$19.900 CLP/año por RUT |

---

## Arquitectura Multi-Tenant

- **Patrón:** Shared schema + RLS (tabla compartida con `empresa_id` en todo).
- **Auth Hook:** custom claims en JWT — `empresa_id` y `rol` embebidos en el token,
  evaluados en memoria RAM por RLS sin subconsultas.
- **Funciones helper:** `auth.get_tenant_id()` y `auth.get_rol()` — marcadas `STABLE`
  para que el planificador las cachee.
- **Indexación:** todos los índices críticos llevan `empresa_id` como primera columna.

## Arquitectura Offline POS

- **Motor:** Dexie.js para persistencia local (IndexedDB), `useLiveQuery` para
  reactividad sin spinners.
- **Cola:** `sync_queue` con estados `pending → processing → resolved / failed / dead`.
- **Idempotencia:** UUID generado en el cliente al momento de cobrar; backend usa
  `ON CONFLICT (id) DO NOTHING`.
- **Inventario concurrente:** RPCs PL/pgSQL con decrementos relativos atómicos
  (`stock = stock - qty`), **nunca** valores absolutos desde el cliente.
- **PWA:** Serwist con "Network First, fallback to cache" para lógica dinámica;
  "Cache First" solo para assets estáticos.

## Seguridad RLS — Reglas de oro

1. **Nunca** políticas que consulten otras tablas (causa `ERROR 42P17` recursión infinita).
2. **Nunca** `SECURITY DEFINER` sin validación interna de `auth.get_tenant_id()`.
3. **Siempre** `USING` + `WITH CHECK` en `UPDATE` para prevenir robo lateral de datos.
