# Plan / Factibilidad — Mercado Pago Point integrado a Gestionala

> **Estado:** idea en evaluación (junio 2026). Documento de arranque para continuar en otra sesión.
> **Autor del análisis:** sesión Claude Code (investigación + diseño). NO implementado.
> **Resumen en una frase:** ofrecer la maquinita **Mercado Pago Point** como add-on del plan de
> Gestionala, que el cobro con tarjeta se dispare **desde el POS** y quede registrado en la
> plataforma (venta + caja + inventario), y que Andrés gane por ello.

---

## 1. Veredicto

- **Técnicamente: factible y encaja bien con el stack** (Next 16 + Supabase + webhooks; ya hay
  precedente con Flow). Riesgo técnico medio, no alto.
- **El cuello de botella NO es el código: es el acuerdo comercial con Mercado Pago.** Lo que define
  si el negocio existe es cuánto te paga MP (revenue share + reventa de hardware). Eso se confirma con
  un ejecutivo de MP **antes** de escribir código.
- **Recomendación:** arrancar por las fuentes de ingreso que NO dependen de MP (markup de
  suscripción), construir un MVP de cobro acotado, y sumar el revenue share cuando el acuerdo esté firmado.

---

## 2. De dónde sale TU dinero (4 fuentes, muy distinta factibilidad)

| # | Fuente | Cómo funciona | Factibilidad | Depende de |
|---|--------|---------------|--------------|------------|
| 1 | **Markup de suscripción** | Plan "con maquinita" cuesta más (ej. +$X/mes). | **Alta** — 100% bajo tu control. | Nadie. Ya tienes Flow. |
| 2 | **Revenue Share (Partners Program)** | MP te paga un **% del TPV** (volumen transado) de cada comerciante que integraste, mensual, según tu **nivel de partner**. | **Media-alta** | Entrar al Partners Program de MP + confirmar que aplica a **TPV presencial (Point)**. |
| 3 | **Comisión por vender el hardware + bonos** | Comisión por cada Point que colocas + bonos por metas. | **Media** (comercial) | Acuerdo de reventa/partner con MP Chile. No es self-service. |
| 4 | **`application_fee` (split de pagos)** | Cobras una comisión por cada pago, descontada en el momento. | **Baja-incierta para Point** | Confirmado para checkout **online**; **NO confirmado para Point presencial**. |

> **Clave:** la #2 (Revenue Share del Partners Program) es probablemente tu mejor vía para "ganar por
> las ventas", y es un **acuerdo comercial**, no un hack técnico. La #4 (application_fee) sería lo
> ideal técnicamente pero está sin confirmar para presencial — no apostar a ella todavía.

---

## 3. Flujo técnico (cómo "vive en la plataforma")

```
[Venta en el POS de Gestionala]
        │  (dueño elige "Cobrar con Mercado Pago")
        ▼
[Backend Gestionala]  ── crea Payment Intent / Order ──►  [API Mercado Pago Point]
        │                                                         │
        │                                                  carga el monto en
        │                                                  la terminal Point Smart
        │                                                         ▼
        │                                              [Cliente paga con tarjeta]
        │                                                         │
        ◄──────────── webhook: aprobado / rechazado ─────────────┘
        ▼
[Registrar la venta]  → process_sale (método "Mercado Pago") → descuenta stock,
                         queda en la caja como pago no-efectivo, imprime/registra
```

**Requisitos confirmados (docs MP):**
- Terminal **Point Smart** (Smart 1/2) en **modo PDV** (integrado, no standalone).
- Vinculación de la terminal a la cuenta del comerciante (app MP + QR).
- Para integración de terceros/marketplace: **OAuth** → tu app obtiene el `access_token` de cada
  comerciante.
- **Webhook** de notificación de pago (igual patrón que ya usas con Flow).
- **Requiere internet**; **una terminal en modo PDV por caja**.
- Métodos: débito, crédito, prepago (chip/NFC/banda).

---

## 4. Diseño técnico para Gestionala (multi-tenant)

