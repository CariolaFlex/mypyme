# Roadmap por Fases

**Versión:** 1.0 · **Fecha:** 2026-06-13 · **Timeline total:** ~17 semanas full-time

> Marca `[x]` al completar cada item. Cada fase tiene un entregable verificable.

---

## FASE 0 — Setup (Semana 1-2)
**Objetivo:** proyecto andando localmente, DB configurada, deploy inicial en Vercel.

- [x] Crear proyecto Next.js 15 con App Router + TypeScript (Next 16.2.9 + React 19 + Tailwind v4)
- [x] Inicializar Supabase (proyecto cloud `igpplasotoshtuwbdzmf` en São Paulo + `supabase init` local)
- [x] Configurar `supabase/config.toml` con Auth Hook (`custom_access_token_hook`)
- [x] Escribir + aplicar migraciones: core, grants authenticated, grants service_role (verificadas en cloud)
- [x] Validación RUT (Módulo 11) probada end-to-end contra la DB (rechaza inválido, acepta válido)
- [x] Clientes Supabase (`lib/supabase/{client,server,admin}.ts`) + sanity check en home
- [x] Configurar Serwist para PWA (`app/sw.ts`, manifest, icono; build forzado a webpack)
- [x] Variables de entorno (`.env.local` con URL + publishable + secret keys)
- [x] **Activar el Auth Hook en el dashboard** (Authentication → Hooks → `custom_access_token_hook`)
- [x] Deploy inicial en Vercel (`main` → producción, auto-deploy)
- [x] GitHub: ramas `main` (prod) + `develop` (preview)

**Entregable:** URL en Vercel con login funcional, conexión a Supabase operativa.

---

## FASE 1 — Auth + Onboarding + Configuración (Semana 3-4)
**Objetivo:** una empresa puede registrarse, configurar su negocio y gestionar usuarios.

### Bloque A — columna vertebral (✅ hecho, verificado e2e)
- [x] Páginas `/login` y `/register` con Supabase Auth (email/password)
- [x] Onboarding: crear empresa, RUT (validación Módulo 11), configurar IVA — RPC `crear_empresa_y_membresia`
- [x] Auth Hook activado — JWT incluye `empresa_id` y `user_rol`
- [x] Middleware Next.js: protección de rutas + gate de onboarding por claims
- [x] RLS multi-tenant verificado (empresa A no ve datos de B)

### Bloque B — ✅ hecho
- [x] Página `/configuracion/negocio` — editar datos empresa
- [x] Página `/configuracion/usuarios` — gestionar miembros (listar, crear, rol, quitar).
  Sin SMTP: el admin crea la cuenta (email + clave temporal entregada en persona) o vincula
  una cuenta existente. Migración `20260613013000`. Verificado e2e 13/13 + alta 5/5 + navegador.
- [x] Página `/configuracion/metodos-pago` — CRUD métodos de pago (hecho en Fase 2)
- [x] Probar el flujo real en navegador (registro→onboarding→dashboard verificado)

**Entregable:** registro end-to-end, multi-tenant verificado (empresa A no ve datos de B).

---

## FASE 2 — Catálogo e Inventario (Semana 5-6)
**Objetivo:** el admin puede cargar productos y gestionar stock.

### Bloque A (✅ hecho, verificado e2e)
- [x] CRUD categorías
- [x] CRUD productos (SKU, precio c/IVA → neto derivado, stock mínimo, activar/desactivar)
- [x] Tablas catálogo + RLS (lectura tenant / escritura admin) + grants
- [x] Onboarding siembra bodega "Principal" + métodos de pago estándar

### Bloque B (✅ hecho, verificado e2e)
- [x] Vista de stock actual (`vw_stock_actual`, `security_invoker`, calculada desde `movimientos_inventario`)
- [x] Registro de mermas / ajustes / entradas (RPC `registrar_movimiento` + página `/inventario/stock`)
- [x] Alerta de stock bajo (badge en tabla **y** en el sidebar)
- [x] Upload de imagen de producto (Supabase Storage, bucket con RLS por tenant verificado)
- [x] Página `/configuracion/metodos-pago` (movida desde Fase 1, ya con tabla `metodos_pago`)

**Entregable:** catálogo completo con inventario funcional.

---

## FASE 3 — POS + Caja (Semana 7-9)
**Objetivo:** el POS funciona en tiempo real y en offline.

### Bloque A — POS online (✅ hecho, verificado e2e en navegador)
- [x] Layout POS: catálogo izquierda, carrito derecha, touch-friendly
- [x] Manejo de cantidades en carrito
- [x] Cálculo de IVA (neto derivado del precio c/IVA, autoritativo desde DB)
- [x] Cobro con método de pago + RPC `process_sale` idempotente (UUID cliente)
- [x] Descuento de stock atómico al vender (verificado)

