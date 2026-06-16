# Guion de demo + testeo completo — Gestionala

**Objetivo:** recorrer y probar **toda** la plataforma de una sola sesión, grabando y
explicando cada cosa de forma didáctica. El orden está pensado para que **nunca tengas
que parar**: cada módulo deja listo lo que el siguiente necesita.

> **Versión:** 1.0 · 2026-06-16 · Plataforma: https://mypyme-blond.vercel.app

---

## Antes de grabar (checklist de 1 minuto)

- [ ] Navegador **Chrome** en pantalla completa (idealmente ventana limpia, sin extensiones visibles).
- [ ] Este guion abierto en **otra pantalla** o el celular.
- [ ] Poder **apagar y prender el WiFi** a voluntad (lo necesitas para la prueba offline).
- [ ] Tu **correo y clave reales** a mano (es la cuenta de administrador que vas a crear).
- [ ] Sonido/mic listo.

**3 advertencias importantes (léelas antes):**
1. 💳 **Suscripción (ACTO 15):** inscribir una tarjeta de verdad genera un cobro real de validación (~$50 que se reversa) y deja tu tarjeta en pantalla. **Para la grabación, explica la pantalla pero NO inscribas la tarjeta en cámara** (o hazlo después, en privado).
2. ✉️ **Recuperar contraseña:** la pantalla funciona, pero el correo **todavía no se envía** (falta dominio/SMTP). Muéstrala y explícala, pero no esperes que llegue el mail.
3. 🖨️ **Imprimir boleta:** abre el diálogo de impresión del sistema. En cámara puedes elegir "Guardar como PDF" o cancelar; es solo para mostrarlo.

**Leyenda del guion:**
🎬 = qué hacer · 🎙️ = qué explicar · 📝 = datos a usar · 🔗 = conexión a destacar · 👁️ = visualización a mostrar

---

## Datos inventados (cópialos de acá)

**Tu negocio (onboarding + configuración):**
| Campo | Valor |
|---|---|
| Razón social | Almacén Don Pepe SpA |
| RUT | 77.815.460-9 |
| Giro | Minimarket / almacén de barrio |
| Dirección | Av. Siempreviva 742, Maipú, Región Metropolitana |
| Teléfono | +56 9 1234 5678 |
| IVA | Activado, 19% |

**Catálogo para "Importar catálogo" (pega este bloque tal cual):**
```
Nombre; Precio; Categoría; Stock
Sprite 1.5L; 2000; Bebidas; 24
Agua Mineral 500ml; 800; Bebidas; 40
Jugo Watt's 1L; 1300; Bebidas; 18
Arroz Tucapel 1kg; 1500; Abarrotes; 30
Fideos Carozzi 400g; 990; Abarrotes; 25
Aceite Chef 1L; 2490; Abarrotes; 15
Azúcar Iansa 1kg; 1200; Abarrotes; 20
Leche Soprole 1L; 1100; Lácteos; 24
Yogurt Colún pack; 1990; Lácteos; 12
Papas Lay's 90g; 1490; Snacks; 20
Galletas Tritón; 990; Snacks; 30
Pan de molde Ideal; 1790; Panadería; 10
Detergente Omo 1kg; 3990; Limpieza; 8
Confort 4un; 2290; Limpieza; 14
```

**Proveedores:**
| Nombre | RUT | Contacto | Teléfono |
|---|---|---|---|
| Distribuidora Central Ltda | 76.192.083-9 | Juan Pérez | +56 2 2555 1234 |
| Bebidas del Sur SpA | 60.000.000-4 | María Soto | +56 2 2555 5678 |

**Empleado de prueba (ACTO 13):**
| Campo | Valor |
|---|---|
| Nombre | Cajera Demo |
| Email | cajera.demo@almacendonpepe.cl |
| Clave temporal | Cajera2026 |
| Rol | Empleado |

---

# ACTO 0 — La cara pública (antes de entrar)

🎬 Abre **https://mypyme-blond.vercel.app** (sin sesión).
🎙️ "Esta es la página que ve cualquier persona que llega a Gestionala." Recorre el **hero**, las **6 funciones**, los **planes** (Emprende $9.990 / Pyme $19.990) y el pie de página.
👁️ Pasa el mouse por las tarjetas (tienen brillo y animación). Muestra que el diseño es navy/glass.
🎬 En el footer abre **Términos** y **Privacidad** en otra pestaña; muéstralos por encima.
🎙️ "Tiene sus términos y política de privacidad reales, pensados para un punto de venta chileno."
🎬 Vuelve y haz clic en **Crear cuenta**.

