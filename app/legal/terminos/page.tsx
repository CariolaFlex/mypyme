import type { Metadata } from 'next';
import { LEGAL } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Términos y Condiciones',
  description: 'Términos y condiciones de uso del servicio Gestionala.',
};

export default function TerminosPage() {
  return (
    <article className="space-y-6 text-sm leading-relaxed text-foreground">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Términos y Condiciones de Uso</h1>
        <p className="text-muted-foreground">Última actualización: {LEGAL.actualizado}</p>
      </header>

      <p>
        Estos Términos y Condiciones (los «Términos») regulan el acceso y uso del servicio{' '}
        <strong>{LEGAL.marca}</strong> (el «Servicio»), una plataforma web de punto de venta y
        gestión para micro y pequeñas empresas, provista por <strong>{LEGAL.razonSocial}</strong>,
        RUT {LEGAL.rut}, con domicilio en {LEGAL.domicilio} (el «Proveedor» o «nosotros»). El
        Servicio está dirigido a empresas y comerciantes («tú» o el «Cliente») que lo utilizan con
        fines profesionales. Al registrarte o utilizar el Servicio, declaras haber leído y aceptado
        estos Términos.
      </p>

      <Section n="1" titulo="Descripción del Servicio">
        <p>
          {LEGAL.marca} permite registrar ventas (punto de venta), administrar caja con cuadratura,
          controlar inventario (incluida la venta a granel o por peso), gestionar compras, proveedores
          y gastos, y generar reportes. Incluye además herramientas de captura por cámara —escáner de
          códigos de barras y lectura de facturas mediante reconocimiento de texto (OCR)— que operan
          como apoyo y cuyos resultados el Cliente debe revisar antes de confirmarlos. Algunas funciones
          operan sin conexión a internet y se sincronizan al reconectar. El Servicio se ofrece «tal cual»
          y puede evolucionar con nuevas funcionalidades, mejoras o ajustes.
        </p>
      </Section>

      <Section n="2" titulo="Naturaleza profesional y registro de cuenta">
        <p>
          El Servicio es una herramienta de gestión para negocios y no está dirigido a consumidores
          finales ni a menores de edad. Para registrarte debes ser mayor de edad y tener facultad
          para obligar a la empresa que representas. Eres responsable de la veracidad de los datos de
          registro, de mantener la confidencialidad de tus credenciales y de toda actividad
          realizada bajo tu cuenta. Cada empresa administra sus propios usuarios y los roles
          (administrador y empleado) que les asigna.
        </p>
      </Section>

      <Section n="3" titulo="Uso aceptable">
        <p>
          Te comprometes a usar el Servicio conforme a la legislación chilena vigente y a no
          utilizarlo para fines ilícitos. No está permitido intentar vulnerar la seguridad,
          integridad o disponibilidad del Servicio, realizar ingeniería inversa, extracción masiva
          de datos (scraping), revender o ceder el acceso a terceros sin autorización. El Proveedor
          podrá suspender o terminar cuentas que infrinjan estos Términos.
        </p>
      </Section>

      <Section n="4" titulo="Planes, prueba gratuita, pagos y cancelación">
        <p>
          El Servicio ofrece un período de prueba gratuito (durante el cual no se realizan cobros) y
          planes de pago por suscripción mensual. Los precios se informan en la plataforma e incluyen
          los impuestos aplicables. Los cobros se procesan a través de <strong>Flow.cl</strong>, el
          proveedor de pagos contratado; el Proveedor no almacena los datos de tu tarjeta, que son
          gestionados directamente por dicho proveedor. Puedes cancelar tu suscripción en cualquier
          momento: la cancelación surte efecto al término del período ya pagado, sin reembolsos por
          períodos parciales, salvo lo que exija la Ley N° 19.496 sobre Protección de los Derechos de
          los Consumidores cuando resulte aplicable.
        </p>
      </Section>

      <Section n="5" titulo="Obligaciones tributarias del Cliente">
        <p>
          {LEGAL.marca} es una herramienta de gestión interna. A la fecha, el Servicio{' '}
          <strong>no emite documentos tributarios electrónicos</strong> (boletas o facturas) ante el
          Servicio de Impuestos Internos (SII); el comprobante que genera el punto de venta es de
          carácter interno y no constituye un documento tributario válido. Es de tu exclusiva
          responsabilidad cumplir con tus obligaciones tributarias, contables y legales, incluyendo
          la emisión de los documentos que correspondan ante el SII.
        </p>
      </Section>

      <Section n="6" titulo="Datos del Cliente y rol de encargado">
        <p>
          La información que cargas y generas en el Servicio (catálogo, ventas, inventario, compras,
          gastos y similares) es de tu propiedad. El Proveedor la trata conforme a la{' '}
          <a href="/legal/privacidad" className="text-primary underline-offset-4 hover:underline">
            Política de Privacidad
          </a>
          . Respecto de cualquier dato personal de terceros que decidas incorporar al Servicio,
          actúas como responsable de su tratamiento y el Proveedor como encargado, procesándolos
          únicamente conforme a tus instrucciones y a la normativa aplicable. Garantizas contar con
          la autorización necesaria para incorporar dichos datos.
        </p>
      </Section>

      <Section n="7" titulo="Propiedad intelectual">
        <p>
          El Servicio, el software, la marca «{LEGAL.marca}», su diseño y todos los elementos que lo
          componen son propiedad del Proveedor o de sus licenciantes y están protegidos por la
          legislación de propiedad intelectual. Se te concede una licencia limitada, no exclusiva,
          intransferible y revocable para usar el Servicio conforme a estos Términos. Esta licencia
          no transfiere ningún derecho de propiedad sobre la plataforma. Tus datos siguen siendo
          tuyos.
        </p>
      </Section>

      <Section n="8" titulo="Disponibilidad del Servicio">
        <p>
          El Proveedor procura una alta disponibilidad, pero no garantiza un funcionamiento
          ininterrumpido ni libre de errores, y podrá realizar mantenimientos o cambios que afecten
          temporalmente el acceso. Las funciones offline operan con el mejor esfuerzo y dependen del
          dispositivo y navegador del Cliente.
        </p>
      </Section>

      <Section n="9" titulo="Suspensión y terminación">
        <p>
          Podrás dejar de usar el Servicio y cerrar tu cuenta en cualquier momento. El Proveedor
          podrá suspender o terminar el acceso en caso de incumplimiento de estos Términos, falta de
          pago de la suscripción, fraude o riesgo para la seguridad, procurando avisar salvo cuando
          la urgencia lo impida. Tras la terminación, los datos se conservan o eliminan según la{' '}
          <a href="/legal/privacidad" className="text-primary underline-offset-4 hover:underline">
            Política de Privacidad
          </a>{' '}
          y las obligaciones legales aplicables.
        </p>
      </Section>

      <Section n="10" titulo="Limitación de responsabilidad">
        <p>
          En la máxima medida permitida por la ley, el Proveedor no será responsable por daños
          indirectos, incidentales, lucro cesante ni pérdida de datos derivados del uso o
          imposibilidad de uso del Servicio. Nada en estos Términos limita los derechos
          irrenunciables que la ley reconoce a los consumidores.
        </p>
      </Section>

      <Section n="11" titulo="Indemnidad">
        <p>
          Te comprometes a mantener indemne al Proveedor frente a reclamos de terceros derivados del
          uso indebido del Servicio, del incumplimiento de estos Términos o de la incorporación de
          datos de terceros sin la autorización correspondiente.
        </p>
      </Section>

      <Section n="12" titulo="Modificaciones">
        <p>
          El Proveedor podrá actualizar estos Términos. Los cambios relevantes se comunicarán por la
          plataforma o por correo. El uso continuado del Servicio tras la entrada en vigencia de los
          cambios implica su aceptación.
        </p>
      </Section>

      <Section n="13" titulo="Ley aplicable y jurisdicción">
        <p>
          Estos Términos se rigen por las leyes de la República de Chile. Cualquier controversia será
          sometida a los tribunales ordinarios de justicia de {LEGAL.jurisdiccion}, sin perjuicio de
          los derechos que la ley reconoce a los consumidores.
        </p>
      </Section>

      <Section n="14" titulo="Idioma y separabilidad">
        <p>
          La versión en español de estos Términos es la oficial y prevalece sobre cualquier
          traducción. Si alguna disposición se declara inválida o inaplicable, el resto continuará en
          plena vigencia.
        </p>
      </Section>

      <Section n="15" titulo="Contacto">
        <p>
          Para consultas sobre estos Términos o el ejercicio de tus derechos, escríbenos a{' '}
          <a href={`mailto:${LEGAL.emailContacto}`} className="text-primary underline-offset-4 hover:underline">
            {LEGAL.emailContacto}
          </a>
          .
        </p>
      </Section>
    </article>
  );
}

const slug = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function Section({ n, titulo, children }: { n: string; titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 id={slug(titulo)} className="scroll-mt-6 text-base font-semibold">
        {n}. {titulo}
      </h2>
      {children}
    </section>
  );
}
