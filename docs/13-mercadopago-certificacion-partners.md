# Mercado Pago — Certificación, Integrator ID y Partners (ruta persona natural)

**Fecha:** 2026-07-05 · **Estado:** decisión tomada, ejecución pendiente
**Reemplaza el supuesto societario** de `docs/12-plan-mercadopago-point.md` §5 Fase 0 y de las
menciones a "Vectium SpA" como parte comercial en el contexto de Mercado Pago. Este documento es
la fuente de verdad para la ruta de certificación/partners; `docs/12-plan-mercadopago-point.md`
sigue siendo la fuente de verdad para el **diseño técnico** (ya implementado y gateado).

---

## 1. Estado societario real (hecho confirmado)

- **Vectium SpA no está formalizada a favor de Andrés.** Hoy Andrés **no tiene acciones** de Vectium.
- El socio **Joaquín** es quien legalmente aparece hoy en Vectium.
- La diligencia/formalización societaria completa (reparto de acciones, etc.) se **postergó a
  propósito**: no hay ingresos reales todavía, tiene costo, y no se justifica antes de validar el
  modelo de negocio.
- Esto es una decisión, no un olvido. No se apura solo porque Mercado Pago pida "razón social".

**Corrección importante:** otros documentos del repo (`00-plan-maestro.md`, `07-tributario-operacion.md`,
`08-estado-actual.md`) mencionan "Vectium" como si la operación ya corriera bajo esa SpA de forma
resuelta para Andrés. Eso describe la intención/marca del producto (Gestionala se comercializa bajo
Vectium), **no el estado accionario de Andrés**. Se agregó una nota aclaratoria en esos documentos
apuntando aquí. No se reescribió toda la narrativa societaria del proyecto porque no es necesario:
el punto crítico es específicamente **no presentarse ante Mercado Pago como una SpA cerrada** hasta
que la formalización exista.

---

## 2. Decisión operativa actual

**Avanzar como persona natural, no como Vectium SpA.**

Concretamente:
- Usar la **cuenta personal de Mercado Pago** de Andrés (no una cuenta empresa).
- Certificarse en el `<dev>program` como **desarrollador individual**.
- Obtener el **Integrator ID** personal a partir de la primera certificación aprobada.
- Usar ese Integrator ID para abrir la conversación con Partners / un ejecutivo de MP.
- **Postergar** la estructuración empresarial (cuenta empresa, contrato bajo SpA, recertificación)
  hasta que haya validación comercial, ingresos, o un requisito contractual real que lo exija.

## 3. Por qué esta decisión (no es improvisada)

| # | Razón | Fuente |
|---|-------|--------|
| A | El **Integrator ID** se genera automáticamente tras la primera certificación aprobada y queda asociado al **usuario/cuenta** de MP — no a una empresa. Certificarse como persona natural es viable. | Docs oficiales `<dev>program` |
| B | El Partners Program está explícitamente pensado también para **desarrolladores individuales**: gratuito, basta con **una certificación aprobada** para participar. | Landing pública del Partners Program |
| C | Presentarse hoy como "SpA cerrada" sería incoherente: si un ejecutivo pide razón social, representación legal, titularidad o facturación, Andrés no puede responder eso como Vectium sin generar un problema (no es accionista). | Estado societario §1 |
| D | La certificación personal **no se pierde** aunque después se migre a cuenta empresa: sirve para aprender el proceso real, destrabar el Integrator ID, y abrir la conversación con Partners ya. Reduce incertidumbre antes de gastar en formalizar la SpA. | — |
| E | El cuello de botella hoy **no es técnico** (Fase 1 del POS con MP Point ya está construida y gateada). Es comercial/estratégico: revenue share, si aplica a Point presencial, si hay `application_fee`/bonificación real, y si el acuerdo compensa seguir invirtiendo. | `docs/12-plan-mercadopago-point.md` §2, §6 |

---

## 4. Flujo actualizado

### Fase 0 — Alineación documental ✅ (esta tarea, 2026-07-05)
- Corregido el supuesto de "operación bajo Vectium SpA" en el contexto de Mercado Pago.
- Documentado el estado societario real y la decisión de avanzar como persona natural.
- `docs/12-plan-mercadopago-point.md` actualizado para reflejar esto en su Fase 0 y en la lista de
  preguntas para el ejecutivo.

### Fase 1 — Certificación prioritaria — ✅ EN CURSO (2026-07-05, confirmado en el portal)
- **Confirmado en el portal:** las únicas 3 certificaciones ofrecidas hoy son **Checkout Pro,
  WooCommerce y Adobe Commerce**. **No existe una certificación específica de Point/POS presencial.**
  Se descarta la duda de la Fase 1 original — **Checkout Pro es la única opción aplicable** (requisitos:
  API REST y GitHub, PHP/.NET/Java/Node.js, configuración básica de servidores — Node.js encaja
  directo con el stack de Andrés).
