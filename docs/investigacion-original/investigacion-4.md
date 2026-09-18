Arquitectura e Implementación de Pagos Recurrentes para SaaS en Next.js mediante Flow.cl
El desarrollo y despliegue de plataformas de Software as a Service (SaaS) orientadas a Pequeñas y Medianas Empresas (PyMEs) requiere una infraestructura de facturación y cobro robusta, altamente automatizada y profundamente adaptada a la realidad normativa y financiera local. En el contexto del mercado chileno, la pasarela de pagos Flow se ha posicionado como un agregador tecnológico fundamental, destacando por su amplio soporte para múltiples medios de pago, su integración fluida con la red de Webpay para la ejecución de cargos automáticos recurrentes y su notable ausencia de costos fijos mensuales o tarifas de mantención. La implementación de un ecosistema de suscripciones sobre esta pasarela exige un entendimiento exhaustivo de su API REST, sus rigurosos mecanismos de seguridad criptográfica, el ciclo de vida transaccional de los cobros y la gestión asíncrona de eventos de estado mediante webhooks.
Este documento técnico presenta una guía arquitectónica y operativa profunda para diseñar e implementar el flujo completo de cobros mensuales, la gestión programática de periodos de prueba (trials) gratuitos y el manejo avanzado de estados de suscripción utilizando Next.js como entorno de desarrollo unificado, aprovechando tanto las capacidades del frontend interactivo mediante React como la solidez del backend a través de Node.js y las Route Handlers de su App Router.
Marco Legal y Requisitos de Afiliación Comercial en Chile
Antes de iniciar la integración técnica a nivel de código fuente y arquitectura de software, resulta imperativo establecer correctamente la entidad legal y cumplir con todos los requisitos normativos exigidos por la pasarela de pagos. La correcta configuración de estos aspectos garantiza la operatividad ininterrumpida de un modelo de negocio basado en cobros recurrentes y asegura el cumplimiento fiscal.
El proceso de registro en la plataforma permite operar comercialmente bajo dos figuras legales principales: como Persona Natural (con o sin inicio de actividades y giro comercial formal) o como Persona Jurídica (empresa legalmente constituida, como una Sociedad por Acciones o una Empresa Individual de Responsabilidad Limitada). Para un modelo SaaS B2B (Business to Business) dirigido a PyMEs, el estándar de la industria y la recomendación contable principal es operar invariablemente como Persona Jurídica. Esta figura permite una correcta emisión de facturas electrónicas, deducción de gastos operativos y una separación patrimonial clara.
El proceso de validación y registro de la entidad requiere atravesar múltiples etapas de verificación documental e identitaria. En una primera instancia de verificación de identidad, el representante legal debe proporcionar sus datos personales exactos y verificar su número de teléfono celular mediante un código SMS, un paso crítico para garantizar la seguridad inicial de la cuenta frente a posibles fraudes. Posteriormente, se debe aportar información comercial y tributaria detallada, declarando el rubro específico del negocio, la dirección comercial registrada y la condición tributaria de la actividad económica frente al Servicio de Impuestos Internos (SII) de Chile, especificando particularmente si los servicios de software prestados están afectos o exentos del Impuesto al Valor Agregado (IVA).
En paralelo, es estrictamente necesario proveer la identidad visual de la empresa, incluyendo datos de contacto público y el logotipo oficial del comercio. Estos elementos visuales son de vital importancia, ya que se inyectarán de manera automática en los comprobantes de pago transaccionales que la plataforma envía por correo electrónico a los clientes finales tras cada cobro recurrente. Finalmente, para la consolidación financiera, se requiere vincular una cuenta bancaria nacional, ya sea cuenta corriente, cuenta vista o cuenta RUT, que debe estar estrictamente a nombre de la persona natural o jurídica registrada en la plataforma. Hacia esta cuenta bancaria se realizarán las liquidaciones o abonos de los fondos recaudados según la periodicidad seleccionada.
La habilitación del servicio específico de suscripciones requiere la aceptación de condiciones legales particulares. El servicio de "Cargo Automático" impone la aceptación de Términos y Condiciones Especiales adicionales a los términos generales de uso de la plataforma. Este marco contractual regula de forma explícita la responsabilidad del comercio en la obtención y custodia de la autorización del pagador. Un elemento crítico en este contrato es la asunción del riesgo financiero; el comercio asume íntegramente la responsabilidad y el riesgo patrimonial asociado a los contracargos. Los contracargos ocurren cuando el titular de la tarjeta desconoce un cargo recurrente ante su banco emisor, lo que desencadena una reversión de los fondos. En un modelo SaaS, mitigar este riesgo legal y financiero exige mantener políticas de cancelación claras, proporcionar canales de soporte accesibles y enviar notificaciones previas al cargo, asegurando que las PyMEs clientes reconozcan inequívocamente el origen del cobro en sus cartolas bancarias.
Estructura Analítica de Costos, Comisiones y Liquidaciones
El modelo de monetización de la plataforma se fundamenta puramente en una tarifa transaccional por uso, eliminando barreras financieras de entrada al descartar la existencia de costos de inscripción inicial, tarifas de mantención mensual o cobros fijos periódicos por disponibilidad del servicio. Para un software en formato suscripción con cobros recurrentes mensuales, las comisiones se aplican de manera exclusiva sobre cada cargo exitoso procesado por el motor de facturación.
La estructura matemática que define la comisión neta por transacción se rige por la aplicación de una tasa porcentual multiplicada por el monto total pagado, sumado a un costo fijo cuando la modalidad lo requiere. Sobre el resultado de esta ecuación se debe aplicar el Impuesto al Valor Agregado (IVA) correspondiente a la comisión del servicio, que en la jurisdicción chilena equivale actualmente al 19%. Cabe destacar que el servicio de procesamiento es complemente gratuito para la entidad que realiza el pago; la plataforma no transfiere recargos adicionales al cliente final de manera oculta.
La plataforma ofrece distintas modalidades de abono, es decir, el plazo en el cual los fondos recaudados son transferidos a la cuenta bancaria del comercio. Para el procesamiento de tarjetas de crédito, débito y prepago, que incluye la infraestructura de Webpay y el sistema de Cargo Automático, las tasas se configuran de la siguiente manera :
Plazo de Abono (Liquidación)
Tasa Porcentual Base
Costo Fijo por Transacción
Consideraciones Financieras
Abono al tercer día hábil
2,89% + IVA
$0 CLP
Representa la modalidad más eficiente en costos para un flujo de caja regular y predecible en modelos SaaS.
Abono al día hábil siguiente
3,19% + IVA
$0 CLP
Opción acelerada diseñada para empresas que requieren liquidez operativa inmediata, asumiendo un margen de costo marginalmente superior.

