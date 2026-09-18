<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Necesito diseñar el modelo de datos (esquema de base de datos Postgres) para un SaaS de gestión de PyMEs chilenas, multi-tenant, que incluye estos módulos: punto de venta (POS), control de caja, inventario, proveedores, órdenes de compra, cuentas por pagar, gastos, y reportes. Requisitos:

1. Multi-tenant: todo asociado a un negocio (tenant_id).
2. IVA configurable: cada negocio decide si trabaja con IVA, y cada transacción (venta, gasto, compra) debe poder separar neto, IVA y total, o no, según configuración.
3. POS en vivo: ventas con múltiples ítems, métodos de pago, cálculo de vuelto.
4. Caja: apertura, cierre, cuadratura diaria.
5. Inventario: productos, stock, categorías, mermas, alertas de stock bajo.
6. Proveedores: catálogo, órdenes de compra, cuentas por pagar.
7. Gastos categorizados.
8. Roles: admin y empleado.

Entrégame el esquema completo de tablas con sus columnas, tipos, relaciones (claves foráneas) y un diagrama entidad-relación descrito en texto. Explica las decisiones de diseño clave, especialmente cómo manejas el IVA configurable y la integridad entre inventario y ventas. Prioriza un diseño limpio, normalizado y escalable.

Te propongo un esquema multi-tenant con `tenant_id` en todas las tablas de negocio, IVA configurable por negocio y un modelo de inventario basado en movimientos para mantener integridad con ventas y compras.[^1][^2][^3][^4]

***

## Visión general del modelo

- Enfoque multi-tenant: **shared schema + columna `tenant_id` en todas las tablas** relevantes, con índices que comienzan por `tenant_id` para aislar datos y escalar fácil en un solo cluster Postgres.[^1][^4][^5]
- IVA: cada transacción (ventas, compras, gastos) guarda explícitamente `net_amount`, `vat_amount`, `total_amount` y `vat_rate` para no depender de reglas futuras (las tasas y fórmulas de impuestos cambian con el tiempo).[^6][^3]
- Inventario: se maneja vía **movimientos de stock entre ubicaciones** (entrada, salida, merma, transferencia, etc.), en lugar de “sumas directas”; el stock actual se calcula como la suma de movimientos por producto y ubicación.[^2][^7][^8]

A continuación, detallo tablas, columnas y relaciones, seguido por un ERD textual y las decisiones de diseño clave.

***

## Núcleo multi-tenant y usuarios

### Tabla `tenants` (negocios)

```sql
tenants (
  id              uuid PK DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  rut             text,               -- opcional, RUT del negocio
  email           text,
  phone           text,
  address         text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
)
```


### Tabla `users`

```sql
users (
  id              uuid PK DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  email           text UNIQUE NOT NULL,
  password_hash   text NOT NULL,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
)
```


### Tabla `user_tenant_roles` (multi-tenant + roles admin/empleado)

```sql
user_tenant_roles (
  id              uuid PK DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id),
  user_id         uuid NOT NULL REFERENCES users(id),
  role            text NOT NULL CHECK (role IN ('admin', 'employee')),
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
)
```

> Con esto soportas un usuario que puede estar en varias PyMEs y con rol distinto por negocio.

***

## Configuración de negocio e IVA

### Tabla `business_settings`

```sql
business_settings (
  id                      uuid PK DEFAULT gen_random_uuid(),
  tenant_id               uuid NOT NULL UNIQUE REFERENCES tenants(id),
  use_vat                 boolean NOT NULL DEFAULT true,        -- ¿trabaja con IVA?
  default_vat_rate        numeric(5,2) NOT NULL DEFAULT 19.00,  -- p.ej. 19.00 = 19%
  prices_include_vat      boolean NOT NULL DEFAULT true,        -- para POS
  currency_code           text NOT NULL DEFAULT 'CLP',
  low_stock_global_threshold integer,                           -- fallback
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
)
```


