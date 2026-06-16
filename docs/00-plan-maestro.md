# Plan Maestro — SaaS Pymes Chile

**Versión:** 1.0 · **Fecha:** 2026-06-13 · **Autor:** Andrés Cariola (Vectium SpA)

> Documento fuente de verdad. Las decisiones técnicas están cerradas (ver `01-decisiones-tecnicas.md`).
> No se vuelven a cuestionar salvo cambio explícito registrado en el historial de versiones.

---

## Índice de documentos

| Doc | Contenido |
|-----|-----------|
| [00-plan-maestro.md](00-plan-maestro.md) | Este archivo — resumen ejecutivo e índice |
| [01-decisiones-tecnicas.md](01-decisiones-tecnicas.md) | Stack, arquitectura multi-tenant, offline, reglas RLS |
| [02-modelo-datos.md](02-modelo-datos.md) | Esquema SQL completo + índices |
| [03-arquitectura-app.md](03-arquitectura-app.md) | Estructura Next.js, módulos por pantalla |
| [04-flow-integracion.md](04-flow-integracion.md) | Suscripciones y webhooks Flow.cl |
| [05-modelo-comercial.md](05-modelo-comercial.md) | Planes, precios, proyecciones |
| [06-roadmap.md](06-roadmap.md) | Fases 0–9 con entregables |
| [07-tributario-operacion.md](07-tributario-operacion.md) | Régimen, IVA, obligaciones SII del SaaS |
| [08-estado-actual.md](08-estado-actual.md) | **Estado actual / punto de continuación (handoff)** |

---

## Diagnóstico y oportunidad

Gap de mercado real y cuantificado. Ninguna plataforma chilena bajo ~$20.000 CLP/mes
ofrece simultáneamente **POS táctil + control de caja + inventario + cumplimiento
tributario básico** orientado a micro-gastronómicos.

| Competidor | Precio | Limitación |
|------------|--------|------------|
| Bsale | $76.000 CLP | Caro para micro |
| Toteat | $40.000 CLP + comisión | El "barato con features reales" |
| Haulmer / TUU | Bajo | Sin gestión real |

Segmento "micro-comercio / almacén que recién parte": **desatendido**.

**Primer cliente confirmado:** mini almacén de una amiga (vende galletas, dulces, bebidas,
jugos, etc.) — acceso gratuito a cambio de ser beta tester y caso de estudio. Elimina el
riesgo de "producto sin usuario real" en v1.

---

## Resumen ejecutivo

- **Qué se construye:** SaaS B2B para micro-PyMEs gastronómicas chilenas — POS táctil
  con offline, caja, inventario, compras, gastos y reportes. Tributariamente correcto
  para Chile.
- **Por qué gana:** único producto bajo ~$10K CLP/mes con POS real + inventario + path
  a SII DTE. El más barato con features reales es Toteat a $40K+.
- **Cómo se monetiza:** suscripciones recurrentes automáticas vía Flow.cl. Onboarding
  autoservicio, sin venta activa.
- **Riesgo principal mitigado:** la amiga (dueña de un mini almacén) es usuaria real desde el día 1.
- **Timeline a lanzamiento público:** ~17 semanas full-time (≈6 meses a tiempo parcial).
- **Próximo paso inmediato:** ejecutar Fase 0 (ver `06-roadmap.md`).