Para el procesamiento de transferencias bancarias directas, existe una tarifa altamente competitiva del 0,99% + IVA, acoplada a un costo fijo de $100 CLP + IVA, manteniendo el abono al tercer día hábil. No obstante, en la arquitectura de un modelo SaaS automatizado, la fricción de requerir transferencias manuales recurrentes deteriora la retención de clientes. Por consiguiente, la tokenización de tarjetas de crédito o débito para el cargo automático sin intervención del usuario constituye el estándar operativo indiscutible, asumiendo la tasa del 2,89% o 3,19%. Además, si la empresa de software factura volúmenes transaccionales superiores a los 50 millones de pesos chilenos mensuales, existe la viabilidad de negociar estructuras tarifarias personalizadas contactando directamente al departamento comercial de la pasarela.
El ciclo de vida de un servicio SaaS inevitablemente conlleva la gestión de insatisfacciones, cancelaciones tardías o errores de doble facturación, escenarios que derivan en la necesidad operativa de emitir reembolsos. La arquitectura financiera de la plataforma establece que cada proceso de reembolso ejecutado conlleva una tarifa de procesamiento de $202 CLP netos, lo que asciende a un total de $240 CLP al incluir el IVA. Este costo no se exige por adelantado, sino que se descuenta contablemente de la siguiente liquidación de fondos del comercio, y la facturación de este servicio particular se emite únicamente una vez que el cliente pagador ha interactuado con la plataforma para aceptar formalmente el reembolso. El flujo de reembolso exige que el pagador lo acepte en un plazo de diez días corridos; de no hacerlo, los fondos retenidos retornan al balance del comercio.
Entornos de Desarrollo: Aislamiento entre Sandbox y Producción
La construcción de una integración financiera en Next.js exige la adopción de una arquitectura estrictamente orientada a múltiples entornos, separando rigurosamente el código en fase de pruebas del entorno operativo expuesto a clientes reales. La pasarela provee un entorno de pruebas denominado Sandbox, el cual emula con precisión el comportamiento de los servidores de producción, permitiendo ejecutar el flujo completo de la API REST sin movilizar fondos reales ni interactuar con las redes interbancarias reales.
La comunicación mediante protocolo HTTP se dirige a dos dominios base diferenciados según el entorno. Para el entorno Sandbox, las peticiones deben dirigirse a la URL https://sandbox.flow.cl/api, mientras que en el entorno de producción operativo, los recursos residen en https://www.flow.cl/api. En una aplicación Next.js, esta dualidad se maneja mediante el uso de variables de entorno, configurando un archivo .env.local para el desarrollo local que apunte al Sandbox, y configurando las variables definitivas en la plataforma de despliegue, como Vercel o AWS, apuntando al dominio de producción.
Para validar exhaustivamente la lógica de negocio, el entorno Sandbox facilita el uso de credenciales y tarjetas de prueba simuladas. La documentación técnica especifica que, para efectuar pruebas de enrolamiento de tarjetas orientadas a pagos recurrentes, el desarrollador está facultado para ingresar cualquier secuencia numérica que simule un número de tarjeta de crédito, acompañado de cualquier fecha de expiración que corresponda a un mes y año en el futuro, y utilizando un código de seguridad o CVV genérico, habitualmente el valor 123. La utilización de estos datos simulados en el Sandbox desencadena una respuesta de éxito en el proceso de tokenización, permitiendo a los ingenieros observar el comportamiento de los webhooks y las transiciones de estado en la base de datos local sin restricciones.
Seguridad Criptográfica y Autenticación de la API
La arquitectura de seguridad implementada por la pasarela difiere de los esquemas de autenticación modernos más convencionales, desestimando el uso de tokens al portador estáticos (Bearer tokens) o JSON Web Tokens (JWT) inyectados en las cabeceras HTTP de autorización. En su defecto, la plataforma ha adoptado un modelo de seguridad transaccional basado en firmas digitales dinámicas calculadas mediante el uso de funciones hash criptográficas, específicamente el algoritmo HMAC-SHA256. Este diseño criptográfico garantiza la integridad absoluta de los datos transmitidos, autentica la identidad del emisor en cada petición y proporciona una garantía robusta de no repudio operativo.
Todas las comunicaciones hacia los endpoints de la API requieren que el cuerpo de la solicitud HTTP (Payload) sea serializado bajo el formato estandarizado application/x-www-form-urlencoded, el cual debe ser declarado explícitamente en la cabecera Content-Type de la petición. Cada petición individual, sin excepción, debe incluir el parámetro apiKey, que funciona como el identificador público del comercio, y un parámetro de vital importancia denominado s, que alberga la firma digital hexadecimal de todos los parámetros de la solicitud, generada utilizando la secretKey privada del comercio.
El proceso de generación de esta firma criptográfica exige una rutina estricta de ordenamiento y concatenación. Los parámetros de la solicitud deben ordenarse alfabéticamente según el nombre de su clave (key). Una vez ordenados, cada clave y su valor correspondiente se concatenan de forma secuencial, sin espacios ni delimitadores intermedios, para conformar una única cadena de texto plana continua. Esta cadena resultante es sometida a la función HMAC-SHA256, utilizando la clave secreta del comercio como llave de cifrado, para producir una cadena hexadecimal que servirá como comprobante de autenticidad.
En un entorno basado en Next.js, la arquitectura de componentes de servidor es ideal para manejar este proceso de manera segura. Las llamadas a la API deben ejecutarse exclusivamente desde instancias de servidor, como las Route Handlers alojadas en el directorio app/api/ o mediante Server Actions, asegurando categóricamente que la secretKey permanezca oculta y jamás quede expuesta al entorno del cliente o navegador web. Una implementación robusta en TypeScript nativo para entornos Node.js requiere el uso del módulo de criptografía nativo.
La abstracción de este proceso puede modelarse mediante una clase utilitaria encargada de la firma y la preparación de los datos:
TypeScript
import { createHmac } from "node:crypto";

