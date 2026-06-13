# Modelo de Datos — Esquema Completo

**Versión:** 1.0 · **Fecha:** 2026-06-13 · **Motor:** PostgreSQL (Supabase)

> Convención: toda tabla de negocio lleva `empresa_id` y queda bajo RLS.
> Stock se calcula desde `movimientos_inventario` (doble entrada), nunca como campo mutable.

---

## Núcleo Multi-Tenant

```sql
-- Enum de roles
CREATE TYPE rol_empresa AS ENUM ('admin', 'empleado');

-- Tabla de tenants (la PyME)
CREATE TABLE empresas (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rut             VARCHAR(12) UNIQUE NOT NULL,  -- validado con función Módulo 11
  razon_social    VARCHAR(255) NOT NULL,
  giro            VARCHAR(255),
  telefono        VARCHAR(20),
  direccion       TEXT,
  estado_suscripcion VARCHAR(50) DEFAULT 'trial',  -- trial, activa, suspendida, cancelada
  plan            VARCHAR(50) DEFAULT 'emprende',   -- emprende, pyme
  creado_en       TIMESTAMPTZ DEFAULT now() NOT NULL,
  actualizado_en  TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT chk_rut_valido CHECK (validar_rut_chileno(rut))
);

-- Mapeo usuario ↔ empresa ↔ rol
CREATE TABLE usuarios_empresa (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id  UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  rol         rol_empresa NOT NULL DEFAULT 'empleado',
  creado_en   TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (usuario_id, empresa_id)
);

-- Configuración por negocio
CREATE TABLE configuracion_negocio (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id           UUID NOT NULL UNIQUE REFERENCES empresas(id),
  usa_iva              BOOLEAN NOT NULL DEFAULT true,
  tasa_iva_default     NUMERIC(5,2) NOT NULL DEFAULT 19.00,
  precios_con_iva      BOOLEAN NOT NULL DEFAULT true,  -- precios del POS ya incluyen IVA
  moneda               VARCHAR(10) NOT NULL DEFAULT 'CLP',
  umbral_stock_bajo    INTEGER DEFAULT 5,
  creado_en            TIMESTAMPTZ DEFAULT now() NOT NULL,
  actualizado_en       TIMESTAMPTZ DEFAULT now() NOT NULL
);
```

---

## Catálogo e Inventario

```sql
CREATE TABLE categorias_producto (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id  UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  parent_id   UUID REFERENCES categorias_producto(id),
  creado_en   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (empresa_id, nombre)
);

CREATE TABLE productos (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id           UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  sku                  TEXT NOT NULL,
  nombre               TEXT NOT NULL,
  descripcion          TEXT,
  categoria_id         UUID REFERENCES categorias_producto(id),
  unidad_medida        TEXT NOT NULL DEFAULT 'unidad',
  controla_stock       BOOLEAN NOT NULL DEFAULT true,
  activo               BOOLEAN NOT NULL DEFAULT true,
  precio_neto          NUMERIC(14,2),    -- precio sin IVA
  precio_total         NUMERIC(14,2),    -- precio con IVA (lo que se muestra en POS)
  tasa_iva             NUMERIC(5,2),     -- puede diferir del default del negocio
  stock_minimo         NUMERIC(14,2),
  creado_en            TIMESTAMPTZ DEFAULT now(),
  actualizado_en       TIMESTAMPTZ DEFAULT now(),
  UNIQUE (empresa_id, sku)
);

CREATE TABLE bodegas (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id  UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  es_default  BOOLEAN NOT NULL DEFAULT false,
  creado_en   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (empresa_id, nombre)
);

-- Movimientos de stock (doble entrada — stock = SUM(cantidad))
CREATE TABLE movimientos_inventario (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id              UUID NOT NULL REFERENCES empresas(id),
  producto_id             UUID NOT NULL REFERENCES productos(id),
  bodega_id               UUID NOT NULL REFERENCES bodegas(id),
  cantidad                NUMERIC(14,3) NOT NULL,  -- positivo = entrada, negativo = salida
  costo_unitario          NUMERIC(14,4),
  tipo                    TEXT NOT NULL CHECK (tipo IN (
                            'venta','devolucion_venta','compra','devolucion_compra',
                            'ajuste','merma','transfer_entrada','transfer_salida')),
  venta_linea_id          UUID,
  orden_compra_linea_id   UUID,
  ajuste_id               UUID,
  ocurrido_en             TIMESTAMPTZ DEFAULT now(),
  creado_en               TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ajustes_inventario (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id    UUID NOT NULL REFERENCES empresas(id),
  bodega_id     UUID NOT NULL REFERENCES bodegas(id),
  usuario_id    UUID REFERENCES auth.users(id),
  razon         TEXT NOT NULL,
  comentario    TEXT,
  estado        TEXT NOT NULL CHECK (estado IN ('borrador','confirmado','cancelado')),
  creado_en     TIMESTAMPTZ DEFAULT now(),
  confirmado_en TIMESTAMPTZ
);
```