- **Cómo funciona el desafío (confirmado, portal "Bienvenida"):** hay que resolver un desafío práctico
  de integración de Checkout Pro en **una tienda online creada por Andrés** (no en mypyme/Gestionala
  — es un ejercicio aparte, ver nota de alcance más abajo). Se simula un pago con credenciales y
  usuarios de prueba (comprador/vendedor) + una tarjeta de prueba que MP entrega. Cada pago simulado
  genera un **Payment ID único**; en la última etapa se envía ese Payment ID para validar que la
  integración cumple las especificaciones.
- **6 etapas del flujo del desafío:** 1) Bienvenida, 2) Contexto del desafío, 3) Prepara tu ambiente,
  4) Configura tu integración, 5) Simula un pago, 6) Resultado. **Hoy completada la etapa 1.**
  Pendiente avanzar 2→6 en el portal para obtener las credenciales/specs exactas — no se inventan
  aquí porque MP las genera específicas para este desafío.
- **Conceptos confirmados que exige el desafío:**
  - **Cuenta de prueba:** simulan cuentas reales de MP para probar sin dinero real.
  - **Credenciales de prueba** (Access Token + Public Key) para simular; **las de producción se usan
    después, ya con la cuenta real, para cobrar de verdad.**
  - **Integrator ID:** para este desafío, MP entrega un ID específico que hay que configurar en la
    integración (distinto del Integrator ID final del programa, que se emite recién al aprobar).
  - **Payment ID:** identifica cada pago simulado; el que se envía al final para validar.
  - **Access Token** (backend, privado, nunca en el cliente) y **Public Key** (frontend, cifra datos
    de tarjeta).
- **Criterios de evaluación confirmados (6):** 1) Integrator ID del desafío configurado en la
  integración, 2) datos del producto de la compra simulada según especificación, 3) medios de pago
  del Checkout configurados según especificación, 4) manejo correcto de **páginas/URLs de retorno**
  (back_urls), 5) **webhook de notificaciones** funcionando (recibir actualizaciones de estado de
  pago en tiempo real), 6) campo **`external_reference`** de la preferencia configurado correctamente
  (identifica la transacción).
- **Nota de alcance/dónde vive el código de este desafío (decisión, no bloquea):** este ejercicio de
  certificación **no es una feature de Gestionala/mypyme** — es un checkout de prueba personal de
  Andrés. Para no mezclar código de certificación con el producto multi-tenant, se construirá **aislado
  dentro de este mismo repo pero fuera de las rutas del producto** (ej. `app/mp-cert-checkout-pro/` +
  1–2 API routes dedicadas, sin tocar tablas/tenants/RLS existentes, con sus propias env vars
  `MP_CERT_*` distintas de `MP_CLIENT_ID/SECRET` de Point), aprovechando que el dominio ya está
  desplegado en Vercel (evita crear y desplegar un proyecto nuevo solo para esto — más rápido). Se
  elimina o se deja inerte después de aprobar la certificación. **Esto se construye recién cuando
  Andrés pegue el contenido de las etapas 2–4** (ahí vienen las credenciales de prueba y el detalle
  exacto del producto/monto/flujo a simular — no hay que inventarlos).
- Entregable de esta fase: certificación aprobada + captura/constancia guardada en
  `docs/` (o carpeta de evidencia) para referencia futura.

### Fase 2 — Obtener el Integrator ID
- Objetivo inmediato y medible: **una certificación aprobada → Integrator ID emitido.**
- Guardar el Integrator ID (no es secreto de credenciales, pero tratarlo como dato de cuenta:
  no commitear en el repo público si el repo llegara a ser público; hoy es privado, no bloquea).

### Fase 3 — Contacto con ejecutivo / Partners
- **Canal:** el que indique el propio `<dev>program` tras la certificación (típicamente centro de
  partners / formulario de contacto ligado al Integrator ID). Confirmar al llegar ahí.
- **Pitch actualizado** (persona natural, honesto sobre el estado societario):
  - Gestionala: SaaS POS para micro-comercios en Chile, ya en producción con clientes reales.
  - Mercado Pago Point ya integrado técnicamente en el POS (OAuth por comerciante, cobro desde el
    POS, webhook, reporte por comerciante) — **Fase 1 y Fase 2 inc.1/2 del plan técnico ya
    construidas**, gateadas hasta tener credenciales de producción.
  - Hoy certificando como desarrollador individual; la vía empresa (Vectium SpA) es una fase
    posterior, a definir según cómo resulte esta conversación.