interface FlowParams {
  [key: string]: string | number | null | undefined;
}

export class FlowSignatureManager {
  private readonly secretKey: string;
  private readonly apiKey: string;

  constructor(apiKey: string, secretKey: string) {
    if (!apiKey ||!secretKey) {
      throw new Error("Credenciales de API insuficientes para inicializar el gestor de firmas.");
    }
    this.apiKey = apiKey;
    this.secretKey = secretKey;
  }

  public generateSignature(params: FlowParams): string {
    const paramsToSign: Record<string, string> = { apiKey: this.apiKey };
    
    for (const [key, value] of Object.entries(params)) {
      if (value!== undefined && value!== null && value!== "") {
        paramsToSign[key] = String(value);
      }
    }
    
    const sortedKeys = Object.keys(paramsToSign).sort();
    
    let stringToSign = "";
    for (let i = 0; i < sortedKeys.length; i++) {
      const key = sortedKeys[i];
      stringToSign += key + paramsToSign[key];
    }
    
    return createHmac("sha256", this.secretKey)
     .update(stringToSign)
     .digest("hex");
  }

  public buildUrlEncodedPayload(params: FlowParams): string {
    const signature = this.generateSignature(params);
    const formData = new URLSearchParams();
    
    formData.append("apiKey", this.apiKey);
    
    for (const [key, value] of Object.entries(params)) {
      if (value!== undefined && value!== null && value!== "") {
        formData.append(key, String(value));
      }
    }
    
    formData.append("s", signature);
    return formData.toString();
  }
}


Esta implementación encapsula la complejidad del ordenamiento alfabético y la concatenación, previniendo errores sutiles como la inclusión de valores nulos en la cadena de firma, lo cual resultaría en un rechazo ineludible por parte de los servidores de la pasarela debido a discrepancias en el hash resultante.
Arquitectura Modular del Sistema de Suscripciones
La interfaz de programación de aplicaciones (API) ha segmentado de manera lógica el dominio de los cobros recurrentes en una arquitectura relacional compuesta por múltiples entidades principales, cuyo entendimiento es fundamental para el diseño de la base de datos del SaaS.
La primera entidad corresponde a los Planes de Suscripción (Plan). Estos actúan como plantillas o arquetipos de facturación inmutables que definen los parámetros económicos y temporales del servicio, estableciendo el precio base, la moneda de cobro, la frecuencia o intervalo de generación del cargo (como ciclos mensuales o anuales) y la parametrización de los periodos de prueba gratuitos por defecto.
La segunda entidad radica en los Clientes (Customer). Estos registros digitales actúan como espejos o representaciones de los usuarios del SaaS dentro de la infraestructura de la pasarela. Cada cliente posee identificadores únicos y correos electrónicos asociados, formando la base sobre la cual se asientan las operaciones de pago.
Derivado de los clientes, se encuentra la entidad abstracta de las Tarjetas Enroladas. A través de un proceso estricto de tokenización que cumple con las normativas PCI-DSS de la industria de tarjetas de pago, los medios de pago físicos son convertidos en tokens seguros asociados intrínsecamente a un cliente específico, facultando a la plataforma para ejecutar la emisión de cargos automáticos sin requerir la retención ni el almacenamiento de los números de tarjeta originales en los servidores del SaaS.
El núcleo del modelo de negocio converge en la entidad Suscripción (Subscription). Este objeto digital actúa como el contrato vinculante o puente relacional que une a un cliente específico con un plan determinado. Una vez que la suscripción es instanciada, esta entidad asume el control absoluto del cronograma de cobros, calculando las fechas exactas de vencimiento, aplicando los periodos de prueba, y orquestando la invocación periódica del motor de facturación.
Finalmente, las Facturas o Importes (Invoice) representan las concreciones individuales de cada ciclo de cobro. Cada importe generado por una suscripción activa inicia su propio ciclo de vida, transitando desde un estado pendiente hasta un estado pagado, vencido o fallido.
El control de acceso de los usuarios en el SaaS depende inexorablemente de la interpretación correcta de dos propiedades fundamentales inyectadas en la entidad Suscripción: el estado general (status) y el nivel de morosidad (morose).
El parámetro status, representado numéricamente, dictamina la macrotendencia del ciclo de vida de la suscripción :
Valor de Status
Significado Operativo
Implicaciones en el SaaS
0
Inactiva
La suscripción ha sido creada pero el flujo del cronograma aún no ha comenzado a regir. El acceso debe permanecer restringido.
1
Activa
El ciclo de cobro está en pleno funcionamiento y el último pago fue procesado. El usuario ostenta privilegios plenos y acceso irrestricto a los recursos contratados.
2
En Periodo de Prueba (Trial)
El usuario se encuentra en la ventana de uso gratuito previa al primer intento de cargo real. A nivel lógico, el SaaS debe proveer un acceso equivalente al estado activo, aunque puede estar sujeto a limitaciones promocionales si el modelo de negocio lo requiere.
4
Cancelada
El contrato de suscripción ha sido terminado. El motor de cobros detiene toda actividad y el SaaS debe revocar las capacidades de escritura y uso general al expirar el ciclo temporal remanente.