---

## POS — Ventas y Caja

```sql
CREATE TABLE metodos_pago (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id  UUID NOT NULL REFERENCES empresas(id),
  nombre      TEXT NOT NULL,  -- Efectivo, Débito, Crédito, Transferencia
  tipo        TEXT,           -- cash, card, transfer, other
  activo      BOOLEAN DEFAULT true,
  UNIQUE (empresa_id, nombre)
);

CREATE TABLE cajas (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id  UUID NOT NULL REFERENCES empresas(id),
  nombre      TEXT NOT NULL,  -- Caja 1, POS móvil, etc.
  bodega_id   UUID REFERENCES bodegas(id),
  activa      BOOLEAN DEFAULT true,
  UNIQUE (empresa_id, nombre)
);

CREATE TABLE sesiones_caja (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id        UUID NOT NULL REFERENCES empresas(id),
  caja_id           UUID NOT NULL REFERENCES cajas(id),
  usuario_apertura  UUID NOT NULL REFERENCES auth.users(id),
  usuario_cierre    UUID REFERENCES auth.users(id),
  abierta_en        TIMESTAMPTZ NOT NULL,
  cerrada_en        TIMESTAMPTZ,
  monto_apertura    NUMERIC(14,2) NOT NULL,
  monto_cierre      NUMERIC(14,2),       -- contado real
  monto_esperado    NUMERIC(14,2),       -- calculado por sistema
  estado            TEXT NOT NULL CHECK (estado IN ('abierta','cerrada','cancelada')),
  creado_en         TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ventas (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,  -- generado en cliente
  empresa_id        UUID NOT NULL REFERENCES empresas(id),
  sesion_caja_id    UUID REFERENCES sesiones_caja(id),
  bodega_id         UUID REFERENCES bodegas(id),
  usuario_id        UUID REFERENCES auth.users(id),
  numero_boleta     TEXT,
  fecha_venta       TIMESTAMPTZ NOT NULL DEFAULT now(),
  monto_neto        NUMERIC(14,2) NOT NULL,
  monto_iva         NUMERIC(14,2) NOT NULL DEFAULT 0,
  monto_total       NUMERIC(14,2) NOT NULL,
  monto_recibido    NUMERIC(14,2) NOT NULL,
  vuelto            NUMERIC(14,2) NOT NULL DEFAULT 0,
  estado            TEXT NOT NULL CHECK (estado IN ('completada','cancelada')),
  creado_en         TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ventas_lineas (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id        UUID NOT NULL REFERENCES empresas(id),
  venta_id          UUID NOT NULL REFERENCES ventas(id),
  producto_id       UUID NOT NULL REFERENCES productos(id),
  cantidad          NUMERIC(14,3) NOT NULL,
  precio_neto_unit  NUMERIC(14,4) NOT NULL,
  precio_total_unit NUMERIC(14,4) NOT NULL,
  descuento         NUMERIC(14,2) NOT NULL DEFAULT 0,
  tasa_iva          NUMERIC(5,2) NOT NULL DEFAULT 0,
  monto_neto        NUMERIC(14,2) NOT NULL,
  monto_iva         NUMERIC(14,2) NOT NULL DEFAULT 0,
  monto_total       NUMERIC(14,2) NOT NULL,
  creado_en         TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ventas_pagos (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id          UUID NOT NULL REFERENCES empresas(id),
  venta_id            UUID NOT NULL REFERENCES ventas(id),
  metodo_pago_id      UUID NOT NULL REFERENCES metodos_pago(id),
  monto               NUMERIC(14,2) NOT NULL,
  monto_recibido      NUMERIC(14,2) NOT NULL,
  creado_en           TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE movimientos_caja (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id        UUID NOT NULL REFERENCES empresas(id),
  sesion_caja_id    UUID NOT NULL REFERENCES sesiones_caja(id),
  tipo              TEXT NOT NULL CHECK (tipo IN ('venta','gasto','pago_proveedor','entrada_manual','salida_manual')),
  monto             NUMERIC(14,2) NOT NULL,  -- positivo = entra, negativo = sale
  pago_venta_id     UUID REFERENCES ventas_pagos(id),
  gasto_id          UUID,
  pago_proveedor_id UUID,
  descripcion       TEXT,
  ocurrido_en       TIMESTAMPTZ DEFAULT now()
);
```

---

## Proveedores, Compras y Gastos