### Idea clave IVA

- En **cada encabezado y detalle** de venta, compra y gasto se guardan:
    - `net_amount` (monto neto),
    - `vat_amount` (IVA),
    - `total_amount` (total).
- `vat_rate` se guarda por línea (no solo por encabezado) para soportar productos exentos o con tasa distinta.
- Si `use_vat = false`, simplemente se guarda `vat_rate = 0`, `vat_amount = 0` y `net_amount = total_amount`.

Esto sigue la recomendación de guardar los valores calculados (no solo la tasa) porque las tasas y reglas cambian.[^3][^9]

***

## Catálogo de productos e inventario

### Tabla `product_categories`

```sql
product_categories (
  id              uuid PK DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id),
  name            text NOT NULL,
  parent_id       uuid REFERENCES product_categories(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
)
```


### Tabla `products`

```sql
products (
  id              uuid PK DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id),
  sku             text NOT NULL,
  name            text NOT NULL,
  description     text,
  category_id     uuid REFERENCES product_categories(id),
  unit_of_measure text NOT NULL DEFAULT 'unit',  -- unidad, kg, etc.
  track_inventory boolean NOT NULL DEFAULT true,
  is_active       boolean NOT NULL DEFAULT true,

  -- precios base (lado ventas)
  default_price_net        numeric(14,2),   -- precio de lista sin IVA
  default_price_total      numeric(14,2),   -- precio con IVA (si manejas prices_include_vat)
  default_vat_rate         numeric(5,2),    -- puede ser distinto al default del negocio

  -- umbrales de stock
  min_stock_level          numeric(14,2),   -- para alertas de stock bajo
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, sku)
)
```


### Tabla `warehouses` (bodegas/sucursales)

```sql
warehouses (
  id              uuid PK DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id),
  name            text NOT NULL,
  code            text,
  address         text,
  is_default      boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
)
```


### Tabla `inventory_adjustments` (cabecera de ajustes/mermas)

```sql
inventory_adjustments (
  id              uuid PK DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id),
  warehouse_id    uuid NOT NULL REFERENCES warehouses(id),
  user_id         uuid REFERENCES users(id),
  reason          text NOT NULL,           -- inventario inicial, ajuste, merma, conteo, etc.
  comment         text,
  status          text NOT NULL CHECK (status IN ('draft', 'confirmed', 'cancelled')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  confirmed_at    timestamptz
)
```


### Tabla `inventory_movements` (doble entrada de stock)

```sql
inventory_movements (
  id              uuid PK DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id),

  product_id      uuid NOT NULL REFERENCES products(id),
  warehouse_id    uuid NOT NULL REFERENCES warehouses(id),

  quantity        numeric(14,3) NOT NULL,  -- positivo = entrada, negativo = salida
  unit_cost       numeric(14,4),           -- costo unitario para movimientos de compra/ajuste
  total_cost      numeric(14,2),

  movement_type   text NOT NULL CHECK (
                     movement_type IN (
                       'sale',
                       'sale_return',
                       'purchase',
                       'purchase_return',
                       'adjustment',
                       'waste',
                       'transfer_in',
                       'transfer_out'
                     )
                   ),

  -- enlaces opcionales a origen
  pos_sale_line_id        uuid REFERENCES pos_sale_lines(id),
  purchase_order_line_id  uuid REFERENCES purchase_order_lines(id),
  inventory_adjustment_id uuid REFERENCES inventory_adjustments(id),

  occurred_at     timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
)
```

> El stock disponible se calcula como `SUM(quantity)` agrupado por `tenant_id, product_id, warehouse_id`. Entradas positivas (compras, transfer_in, ajustes de aumento) y salidas negativas (ventas, mermas, transfer_out).[^2][^7][^8]

No necesitas tabla de “stock actual”; puedes materializarla en una vista o tabla caché para performance.

***

## POS: ventas, items, pagos y vuelto