A un nivel de granularidad más fino, el parámetro morose diagnostica la salud financiera inmediata de la suscripción activa :
Valor de Morose
Estado de Deuda
Acción Recomendada en el Sistema
0
Solvencia Total
Ninguna factura se encuentra vencida. Mantenimiento del acceso regular.
1
Morosidad
Una o más facturas han cruzado el umbral de vencimiento tras múltiples intentos de cobro fallidos. Es inminente la aplicación de restricciones de acceso y la ejecución de campañas de recuperación.
2
Cobro Pendiente
El importe actual se encuentra emitido y en proceso de cobro, pero aún permanece dentro del margen de los días de gracia estipulados. El servicio no debe ser interrumpido durante esta ventana transitoria.

Modelado de Datos y Arquitectura de Base de Datos Local
La consistencia de los datos entre el software como servicio y la pasarela de pagos demanda un diseño de base de datos relacional impecable. La adopción de un ORM (Object-Relational Mapping) como Prisma en el entorno de Next.js facilita enormemente la representación de este modelo. Conceptualmente, la estructura debe disociar la información del usuario de la información financiera, enlazándolas mediante claves externas consistentes.
El diseño óptimo para un ecosistema B2B requiere una jerarquía clara. La tabla Tenant o Company representa a la PyME cliente. La tabla User representa a los individuos que operan bajo ese entorno. La entidad crítica recae sobre la tabla Subscription, la cual debe alojar campos espejo para registrar el reflejo en tiempo real de la nomenclatura de la API externa.
Esta tabla debe almacenar obligatoriamente el flowSubscriptionId en formato de cadena de texto, actuando como la clave primaria externa para cualquier consulta futura de cancelación o modificación. Asimismo, debe mantener un registro de la plantilla original mediante el planId. La salud del acceso se controla almacenando el estado transaccional mediante campos equivalentes a la API: un status indexado que permita realizar filtros eficientes y un campo moroseStatus de tipo entero. Para calcular el acceso temporal sin necesidad de consultar permanentemente la API, se debe almacenar un campo de fecha y hora, denominado currentPeriodEnd, calculado de forma automática a partir del parámetro next_invoice_date provisto por la pasarela, añadiendo un margen temporal de seguridad.
La estrategia de mantener una fuente de la verdad distribuida requiere que cualquier actualización en la tabla de suscripciones se derive estrictamente del procesamiento exitoso y validado de los eventos asíncronos (webhooks) originados por el motor de facturación, y no de estimaciones temporales originadas en el servidor local.
Implementación del Flujo Transaccional Completo
El proceso algorítmico diseñado para transformar a un visitante registrado en un suscriptor automatizado y financieramente activo está compuesto por cuatro fases secuenciales bien delimitadas.
Fase 1: Creación y Parametrización del Plan
La configuración del catálogo de precios requiere la instanciación de planes de suscripción. Aunque la plataforma provee una interfaz gráfica de administración para este propósito, en arquitecturas escalables o sistemas de precios dinámicos, la creación debe realizarse de forma programática invocando el recurso /plans/create mediante el protocolo HTTP POST. En el ciclo de vida del desarrollo, esta operación suele encapsularse en scripts de migración ejecutados durante el despliegue del sistema o mediante un panel de control interno administrativo, quedando completamente abstraído de la interacción del usuario final.
La carga de datos (payload) para la creación de un plan exige una cuidadosa parametrización. El campo identificador planId debe ser una cadena de texto alfanumérica única en el entorno del comercio, desprovista de espacios en blanco (por ejemplo, SaaS_PyME_Mensual_v1). Este identificador rígidamente formateado se utilizará posteriormente en miles de transacciones, por lo que su inmutabilidad semántica es crucial. El parámetro name proporciona la denominación comercial que será visible en las notificaciones del cliente. El campo monetario amount exige la definición del valor bruto a facturar en cada iteración del ciclo temporal.
El motor de recurrencia se ajusta mediante dos variables complementarias: interval y interval_count. La variable interval define la magnitud del salto temporal, aceptando valores predeterminados donde 1 equivale a un ritmo diario, 2 establece un ciclo semanal, 3 define la periodicidad mensual predominante en la industria del software, y 4 proyecta facturaciones anuales. La combinación de estos parámetros permite crear frecuencias híbridas; por ejemplo, configurar interval = 3 y interval_count = 3 daría como resultado un cobro trimestral automatizado.
Si el modelo comercial dictamina un obsequio promocional a nivel general, el campo trial_period_days permite instaurar una cantidad de días de gracia que precederán invariablemente al primer cargo económico, retrasando efectivamente la ejecución de la facturación. Finalmente, el parámetro urlCallback acepta una dirección URL absoluta; hacia este destino, la plataforma emitirá las notificaciones asíncronas de los cobros efectivos derivados de cualquier suscripción adscrita a esta plantilla específica.
Fase 2: Mapeo y Creación del Cliente (Customer)
El inicio del proceso de checkout interactivo en la aplicación web del lado del cliente debe invocar una ruta interna en el backend de Next.js, encargada de proyectar la identidad del usuario hacia la infraestructura de pagos mediante un llamado POST al recurso /customer/create.
La anatomía de esta petición demanda la transmisión del nombre completo del usuario mediante el parámetro name y su dirección de correo electrónico a través de email. Sin embargo, la piedra angular para lograr una reconciliación de datos robusta reside en el uso correcto del parámetro externalId. Este campo permite inyectar el identificador único universal (UUID) o la clave primaria numérica autoincremental que el usuario posee en la base de datos relacional local del SaaS. Al proveer este dato, toda información financiera generada en el futuro portará este marcador biológico del sistema original, eliminando la necesidad de realizar búsquedas ineficientes basadas en direcciones de correo electrónico que los usuarios podrían modificar a posteriori.
La respuesta exitosa de los servidores retornará un objeto de datos estructurado en formato JSON, del cual se debe extraer imperiosamente el valor asociado a la clave customerId, un string con un patrón prefijado como cus_onoolldvec. Este identificador delegado debe ser almacenado inmediatamente en la fila correspondiente al usuario en la base de datos local, convirtiéndose en el token de acceso para la manipulación de todos sus instrumentos de pago futuros.
Fase 3: Tokenización Criptográfica y Registro de Tarjeta
Para viabilizar la recurrencia financiera sin someter al usuario a la fricción de aprobaciones mensuales, el cliente debe registrar, o en términos de ingeniería financiera, "tokenizar" un instrumento de crédito, débito o prepago. Esta fase crítica de delegación de confianza demanda que el backend local genere un token de sesión efímero mediante la invocación del recurso /customer/register, proporcionando el customerId consolidado en la fase previa.
Una vez que el servidor backend ha obtenido este token de registro temporal y su URL correspondiente, se abren tres vías arquitectónicas para orquestar la captura de los datos de la tarjeta. La primera alternativa, "Enrolar utilizando redirección", implica navegar fuera del ecosistema del SaaS hacia el dominio de la pasarela, resolviendo el problema rápidamente pero fragmentando severamente la experiencia inmersiva del usuario. La segunda opción, "Enrolar enviando correo", delega a la plataforma la emisión de un email con un enlace seguro hacia el cliente, siendo una estrategia sumamente valiosa en integraciones empresariales complejas donde el operador del software no posee autorización corporativa para digitar los números de la tarjeta de crédito institucional de la empresa.
La estrategia recomendada como estándar de excelencia es "Enrolar utilizando Widget". Este patrón de diseño incrusta de manera nativa la interfaz de captura de datos financieros en el flujo del checkout del SaaS, empleando un marco flotante seguro (iframe) gestionado por bibliotecas de JavaScript proveídas directamente por la pasarela. Esta encapsulación asegura que los números de la tarjeta jamás atraviesen la memoria del entorno Next.js, relevando a la empresa de software de las cargas normativas extremas impuestas por el estándar de seguridad de datos de la industria de tarjetas de pago (PCI DSS).
La integración de este componente en el paradigma App Router de Next.js exige su definición estricta como un Client Component. El desafío técnico radica en la orquestación del ciclo de vida del componente React en paralelo con la carga asíncrona del script externo de la pasarela.
TypeScript
"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