```sql
CREATE TABLE proveedores (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id  UUID NOT NULL REFERENCES empresas(id),
  nombre      TEXT NOT NULL,
  rut         TEXT,
  email       TEXT,
  telefono    TEXT,
  activo      BOOLEAN DEFAULT true,
  creado_en   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (empresa_id, nombre)
);

CREATE TABLE ordenes_compra (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id     UUID NOT NULL REFERENCES empresas(id),
  proveedor_id   UUID NOT NULL REFERENCES proveedores(id),
  bodega_id      UUID REFERENCES bodegas(id),
  usuario_id     UUID REFERENCES auth.users(id),
  fecha          DATE NOT NULL,
  fecha_esperada DATE,
  monto_neto     NUMERIC(14,2) NOT NULL,
  monto_iva      NUMERIC(14,2) NOT NULL DEFAULT 0,
  monto_total    NUMERIC(14,2) NOT NULL,
  estado         TEXT NOT NULL CHECK (estado IN ('borrador','aprobada','recibida_parcial','recibida','cancelada')),
  creado_en      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ordenes_compra_lineas (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id        UUID NOT NULL REFERENCES empresas(id),
  orden_compra_id   UUID NOT NULL REFERENCES ordenes_compra(id),
  producto_id       UUID NOT NULL REFERENCES productos(id),
  cantidad          NUMERIC(14,3) NOT NULL,
  costo_neto_unit   NUMERIC(14,4) NOT NULL,
  tasa_iva          NUMERIC(5,2) NOT NULL DEFAULT 0,
  monto_neto        NUMERIC(14,2) NOT NULL,
  monto_iva         NUMERIC(14,2) NOT NULL DEFAULT 0,
  monto_total       NUMERIC(14,2) NOT NULL,
  cantidad_recibida NUMERIC(14,3) NOT NULL DEFAULT 0,
  creado_en         TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE facturas_proveedor (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id       UUID NOT NULL REFERENCES empresas(id),
  proveedor_id     UUID NOT NULL REFERENCES proveedores(id),
  orden_compra_id  UUID REFERENCES ordenes_compra(id),
  numero_factura   TEXT NOT NULL,
  fecha            DATE NOT NULL,
  vencimiento      DATE,
  monto_neto       NUMERIC(14,2) NOT NULL,
  monto_iva        NUMERIC(14,2) NOT NULL DEFAULT 0,
  monto_total      NUMERIC(14,2) NOT NULL,
  saldo            NUMERIC(14,2) NOT NULL,
  estado           TEXT NOT NULL CHECK (estado IN ('pendiente','pago_parcial','pagada','cancelada')),
  creado_en        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE pagos_proveedor (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id      UUID NOT NULL REFERENCES empresas(id),
  factura_id      UUID NOT NULL REFERENCES facturas_proveedor(id),
  metodo_pago_id  UUID REFERENCES metodos_pago(id),
  sesion_caja_id  UUID REFERENCES sesiones_caja(id),
  fecha           TIMESTAMPTZ NOT NULL DEFAULT now(),
  monto           NUMERIC(14,2) NOT NULL,
  creado_en       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE categorias_gasto (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id  UUID NOT NULL REFERENCES empresas(id),
  nombre      TEXT NOT NULL,
  parent_id   UUID REFERENCES categorias_gasto(id),
  UNIQUE (empresa_id, nombre)
);

CREATE TABLE gastos (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id         UUID NOT NULL REFERENCES empresas(id),
  categoria_gasto_id UUID NOT NULL REFERENCES categorias_gasto(id),
  proveedor_id       UUID REFERENCES proveedores(id),
  sesion_caja_id     UUID REFERENCES sesiones_caja(id),
  descripcion        TEXT NOT NULL,
  fecha              DATE NOT NULL,
  monto_neto         NUMERIC(14,2) NOT NULL,
  monto_iva          NUMERIC(14,2) NOT NULL DEFAULT 0,
  monto_total        NUMERIC(14,2) NOT NULL,
  tasa_iva           NUMERIC(5,2) NOT NULL DEFAULT 0,
  creado_en          TIMESTAMPTZ DEFAULT now()
);
```

---

## Índices Críticos (`empresa_id` primero, siempre)

```sql
CREATE INDEX idx_ventas_empresa_fecha   ON ventas (empresa_id, fecha_venta DESC);
CREATE INDEX idx_ventas_sesion          ON ventas (empresa_id, sesion_caja_id);
CREATE INDEX idx_mov_inv_empresa_prod   ON movimientos_inventario (empresa_id, producto_id, bodega_id);
CREATE INDEX idx_productos_empresa      ON productos (empresa_id, activo);
CREATE INDEX idx_sesiones_empresa       ON sesiones_caja (empresa_id, estado);
CREATE INDEX idx_facturas_prov_empresa  ON facturas_proveedor (empresa_id, estado);
```
