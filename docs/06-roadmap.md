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
- [ ] **Activar el Auth Hook en el dashboard** (Authentication → Hooks → `custom_access_token_hook`)
- [ ] Deploy inicial en Vercel (`main` → producción, `develop` → preview)
- [ ] GitHub: definir rama strategy (`main`, `develop`, `feature/*`)

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

### Bloque B — pendiente
- [ ] Página `/configuracion/negocio` — editar datos empresa
- [ ] Página `/configuracion/usuarios` — invitar usuarios, asignar rol
- [ ] Página `/configuracion/metodos-pago` — CRUD métodos de pago (requiere tabla `metodos_pago`, Fase 2)
- [ ] Probar el flujo real en navegador (requiere desactivar "Confirm email" en dev)

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
- [ ] Movimientos de caja manuales (entrada/salida) — *pendiente menor*
- [ ] Cobro con múltiples métodos a la vez (hoy: 1 método; RPC ya soporta varios) — *pendiente menor*
- [ ] Búsqueda/filtro en el POS — *pendiente menor*

### Bloque C — Offline (pendiente)
- [ ] Dexie.js: schema local (`products_cache`, `sync_queue`)
- [ ] Serwist: App Shell cacheado, operación sin internet
- [ ] Sync Engine: cola FIFO, idempotencia con UUID, dead letter pattern
- [ ] Indicador visual de estado offline en POS

**Entregable:** el cafetero puede cobrar, incluso si se cae el internet.

---

## FASE 4 — Compras, Proveedores y Gastos (Semana 10-11)
**Objetivo:** control completo de egresos.

- [ ] CRUD proveedores
- [ ] Órdenes de compra: crear, aprobar, recibir (genera movimientos de inventario)
- [ ] Recepción parcial de OC
- [ ] Cuentas por pagar: facturas proveedor, pagos, saldo pendiente
- [ ] CRUD gastos con categorías
- [ ] Gastos en efectivo que descuentan caja automáticamente

**Entregable:** flujo completo de compras y gastos operativo.

---

## FASE 5 — Reportes (Semana 12)
**Objetivo:** dashboards básicos que el dueño realmente usa.

- [ ] Dashboard principal: ventas hoy/semana/mes; ticket promedio; top productos
- [ ] Reporte ventas: por período, método de pago, cajero, producto
- [ ] Reporte caja: historial de sesiones, cuadraturas
- [ ] Reporte inventario: stock actual, movimientos, alertas
- [ ] Reporte IVA: débito/crédito por mes (insumo para F29)

**Entregable:** el dueño ve su negocio en números sin abrir Excel.

---

## FASE 6 — Suscripciones Flow.cl (Semana 13)
**Objetivo:** monetización automática real.

- [ ] Crear planes en Flow dashboard (Emprende y Pyme)
- [ ] Widget de enroll de tarjeta (iframe) en página de suscripción
- [ ] Crear Customer → Subscription en Flow al finalizar trial
- [ ] Webhook `/api/webhooks/flow` con verificación doble fase
- [ ] Lógica de estados: activa, morosa, cancelada
- [ ] Restricción de acceso según estado de suscripción (middleware)
- [ ] Email de bienvenida post-pago (Resend o similar)
- [ ] Migración: agregar `flow_subscription_id` a `empresas`

**Entregable:** el sistema cobra solo, sin intervención manual.

---

## FASE 7 — Beta Privada y Pulido (Semana 14-16)
**Objetivo:** lanzamiento con el primer cliente real y feedback loop.

- [ ] Onboarding guiado (wizard de 3 pasos al primer login)
- [ ] Carga inicial de datos del amigo (menú, stock, categorías)
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