---

# ACTO 1 — Registro y puesta en marcha

🎬 En **Crear cuenta**, ingresa **tu correo y clave reales** → Registrarte.
🎙️ "Me registro y entro directo a configurar mi negocio: no hay fricción."
🎬 En el **onboarding**, ingresa **todos** los datos del negocio (el formulario los pide todos acá):
📝 Razón social **Almacén Don Pepe SpA**, RUT **77.815.460-9**, Giro **Minimarket / almacén de barrio**, Dirección **Av. Siempreviva 742, Maipú**, Teléfono **+56 9 1234 5678**, deja **IVA activado**.
🎙️ "El RUT se valida solo (dígito verificador). Activo IVA porque emito con IVA."
🎬 Continúa → caes al **Dashboard**.
👁️ Muestra la tarjeta **"Pongamos tu negocio en marcha"** con la barra de progreso (1 de 3 listos).
🎙️ "El sistema me guía: ya creé el negocio, ahora me faltan cargar el catálogo y hacer la primera venta. Esta guía desaparece sola cuando termine."
👁️ Muestra arriba los **KPIs** (hoy / 7 días / mes) en cero, con el contador animado.

---

# ACTO 2 — Configuración base

🎬 Sidebar → **Configuración → Negocio**.
🎙️ Toca el botón **"?"** junto al título: "Cada pantalla tiene esta ayuda contextual para que sepas qué hace."
👁️ Muestra que los datos que pusiste en el registro ya están acá. Además ajusta la **tasa de IVA (19%)** y el **umbral de stock bajo** (ej. avisarme cuando queden ≤ 5). Guarda.
🔗 "Estos datos salen luego en la boleta y en los reportes; el umbral define cuándo se prende la alerta de stock."

🎬 **Configuración → Métodos de pago**.
🎙️ "Acá defino cómo me pueden pagar. Vienen creados efectivo, débito, crédito y transferencia."
🎬 Agrega uno nuevo, ej. **"Transbank QR"**, para mostrar el alta.
🔗 "Ojo: solo el **efectivo** mueve la caja; los demás quedan para los reportes. Eso lo vamos a ver."

---

# ACTO 3 — Catálogo (productos)

🎬 Sidebar → **Catálogo → Categorías**. Crea una a mano, ej. **"Bebidas"**.
🎙️ "Las categorías ordenan el catálogo y sirven para filtrar en la caja y ver reportes."

🎬 **Catálogo → Productos**. Crea **un** producto a mano para mostrar el formulario:
📝 Nombre **Coca-Cola 1.5L**, Categoría **Bebidas**, Precio **2200** (con IVA), Stock mínimo **6**. (Opcional: súbele una imagen.)
🎙️ "El precio se ingresa **con IVA incluido**; el sistema calcula el neto solo. El stock mínimo me avisará cuando esté por agotarse."

🎬 **Catálogo → Importar catálogo**. Pega el **bloque de catálogo** de arriba (14 productos). Importar.
🎙️ "Pero cargar uno por uno es lento. Acá pego todo mi inventario de una vez —nombre, precio, categoría, stock— y el sistema crea las categorías que falten y arma todo."
👁️ Muestra el resultado: vuelve a **Productos** y mira la lista llena (15 productos, varias categorías).
🔗 "Fíjate que se crearon solas las categorías Abarrotes, Lácteos, Snacks, etc."

---

# ACTO 4 — Inventario y movimientos de stock

🎬 Sidebar → **Catálogo → Inventario**.
🎙️ Toca el **"?"**: "El stock no se escribe a mano: se **calcula** a partir de los movimientos. Las ventas lo bajan, las compras lo suben."
🎬 Registra los 3 tipos de movimiento para mostrar cada uno:
- **Entrada** +12 a **Arroz Tucapel 1kg** ("llegó mercadería").
- **Merma** −2 a **Yogurt Colún pack** ("se vencieron").
- **Ajuste** de **Pan de molde Ideal** ("conteo físico").
👁️ Después de la merma del yogurt (queda en 10) y si bajas algo bajo su mínimo, muestra el **badge ámbar de stock bajo** en el sidebar y en la lista.
🔗 "Este badge es el mismo número que aparece en el dashboard: todo está conectado."

---

# ACTO 5 — Proveedores y compras (la cadena completa)

🎬 Sidebar → **Compras → Proveedores**. Crea los dos:
📝 **Distribuidora Central Ltda** (76.192.083-9, Juan Pérez) y **Bebidas del Sur SpA** (60.000.000-4).

