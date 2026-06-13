# Arquitectura de la Aplicación

**Versión:** 1.0 · **Fecha:** 2026-06-13 · **Framework:** Next.js 15 (App Router)

---

## Estructura de carpetas

```
app/
├── (auth)/
│   ├── login/
│   └── register/
├── (dashboard)/
│   ├── layout.tsx          ← sidebar + top nav, protegido por middleware
│   ├── page.tsx            ← Dashboard principal (resumen del día)
│   ├── pos/
│   │   └── page.tsx        ← POS táctil en tiempo real
│   ├── caja/
│   │   ├── apertura/
│   │   ├── cierre/
│   │   └── historial/
│   ├── inventario/
│   │   ├── productos/
│   │   ├── categorias/
│   │   ├── movimientos/
│   │   └── ajustes/
│   ├── compras/
│   │   ├── ordenes/
│   │   └── proveedores/
│   ├── gastos/
│   ├── reportes/
│   │   ├── ventas/
│   │   ├── caja/
│   │   ├── inventario/
│   │   └── iva/
│   └── configuracion/
│       ├── negocio/
│       ├── usuarios/
│       ├── metodos-pago/
│       └── suscripcion/
├── api/
│   ├── webhooks/
│   │   └── flow/           ← webhook Flow.cl (doble fase: token → getStatus)
│   └── sii/                ← futuro: integración DTE (v2+)
└── middleware.ts            ← protección de rutas, validación JWT
```

---

## Módulos por pantalla

### Dashboard
Resumen del día: ventas totales, ventas por método de pago, sesión de caja activa,
alertas de stock bajo, últimas ventas.

### POS
Pantalla táctil optimizada para móvil/tablet:
- Catálogo con búsqueda/filtro por categoría
- Carrito con cantidades editables
- Selección de método de pago (uno o múltiples)
- Cálculo de vuelto automático
- Botón "Cobrar" → escribe en Dexie → sync en background
- Indicador offline visible cuando no hay red
- `"use client"` + `next/dynamic { ssr: false }` para todo lo de Dexie

### Caja
Apertura con monto inicial, cierre con conteo real, cuadratura automática
(esperado vs contado), historial de sesiones.

### Inventario
CRUD productos, categorías jerárquicas, vista de stock por bodega (calculado desde
movimientos), registro de mermas, alertas de stock bajo.

### Compras
Órdenes de compra (borrador → aprobada → recibida), recepción parcial de mercadería
que genera movimientos de inventario automáticamente, cuentas por pagar con vencimientos.

### Gastos
Registro de gastos con categorías, soporte IVA configurable, vinculación opcional a
proveedor o sesión de caja.

### Reportes
Ventas por período/método de pago/producto, estado de caja, rotación de inventario,
resumen IVA débito/crédito para F29.

### Configuración
Datos del negocio, IVA on/off, gestión de usuarios y roles, métodos de pago, plan y
suscripción.