interface FlowSubscriptionWidgetProps {
  registrationToken: string;
  onSuccessCallback: (eventData: any) => void;
  onErrorCallback: (errorDetail: any) => void;
}

export default function FlowSubscriptionWidget({ 
  registrationToken, 
  onSuccessCallback, 
  onErrorCallback 
}: FlowSubscriptionWidgetProps) {
  const containerReference = useRef<HTMLDivElement>(null);
  const = useState<boolean>(false);

  useEffect(() => {
    if (!scriptLoaded ||!containerReference.current) return;

    try {
      // @ts-ignore - La función Flow() es inyectada globalmente en el objeto window por el script externo
      const flowInstance = window.Flow();
      const UIelements = flowInstance.elements();
      
      const subscriptionElement = UIelements.create('subscribe', {
        style: {
          backgroundColor: "#ffffff",
          textColor: "#1f2937",
          fontFamily: "Inter, sans-serif"
        }
      });

      subscriptionElement.mount(containerReference.current, registrationToken);

      flowInstance.handleCardSubscribed(subscriptionElement)
       .then((transactionData: any) => {
          onSuccessCallback(transactionData); 
        })
       .catch((errorPayload: any) => {
          onErrorCallback(errorPayload);
        });

    } catch (initializationError) {
      console.error("Error crítico inicializando el contenedor de seguridad", initializationError);
      onErrorCallback(initializationError);
    }

  },);

  return (
    <div className="w-full max-w-md mx-auto relative overflow-hidden rounded-xl border border-gray-200">
      {/* Carga diferida del artefacto de seguridad de la pasarela */}
      <Script 
        src="https://sandbox.flow.cl/app/elements/flow-1.1.0.min.js" 
        strategy="lazyOnload"
        onLoad={() => setScriptLoaded(true)}
        onError={(e) => console.error("Fallo de red al descargar el entorno seguro de Flow.", e)}
      />
      <div 
        id="secure-subscribe-container" 
        ref={containerReference} 
        style={{ minHeight: "260px", width: "100%" }}
        className="bg-white"
      >
        {!scriptLoaded && (
          <div className="flex items-center justify-center h-[260px]">
            <p className="text-sm font-medium text-gray-500 animate-pulse">
              Estableciendo conexión encriptada...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


La implementación anterior garantiza que el script no bloqueará la renderización inicial del servidor, y que la inicialización del objeto protegido solo ocurrirá cuando la referencia al DOM del contenedor esté garantizada, proveyendo un mecanismo elegante para capturar eventos de éxito y desencadenar la última fase del proceso desde el cliente hacia el servidor.
Fase 4: Instanciación de la Suscripción y Lógica de Periodo de Prueba
Con el token transaccional de éxito en poder del frontend tras el enrolamiento de la tarjeta, el cliente posee un instrumento de pago validado y vinculado a su customerId. El paso definitivo consiste en la consolidación del contrato mediante una invocación POST al endpoint /subscription/create, comunicando el servidor de Next.js con la pasarela.
Esta operación une irrevocablemente las tres piezas centrales de la arquitectura: el parámetro obligatorio planId define las reglas comerciales que se aplicarán, el parámetro obligatorio customerId define la entidad y su método de cobro asociado, y la firma criptográfica sella la solicitud. En este preciso instante se configura la estrategia de penetración de mercado a través del manejo dinámico de periodos de prueba gratuitos.
El ecosistema expone el parámetro opcional trial_period_days de tipo numérico. La sofisticación de este parámetro radica en su capacidad de sobreescritura jerárquica: si el plan maestro fue diseñado con cero días de prueba, el envío de este parámetro durante la creación de una suscripción individual sobreescribirá las directrices globales exclusivamente para este usuario particular. Desde la perspectiva de la lógica de negocio, al definir trial_period_days con un valor equivalente a 14, el motor interno de la pasarela programará el primer cobro efectivo para dos semanas en el futuro, bloqueando cualquier intento de deducción de fondos durante este lapso, pero validando la operatividad de la tarjeta. En adición, si existieran campañas promocionales, se puede remitir el identificador numérico de un cupón mediante el parámetro opcional couponId para aplicar rebajas sobre el costo base de la tarifa.
El éxito rotundo de esta operación devuelve una estructura de datos inmensamente densa que describe el contrato en su totalidad. El backend debe seccionar este bloque y almacenar métricas vitales: el string del subscriptionId como puntero maestro. El parámetro de estado inicial se reflejará con un valor de 1 para suscripciones inmediatas o un estado de 2 si se configuró el engranaje del trial, indicando que se ha transitado con éxito hacia un estado de prueba documentado. De suma relevancia operativa resulta el parámetro next_invoice_date, una cadena de fecha que dicta con exactitud quirúrgica cuándo el motor intentará materializar el primer cobro, dato fundamental para sincronizar la cronología de las renovaciones en el panel de control del usuario. El registro local de todos estos metadatos habilita al sistema para operar independientemente sin necesidad de interrogar constantemente a los servidores externos, reduciendo la latencia general.
Orquestación de Webhooks y Sincronización Asíncrona Robusta
El desafío fundamental en la arquitectura de un software financiado mediante cobros recurrentes radica en la latencia temporal y la naturaleza puramente asíncrona de las transacciones mensuales. Tras la facturación del ciclo inicial, la aplicación local no instiga ni controla el proceso de cobro; es la infraestructura cronometrada de la pasarela la que, de forma autónoma, engendra el importe de la factura, intenta efectuar el débito a la tarjeta de crédito o débito a través de la red de Webpay y emite el veredicto resolutivo final. Para sincronizar el estado biológico del usuario en la base de datos del software con su cruda realidad financiera, es ineludible la implementación y el aseguramiento criptográfico de rutas receptoras de notificaciones automáticas, conocidas como Webhooks. La plataforma permite declarar estas URLs de destino mediante la inyección del parámetro urlCallback al instante de crear la plantilla del plan.
Patrón de Seguridad en Doble Fase para Webhooks
La pasarela ha adoptado una estrategia de mitigación de vulnerabilidades altamente sofisticada. En lugar de transmitir la carga de datos completa, conteniendo montos e identidades, directamente en el cuerpo de la notificación entrante, emplea un patrón de verificación de doble fase. Esta decisión arquitectónica está orientada a imposibilitar por completo ataques cibernéticos de falsificación de origen (spoofing) o intentos de manipulación por intermediarios maliciosos (ataques Man-in-the-Middle).
El ciclo de comunicación obedece a las siguientes reglas inquebrantables :
Un evento crítico sucede dentro de los servidores financieros (un cargo recurrente es debitado con éxito de los fondos del cliente o es rechazado por el banco emisor debido a límites de saldo).
El enrutador de notificaciones emite una petición mediante el método HTTP POST hacia el servidor del SaaS en la ruta declarada como urlCallback, declarando el formato application/x-www-form-urlencoded.
El cuerpo de este mensaje de alerta contiene un único argumento de información vital: un string alfanumérico bautizado como token.
Para consolidar la transacción de forma síncrona, el servidor del SaaS debe tomar este token, someterlo a su propio gestor de firmas criptográficas HMAC-SHA256 y realizar una petición secundaria en dirección inversa hacia la API original, específicamente invocando el servicio de verificación de pagos como payment/getStatus o resoluciones de recibos como invoice/get.
Ante la presentación de un token válido y una firma intachable, la API expide un manifiesto detallado conteniendo la realidad absoluta de la transacción, el cual ya no puede ser refutado o modificado en tránsito.
Ruta Receptora Segura en el Ecosistema Next.js
La concreción de esta arquitectura en Next.js se materializa utilizando el esquema de enrutamiento moderno (App Router) mediante la definición de un controlador de rutas. El siguiente código ejemplifica el diseño de un punto final de red destinado a la ingestión, verificación y alteración del estado de la base de datos en respuesta a los eventos del motor de pagos:
TypeScript
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
// Se asume la existencia de la clase gestora de firmas FlowSignatureManager construida previamente
import { FlowSignatureManager } from '@/lib/flow/signature';

const prisma = new PrismaClient();
const signer = new FlowSignatureManager(process.env.FLOW_API_KEY!, process.env.FLOW_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const parsedData = new URLSearchParams(rawBody);
    const notificationToken = parsedData.get('token');

    if (!notificationToken) {
      console.warn("Petición de Webhook defectuosa: ausencia del parámetro token.");
      return NextResponse.json({ error: 'Token ausente o malformado' }, { status: 400 });
    }

    // Preparar el bloque de datos y la firma para el canje seguro del token
    const validationPayload = signer.buildUrlEncodedPayload({ token: notificationToken });
    const apiEndpoint = process.env.NODE_ENV === 'production' 
     ? 'https://www.flow.cl/api/payment/getStatus' 
      : 'https://sandbox.flow.cl/api/payment/getStatus';

    // Iniciar fase 2: Solicitar la verdad absoluta al servidor originario
    const validationResponse = await fetch(apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: validationPayload,
    });

    if (!validationResponse.ok) {
      throw new Error(`Rotura de túnel de verificación, código HTTP: ${validationResponse.status}`);
    }

    const transactionData = await validationResponse.json();
    
    // Extracción de datos vitales para lógica de negocio
    // status 2 implica un flujo de caja completado y asegurado
    const isPaymentSuccessful = transactionData.status === 2; 
    const externalUserId = transactionData.externalId; 

    if (!externalUserId) {
      throw new Error('La transacción carece del anclaje de identificador externo para la reconciliación local.');
    }

    // Orquestación del estado de suscripción dentro de un bloqueo transaccional
    await prisma.$transaction(async (tx) => {
      const activeSubscription = await tx.subscription.findUnique({
        where: { userId: externalUserId }
      });

      if (!activeSubscription) return; // Salida temprana por carencia de registro

      if (isPaymentSuccessful) {
        // Renovar el periodo de gracia y borrar cualquier vestigio de deuda
        await tx.subscription.update({
          where: { userId: externalUserId },
          data: {
            status: 'ACTIVE',
            moroseStatus: 0,
            lastPaymentDate: new Date(),
            // La API externa provee la fecha del próximo cargo a planificar
            currentPeriodEnd: new Date(transactionData.next_invoice_date || Date.now() + 2592000000) 
          }
        });
      } else {
        // En caso de rechazo del banco o fondos exiguos, penalizar la métrica de deuda
        await tx.subscription.update({
          where: { userId: externalUserId },
          data: {
            moroseStatus: 1 
          }
        });
      }
    });

    // Emisión del acuse de recibo explícito al motor de notificaciones
    return NextResponse.json({ received: true }, { status: 200 });

  } catch (criticalError) {
    console.error("Colapso en procesamiento asíncrono de Webhook", criticalError);
    // Retornar un código severo (500) coaccionará al servidor externo a reencolar y reintentar la emisión en el futuro
    return NextResponse.json({ error: 'Falla interna de reconciliación de datos' }, { status: 500 });
  }
}


La robustez de este manejador se sostiene sobre la capacidad de retornar un código de estado apropiado. El retorno de un código HTTP en el rango de los errores del servidor (como un 500 Internal Server Error) informará a los mecanismos de la plataforma de la interrupción en el servicio. La infraestructura de colas de la pasarela reencolará la alerta e intentará comunicarse con el servidor del SaaS mediante intervalos de retroceso progresivo (backoff exponencial) hasta lograr consolidar el mensaje mediante la recepción de un código HTTP equivalente a un éxito asimilado (típicamente 200 OK).
Patrones de Resiliencia, Gestión de Morosidad (Dunning) y Control de Acceso
La interacción simbiótica entre el software de escritorio local y la inmensidad de las redes de pago mundiales debe guiarse por el patrón arquitectónico de "consistencia eventual". Las tarjetas físicas asociadas a las cuentas caducan implacablemente mes a mes por expiración de plásticos, límites de crédito saturados de forma impredecible o bloqueos preventivos por algoritmos de riesgo ante cargos inusuales de software.
Para optimizar la recuperación de carteras incobrables e instrumentar campañas de recuperación de ingresos (conocidas en la disciplina financiera como "Dunning Campaigns"), la API incorpora endpoints auxiliares de diagnóstico profundo, tales como payment/getStatusExtended. La interrogación mediante este servicio proporciona información sumamente granular respecto a la causa motora del colapso en el último intento de débito, permitiendo discernir si el bloqueo se originó por fondos insuficientes, si la tarjeta alcanzó el fin de su vida útil, o si el propio banco retuvo la transacción por cautela.
A nivel sistémico, depender fanáticamente de restricciones radicales del estado puede infundir hostilidad en el usuario y aumentar el índice de cancelaciones tempranas (churn rate). La construcción de políticas operativas eficientes exige la adopción de los siguientes lineamientos y tácticas:
Días de Gracia e Inmovilización Diferida (Soft-Locking): En la eventualidad de que el procesamiento de un webhook atestigüe un colapso en el cobro y eleve la bandera de morosidad a la posición positiva (morose: 1), el gestor de accesos del SaaS no debe transicionar de manera súbita e implacable hacia un apagón total de la interfaz de la PyME (Hard-Lock). La estrategia idónea aconseja instituir una inmovilización parcial (Soft-Lock); el cliente retiene la capacidad de leer sus métricas históricas, exportar su documentación o navegar restringidamente por la interfaz principal bajo la constante visualización de un banner alertando sobre la insuficiencia temporal de su método de pago, limitando exclusivamente la generación de nuevos documentos, consumos de cuotas, u operaciones de escritura hasta que la situación crediticia se normalice.
Manejo Elegante del Periodo de Prueba: Mientras la máquina de estados de la suscripción se desenvuelva bajo un indicador transaccional equivalente al estado 2 (En Trial), el sistema lógico está en la obligación de dotar al usuario de libertades jerárquicas idénticas o superiores al estado activo nominal (1). El motor lógico del frontend debe explotar las ventajas de este estatus extrayendo la estampa temporal contenida en el registro trial_end o next_invoice_date provisto desde la creación, para inyectar cronómetros psicológicos o barras de progreso en la interfaz gráfica, alertando sobre el consumo inminente de los días gratuitos. En caso de que el primer cobro efectivo colapse al fenecer este plazo promocional, la pasarela transicionará automáticamente al estado moroso y ejecutará su propia cadena de reintentos mediante su variable paramétrica charges_retries_number, que de manera nativa instruye tres asaltos progresivos en días consecutivos para capturar el valor de la deuda original.
Idempotencia Fundamental en la Red: Las notificaciones push transoceánicas originadas en sistemas de mensajería asíncrona pueden padecer multiplicidad eventual por causa de divisiones en redes subyacentes. El código manipulador de inserciones de base de datos en Next.js debe ostentar características estrictamente idempotentes; su ejecución concurrente y repetitiva sobre un mismo aviso de una transacción monetaria no debe acarrear duplicidad o suma multiplicativa sobre los créditos temporales o meses vigentes del usuario. La inclusión de un bloque explícito como la directiva $transaction de Prisma, emparejado con una evaluación lógica del identificador de cobro de Flow antes de accionar la mutación UPDATE a nivel de lenguaje SQL subyacente, provee resiliencia arquitectónica plena.
Reconciliación Cronometrada o Rescate de Estado (Fallback Routine): Como defensa profunda en el paradigma serverless que rodea a Next.js (Vercel, AWS Amplify), ante perturbaciones prolongadas que obstaculicen masivamente la recepción de ráfagas de webhooks de notificación o ante un apagado temporal de los servicios web para mantenimiento de infraestructura, es necesario la inclusión de procesos en segundo plano. La orquestación programada de tareas periódicas o Cron Jobs resulta fundamental. Esta rutina silenciosa debe invocar llamadas esporádicas hacia el ecosistema externo, barriendo los registros del SaaS locales en riesgo de vecimiento temporal y cuestionando individualmente los valores flowSubscriptionId alistados. Este acoplamiento perezoso fuerza un acto de sincronización a demanda de los atributos currentPeriodEnd y de estado real, disipando cualquier brecha teórica donde un cliente en estado permanente de deuda financiera pueda seguir consumiendo ancho de banda o procesamientos masivos de información de la compañía en virtud de un error en el canal de reporte automático original.
La asimilación e implementación detallada de estas directrices arquitectónicas, desde el riguroso establecimiento inicial bajo una persona jurídica y la tokenización delegada de componentes de front end al interior de Next.js, hasta la estructuración de transacciones asíncronas seguras con una contabilidad estricta apoyada en funciones hash en Node.js, otorgan la capacidad de concebir una maquinaria de pagos mensuales para PyMEs chilenas extremadamente resiliente, reduciendo los umbrales de fraude y minimizando costos operacionales derivados de morosidad, al tiempo que eleva los estándares cualitativos que el mercado latinoamericano exige a los softwares como servicio orientados al segmento corporativo.