### Bloque B — Caja (✅ hecho, verificado e2e + navegador)
- [x] Apertura y cierre de caja (sesiones) — RPCs `abrir_caja`/`cerrar_caja`
- [x] Cuadratura al cerrar: esperado vs contado (diferencia)
- [x] POS gated por sesión abierta; efectivo registrado en flujo de caja
- [x] Cálculo de vuelto en efectivo (input recibido)
- [x] Movimientos de caja manuales (entrada/salida) — form en `/caja` + lista; afecta el esperado
- [x] Cobro con múltiples métodos a la vez — multi-pago en POS (split con validación de cuadre)
- [x] Búsqueda/filtro en el POS — buscador por nombre + chips por categoría

### Bloque C — Offline (✅ hecho, verificado e2e en navegador)
- [x] Dexie.js: DB local (`productos` cache, `ventasPendientes` cola)
- [x] Serwist: App Shell cacheado (configurado en Fase 0)
- [x] Sync Engine: `flushQueue` FIFO, idempotencia con UUID (reenvío seguro)
- [x] Indicador de estado offline + contador de pendientes en POS
- [x] Verificado: venta offline → cola → reconexión → sync automático → persiste

**Entregable:** el cafetero puede cobrar, incluso si se cae el internet.

---

## FASE 4 — Compras, Proveedores y Gastos (Semana 10-11)
**Objetivo:** control completo de egresos.

### Bloque A — Proveedores + Gastos (✅ hecho, verificado e2e 9/9 + navegador)
- [x] CRUD proveedores (`/compras/proveedores`, activar/desactivar)
- [x] CRUD gastos con categorías (`/gastos`; categorías sembradas en onboarding; neto/IVA derivados)
- [x] Gastos en efectivo que descuentan caja automáticamente (RPC `registrar_gasto`, atómico)

### Bloque B — Órdenes de compra (✅ hecho, verificado e2e 14/14 + navegador)
- [x] Órdenes de compra: crear, aprobar, recibir (genera movimientos de inventario tipo 'compra')
- [x] Recepción parcial de OC (estado borrador→aprobada→recibida_parcial→recibida; + cancelar)

### Bloque C — Cuentas por pagar (✅ hecho, verificado e2e 13/13 + navegador)
- [x] Cuentas por pagar: facturas proveedor, pagos, saldo pendiente (`/compras/facturas`)
- [x] Pago en efectivo descuenta caja automáticamente (RPC `registrar_pago_proveedor`)

**Entregable:** flujo completo de compras y gastos operativo. ✅ (Fase 4 completa)

---

## FASE 5 — Reportes (Semana 12) ✅ (verificado e2e + navegador)
**Objetivo:** dashboards básicos que el dueño realmente usa.

Backend: migración `20260613007000_reportes.sql` — 5 RPCs `security invoker`
(`reporte_ventas_resumen`, `reporte_top_productos`, `reporte_ventas_por_metodo`,
`reporte_ventas_por_dia`, `reporte_iva_mensual`). Cortes de fecha en hora Santiago
(`lib/reportes.ts`). Verificado 15/15 con `scripts/verify-reportes.mjs`.

- [x] Dashboard principal: ventas hoy/7 días/mes; ticket promedio; top productos; IVA mes; stock bajo
- [x] Reporte ventas (`/reportes/ventas`): por período, método de pago, por día, top productos
  - [x] desglose por cajero — RPC `reporte_ventas_por_cajero` (SECURITY DEFINER, resuelve email desde auth.users) + tarjeta "Por cajero" en `/reportes/ventas`
- [x] Reporte caja: historial de sesiones + cuadraturas — ya vive en `/caja`
- [x] Reporte inventario: stock actual + alertas + movimientos — ya vive en `/inventario/stock`
- [x] Reporte IVA (`/reportes/iva`): débito (ventas) − crédito (gastos) por mes/año = resultado F29.
- [x] Exportar a CSV/Excel (BOM es-CL) en `/reportes/ventas` y `/reportes/iva` (Sprint 3).

**Entregable:** el dueño ve su negocio en números sin abrir Excel. ✅

---

## FASE 6 — Suscripciones Flow.cl (Semana 13)
**Objetivo:** monetización automática real.