🎬 **Compras → Órdenes de compra → Nueva orden**.
📝 Proveedor **Distribuidora Central**. Líneas:
- **Arroz Tucapel 1kg** × **20** a costo **1100**
- **Aceite Chef 1L** × **10** a costo **1900**
👁️ Muestra cómo el total se calcula en vivo mientras agregas líneas. Crea la orden.
🎙️ "Una orden de compra es un pedido formal: la creo, la apruebo y, cuando llega, registro lo que recibí."
🎬 En el detalle: **Aprobar**.
🎬 **Recibir parcial:** recibe **10** de arroz y **5** de aceite. Guarda.
🎙️ "A veces llega solo una parte. Registro la recepción parcial y la orden queda 'recibida parcial'."
🎬 **Recibir el resto** (10 arroz, 5 aceite) → la orden pasa a **recibida (total)**.
🔗 **CONEXIÓN CLAVE:** ve a **Inventario** y muestra que el stock de **Arroz** subió +20 y el de **Aceite** +10. "Recibir la compra alimentó el inventario automáticamente, con su costo."

🎬 **Compras → Cuentas por pagar → Nueva factura**.
📝 Proveedor **Distribuidora Central**, N° **F-001234**, monto **35000** (c/IVA), fecha hoy, vencimiento **+30 días**.
🎙️ "Registro la factura que me dejó el proveedor. Todavía no la pago: queda en 'cuentas por pagar'."
👁️ Muestra el total **Por pagar** en el encabezado.
> El **pago** de esta factura lo haremos en el ACTO 9 (necesita la caja abierta).

---

# ACTO 6 — Abrir la caja

🎬 Sidebar → **Caja**.
🎙️ Toca el **"?"**: "La caja controla el efectivo del día. Necesito abrirla para poder cobrar."
🎬 **Abrir caja** con monto inicial **30000**.
🎙️ "Declaro que parto con $30.000 de fondo. Desde acá, todo el efectivo que entre o salga queda registrado."
👁️ Muestra el indicador de **caja abierta** y el "esperado en caja" en vivo.

---

# ACTO 7 — Punto de venta (el corazón)

🎬 Sidebar → **Punto de venta**.
👁️ Muestra la grilla de productos con sus precios. Usa el **buscador** ("escribo 'leche' y aparece"). Usa los **chips de categoría** (filtra por Bebidas).
🎙️ "Esta es la pantalla que usa el cajero todo el día. Toco productos y se van al carrito."

**Venta 1 — efectivo con vuelto:**
🎬 Agrega **2× Coca-Cola 1.5L** + **1× Papas Lay's**. Método **Efectivo**, recibido **10000**.
👁️ Muestra el **vuelto** calculado. Cobra.
🖨️ En el toast aparece **"Imprimir boleta"** → tócalo y muestra el comprobante (cancela o guarda PDF).
🎙️ "Calcula el vuelto solo y me deja imprimir el comprobante. Ojo: es un comprobante interno, todavía no es boleta electrónica del SII."

**Venta 2 — pago dividido (multi-pago):**
🎬 Agrega varios productos (ej. 1× Arroz, 1× Aceite, 1× Detergente). Usa **"Agregar pago (dividir)"**: parte en **Efectivo** + **Débito**.
🎙️ "El cliente paga una parte en efectivo y otra con tarjeta. El sistema valida que la suma cuadre con el total."
🎬 Cobra.

**Venta 3 — débito:**
🎬 Vende **1× Leche Soprole** con **Débito**. Cobra.
🔗 "Esta venta NO entra a la caja en efectivo (fue débito), pero sí aparece en los reportes. Lo vamos a comprobar al cerrar la caja."

---

# ACTO 8 — Vender SIN internet (la joya)

🎬 **Apaga el WiFi** de tu equipo.
👁️ Muestra cómo el indicador cambia a **"● Sin conexión"**.
🎬 Haz una venta: **1× Agua Mineral 500ml**, efectivo. Cobra.
👁️ Aparece el badge **"1 por sincronizar"**. "La venta quedó guardada en el dispositivo, no se perdió."
🎙️ "Esto es clave para un almacén: si se cae el internet, sigo vendiendo igual."
🎬 **Prende el WiFi** de nuevo.
👁️ Muestra cómo el badge desaparece y la venta se **sincroniza sola**.
🔗 "Al volver la conexión, la venta se subió sola. Sin botones, sin perder nada."

---

# ACTO 9 — Gastos y pago a proveedor (efectivo que toca la caja)