### Tabla `payment_methods`

```sql
payment_methods (
  id              uuid PK DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id),
  name            text NOT NULL,       -- Efectivo, Débito, Crédito, Transferencia, etc.
  type            text,                -- cash, card, transfer, other
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
)
```


### Tabla `cash_drawers` (cajas físicas/terminales)

```sql
cash_drawers (
  id              uuid PK DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id),
  name            text NOT NULL,       -- Caja 1, Caja 2, POS móvil, etc.
  warehouse_id    uuid REFERENCES warehouses(id), -- para vincular a sucursal
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
)
```


### Tabla `cash_sessions` (apertura/cierre de caja)

```sql
cash_sessions (
  id              uuid PK DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id),

  cash_drawer_id  uuid NOT NULL REFERENCES cash_drawers(id),
  user_open_id    uuid NOT NULL REFERENCES users(id),
  user_close_id   uuid REFERENCES users(id),

  open_at         timestamptz NOT NULL,
  close_at        timestamptz,
  opening_amount  numeric(14,2) NOT NULL,
  closing_amount  numeric(14,2),           -- contado real al cierre
  expected_amount numeric(14,2),           -- calculado por el sistema
  status          text NOT NULL CHECK (status IN ('open', 'closed', 'cancelled')),

  created_at      timestamptz NOT NULL DEFAULT now()
)
```


### Tabla `pos_sales` (encabezado de venta POS)

```sql
pos_sales (
  id              uuid PK DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id),

  cash_session_id uuid REFERENCES cash_sessions(id),
  warehouse_id    uuid REFERENCES warehouses(id), -- de dónde sale el stock
  user_id         uuid REFERENCES users(id),      -- cajero

  receipt_number  text,                           -- folio / número boleta interno
  sale_date       timestamptz NOT NULL DEFAULT now(),

  -- montos totales de la venta
  net_amount      numeric(14,2) NOT NULL,
  vat_amount      numeric(14,2) NOT NULL DEFAULT 0,
  total_amount    numeric(14,2) NOT NULL,

  -- para cálculo de vuelto
  amount_due      numeric(14,2) NOT NULL,         -- normalmente = total_amount
  amount_received numeric(14,2) NOT NULL,         -- suma de pagos ingresados
  change_given    numeric(14,2) NOT NULL DEFAULT 0,

  status          text NOT NULL CHECK (status IN ('open', 'completed', 'cancelled')),
  created_at      timestamptz NOT NULL DEFAULT now()
)
```


### Tabla `pos_sale_lines` (detalle ítems de venta)

```sql
pos_sale_lines (
  id              uuid PK DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id),

  pos_sale_id     uuid NOT NULL REFERENCES pos_sales(id),
  product_id      uuid NOT NULL REFERENCES products(id),

  quantity        numeric(14,3) NOT NULL,
  unit_price_net  numeric(14,4) NOT NULL,
  unit_price_total numeric(14,4) NOT NULL,   -- si trabajas con precios con IVA
  discount_amount numeric(14,2) NOT NULL DEFAULT 0,

  vat_rate        numeric(5,2) NOT NULL DEFAULT 0,  -- p.ej. 19.00
  net_amount      numeric(14,2) NOT NULL,
  vat_amount      numeric(14,2) NOT NULL DEFAULT 0,
  total_amount    numeric(14,2) NOT NULL,

  created_at      timestamptz NOT NULL DEFAULT now()
)
```

> Cada línea de venta confirmada genera un `inventory_movements` con `movement_type = 'sale'`, `quantity` negativa y `unit_cost` según tu método de costo (promedio, FIFO, etc.).

### Tabla `pos_payments` (múltiples métodos de pago por venta)