**Fundación lista (commit, migraciones `20260613015000` + fix `015100`), verificada 23/23:**
- [x] Migración: `flow_customer_id` + `flow_subscription_id` + `trial_termina_en` en `empresas`; onboarding setea trial de 14 días
- [x] Webhook `/api/webhooks/flow` con verificación doble fase — **inerte sin credenciales** (200 no-op); excluido del gate de login en middleware
- [x] Lógica de estados (`lib/flow/subscription.ts`): `estadoDesdeFlow`, `diasRestantesTrial`, `tieneAcceso`; firma HMAC (`lib/flow/signature.ts`)
- [x] Página `/configuracion/suscripcion` (estado, plan, días de trial) + banner de trial por vencer en el dashboard

**Cableado con cuenta de Flow (producción, cuenta VECTIUM):**
- [x] Planes creados en Flow vía API (`scripts/flow-setup.mjs`, idempotente): `mypyme_emprende` ($9.990) y `mypyme_pyme` ($19.990). Confirma firma + credenciales OK (sin cobro).
- [x] Cliente Flow completo (`lib/flow/client.ts`): customer, registro de tarjeta, subscription, getStatus.
- [~] Enroll de tarjeta cableado (`/configuracion/suscripcion` botón + `/retorno` route) — **construido pero NO probado contra la API real** y **apagado** tras `FLOW_ENROLL_ENABLED` (default off) para evitar cobros accidentales.

**Pendiente:**
- [ ] Probar el enroll punta a punta (inscribir tarjeta → subscription) — requiere habilitar `FLOW_ENROLL_ENABLED` y asumir un cobro real (o cuenta sandbox)
- [ ] Restricción de acceso real (enforcement) según estado — lógica lista (`tieneAcceso`/`enforcementActivo`), activar con env `FLOW_ENFORCE`
- [~] Email de bienvenida post-pago (Resend) — **construido e inerte** (`lib/email/resend.ts`,
  disparado desde el webhook al activarse; no-op sin `RESEND_API_KEY`). Falta: cuenta Resend +
  dominio verificado + `RESEND_API_KEY`/`RESEND_FROM` para enviar de verdad.
- [ ] Cargar env vars en Vercel cuando se vaya a producción real (Flow + Resend)

**Entregable:** el sistema cobra solo, sin intervención manual.

---

## FASE 7 — Beta Privada y Pulido (Semana 14-16)
**Objetivo:** lanzamiento con el primer cliente real y feedback loop.

- [x] Onboarding guiado — tarjeta "Primeros pasos" en el dashboard (3 pasos: crea negocio ✓,
  carga tu menú, abre caja y vende). Flag-free: aparece cuando la empresa no tiene productos y
  desaparece sola al cargar el menú. Verificado en navegador con cuenta nueva.
- [x] Carga inicial de datos (menú, stock, categorías) — herramienta de import masivo
  `/inventario/importar`: pega líneas `Nombre; Precio; Categoría; Stock` (categorías nuevas se
  crean solas, stock opcional, neto derivado del IVA, SKU autogenerado). RPC atómica
  `importar_catalogo`. Migración `20260613014000`. Verificado e2e 14/14 + navegador.
- [ ] Sesión de uso real con el cliente — observación directa
- [ ] Lista de bugs y mejoras UX priorizadas
- [ ] Soporte mínimo: email directo + WhatsApp
- [ ] Términos y condiciones, política de privacidad (mínimos legales)
- [ ] Dominio y branding definitivo
- [ ] Analytics de uso (Plausible o GA)

**Entregable:** primer cliente real usando el sistema en producción.

---

## FASE 8 — Lanzamiento Público (Semana 17+)
**Objetivo:** primeros 10 clientes pagando.

- [ ] Landing page de conversión (Next.js, mismo repo)
- [ ] SEO básico: "software caja registradora cafetería Chile", "POS restaurante barato Chile"
- [ ] Publicación en grupos de Facebook de emprendedores gastronómicos
- [ ] Caso de estudio con el amigo (con permiso): resultados reales, testimonio
- [ ] Referidos: 1 mes gratis por cada cliente que traiga
- [ ] Onboarding autoservicio completamente funcional

---

## FASE 9 — SII / DTE (v2 — 3-6 meses post-lanzamiento)
**Solo cuando haya MRR estable que justifique el costo.**

- [ ] Integrar OpenFactura/Haulmer: boleta electrónica (tipo 39)
- [ ] Agregar RUT del cliente en ventas que lo requieran
- [ ] Transmisión automática al SII dentro de 1 hora (Res. N°74/2020)
- [ ] Emisión de factura electrónica (tipo 33) en B2B (Res. N°36/2024)
- [ ] PDF de boleta para enviar por QR/WhatsApp (Res. N°12/2025)
- [ ] Reporte RCV validado contra SII
