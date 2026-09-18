<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Estoy desarrollando un SaaS de gestión para PyMEs chilenas y necesito integrar facturación electrónica del SII más adelante, sin construir la integración directa con el SII yo mismo. Investiga los proveedores/facturadores autorizados en Chile que ofrezcan API para emitir documentos tributarios electrónicos (DTE: boletas, facturas) desde una aplicación de terceros. Considera al menos: LibreDTE, SimpleAPI, Nubox API, Facturación.cl, Haulmer/OpenFactura.

Para cada uno entrégame:

1. Qué documentos permite emitir vía API (boleta electrónica, factura, nota de crédito).
2. Modelo de precios (por documento, mensual, setup).
3. Calidad y disponibilidad de su documentación de API.
4. Requisitos para integrarse (certificado digital, folios CAF, firma electrónica).
5. Si tienen ambiente de pruebas (sandbox) gratuito.
6. Facilidad de integración desde una app Next.js/Node.

Al final recomienda cuál es el mejor para integrar en un SaaS pequeño que prioriza bajo costo y buena documentación. Cita fuentes y enlaces a la documentación técnica.

La mejor opción para un SaaS pequeño que prioriza bajo costo y buena documentación es **Haulmer / OpenFactura**, seguida de cerca por **LibreDTE** y **SimpleAPI** como alternativas sólidas según tu modelo de negocio.[^1](https://documentacion.simpleapi.cl)[^3](https://www.openfactura.cl/factura-electronica/precios/)

\---

## Resumen comparativo rápido

|Proveedor|DTE vía API (boleta/factura/NC)|Modelo de precios (alto nivel)|Sandbox / pruebas|Facilidad Node/Next|
|-|-|-|-|-|
|**LibreDTE**|Soporta prácticamente todos los DTE SII (33, 34, 39, 41, 52, 56, 61, exportación, etc.).[^5](https://core.libredte.cl/docs/lib/casos-de-uso)|Plan mensual pre‑pago con cupo de DTE incluidos y cobro por excedente (modelo mixto plan + por documento).[^7](https://www.libredte.cl/blog/2022-02-09-actualizacion-de-precios-2022)|Trial de 10 días con emisión de documentos temporales/borradores.[^3](https://www.libredte.cl/academy/integration/guide/requirements-for-dte-issuance-testing)|REST HTTP, JSON/XML/YAML; integrable desde cualquier lenguaje.[^10](https://www.libredte.cl/academy/integracion/emision-dte/flujo-general)|
|**SimpleAPI**|Permite generar **todos los documentos electrónicos disponibles en el SII** (boletas, facturas, notas, guías, etc.).[^2](https://www.simpleapi.cl/Productos/SimpleAPI)|Free hasta 500 consultas/mes; luego API key anual pagada o compra de código fuente (pago único). [^13](https://www.simpleapi.cl)|Puedes usar API key gratuita y trabajar en ambiente de certificación del SII; orientado a pruebas con Postman/tutoriales.[^13](https://www.youtube.com/watch?v=m1hPtNL6VHM)|Aunque el SDK es .NET, la API HTTP se puede consumir desde cualquier lenguaje.[^2](https://documentacion.simpleapi.cl)|
|**Nubox API**|Emisión de boletas electrónicas (39, 41) y otros documentos (facturas, compras, notas, etc.) vía endpoints para partners.[^15](https://developers.nubox.com/compra)[^17](https://www.nubox.com/factura-electronica)|API orientada a **partners**; precios no públicos, se negocian vía programa de alianzas / plan Nubox.[^18](https://www.nubox.com/beneficios-y-alianzas)|No hay sandbox público; requiere ser partner y obtener PartnerKey para usar la API.[^16](https://developers.nubox.com)|REST JSON, bien documentada pero cerrada a partners; integración técnica sencilla, acceso comercial más complejo.[^15](https://developers.nubox.com)|
|**Facturacion.cl**|Facturas electrónicas (33, 34, 46, etc.), boletas electrónicas (39, 41), notas de crédito/débito y guías de despacho mediante WebService SOAP.[^20](https://www.facturacion.cl/manualintegracion/archivoboletaintegracion.php)[^22](http://www.facturacion.cl/desis/sfpdf/desis/5a99b6cdf2d5a.pdf)|Se vende como **servicio de integración** + facturación; precios de API no claramente publicados, usualmente plan + implementación.[^20](http://www.facturacion.cl/desis/sfpdf/desis/5a99b6cdf2d5a.pdf)|Se prueba normalmente usando el ambiente de certificación del SII, no se expone un sandbox REST público.[^20](https://www.facturacion.cl/manualintegracion/archivoboletaintegracion.php)|Usa SOAP; integrable desde Node pero con más fricción (cliente SOAP, XML manual); documentación algo antigua.[^20](https://www.facturacion.cl/manualintegracion/archivofacturaelectronica.php)|
|**Haulmer / OpenFactura**|8 DTE soportados: factura, factura exenta, boleta, boleta exenta, nota de crédito, nota de débito, guía de despacho, liquidación-factura.[^4](https://www.openfactura.cl/factura-electronica/api/)|Planes desde aprox. 19.900 CLP anuales con **emisión ilimitada de documentos** para esos tipos.[^4](https://www.openfactura.cl/factura-electronica/precios/)|API REST con ambiente de desarrollo `dev-api.haulmer.com`, CAF simulado y dos API keys públicas sin necesidad de cuenta.[^1](https://jumpseller.cl/support/openfactura/)|API REST JSON muy limpia, docs modernas, ejemplos y dev env; integración muy directa desde Node/Next.[^1](https://www.openfactura.cl/articulos/integrate-a-la-api-de-openfactura/)|



\---

## 1\. Tipos de DTE que puedes emitir vía API

### LibreDTE

* Su documentación lista los tipos de DTE disponibles: factura electrónica 33, factura exenta 34, boleta electrónica 39, boleta exenta 41, guía de despacho 52, nota de débito 56, nota de crédito 61, facturas de compra y de exportación (110, 111, 112, etc.).[^5](https://core.libredte.cl/docs/lib/casos-de-uso)
* Estos DTE se pueden emitir vía API siguiendo el flujo de DTE temporal → DTE real → PDF/XML usando endpoints REST.[^11](https://www.libredte.cl/academy/integracion/emision-dte/emision-en-3-pasos)



### SimpleAPI

* La documentación indica que **permite generar todos los documentos electrónicos disponibles en el SII**, incluyendo boletas electrónicas, facturas afectas/exentas, notas de crédito/débito, guías de despacho, libros, etc.[^2](https://www.simpleapi.cl/Productos/SimpleAPI)
* Además expone APIs adicionales para operaciones relacionadas (boleta de honorarios, RCV, folios, mapas).[^2](https://documentacion.simpleapi.cl)



### Nubox API

* La API de emisión de boletas documenta explícitamente códigos de tipo de documento 39 (Boleta Electrónica) y 41 (Boleta Electrónica Exenta).[^15](https://developers.nubox.com/emision-boleta-info)
* La API de compras muestra soporte para múltiples tipos tributarios (facturas, notas de crédito, factura de compra, etc.), y Nubox como sistema comercial permite emitir facturas, boletas, notas de crédito/débito y guías de despacho.[^17](https://developers.nubox.com/compra)



### Facturacion.cl

* El manual de integración vía WebService describe emisión de Factura Electrónica, Guía de Despacho Electrónica, Nota de Crédito Electrónica, Nota de Débito Electrónica, entre otros DTE.[^20](http://www.facturacion.cl/desis/sfpdf/desis/5a99b6cdf2d5a.pdf)
* Sus especificaciones de formato listan explícitamente códigos SII para facturas (30, 32, 33, 34, 40, 45, 46), guías de despacho (50, 52), notas de débito (55, 56) y notas de crédito (60, 61).[^22](https://www.facturacion.cl/manualintegracion/archivofacturaelectronica.php)
* Para boletas electrónicas define los tipos 39 y 41 con su estructura de archivo de integración.[^21](https://www.facturacion.cl/manualintegracion/archivoboletaintegracion.php)



### Haulmer / OpenFactura

* La página de precios indica que OpenFactura permite emitir 8 documentos electrónicos: factura electrónica, factura no afecta/exenta, boleta electrónica, boleta exenta electrónica, nota de débito, nota de crédito, guía de despacho y liquidación factura electrónica.[^4](https://www.openfactura.cl/factura-electronica/precios/)
* Estos documentos se emiten vía API REST, donde el cuerpo incluye el campo `TipoDTE` (por ejemplo 33 para factura electrónica) dentro del nodo `dte`.[^24](https://www.openfactura.cl/factura-electronica/api/)

\---

## 2\. Modelo de precios

### LibreDTE

* LibreDTE opera con servicios pre‑pago: planes con un número de DTE incluidos al mes y cobro variable por documento emitido sobre la cuota.[^7](https://www.libredte.cl/blog/tags/servicios-y-precios)
* Para API se han manejado planes Estándar, PYME y Premium con cobro mensual fijo (por ejemplo, Estándar 10.000 CLP, PYME 40.000 CLP, Premium 80.000 CLP en una actualización 2022), manteniendo tarifas por DTE excedente.[^8](https://www.libredte.cl/blog/tags/servicios-y-precios)
* Para la edición web (no solo API), se mencionan servicios como MIPYME y Plus con precios mensuales; el modelo general para API es **plan mensual + costo por documento extra**, más que “pago sólo por documento”.[^28](https://www.libredte.cl/blog/2022-02-09-actualizacion-de-precios-2022)



### SimpleAPI

* El sitio indica que SimpleAPI se puede usar **gratis hasta 500 consultas al mes**, reiniciándose el contador el día 1 de cada mes.[^13](https://www.simpleapi.cl)
* Para más consultas, debes comprar una API key de **pago anual**, y también ofrecen la compra del código fuente con **pago único**, sin restricciones de uso en tu propio servidor.[^12](https://www.simpleapi.cl)
* El pricing se basa en número de requests, no explícitamente en número de DTE emitidos, aunque en la práctica emitir un DTE implica varias llamadas.[^13](https://www.simpleapi.cl)



### Nubox API

* La API está orientada a **partners**: varios endpoints declaran “API endpoint exclusivo para partners que trabajen con factura electrónica” y requieren PartnerKey.[^16](https://developers.nubox.com/clientes)[^15](https://developers.nubox.com/emision-boleta-info)
* Nubox ofrece un programa de partners para integrar su API de factura y administración; el modelo de precios del API no es público y se negocia como alianza comercial o asociado a los planes de Nubox.[^18](https://www.nubox.com/beneficios-y-alianzas)



### Facturacion.cl

* Facturacion.cl vende un **servicio de integración** y facturación: su manual se refiere a un “Servicio de Integración” que incluye certificación e integración de documentos electrónicos básicos (facturas, guías, notas), con diseño de impreso.[^23](https://www.facturacion.cl/manualintegracion/integracionservicioweb.php)
* Los documentos públicos revisados no detallan tarifas exactas para la API; sí se ven otros servicios (por ejemplo pagos presenciales con terminal) con cargos de habilitación y mensualidad, lo que sugiere un enfoque de **proyecto + plan mensual**, más que un simple “API auto‑service por DTE”.[^30](http://www.facturacion.cl/desis/sfpdf/desis/5a99b6cdf2d5a.pdf)



### Haulmer / OpenFactura

* OpenFactura muestra planes desde aproximadamente **19.900 CLP anuales**, permitiendo emitir los 8 tipos de documentos electrónicos soportados sin límites de cantidad.[^4](https://www.openfactura.cl/factura-electronica/precios/)
* No se menciona un cobro por documento emitido; el modelo es **licencia anual por contribuyente**, con emisión ilimitada de DTE dentro de esos tipos.[^4](https://www.openfactura.cl/factura-electronica/precios/)

\---

## 3\. Calidad y disponibilidad de la documentación de API

### LibreDTE

* Tiene un portal de documentación (“LibreDTE Core”) que separa biblioteca PHP y servicios web (API), describiendo endpoints, casos de uso y DTE disponibles.[^10](https://core.libredte.cl/docs/lib/documentos-tributarios)[^32](https://www.libredte.cl/docs)
* La “Academy” incluye guías paso a paso para el flujo de emisión (temporal → real → PDF) y ejemplos de integración detallados, incluyendo un ejemplo completo en PHP con el cliente oficial de la API.[^27](https://www.libredte.cl/academy/integracion/emision-dte/ejemplo-php)[^11](https://www.libredte.cl/academy/integracion/emision-dte/flujo-general)
* La documentación está razonablemente actualizada y cubre requisitos, configuración de folios y firma, por lo que es de buena calidad para desarrolladores.[^3](https://www.libredte.cl/faq/folios-y-control/como-se-solicitan-y-cargan-los-folios)



### SimpleAPI

* Tiene un sitio de documentación técnica donde explica la arquitectura, límites de uso (rate limits), autenticación por API key y los distintos servicios (DTE, RCV, boletas de honorarios, folios, etc.).[^2](https://documentacion.simpleapi.cl)
* Proporciona tutoriales y videotutoriales sobre generación de DTE, uso del SDK y uso con Postman, orientados a desarrolladores.[^35](https://www.simpleapi.cl/Tutoriales/GenerarDTE)[^37](https://www.simpleapi.cl/Tutoriales/Videotutoriales)
* Aunque el SDK principal es C#, toda la API está basada en HTTP, y la doc deja claro que se puede consumir desde cualquier lenguaje con peticiones HTTP.[^2](https://documentacion.simpleapi.cl)



### Nubox API

* Nubox dispone de un portal para developers con documentación organizada por recursos (boletas, compras, clientes, PDF, etc.), incluyendo parámetros, códigos SII y requisitos de autenticación.[^19](https://developers.nubox.com/clientes)[^15](https://developers.nubox.com/compra)
* La doc es clara y moderna (REST, JSON), pero muchos endpoints son “exclusivos para partners”, por lo que en la práctica necesitas un acuerdo previo para usarla.[^16](https://developers.nubox.com)



### Facturacion.cl

* La documentación consiste en **manuales de integración** en HTML y PDF: uno general para WebService y otros específicos para formatos de archivo de boleta y factura.[^20](https://www.facturacion.cl/manualintegracion/archivoboletaintegracion.php)[^22](https://www.facturacion.cl/manualintegracion/archivofacturaelectronica.php)
* La estructura está muy alineada a la especificación del SII (campos, códigos, obligatoriedad), pero la tecnología de integración está basada en SOAP y varios documentos son antiguos (por ejemplo, manual de 2008).[^22](https://www.facturacion.cl/manualintegracion/integracionservicioweb.php)
* Es usable, pero menos developer‑friendly si estás acostumbrado a APIs REST JSON modernas.



### Haulmer / OpenFactura

* OpenFactura ofrece docs de API RESTful basadas en HTTP con mensajes JSON, explicando claramente endpoints, ambientes y autenticación.[^1](https://docsapi-openfactura.haulmer.com)
* El mismo sitio explica que existe un entorno de desarrollo completamente operativo con ejemplos y dos API keys públicas, lo que facilita mucho la integración.[^1](https://docsapi-openfactura.haulmer.com)
* Además de la doc de API, tienen artículos orientados a developers (“¡Intégrate a la API de OpenFactura!”) donde explican el enfoque y cómo solicitar una API key productiva.[^26](https://www.openfactura.cl/articulos/integrate-a-la-api-de-openfactura/)

\---

## 4\. Requisitos para integrarse (certificado, CAF, firma, etc.)

### Requisitos generales SII (aplican a todos)

* En Chile, para emitir DTE necesitas: inicio de actividades, certificación de documentos, certificado digital vigente y folios CAF autorizados por el SII para cada tipo de documento.[^38](https://profitar.app/cl/facturacion-electronica-chile)
* El certificado digital es un archivo .pfx/.p12 emitido por proveedores acreditados (E‑Sign, E‑Certchile, Acepta, etc.), que firma electrónicamente cada documento.[^40](https://profitar.app/cl/facturacion-electronica-chile)[^38](https://www.apigateway.cl/academy/integracion-para-la-emision-de-dte/introduccion/requisitos-de-emision)



### LibreDTE

* Para pruebas de integración y emisión de DTE:

  * Crear una cuenta de usuario y registrar una empresa en LibreDTE.[^9](https://www.libredte.cl/academy/integracion/emision-dte/requisitos)
  * En producción, subir la **Firma Electrónica Simple** del representante legal (certificado digital) y configurar los folios CAF (archivos CAF autorizados por el SII).[^3](https://www.libredte.cl/academy/integration/guide/requirements-for-dte-issuance-testing)
* Durante el período de prueba (10 días), sólo puedes emitir documentos temporales/borradores, por lo que no necesitas aún subir firma ni CAF para pruebas iniciales.[^3](https://www.libredte.cl/academy/integracion/emision-dte/requisitos)



### SimpleAPI

* Requiere obtener un **API key** (gratuito o de pago) para autenticar todas las llamadas.[^12](https://documentacion.simpleapi.cl)
* Necesitas tener un **certificado digital instalado en tu equipo** (.pfx) y un archivo CAF para el timbraje, que se obtiene postulando como emisor de DTE en el SII y descargando el CAF correspondiente.[^14](https://www.simpleapi.cl/Productos/SimpleAPI)
* La doc recalca que en Chile se certifican los documentos del contribuyente, no el software; cada contribuyente debe certificar sus documentos por tipo al menos una vez.[^12](https://www.simpleapi.cl/Productos/SimpleAPI)



### Nubox API

* Los endpoints de emisión requieren autenticación (token) y, en algunos casos, una **PartnerKey** que identifica al partner como único.[^29](https://developers.nubox.com/compra)
* Como sistema de facturación, Nubox se encarga de la relación con el SII, pero igualmente cada empresa debe cumplir con requisitos de facturación electrónica; la doc orienta a leer prerequisitos antes de consumir recursos.[^17](https://developers.nubox.com)



### Facturacion.cl

* El manual indica que la integración usa WebService SOAP para emitir DTE, basándose en archivos de integración que representan el documento (XML o TXT) con la información tributaria exigida.[^20](https://www.facturacion.cl/manualintegracion/archivofacturaelectronica.php)
* Aunque el manual de requisitos específicos no se detalla en las páginas consultadas, como facturador autorizado se espera que el contribuyente tenga certificado digital y folios CAF configurados, alineado con la normativa general del SII.[^21](https://www.apigateway.cl/academy/integracion-para-la-emision-de-dte/introduccion/requisitos-de-emision)



### Haulmer / OpenFactura

* Los términos de servicio indican explícitamente que **OpenFactura no proporciona certificado de firma electrónica**, por lo que el usuario debe entregar o comprar su firma electrónica para que la aplicación funcione correctamente.[^41](https://docs.openfactura.cl/empresa/terminos-y-condiciones.html)
* Para emitir boleta electrónica, OpenFactura menciona como requisito contar con un software de facturación electrónica y un certificado digital o firma electrónica válida para DTE.[^42](https://www.openfactura.cl/articulos/boleta-electronica-requisitos-conocelos/)
* Para usar la API en producción, debes contratar OpenFactura y obtener una API key asociada a tu empresa; en entorno de desarrollo puedes probar sin cuenta usando las API keys públicas.[^43](https://docsapi-openfactura.haulmer.com)

\---

## 5\. ¿Tienen ambiente de pruebas (sandbox) gratuito?

### LibreDTE

* Ofrece un período de prueba de 10 días del **Servicio Plus**, donde puedes integrar y emitir sólo documentos temporales/borradores, sin necesidad de firma ni CAF.[^9](https://www.libredte.cl/academy/integracion/emision-dte/requisitos)
* Es suficiente para validar tu integración y flujo desde tu SaaS, pero no para pruebas “end‑to‑end” con aceptación SII, porque esos documentos no se envían realmente al SII.[^3](https://www.libredte.cl/academy/integracion/emision-dte/requisitos)



### SimpleAPI

* Puedes conseguir un **API key gratuito** desde su sitio y usar la API hasta 500 consultas al mes sin costo.[^13](https://www.simpleapi.cl/Productos/SimpleAPI)
* Los tutoriales muestran cómo usar la API con Postman y cómo obtener CAF desde el SII mediante la propia API, incluyendo selección de ambiente de certificación (valor 0) o producción (valor 1), lo que permite probar en el entorno de certificación del SII.[^14](https://documentacion.simpleapi.cl)
* En la práctica, esto funciona como un sandbox basado en el ambiente de certificación del SII, siempre que tengas certificado digital y contribuyente de prueba.



### Nubox API

* La documentación no muestra un sandbox público; los endpoints relevantes son “exclusivos para partners” y requieren PartnerKey y autenticación asociada a una cuenta Nubox.[^19](https://developers.nubox.com/compra)
* Es probable que Nubox ofrezca ambientes de prueba a sus partners, pero esto no es autogestionado ni gratuito de forma abierta.



### Facturacion.cl

* El esquema de pruebas suele apoyarse en el **ambiente de certificación del SII**, usando archivos de integración y WebService SOAP.[^21](https://www.facturacion.cl/manualintegracion/integracionservicioweb.php)
* No se expone un sandbox REST ni claves públicas; las pruebas dependen de tener una cuenta en Facturacion.cl y configurar la integración, por lo que no es tan simple como un “sandbox auto‑service”.



### Haulmer / OpenFactura

* La doc de API explica que OpenFactura ofrece un **entorno de desarrollo completamente operativo** para integrar tus aplicaciones sin requerir una cuenta.[^1](https://docsapi-openfactura.haulmer.com)
* En este entorno se usan **CAF simulados**, por lo que el timbre no es validable, pero puedes emitir DTE de prueba y consumir la API con dos API keys públicas incluidas en la doc, contra `https://dev-api.haulmer.com`.[^1](https://docsapi-openfactura.haulmer.com)
* Además, integraciones como la de Jumpseller se entregan con una **demostración activada por defecto**, con emisiones de prueba visibles en learn‑openfactura.haulmer.com.[^25](https://jumpseller.cl/support/openfactura/)

\---

## 6\. Facilidad de integración desde Next.js / Node.js

### Criterios técnicos

Para una app Next.js 14+/Node, lo ideal es:

* API REST sobre HTTP(S), con JSON.
* Autenticación simple (API key/Bearer token).
* Buen sandbox y ejemplos claros.



### LibreDTE

* Ofrece servicios web (API) que pueden usarse desde cualquier lenguaje vía HTTP, aunque su cliente oficial es PHP.[^33](https://www.libredte.cl/academy/integracion/emision-dte/flujo-general)[^10](https://core.libredte.cl/docs)
* Endpoints REST aceptan JSON, XML o YAML, y los flujos están documentados (DTE temporal, DTE real, PDF).[^11](https://www.libredte.cl/academy/integracion/emision-dte/emision-en-3-pasos)
* Desde Node/Next, la integración es relativamente directa usando `fetch`/`axios`, pero debes manejar bien el modelo de datos DTE; no hay SDK oficial en JS.



### SimpleAPI

* Aunque el SDK principal está en C#, la doc aclara que **puede ser consumida desde cualquier lenguaje que soporte peticiones HTTP**.[^2](https://documentacion.simpleapi.cl)
* Necesitas manejar certificados cliente y archivos XML en algunos casos, más la API key y la lógica de obtención de CAF; hay bastante material de ejemplos, pero no en JS directamente.[^36](https://www.youtube.com/watch?v=m1hPtNL6VHM)[^2](https://documentacion.simpleapi.cl)
* La parte de gestión de certificado digital (PFX) puede ser algo más incómoda desde Node en comparación con .NET, aunque manejable si dejas esa capa en un microservicio separado.



### Nubox API

* Técnicamente es una API REST JSON con endpoints bien definidos para boletas, compras, clientes y PDFs, por lo que desde Node/Next la integración es trivial en lo puramente técnico.[^15](https://developers.nubox.com/clientes)[^16](https://developers.nubox.com/compra)
* El problema práctico es el acceso: requiere ser **partner** y obtener PartnerKey y credenciales; esto no calza tan bien con un SaaS pequeño que quiere auto‑servicio y baja fricción inicial.[^18](https://developers.nubox.com/compra)



### Facturacion.cl

* La integración es vía **SOAP WebService**, lo que implica trabajar con XML y un cliente SOAP (p.ej. `strong-soap` o `soap` en Node) o un microservicio intermedio.[^20](https://www.facturacion.cl/manualintegracion/integracionservicioweb.php)
* Además, debes construir archivos de integración con formatos específicos para boletas y facturas según tablas de campos y códigos.[^22](https://www.facturacion.cl/manualintegracion/archivoboletaintegracion.php)
* Es perfectamente viable, pero comparado con una API REST JSON, supone mayor complejidad en un stack moderno como Next.js/Node.



### Haulmer / OpenFactura

* La API es **RESTful, basada en HTTP con JSON** para requests y responses, exactamente lo que quieres para Node/Next.[^24](https://docsapi-openfactura.haulmer.com)
* Define claramente URLs para producción (`https://api.haulmer.com`) y desarrollo (`https://dev-api.haulmer.com`), con API keys y ejemplos listos para probar.[^1](https://docsapi-openfactura.haulmer.com)
* El hecho de tener API keys públicas para dev y CAF simulado permite que montes tu integración en local/preview sin coordinar nada comercial al inicio.[^25](https://docsapi-openfactura.haulmer.com)

\---

## Recomendación para tu SaaS (PyMEs, bajo costo + buena documentación)

Dado tu contexto (SaaS multi‑tenant para PyMEs chilenas, stack Next.js/Node, foco en automatización y baja fricción) te propongo esta priorización:

### 1\) Haulmer / OpenFactura – Opción principal recomendada

**Por qué encaja especialmente bien:**

* **Modelo simple y predecible:** pago anual por empresa, emisiones ilimitadas de los DTE más usados (facturas, boletas, notas, guías).[^4](https://www.openfactura.cl/factura-electronica/precios/)
* **Excelente sandbox:** entorno dev público (`dev-api.haulmer.com`) con API keys de prueba y CAF simulado, sin necesidad de cuenta para probar.[^1](https://docsapi-openfactura.haulmer.com)
* **API moderna:** REST + JSON, bien documentada, con ejemplos claros; ideal para Next.js/Node.[^26](https://www.openfactura.cl/factura-electronica/api/)[^1](https://docsapi-openfactura.haulmer.com)
* **Enfoque developer‑friendly:** artículos explicativos y complementos (ej. integración con Jumpseller y Google Sheets) que muestran casos reales de integración masiva, alineados a lo que harás en un SaaS.[^44](https://jumpseller.cl/support/openfactura/)

**Trade‑offs:**

* Cada cliente deberá tener su certificado digital y CAF configurados en OpenFactura, pero eso es cierto para casi cualquier proveedor.[^41](https://www.openfactura.cl/articulos/boleta-electronica-requisitos-conocelos/)
* Estás atado al modelo de licenciamiento de Haulmer por contribuyente; si planeas miles de RUT muy pequeños, conviene revisar bien la escala de precios.



### 2\) LibreDTE – Alternativa sólida, especialmente si quieres más control

**Pros:**

* Soporta un rango muy amplio de DTE (incluyendo exportaciones) y tiene base instalada grande en Chile.[^45](https://core.libredte.cl/docs/lib/casos-de-uso)[^5](https://libredte.cl/consultar)
* Documentación extensa, con guías de integración y Academy que cubren desde requisitos hasta flujo de emisión.[^32](https://core.libredte.cl/docs)[^11](https://www.libredte.cl/academy/integracion/emision-dte/requisitos)
* Modelo de cobro **plan + por documento excedente** pre‑pago, que puede ser interesante si tienes volumen moderado y quieres controlar el costo por DTE.[^8](https://www.libredte.cl/blog/tags/servicios-y-precios)

**Contras:**

* Sandbox limitado a 10 días y sólo documentos temporales; para pruebas largas o staging continuo no es tan cómodo como el sandbox permanente de OpenFactura.[^3](https://www.libredte.cl/academy/integracion/emision-dte/requisitos)
* Cliente oficial en PHP; desde Node debes trabajar directamente contra la API REST, lo cual es totalmente viable pero sin SDK JavaScript oficial.[^10](https://www.libredte.cl/academy/integracion/emision-dte/ejemplo-php)



### 3\) SimpleAPI – Muy interesante para early stage (free tier) si no te molesta el enfoque .NET

**Pros:**

* **Gratis hasta 500 consultas/mes**, ideal para pruebas, MVP y primeros clientes.[^13](https://www.simpleapi.cl)
* Permite generar todos los DTE del SII y además automatizar cosas como obtención de CAF, RCV y boletas de honorarios vía API.[^14](https://www.simpleapi.cl/Productos/SimpleAPI)[^2](https://documentacion.simpleapi.cl)
* Buena documentación y videotutoriales orientados a integrarse con el SII paso a paso.[^37](https://www.youtube.com/watch?v=ULJZm53eQvA)[^2](https://documentacion.simpleapi.cl)

**Contras:**

* Principal SDK y ejemplos en C#; desde Node consumirás la API HTTP directamente y puede ser más cómodo envolverlo en un microservicio .NET si quieres aprovechar del todo el SDK.[^36](https://documentacion.simpleapi.cl)
* Requiere manejo cuidadoso de certificado digital y CAF desde tu backend, algo que OpenFactura y LibreDTE abstraen parcialmente a nivel de plataforma.[^12](https://www.youtube.com/watch?v=m1hPtNL6VHM)[^3](https://www.libredte.cl/academy/integracion/emision-dte/requisitos)



### 4\) Nubox API – Buena técnicamente, pero poco adecuada para un SaaS pequeño

* API REST bien documentada, pero fuertemente orientada a **ecosistema de partners**, con PartnerKey y acuerdos comerciales no públicos.[^15](https://developers.nubox.com/compra)[^18](https://developers.nubox.com)
* Más razonable si te quieres posicionar como partner de Nubox y no tanto como plataforma independiente para muchas PyMEs diversas.



### 5\) Facturacion.cl – Sólo considerarlo si tienes motivos fuertes (cliente legado, etc.)

* Documentación cumple pero está centrada en SOAP, con manuales antiguos y formatos de archivo muy pegados a la especificación XML del SII.[^21](https://www.facturacion.cl/manualintegracion/archivofacturaelectronica.php)[^20](https://www.facturacion.cl/manualintegracion/integracionservicioweb.php)
* Para un stack moderno y un SaaS que prioriza rapidez de integración y mantenibilidad, es claramente menos atractivo que un REST JSON como OpenFactura, LibreDTE o SimpleAPI.[^10](https://documentacion.simpleapi.cl)[^1](https://docsapi-openfactura.haulmer.com)

\---

## Siguiente paso práctico

Para avanzar con tu SaaS te sugeriría:

1. **Prototipo rápido con OpenFactura**

   * Usar `https://dev-api.haulmer.com` y las API keys públicas para implementar el flujo básico de emisión de factura/boleta (POST DTE → obtener PDF/XML) desde tu backend Node.[^24](https://docsapi-openfactura.haulmer.com)
2. **Diseñar la capa multi‑tenant**

   * Modelar por RUT emisor: guardar token/API key de OpenFactura, datos de emisor y configuración de DTE por empresa; esto te servirá igual si en el futuro agregas LibreDTE o SimpleAPI como “drivers” alternativos.[^4](https://documentacion.simpleapi.cl)[^3](https://www.libredte.cl/academy/integracion/emision-dte/requisitos)
3. **Dejar la puerta abierta a un segundo proveedor**

   * Diseñar tu módulo de facturación como interfaz (`FacturaProvider`) con implementaciones `OpenFacturaProvider`, `LibreDTEProvider`, etc., para poder cambiar o combinar proveedores si cambian precios o regulaciones del SII.

Si quieres, en un siguiente mensaje puedo ayudarte a diseñar una **interfaz de proveedor de facturación electrónica** en TypeScript (para tu backend Next.js) con un ejemplo concreto de implementación contra la API de OpenFactura.
<span style="display:none">[^46](https://www.chilesystems.com/Productos)[^48](https://www.facebook.com/groups/desarrolladoreschile/posts/27276944038608581/)[^50](https://globalresponse.cl/forum/how-to)[^52](https://facto.cl/documentacion/api/es/ejemplos/chile/intro-a-e-invoice/)[^54](https://www.billmysales.com/apps/billers/libredte)[^56](https://www.sii.cl/factura_electronica/guia_inst_cert_digital.htm)[^58](https://www.openfactura.cl)[^60](https://www.webfactura.cl/api/)[^62](https://www.enternet.cl/recursos/glosario)</span>

<div align="center">⁂</div>