### 4.1 OAuth de Mercado Pago por comerciante
- App única de Gestionala en MP (client_id / client_secret en env de Vercel; **NO en el repo**).
- Cada dueño conecta SU cuenta MP: botón "Conectar Mercado Pago" → redirect a MP → `code` →
  intercambio por `access_token` + `refresh_token` (grant `authorization_code`).
- Guardar tokens **cifrados** por empresa; refresco automático antes de expirar.
- El dinero de cada venta cae en la **cuenta MP del comerciante** (tú no custodias plata → menos
  riesgo regulatorio).

### 4.2 Modelo de datos (tablas nuevas en Supabase, RLS por tenant)
- `mp_conexiones` — `empresa_id`, `mp_user_id`, `access_token` (cifrado), `refresh_token` (cifrado),
  `expira_en`, `scope`, `estado`.
- `mp_dispositivos` — `empresa_id`, `device_id`, `nombre`, `modo`, `caja_id`/`sucursal`, `estado`.
- `mp_cobros` — `empresa_id`, `payment_intent_id`/`order_id`, `venta_id` (FK), `monto`, `estado`,
  `metodo` (debito/credito), `fee`, `raw` (jsonb), timestamps. Vincula el cobro Point con la venta.
- `metodos_pago`: sembrar uno tipo `mercadopago_point` (el modelo de pagos del POS ya soporta varios
  métodos → `ventas_pagos`).

### 4.3 Backend (Edge Functions Supabase o API routes Next)
- `mp/oauth/callback` — intercambia el `code`, guarda tokens.
- `mp/cobro` — crea el payment intent sobre el `device_id` con el token del comerciante.
- `mp/webhook` — recibe el resultado, marca `mp_cobros`, dispara el registro de la venta. **Rate-limit
  + verificación de firma**, igual que el webhook de Flow (`lib/rate-limit.ts` ya existe).

### 4.4 Encaje con lo que YA tienes
- **POS** (`pos-client.tsx`): el método de pago "Mercado Pago" abre el flujo de cobro Point en vez de
  registrar directo. Al confirmar el webhook → `process_sale` (idempotente por UUID, ya está).
- **Caja**: el pago con tarjeta MP NO entra a `movimientos_caja` de efectivo (igual que hoy los
  métodos no-cash) → no descuadra la caja.
- **Inventario**: `process_sale` ya descuenta stock atómicamente.
- **Comprobante**: `lib/boleta.ts` ya imprime; se le agrega la referencia del pago MP.

### 4.5 Manejo offline (límite real)
- El POS es **offline-first para efectivo**. El cobro **Point exige conexión** (va por la red de MP).
- Regla: si `!navigator.onLine`, deshabilitar "Cobrar con Mercado Pago" (igual que hoy se gatea el
  cobro sin caja). El efectivo sigue funcionando offline.

---

## 5. Fases (MVP acotado — reducir scope)

- **Fase 0 — Validación comercial (SIN código). BLOQUEANTE.**
  Reunión con MP Chile. No avanzar a código sin respuestas a la sección 7.