🎬 Sidebar → **Gastos**.
🎙️ Toca el **"?"**: "Acá anoto los egresos del negocio."
🎬 Gasto 1: categoría **Servicios básicos**, descripción **Cuenta de luz**, monto **45000**, **pagar en efectivo** (✔). Guarda.
🔗 "Como lo pagué en efectivo y tengo la caja abierta, este gasto **descontó la caja**."
🎬 Gasto 2: categoría **Arriendo**, monto **350000**, **sin** marcar efectivo (fue transferencia). Guarda.
🎙️ "Este otro lo pagué por transferencia, así que no toca la caja, pero sí suma su IVA al crédito fiscal."

🎬 Sidebar → **Compras → Cuentas por pagar** → abre la factura **F-001234**.
🎬 Registra un **pago parcial** de **20000** en **Efectivo**.
👁️ Muestra cómo el **saldo** baja y el estado pasa a **pago parcial**.
🔗 "Pago en efectivo otra vez → también descuenta la caja."
🎬 Registra el **pago del saldo** restante → la factura queda **pagada**.

---

# ACTO 10 — Movimientos manuales y cierre de caja (la cuadratura)

🎬 Sidebar → **Caja**.
🎬 Registra un movimiento manual de **entrada** +10000 ("fondo extra") y uno de **salida** −5000 ("compré bolsas").
🎙️ "A veces meto o saco plata que no es venta; lo dejo registrado para que la caja cuadre."
👁️ Muestra el **"esperado en caja"** actualizado en vivo.
🎙️ "El sistema sabe cuánto **debería** haber: fondo inicial + ventas en efectivo + entradas − gastos en efectivo − pagos en efectivo − salidas."
🎬 **Cerrar caja:** cuenta el efectivo (usa el monto **esperado** que muestra el sistema) e ingrésalo.
👁️ Muestra la **cuadratura**: esperado vs contado vs **diferencia $0**.
🎙️ (Opcional didáctico) "Si cuento $1.000 menos, el sistema me marca el descuadre en rojo." — pruébalo si quieres mostrar la alerta.
🔗 "Acá se cierra el círculo: cada venta en efectivo, cada gasto, cada pago, todo llegó a la caja."

---

# ACTO 11 — Reportes de ventas (visualizaciones)

🎬 Sidebar → **Reportes**.
👁️ Recorre todo:
- **Resumen** del período (n° ventas, total, ticket promedio).
- **Gráfico de barras** de ventas por día.
- **Gráfico de dona** por método de pago. 🔗 "Acá se ve la venta con débito separada del efectivo."
- Tabla **por método**, **por día**, **top productos** y **por cajero**.
🎙️ "Tengo todo lo que vendí cortado por día, por forma de pago, por producto y por cajero —útil cuando tengo empleados."
🎬 Toca **Exportar** → descarga el **CSV** (ábrelo en Excel si quieres mostrar que abre perfecto, con acentos y montos).
🎙️ "Y me lo llevo a Excel con un clic, formato chileno."

---

# ACTO 12 — IVA / F29

🎬 Ve al **Dashboard** (logo/Inicio) → tarjeta **Reportes** → **Reporte de IVA (F29)**. (También llegas directo en `/reportes/iva`.)
👁️ Muestra la tabla por mes: **Débito** (IVA de tus ventas) − **Crédito** (IVA de tus gastos) = **Resultado**.
🔗 "El IVA de las ventas que hicimos es el débito; el IVA de la luz y el arriendo que registramos es el crédito. El sistema me arma el insumo para el F29."
🎙️ "Si el resultado es negativo, es remanente a favor; lo muestra en verde."
🎬 **Exportar** el CSV del IVA.

---

# ACTO 13 — Usuarios y roles

🎬 Sidebar → **Configuración → Usuarios**.
🎬 Crea el empleado:
📝 Nombre **Cajera Demo**, email **cajera.demo@almacendonpepe.cl**, clave **Cajera2026**, rol **Empleado**.
🎙️ "Le creo la cuenta a mi cajera con una clave temporal que le entrego en persona."
🎬 **Cierra sesión** (botón abajo en el sidebar).
🎬 **Inicia sesión como la cajera** (cajera.demo@almacendonpepe.cl / Cajera2026).
👁️ Muestra que el sidebar **NO tiene la sección Configuración**: la empleada puede vender, ver inventario, compras y gastos, pero no toca la configuración, los usuarios ni la suscripción.
🎙️ "Cada rol ve lo que le corresponde. La cajera opera, pero no entra a lo sensible."
🎬 **Cierra sesión** y **vuelve a entrar como administrador** (tu correo real).

