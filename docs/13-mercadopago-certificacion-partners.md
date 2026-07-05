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

### Fase 1 — Certificación prioritaria (siguiente paso)
- **Candidata: Checkout Pro** como puerta de entrada — es la certificación más estándar/documentada
  del `<dev>program` y no depende de tener hardware Point físico para completarla.
  - **Verificar al entrar al portal** si existe una certificación específica de **Point/POS
    presencial**; si existe y es más directa al objetivo final (cobro con Point desde Gestionala),
    priorizarla en su lugar. No asumir sin confirmar en el portal — la lista de certificaciones
    puede haber cambiado.
- Requisitos a documentar apenas se abra el proceso en el portal (pendiente de confirmar, no
  inventar): cuenta personal verificada, entorno de prueba/sandbox, integración de ejemplo
  funcionando, evidencia de la integración (URL o video, según pida el flujo).
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

**Entrar al portal `<dev>program` de Mercado Pago con la cuenta personal de Andrés y:**
1. Revisar las certificaciones disponibles y confirmar si hay una específica de Point/POS presencial.
2. Elegir Checkout Pro (o la de Point si existe y aplica mejor) y arrancar la integración de prueba.
3. Aprobar la certificación → obtener el Integrator ID.
4. Con el Integrator ID en mano, buscar el canal de contacto con Partners/ejecutivo y llevar las
   preguntas de la Fase 3 (§4).

No hay tarea de código pendiente para esto — es 100% gestión/certificación fuera del repo. El
repo ya tiene el lado técnico listo y gateado esperando el resultado de esta conversación.

---

## 8. Referencias

Mismas que `docs/12-plan-mercadopago-point.md` §9 (Point Integration API, Partners Program Chile,
FAQ del programa de socios). No se repiten aquí para evitar que diverjan dos copias.