```sql
pos_payments (
  id              uuid PK DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id),

  pos_sale_id     uuid NOT NULL REFERENCES pos_sales(id),
  payment_method_id uuid NOT NULL REFERENCES payment_methods(id),

  amount          numeric(14,2) NOT NULL,  -- monto aplicado a este método
  received_amount numeric(14,2) NOT NULL,  -- lo que entrega el cliente en este método
  change_amount   numeric(14,2) NOT NULL DEFAULT 0, -- opcional, si quieres dividir el vuelto

  created_at      timestamptz NOT NULL DEFAULT now()
)
```

> El cálculo de vuelto típico: `total_received = SUM(received_amount)` y `change = total_received - amount_due`. Puedes guardar el vuelto solo en `pos_sales.change_given` y usar `pos_payments` solo como breakdown por método.

***

## Control de caja y cuadratura diaria

Además de `cash_sessions`, necesitas registrar movimientos de caja (entradas/salidas) para poder cuadrar con las ventas y gastos.

### Tabla `cash_movements`

```sql
cash_movements (
  id              uuid PK DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id),

  cash_session_id uuid NOT NULL REFERENCES cash_sessions(id),
  type            text NOT NULL CHECK (type IN ('sale', 'expense', 'ap_payment', 'manual_in', 'manual_out')),
  amount          numeric(14,2) NOT NULL,  -- positivo = entra caja, negativo = sale

  -- referencias opcionales a documentos origen
  pos_payment_id  uuid REFERENCES pos_payments(id),
  expense_id      uuid REFERENCES expenses(id),
  ap_payment_id   uuid REFERENCES ap_payments(id),

  description     text,
  occurred_at     timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
)
```

> La cuadratura diaria se basa en sumar `cash_movements` por `cash_session_id` y comparar con `expected_amount`/`closing_amount` de la sesión.

***

## Proveedores, órdenes de compra y cuentas por pagar

### Tabla `suppliers`

```sql
suppliers (
  id              uuid PK DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id),

  name            text NOT NULL,
  rut             text,
  email           text,
  phone           text,
  address         text,
  is_active       boolean NOT NULL DEFAULT true,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
)
```


### Tabla `purchase_orders` (OC)

```sql
purchase_orders (
  id              uuid PK DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id),

  supplier_id     uuid NOT NULL REFERENCES suppliers(id),
  warehouse_id    uuid REFERENCES warehouses(id),
  user_id         uuid REFERENCES users(id),

  order_number    text,
  order_date      date NOT NULL,
  expected_date   date,

  net_amount      numeric(14,2) NOT NULL,
  vat_amount      numeric(14,2) NOT NULL DEFAULT 0,
  total_amount    numeric(14,2) NOT NULL,

  status          text NOT NULL CHECK (status IN ('draft', 'approved', 'partially_received', 'received', 'cancelled')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
)
```


### Tabla `purchase_order_lines`

```sql
purchase_order_lines (
  id              uuid PK DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id),

  purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id),
  product_id      uuid NOT NULL REFERENCES products(id),

  quantity        numeric(14,3) NOT NULL,
  unit_cost_net   numeric(14,4) NOT NULL,
  unit_cost_total numeric(14,4) NOT NULL,

  vat_rate        numeric(5,2) NOT NULL DEFAULT 0,
  net_amount      numeric(14,2) NOT NULL,
  vat_amount      numeric(14,2) NOT NULL DEFAULT 0,
  total_amount    numeric(14,2) NOT NULL,

  received_quantity numeric(14,3) NOT NULL DEFAULT 0,

  created_at      timestamptz NOT NULL DEFAULT now()
)
```

> Cada recepción de compra confirmada crea movimientos en `inventory_movements` con `movement_type='purchase'`, `quantity` positiva y `unit_cost` = costo de compra.

### Tabla `ap_bills` (documentos de cuentas por pagar)