---

# ACTO 14 — Bitácora (auditoría)

🎬 Sidebar → **Configuración → Bitácora**.
👁️ Muestra los registros: quién cambió qué y cuándo, con el **antes → después**.
🎙️ "Todo cambio en los datos queda registrado. Si la cajera modifica un precio o un producto, queda la huella. Nadie se la puede saltar."

---

# ACTO 15 — Suscripción y cobro

🎬 Sidebar → **Configuración → Suscripción**.
👁️ Muestra el **banner del período de prueba** (cuántos días te quedan), el **plan** y la sección **Historial de pagos**.
🎙️ "Gestionala parte con prueba gratis. Para seguir, se inscribe una tarjeta y el cobro es mensual por Flow. Acá veo mi historial de pagos."
⚠️ **NO inscribas una tarjeta real en cámara** (genera un cobro de validación real y expone tu tarjeta). Explica el flujo de palabra y, si quieres, hazlo después en privado.

---

# ACTO 16 — Ayuda y soporte

🎬 Toca cualquier botón **"?"** de una pantalla y muestra el globo de ayuda.
🎬 Sidebar → **Centro de ayuda** (`/ayuda`).
👁️ Recorre la **guía de uso por módulo** y abre un par de **preguntas frecuentes** (acordeón).
🎙️ "Pensé esto para que el dueño no técnico no tenga que googlear: tiene ayuda en cada pantalla y un centro de ayuda con guía y preguntas frecuentes."
🎬 Sidebar → **Soporte**.
👁️ Muestra la tarjeta de **WhatsApp** (+56 9 4033 7486) y el **correo**.

---

# ACTO 17 — Detalles de experiencia

🎬 En el sidebar, usa el **interruptor de tema** (claro/oscuro).
👁️ Muestra cómo toda la plataforma cambia a **modo oscuro** manteniendo la identidad navy.
🎬 (Opcional) Achica la ventana o abre en el **celular**: muestra que es **responsive** (aparece el menú hamburguesa).
🎙️ "Funciona igual en el computador del local o en el celular."

---

# ACTO 18 — Cierre

🎬 **Cierra sesión**.
👁️ Muestra que vuelves a la **landing pública**.
🎙️ "Y eso es Gestionala de punta a punta: catálogo, ventas con o sin internet, caja cuadrada, compras, gastos, reportes con IVA, equipo con roles y todo auditado." Cierre.

---

## ✅ Checklist de cobertura (todo lo que quedó probado)

- [ ] Landing pública + Términos + Privacidad
- [ ] Registro + onboarding + guía de primeros pasos
- [ ] Configuración del negocio + IVA
- [ ] Métodos de pago (alta)
- [ ] Categorías (alta manual)
- [ ] Productos (alta manual con imagen + precio c/IVA)
- [ ] Importación masiva de catálogo
- [ ] Inventario: entrada, merma, ajuste + alerta de stock bajo
- [ ] Proveedores (alta)
- [ ] Orden de compra: crear → aprobar → recepción parcial → total → **alimenta inventario**
- [ ] Cuenta por pagar: factura + pago parcial + pago total
- [ ] Gastos: efectivo (toca caja) y transferencia (no toca caja) + IVA crédito
- [ ] Caja: apertura, movimientos manuales, **cierre con cuadratura**
- [ ] POS: venta efectivo con vuelto + comprobante
- [ ] POS: pago dividido (multi-pago)
- [ ] POS: pago con débito
- [ ] POS: búsqueda y filtro por categoría
- [ ] **POS offline** → sincronización al reconectar
- [ ] Reportes de ventas: resumen, gráficos (barras + dona), por método/día/cajero/top + export CSV
- [ ] Reporte de IVA (F29): débito − crédito + export CSV
- [ ] Usuarios y roles: crear empleado + login como empleado (restricciones) + volver a admin
- [ ] Bitácora / auditoría
- [ ] Suscripción: trial, plan, historial (sin inscribir tarjeta en cámara)
- [ ] Ayuda contextual ("?") + Centro de ayuda + Soporte
- [ ] Modo oscuro + responsive
- [ ] Cierre de sesión → landing

---

## Notas finales

- **No bloquea nada:** el control de acceso por suscripción (`FLOW_ENFORCE`) está apagado, así que el trial no te va a interrumpir la grabación.
- **Tiempo estimado:** 25–40 min según cuánto expliques.
- **Si algo se ve raro:** anótalo (minuto del video + qué pasó) para revisarlo después; no pares la toma.