- **Preguntas clave a llevar** (fusiona las de `docs/12-plan-mercadopago-point.md` §7 con las nuevas
  de identidad/migración):
  1. ¿A qué nivel de Partners Program entro y cuál es el **% de revenue share**? ¿Aplica al **TPV
     presencial (Point)** o solo a checkout online?
  2. ¿Hay comisión por reventa de hardware (Point) + bonos por metas? ¿Bajo qué contrato?
  3. ¿`application_fee`/split de pagos está soportado en **Point presencial en Chile**, o el ingreso
     por transacción va solo por el revenue share del programa?
  4. ¿Mi app puede usar **Point Integration API + OAuth marketplace**? ¿Hay sandbox/terminales de
     prueba disponibles para seguir probando?
  5. ¿La certificación es requisito obligatorio para acceder al revenue share, o solo para el sello
     del programa?
  6. ¿Quién da soporte del lector al comerciante final? ¿Tiempos de liquidación del dinero cobrado?
  7. **(Nueva) Si me certifico y avanzo como persona natural ahora, ¿cómo se migra esto cuando
     formalice la SpA más adelante?**
     - ¿Se puede **migrar el Integrator ID** de cuenta personal a cuenta empresa, o hay que sacar
       uno nuevo?
     - ¿Se puede **cambiar el titular** de un acuerdo de partners ya firmado?
     - ¿Hay que **recertificar** bajo la cuenta empresa, o la certificación aprobada vale para
       cualquier titularidad futura?
     - ¿Afecta esto el revenue share ya devengado o el nivel de partner alcanzado?

### Fase 4 — Decisión comercial antes de seguir invirtiendo en desarrollo
- **No seguir construyendo** Fase 2 inc. `application_fee`/split, ni Fase 3 (reembolsos, disputas,
  multi-terminal) del plan técnico hasta tener respuesta de Partners a las preguntas de la Fase 3
  de este documento.
- Lo ya construido (Fase 1 técnica: OAuth + cobro + webhook + reporte) queda como está — gateado,
  sin credenciales de producción, cero riesgo, listo para activar apenas el acuerdo cierre.
- Si el revenue share **no aplica a Point presencial** o no compensa, el negocio de Mercado Pago
  para Gestionala se reduce al markup de suscripción (#1 en `docs/12-plan-mercadopago-point.md` §2),
  que ya es viable por sí solo y no depende de este proceso.

---

## 5. Qué NO hay que seguir afirmando (correcciones aplicadas)

- ❌ "La cuenta y certificación de Mercado Pago serán bajo Vectium SpA desde el inicio."
- ❌ "Vectium SpA es la contraparte legal en la conversación con el ejecutivo de Partners."
- ❌ Tratar la formalización societaria como un trámite ya resuelto o inminente.
- ✅ En su lugar: persona natural ahora, empresa como fase posterior condicionada a validación
  comercial + ingresos reales.

## 6. Riesgos y preguntas abiertas

| Riesgo / pregunta abierta | Estado |
|---|---|
| No está confirmado si el Integrator ID/acuerdo de partners es migrable a una cuenta empresa sin fricción | **Pendiente de validar con ejecutivo** (Fase 3, pregunta 7) |
| No está confirmado si existe una certificación específica para Point (vs. Checkout Pro genérico) | **Pendiente de revisar en el portal** al iniciar Fase 1 |
| El revenue share podría no aplicar a TPV presencial | **Pendiente de confirmar** (pregunta 1 y 3) — riesgo ya señalado en `docs/12-plan-mercadopago-point.md` |
| Si la formalización de Vectium se demora mucho y el acuerdo de partners queda "personal" por default | Aceptado como riesgo bajo: no bloquea nada hoy; se revisa cuando haya ingresos reales |

## 7. Próxima acción concreta inmediata

**Estado (2026-07-05): ya se descartó Point como certificación (no existe) y se avanzó a la etapa 1
"Bienvenida" de Checkout Pro.** Siguiente paso de Andrés en el portal:

1. Click "Próximo" y avanzar las etapas **2) Contexto del desafío, 3) Prepara tu ambiente, 4) Configura
   tu integración** — pegar el contenido de esas pantallas para tener las credenciales de prueba, el
   Integrator ID del desafío, y la especificación exacta del producto/flujo a simular.
2. Con eso confirmado (no antes, para no inventar specs), Claude Code construye la integración
   aislada (`app/mp-cert-checkout-pro/`, ver Fase 1 arriba) en este repo.
3. Etapa 5: simular el pago con la tarjeta de prueba → obtener el Payment ID.
4. Etapa 6: enviar el Payment ID → esperar el resultado de la certificación.
5. Al aprobar → se emite el **Integrator ID real del programa** → con eso, buscar el canal de contacto
   con Partners y llevar las preguntas de la Fase 3.

Hasta el punto 1 (pegar etapas 2–4) no hay código que escribir — inventar specs de credenciales o
producto violaría la regla de "no inventar datos no confirmados".

---

## 8. Referencias

Mismas que `docs/12-plan-mercadopago-point.md` §9 (Point Integration API, Partners Program Chile,
FAQ del programa de socios). No se repiten aquí para evitar que diverjan dos copias.