```sql
ap_bills (
  id              uuid PK DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id),

  supplier_id     uuid NOT NULL REFERENCES suppliers(id),
  purchase_order_id uuid REFERENCES purchase_orders(id),

  bill_number     text NOT NULL,      -- número de factura
  bill_date       date NOT NULL,
  due_date        date,
  status          text NOT NULL CHECK (status IN ('open', 'partially_paid', 'paid', 'cancelled')),

  net_amount      numeric(14,2) NOT NULL,
  vat_amount      numeric(14,2) NOT NULL DEFAULT 0,
  total_amount    numeric(14,2) NOT NULL,
  balance_amount  numeric(14,2) NOT NULL,    -- saldo pendiente

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
)
```


### Tabla `ap_bill_lines`

```sql
ap_bill_lines (
  id              uuid PK DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id),

  ap_bill_id      uuid NOT NULL REFERENCES ap_bills(id),
  product_id      uuid REFERENCES products(id),  -- opcional para servicios
  description     text NOT NULL,

  quantity        numeric(14,3) NOT NULL DEFAULT 1,
  unit_cost_net   numeric(14,4) NOT NULL,
  unit_cost_total numeric(14,4) NOT NULL,

  vat_rate        numeric(5,2) NOT NULL DEFAULT 0,
  net_amount      numeric(14,2) NOT NULL,
  vat_amount      numeric(14,2) NOT NULL DEFAULT 0,
  total_amount    numeric(14,2) NOT NULL,

  created_at      timestamptz NOT NULL DEFAULT now()
)
```


### Tabla `ap_payments` (pagos a proveedores)

```sql
ap_payments (
  id              uuid PK DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id),

  ap_bill_id      uuid NOT NULL REFERENCES ap_bills(id),
  payment_method_id uuid REFERENCES payment_methods(id),   -- Transferencia, Cheque, etc.
  cash_session_id uuid REFERENCES cash_sessions(id),       -- si sale desde caja

  payment_date    timestamptz NOT NULL DEFAULT now(),
  amount          numeric(14,2) NOT NULL,

  created_at      timestamptz NOT NULL DEFAULT now()
)
```


***

## Gastos categorizados

### Tabla `expense_categories`

```sql
expense_categories (
  id              uuid PK DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id),

  name            text NOT NULL,      -- Arriendo, Servicios básicos, Marketing, etc.
  parent_id       uuid REFERENCES expense_categories(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
)
```


### Tabla `expenses`

```sql
expenses (
  id              uuid PK DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id),

  expense_category_id uuid NOT NULL REFERENCES expense_categories(id),
  supplier_id     uuid REFERENCES suppliers(id),  -- opcional
  cash_session_id uuid REFERENCES cash_sessions(id),

  description     text NOT NULL,
  expense_date    date NOT NULL,

  net_amount      numeric(14,2) NOT NULL,
  vat_amount      numeric(14,2) NOT NULL DEFAULT 0,
  total_amount    numeric(14,2) NOT NULL,

  vat_rate        numeric(5,2) NOT NULL DEFAULT 0,

  created_at      timestamptz NOT NULL DEFAULT now()
)
```

> Un gasto en efectivo (por ejemplo, “compra menor”) puede crear además un `cash_movements` con `type='expense'` y monto negativo para reflejar la salida de caja.

***

## Reportes y auditoría

Aunque no son tablas extra, el diseño facilita:

- Reportes de ventas por día/caja/método de pago desde `pos_sales`, `pos_payments` y `cash_sessions`.
- Reportes de inventario desde `inventory_movements` agregando por producto y bodega.
- Reportes de cuentas por pagar desde `ap_bills` y `ap_payments` (saldo, vencimientos).
- Reportes de gastos por categoría desde `expenses` y `expense_categories`.

Como guardas siempre `net_amount`, `vat_amount`, `total_amount` y `vat_rate` por línea, puedes reconstruir reportes separados por IVA (afecto/exento), incluso si cambian las tasas a futuro.[^3][^9]

***

## Diagrama entidad-relación (descrito en texto)

Relaciones principales (todas las tablas de negocio llevan `tenant_id`):

