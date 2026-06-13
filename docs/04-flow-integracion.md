# Integración Flow.cl

**Versión:** 1.0 · **Fecha:** 2026-06-13

---

## Flujo de suscripción

```
Registro empresa → Trial gratuito (sin tarjeta)
                    ↓ (al vencer trial o upgrade)
                 Enroll tarjeta vía Widget iframe (PCI DSS compliant)
                    ↓
                 Crear Customer en Flow → crear Subscription → cargos automáticos mensuales
```

---

## Webhook (doble fase obligatoria)

> **Regla:** nunca confiar en el payload directo. Siempre verificar el estado con Flow.

```typescript
// app/api/webhooks/flow/route.ts
export async function POST(request: Request) {
  const body = await request.formData();
  const token = body.get('token') as string;

  // NUNCA confiar en el payload directo. Siempre verificar con Flow.
  const status = await flowClient.payment.getStatus(token);

  if (status.status === 2) {  // pagado
    await supabaseAdmin
      .from('empresas')
      .update({ estado_suscripcion: 'activa' })
      .eq('flow_subscription_id', status.commerceOrder);
  }

  return new Response('OK', { status: 200 });
}
```

---

## Firma HMAC (requerida en cada request a Flow)

```typescript
// lib/flow/signature.ts
export class FlowClient {
  generateSignature(params: Record<string, string>): string {
    const paramsToSign = { apiKey: this.apiKey, ...params };
    const sorted = Object.keys(paramsToSign).sort();
    const stringToSign = sorted.map(k => k + paramsToSign[k]).join('');
    return createHmac('sha256', this.secretKey).update(stringToSign).digest('hex');
  }
}
```

---

## Estados de suscripción mapeados en `empresas`

| Estado interno | Origen Flow | Significado |
|----------------|-------------|-------------|
| `trial` | status=2 | Período de prueba (sin tarjeta) |
| `activa` | status=1 | Suscripción activa |
| `morosa` | morose=1 | Pago fallido |
| `cancelada` | status=4 | Cancelación |

> **Nota de implementación:** agregar columna `flow_subscription_id` a `empresas`
> (no está en el esquema base — añadir en migración de Fase 6).
