# Plan de Módulos y Sprints — Camino a producción

**Versión:** 1.0 · **Fecha:** 2026-06-14
**Base:** lista exhaustiva de pendientes (ver chat / `docs/08-estado-actual.md`).

---

## Filosofía del plan (la decisión importante)

**Casi todo el desarrollo restante NO requiere credenciales ni pasos manuales.**
Robustez multi-tenant, roles, pulido UI y deuda técnica son 100% trabajo de Claude.

Por eso invertimos el orden natural:

```
[ DESARROLLO PURO — Claude, 0 interrupciones ]  →  [ 1 SESIÓN MANUAL — tú ]  →  [ GO-LIVE ]
        Sprints 1–4                                    Sprint 5                   Sprint 6
```

- **Tú no tocas nada** durante los Sprints 1–4 (semanas de trabajo de Claude, verificado e2e).
- **Una única sesión manual** (Sprint 5) junta TODO lo que necesita tus manos: cuentas,
  claves, dominio, env vars en Vercel, textos legales, y la prueba de cobro real.
- Después, go-live es casi un botón.

> Excepción opcional: si quieres probar la suscripción **antes** del final, hacemos un mini-toque
> manual para Resend/Flow. Pero no es necesario: el código queda listo y probado hasta donde se
> puede sin gatillar un cobro.

---

## Prioridad #1 declarada por Andrés

> "Cosas conectadas a bases de datos que deben funcionar perfectamente para CUALQUIER cliente
> (empresa, trabajadores, etc.)."

Esto se traduce en el **Sprint 1 (Robustez multi-tenant & roles)** como lo primero, antes que
estética. Un POS que cobra mal o filtra datos entre empresas es un problema; uno feo, no.

---

## Módulos

| # | Módulo | Qué cubre | Quién |
|---|--------|-----------|-------|
| M1 | **Núcleo multi-tenant & roles** | Que todo funcione perfecto para cualquier empresa con admin + empleados | Claude |
| M2 | **Pulido UI/UX** | Rediseño índigo en todas las pantallas, responsive, dark mode, estados | Claude |
| M3 | **Beta-ready** | Legal, soporte, onboarding pulido, analytics (código) | Claude |
| M4 | **Monetización (Fase 6)** | Cerrar enforcement + dejar enroll/email listos para activar | Claude |
| M5 | **Setup & Go-live** | Credenciales, dominio, Vercel, prueba de cobro real | **Tú** + Claude |
| M6 | **Lanzamiento público (Fase 8)** | Landing, SEO, difusión | Claude + tú |
| M7 | **SII/DTE (Fase 9)** | Boleta electrónica — diferido hasta MRR | Claude + tú |

---

## Sprints (en orden de ejecución)

### Sprint 1 — Robustez multi-tenant & roles  ·  *Claude, 0 manual*  ·  **PRIORIDAD MÁXIMA**
**Objetivo:** que la app sea correcta y a prueba de fugas para cualquier empresa con varios
trabajadores, sin importar el rol.

**1A — Bitácora de cambios ✅ HECHO** (migración `20260613016000`, verificado 8/8 + navegador):
triggers Postgres en datos maestros → tabla `auditoria` con actor + antes/después (imposible
saltárselo); página admin `/configuracion/auditoria` con diff. Borrado = desactivar (recuperable).

**1B — Roles ✅ HECHO** (migración `20260613017000`, verificado 9/9 + navegador):
- [x] **Gating de UI por rol**: sidebar oculta el grupo Configuración a empleados; layout guard
      en `/configuracion/*` redirige a empleados que entren directo.
- [x] **Escritura operativa para empleados** (RLS relajada a miembro del tenant): catálogo,
      inventario, proveedores, gastos, órdenes, facturas. Zonas de control siguen admin-only
      (métodos de pago, configuración, usuarios, empresa). Todo auditado (1A).