- `tenants`
    - 1:N con `business_settings`, `warehouses`, `products`, `suppliers`, `expense_categories`, `cash_drawers`, etc.
    - 1:N con `user_tenant_roles`.
- `users`
    - 1:N con `user_tenant_roles`.
    - 1:N con `cash_sessions` (apertura/cierre), `pos_sales` (cajero), `inventory_adjustments`.
- `user_tenant_roles`
    - N:1 con `tenants` y `users` (llave compuesta `tenant_id + user_id` única).
- `products`
    - N:1 con `product_categories`.
    - 1:N con `pos_sale_lines`, `purchase_order_lines`, `inventory_movements`.
- `warehouses`
    - N:1 con `tenants`.
    - 1:N con `inventory_movements`, `purchase_orders`, `cash_drawers`.
- `inventory_adjustments`
    - N:1 con `warehouses` y `users`.
    - 1:N con `inventory_movements` (vía `inventory_adjustment_id`).
- `inventory_movements`
    - N:1 con `products` y `warehouses`.
    - N:1 opcional con `pos_sale_lines` (movimientos por venta), `purchase_order_lines` (movimientos por compra) y `inventory_adjustments` (ajustes/mermas).
- `cash_drawers`
    - N:1 con `warehouses`.
    - 1:N con `cash_sessions`.
- `cash_sessions`
    - N:1 con `cash_drawers`.
    - N:1 con `users` (apertura/cierre).
    - 1:N con `pos_sales` y `cash_movements`.
- `pos_sales`
    - N:1 con `cash_sessions`, `users`, `warehouses`.
    - 1:N con `pos_sale_lines` y `pos_payments`.
- `pos_sale_lines`
    - N:1 con `pos_sales` y `products`.
    - 1:N con `inventory_movements` (cada línea genera uno o varios movimientos).
- `pos_payments`
    - N:1 con `pos_sales` y `payment_methods`.
    - 1:N con `cash_movements` (si quieres relacionar cada pago con movimiento de caja).
- `suppliers`
    - 1:N con `purchase_orders`, `ap_bills`, `expenses`.
- `purchase_orders`
    - N:1 con `suppliers` y `warehouses`.
    - 1:N con `purchase_order_lines`.
    - 1:N con `ap_bills` (una OC puede relacionarse a varias facturas).
- `purchase_order_lines`
    - N:1 con `purchase_orders` y `products`.
    - 1:N con `inventory_movements`.
- `ap_bills`
    - N:1 con `suppliers` y opcionalmente con `purchase_orders`.
    - 1:N con `ap_bill_lines` y `ap_payments`.
- `ap_bill_lines`
    - N:1 con `ap_bills` y opcionalmente con `products`.
- `ap_payments`
    - N:1 con `ap_bills` y `payment_methods`, opcionalmente `cash_sessions`.
    - 1:N con `cash_movements`.
- `expense_categories`
    - 1:N con `expenses`.
- `expenses`
    - N:1 con `expense_categories`, opcionalmente `suppliers` y `cash_sessions`.
    - 1:N con `cash_movements` (si el gasto fue en efectivo).

***

## Decisiones de diseño clave

### Multi-tenant con `tenant_id` compartido

- Se usa un **solo esquema compartido** con columna `tenant_id` en todas las tablas de negocio, siguiendo el patrón recomendado para SaaS cuando el número de tenants será alto y el aislamiento lógico es suficiente.[^1][^4][^5]
- En índices críticos (`pos_sales`, `inventory_movements`, `ap_bills`, etc.) se recomienda incluir `tenant_id` como primer campo para acelerar queries filtradas por negocio.

Si más adelante necesitas aislamiento más fuerte, puedes migrar tenants grandes a su propio cluster/base, manteniendo el mismo modelo lógico.[^10][^4]

### IVA configurable y persistencia de montos

- Cada negocio define:
    - si usa IVA (`use_vat`),
    - la tasa default (`default_vat_rate`),
    - si los precios incluyen IVA (`prices_include_vat`).[^9]
