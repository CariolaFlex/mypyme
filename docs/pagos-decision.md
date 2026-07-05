# Pagos con máquina / celular — decisión de camino

**Fecha:** 2026-07-04 · **Estado:** decidido (revisitar tras feedback de usuarios reales)

## Contexto

Andrés quiere que la plataforma quede lista para cobrar con máquinas o evaluar un
sistema propio de pagos por celular. Opciones sobre la mesa: integrar más
procesadores, usar apps de "tap to phone" existentes, o construir un sistema propio.

## Lo que YA existe en mypyme

- **Mercado Pago Point** integrado (OAuth + webhook + cobro desde el POS + reporte
  por comerciante) — commits `baf54a6`, `0f19041`. Es la máquina dominante en
  micro-comercios chilenos.
- **Flow** para las suscripciones de la plataforma (webhook activo).
- Métodos de pago manuales en el POS (efectivo, transferencia, débito/crédito
  registrados a mano).

## Decisión (reducción de scope)

1. **NO construir un sistema de pagos propio.** Procesar pagos requiere licencia
   de operador (CMF en Chile), certificación PCI-DSS, adquirencia bancaria y
   antifraude — es una empresa completa, no un módulo. Riesgo/costo totalmente
   fuera de escala para un SaaS de micro-comercios.
2. **Camino corto (recomendado):** exprimir MP Point que ya está integrado —
   es la vía "tap to phone" real en Chile: la app de Mercado Pago convierte el
   celular del comerciante en POS NFC y nuestra integración Point ya registra
   esos cobros. Completar las fases pendientes del plan MP (ver
   `docs/` plan de factibilidad, commit `06eecf0`) antes de sumar nada nuevo.
3. **Si un cliente pide otra máquina:** evaluar SumUp / Compraquí / Tuu por API
   solo cuando exista demanda real (hoy ninguna tiene la penetración de MP en
   el segmento objetivo).

## Próximo paso concreto

Terminar y probar en terreno el flujo MP Point del POS con un comercio real.
Recién después decidir si se necesita un segundo procesador.