- [x] **Empleado opera lo suyo** (POS, caja, reportes) — verificado con login rol `empleado`.
- [ ] **Auditoría de aislamiento tenant** end-to-end: 2 empresas × 2 trabajadores c/u, recorrer
      TODAS las pantallas y RPCs verificando que ninguna filtra datos de la otra.
- [ ] **Smoke test de empresa nueva**: script que crea empresa + empleados + datos y verifica que
      onboarding sembró todo (métodos/caja/categorías/bodega) y que cada módulo responde. Evita
      regresiones como la de `015000`.
- [ ] **Manejo de errores consistente**: que ninguna acción denegada por RLS muestre un crash;
      mensajes claros ("no tienes permiso").
- [ ] Fix de checkboxes desactualizados en `docs/06-roadmap.md` (cosas ya hechas).

**Entregable:** la app funciona perfecto para N empresas con admins y empleados. Base sólida.

---

### Sprint 2 — Pulido UI/UX completo  ·  *Claude, 0 manual*
**Objetivo:** el rediseño índigo en todas las pantallas + experiencia pulida.

- [x] Pulir headers: `PageHeader` (icono+título+descripción+acción) en 10 pantallas operativas
      (caja, productos, inventario, categorías, proveedores, gastos, métodos de pago, negocio,
      órdenes, cuentas por pagar). Commit a16c581. *(falta: onboarding)*
- [x] **Responsive / móvil-tablet**: sidebar con hamburguesa + drawer overlay en <lg. Commit a408124.
- [x] **Dark mode**: toggle next-themes en el sidebar, default claro, índigo preservado. Commit b682e78.
- [x] **hover de filas** en tablas (ya estaba en el primitivo Table).
- [x] **Estados vacíos** con icono (`EmptyState`) en productos y proveedores; **skeletons** de carga
      (`Skeleton` + `app/(dashboard)/loading.tsx` genérico). Commit 584466a.
- [x] **Onboarding** con tratamiento de marca (logo/blobs/card). Commit 584466a.

**Diferido a propósito (menor impacto, queda para Sprint 3 o después):**
- [ ] Más feedback con **toasts** (Sonner) — hoy se usan banners flash con `?ok/?error`, funcionan bien.
- [ ] **Imágenes de producto** en POS (la query del POS no trae `imagen_url`; los productos sembrados
      no tienen imagen → no verificable ahora). El listado de productos sí muestra imagen.
- [ ] `EmptyState` en el resto de listas (gastos, órdenes, facturas, categorías) y pulir formularios internos.

**Entregable:** app consistente y presentable para mostrarle al cafetero. ✅ (Sprint 2 cerrado en lo esencial)

---

### Sprint 3 — Beta-ready  ·  *Claude (con inputs menores tuyos)*
**Objetivo:** lo necesario para una beta privada digna.

- [ ] **Páginas legales** (T&C + privacidad) con plantillas mínimas chilenas — borrador que tú
      revisas/ajustas (textos los apruebas tú; el armado lo hago yo).
- [ ] **Onboarding guiado** más completo (hoy es solo la tarjeta "primeros pasos").
- [ ] **Canal de soporte** mínimo en la app (link email/WhatsApp).
- [ ] **Analytics** (Plausible o GA) integrado en código, listo para activar con tu key.
- [x] **Exportar a CSV/Excel** (con BOM es-CL) en reportes — útil para el dueño. Botón "Exportar CSV"
      en `/reportes/ventas` (respeta el rango activo) y `/reportes/iva` (respeta el año). Route handlers
      `*/export/route.ts` corren los mismos RPCs (RLS aplica). `lib/csv.ts`: BOM UTF-8, delimitador `;`
      (es-CL), CRLF, montos como enteros crudos. Verificado e2e en navegador (BOM EF BB BF, secciones, totales).
- [ ] **Recuperación de contraseña** (UI lista; el envío real depende de SMTP del Sprint 5).

**Entregable:** lista para que el cafetero la use de verdad.

---

### Sprint 4 — Monetización lista para activar  ·  *Claude, 0 manual*
**Objetivo:** dejar la Fase 6 100% lista para encender, sin gatillar cobros.