- Cada transacción guarda:
    - en encabezado: `net_amount`, `vat_amount`, `total_amount`,
    - en detalle: lo mismo por ítem + `vat_rate`.
- Razón:
    - No dependes de reglas históricas; si la tasa de IVA cambia, las boletas y facturas antiguas siguen mostrando los montos correctos.[^3]
    - Puedes soportar productos exentos, combos con distintas tasas y negocios que no usan IVA (simplemente pones `vat_rate = 0` y `vat_amount = 0`).[^6][^11]


### Integridad entre inventario, ventas y compras

- El inventario se lleva por **movimientos**, no por “campo stock” en `products`:
    - Cada venta confirmada crea un `inventory_movements` con `quantity` negativa.
    - Cada compra recibida crea un `inventory_movements` con `quantity` positiva.
    - Ajustes y mermas crean movimientos asociados a `inventory_adjustments`.
- Stock actual = suma de `quantity` por `tenant_id, product_id, warehouse_id`; esto evita desajustes silenciosos y sigue el enfoque de “doble entrada” de sistemas ERP como Odoo.[^2][^7][^8]
- FKs desde `inventory_movements` hacia `pos_sale_lines` y `purchase_order_lines` permiten:
    - rastrear el origen de cada movimiento,
    - auditar ventas/compras vs inventario,
    - evitar borrar líneas que ya tienen movimientos (usando constraints o lógica de aplicación).


### Caja y cuadratura

- `cash_sessions` define el rango temporal de una caja (apertura/cierre).
- `cash_movements` concentra todos los flujos de dinero físicos: ventas en efectivo, gastos, pagos de proveedores, movimientos manuales (carga/descarga de caja).
- La cuadratura se obtiene comparando:
    - `expected_amount` = `opening_amount + SUM(cash_movements.amount)`
    - con `closing_amount` contado por el cajero.

***

Si quieres, en un siguiente paso puedo convertir este modelo en DDL Postgres completo (con `CREATE TABLE`, índices sugeridos y políticas RLS para multi-tenant), o ayudarte a mapearlo a Prisma/TypeORM/Drizzle para integrarlo directo en tu stack.
<span style="display:none">[^12][^13][^14][^15]</span>

<div align="center">⁂</div>

[^1]: https://dev.to/shiviyer/how-to-build-multi-tenancy-in-postgresql-for-developing-saas-applications-4b6

[^2]: https://docs.huihoo.com/odoo/user/10.0/nl/inventory/overview/concepts/double-entry.html

[^3]: https://stackoverflow.com/questions/51329763/order-invoicing-best-practices-store-net-gross-vat-or-calculate

[^4]: https://monpg.app/blog/postgresql-multitenant-schema-design

[^5]: https://www.geeksforgeeks.org/dbms/multi-tenant-application-database-design/

[^6]: https://stackoverflow.com/questions/62030132/how-to-store-tax-vat-value-in-sql

[^7]: https://docs.huihoo.com/odoo/user/10.0/fr/inventory/overview/concepts/double-entry.html

[^8]: https://honstain.com/scalatra-and-slick-for-double/

[^9]: https://learn.microsoft.com/en-us/dynamics365/business-central/finance-work-with-vat

[^10]: https://blog.arkency.com/multitenancy-with-postgres-schemas-key-concepts-explained/

[^11]: https://stackoverflow.com/questions/66317644/calculate-vat-per-product-in-postgressql

[^12]: https://www.youtube.com/watch?v=A8_FLPHc4KU

[^13]: https://docs.oracle.com/en/applications/peoplesoft/financials-and-supply-chain-management/9.2.056/peoplesoft-billing/modifying-total-tax-vat-code.html

[^14]: https://www.scribd.com/document/915676932/3-1-Inventory

[^15]: https://www.studocu.com/en-gb/document/aston-university/accounting/15-the-double-entry-system-for-inventory/15971004