- **Fase 1 — Cobro básico (núcleo técnico).**
  OAuth por comerciante → vincular 1 device → botón "Cobrar con MP" en el POS → payment intent →
  webhook → registrar venta. **Sin split/fee.** Ingreso de esta fase = markup de suscripción (#1) +
  (si hay acuerdo) reventa de hardware (#3).
- **Fase 2 — Revenue Share / reporting.**
  Panel para Andrés: TPV por comerciante, comisiones estimadas, estado de devices. Si MP confirmó
  `application_fee` presencial (#4), cablearlo; si no, el revenue share (#2) se concilia con el
  reporte de MP.
- **Fase 3 — Pulido.**
  Reembolsos/anulaciones desde el POS, manejo de disputas, multi-terminal por caja, alertas de device
  desconectado.

---

## 6. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| **El acuerdo comercial no cierra** (sin revenue share / sin reventa) | Validar en Fase 0. Si no cierra, queda el markup de suscripción (#1) que ya es negocio. |
| `application_fee` no aplica a Point presencial | No apostar a #4; usar revenue share del Partners Program (#2). |
| Manejo de **tokens OAuth de terceros** (sensible) | Cifrar en reposo, refrescar server-side, scope mínimo, nunca exponer al cliente. |
| **Online-only** confunde al dueño acostumbrado a offline | UX clara: cobro MP deshabilitado sin conexión, mensaje explícito. |
| **Soporte de hardware** recae en ti | Definir con MP quién atiende fallas del lector; guía de troubleshooting en /ayuda. |
| **Certificación MP** (Dev Program) como requisito | Es gratis; hacer la certificación temprano. |
| **Scope creep** (tu talón: proyectos sin terminar) | Cortar en Fase 1. No construir #4/multi-terminal/reembolsos hasta tener tracción. |
| Doble integración de pagos (Flow + MP) a mantener | Son dominios separados (Flow = suscripción de Gestionala; MP = ventas del almacén). No se pisan. |

---

## 7. Qué confirmar con Mercado Pago (Fase 0 — llevar esto a la reunión)

1. **Partners Program / Platform:** ¿a qué nivel entro y cuál es el **% de revenue share**? ¿Aplica al
   **TPV presencial (Point)** o solo a checkout online?
2. **Reventa de hardware:** ¿hay comisión por vender cada Point + bonos por metas? ¿Bajo qué contrato?
3. **`application_fee` / split en Point presencial:** ¿soportado en Chile? ¿O el ingreso por
   transacción va solo por el revenue share del programa?
4. **Habilitación técnica:** ¿mi app puede usar **Point Integration API** + **OAuth marketplace**?
   ¿Hay sandbox/terminales de prueba?
5. **Certificación:** ¿el Dev Program / certificación es requisito para el revenue share?
6. **Operativa:** ¿quién da soporte del lector al comerciante? ¿tiempos de liquidación del dinero?

---

## 8. Estimación gruesa de esfuerzo (orientativa)

- Fase 0: días (gestión comercial, no dev).
- Fase 1 (cobro básico end-to-end): **~2–4 semanas** de dev focalizado (OAuth + devices + payment
  intent + webhook + enganche al POS + tests e2e + 1–2 migraciones).
- Fase 2–3: incremental, según tracción.

---

## 9. Referencias (docs oficiales MP)

- Point Integration API — payment intents (CL): https://www.mercadopago.cl/developers/es/reference/integrations_api/_point_integration-api_devices_deviceid_payment-intents/post
- MP Point — overview e integración: https://www.mercadopago.com.mx/developers/es/docs/mp-point/overview
- Configurar dispositivo en modo PDV: https://www.mercadopago.com.br/developers/es/docs/mp-point/integration-configuration/integrate-with-pdv/configure-devices
- Split de pagos / marketplace (online): https://www.mercadopago.cl/developers/es/docs/checkout-pro/how-tos/integrate-marketplace
- Programa de Partners (Chile): https://www.mercadopago.cl/partners/developers/es
- ¿Qué es el Partners Program?: https://www.mercadopago.cl/ayuda/programa-socios-integradores-desarrolladores_38075
- Comisiones de cobro MP Chile: https://www.mercadopago.cl/ayuda/costo-recibir-pagos-dinero_220
- SDK de referencia (Point): https://github.com/mercadopago/point-android_integration

---

## 10. Prompt de arranque para el otro chat

> Quiero implementar el add-on **Mercado Pago Point** en Gestionala (repo `mypyme`, Next 16 + Supabase
> + Flow). Ya tengo el plan en `docs/12-plan-mercadopago-point.md`. Estado del acuerdo comercial con
> MP: [completar con lo que resulte de la Fase 0]. Empecemos por la **Fase 1** (OAuth por comerciante
> → vincular device → cobro desde el POS → webhook → registrar venta), respetando el modelo de datos y
> el encaje con POS/caja/inventario del plan. Usá plan mode y mostrame el plan antes de codear.