- [ ] **Enforcement de acceso** cableado al middleware tras `FLOW_ENFORCE` (default off): trial
      vencido → pantalla de "reactiva tu suscripción". Probado con flag on/off sin cobrar.
- [ ] **Pulir página de suscripción** y el flujo de estados (activa/morosa/cancelada) en la UI.
- [ ] Revisar el **handshake de enroll** (`retorno/route.ts`) contra la doc de Flow para minimizar
      sorpresas en la prueba real del Sprint 5.
- [ ] Banner/avisos de cobro próximo, recibos, historial de pagos (UI).

**Entregable:** apretar un switch (y probar 1 cobro) en el Sprint 5 = cobrando de verdad.

---

### Sprint 5 — 🔑 SESIÓN MANUAL ÚNICA + Go-live  ·  *Tú (~1–2 h) + Claude en vivo*
**Objetivo:** juntar TODO lo manual en una sola sentada y dejar prod listo.

**Checklist tuyo (en orden de dependencia):**
1. [ ] **Dominio**: comprar/decidir el dominio definitivo (keystone de email + branding).
2. [ ] **Resend**: crear cuenta → verificar el dominio (DNS) → copiar `RESEND_API_KEY` + definir `RESEND_FROM`.
3. [ ] **SMTP en Supabase**: configurar (puede ser vía Resend) → **reactivar "Confirm email"**.
4. [ ] **Vercel — env vars**: `FLOW_API_KEY`, `FLOW_SECRET_KEY`, `FLOW_API_URL`, `RESEND_API_KEY`,
       `RESEND_FROM`, `NEXT_PUBLIC_SITE_URL` (dominio definitivo). Y `FLOW_ENFORCE` / `FLOW_ENROLL_ENABLED`
       cuando decidas encender.
5. [ ] **Textos legales**: aprobar los borradores de T&C/privacidad.
6. [ ] **Analytics**: crear cuenta (Plausible/GA) → key.
7. [ ] **Prueba de cobro real**: habilitar enroll e inscribir una tarjeta (1 cobro real, o sandbox)
       → Claude confirma el handshake en vivo y ajusta si hace falta.

**Claude en vivo durante esta sesión:** valida cada conexión, prueba el enroll punta a punta,
activa enforcement, despliega, y deja todo verificado.

**Entregable:** mypyme cobrando, con email, dominio propio y acceso controlado por suscripción.

---

### Sprint 6 — Lanzamiento público (Fase 8)  ·  *Claude + tú*
- [ ] Landing de conversión · [ ] SEO básico · [ ] Onboarding autoservicio 100% ·
      [ ] Caso de estudio del cafetero · [ ] Referidos · [ ] Difusión (tú).

### Sprint 7 — SII / DTE (Fase 9, v2)  ·  *diferido hasta MRR estable*
- [ ] Boleta electrónica tipo 39 (OpenFactura) · [ ] RUT cliente · [ ] Transmisión SII ·
      [ ] Factura tipo 33 · [ ] PDF/QR/WhatsApp · [ ] RCV.

---

## Deuda técnica (se intercala donde encaje, no es un sprint propio)

- [ ] Suite de tests + CI que corra los `verify-*.mjs` automáticamente.
- [ ] `npm audit` — 2 vulnerabilidades moderadas (transitivas de recharts/resend).
- [ ] PWA offline real probado a fondo (Serwist app-shell, instalación).
- [ ] Idempotencia/rate-limit explícito del webhook de Flow.
- [ ] (Futuro) multi-empresa por usuario (hoy 1 usuario = 1 empresa).
- [ ] Boleta/comprobante imprimible + número de boleta real.

---

## Resumen de una línea

> **Yo hago Sprints 1–4 de corrido (sin molestarte). Tú haces UNA sesión manual (Sprint 5) con
> todo junto y quedamos en producción cobrando. Empezamos por la robustez multi-tenant.**
