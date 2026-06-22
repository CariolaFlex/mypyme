import type { Metadata } from 'next';
import { LEGAL } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Política de Privacidad',
  description: 'Política de privacidad y tratamiento de datos personales de Gestionala.',
};

export default function PrivacidadPage() {
  return (
    <article className="space-y-6 text-sm leading-relaxed text-foreground">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Política de Privacidad</h1>
        <p className="text-muted-foreground">Última actualización: {LEGAL.actualizado}</p>
      </header>

      <p>
        Esta Política describe cómo <strong>{LEGAL.razonSocial}</strong> (RUT {LEGAL.rut}), con
        domicilio en {LEGAL.domicilio}, titular del servicio <strong>{LEGAL.marca}</strong> (el
        «Servicio»), trata los datos personales de sus usuarios, conforme a la Ley N° 19.628 sobre
        Protección de la Vida Privada y demás normativa chilena aplicable.
      </p>

      <Section n="1" titulo="Responsable del tratamiento">
        <p>
          El responsable del tratamiento de los datos personales recopilados a través del Servicio es{' '}
          <strong>{LEGAL.razonSocial}</strong>, RUT {LEGAL.rut}, domiciliada en {LEGAL.domicilio}.
          Para cualquier asunto relativo a tus datos, puedes contactarnos en{' '}
          <a href={`mailto:${LEGAL.emailContacto}`} className="text-primary underline-offset-4 hover:underline">
            {LEGAL.emailContacto}
          </a>
          .
        </p>
      </Section>

      <Section n="2" titulo="Datos que recopilamos">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>De registro:</strong> nombre (si lo proporcionas), correo electrónico y
            contraseña (almacenada de forma cifrada).
          </li>
          <li>
            <strong>De la empresa:</strong> razón social, RUT, configuración tributaria y datos de
            contacto que ingreses.
          </li>
          <li>
            <strong>Operacionales:</strong> productos, ventas, movimientos de caja, inventario,
            compras y gastos que registras, incluidas las imágenes de productos y documentos que
            cargas (por ejemplo, fotos de facturas para su lectura). Son principalmente datos de tu
            negocio.
          </li>
          <li>
            <strong>Técnicos:</strong> registros de actividad y auditoría, dirección IP y datos de
            uso necesarios para operar y asegurar la plataforma.
          </li>
          <li>
            <strong>De suscripción:</strong> estado de tu plan y referencias de los cobros. Los datos
            de tu medio de pago los procesa directamente el proveedor de pagos; nosotros no los
            almacenamos.
          </li>
        </ul>
      </Section>

      <Section n="3" titulo="Datos de terceros cargados por el Cliente">
        <p>
          El Servicio no requiere que registres datos personales de los consumidores finales de tu
          negocio para operar. Si decides incorporar datos de terceros, tú actúas como responsable de
          su tratamiento y nosotros como encargados, procesándolos únicamente conforme a tus
          instrucciones. Es tu responsabilidad contar con la autorización necesaria para ello.
        </p>
      </Section>

      <Section n="4" titulo="Finalidad del tratamiento">
        <p>
          Usamos los datos para: prestar y mantener el Servicio; autenticar usuarios y controlar
          accesos por rol; procesar pagos de suscripción; enviar comunicaciones del servicio (por
          ejemplo, recuperación de contraseña o avisos de tu suscripción); brindar soporte; cumplir
          obligaciones legales; y mejorar la plataforma. <strong>No vendemos tus datos personales</strong>{' '}
          ni los usamos para publicidad de terceros.
        </p>
      </Section>

      <Section n="5" titulo="Base legal del tratamiento">
        <p>
          El tratamiento se funda en: tu consentimiento; la ejecución del contrato de prestación del
          Servicio; nuestro interés legítimo en operar y mejorar la plataforma de forma segura; y el
          cumplimiento de obligaciones legales, conforme a la Ley N° 19.628 y demás normativa
          aplicable.
        </p>
      </Section>

      <Section n="6" titulo="Encargados y terceros">
        <p>
          Para operar utilizamos proveedores que actúan como encargados de tratamiento y solo
          procesan datos conforme a nuestras instrucciones:
        </p>
        <ul className="mt-2 space-y-1 pl-5 list-disc">
          <li>
            <strong>Supabase</strong> — infraestructura de base de datos, autenticación y
            almacenamiento.
          </li>
          <li>
            <strong>Vercel</strong> — alojamiento y entrega de la aplicación web.
          </li>
          <li>
            <strong>Flow.cl</strong> — procesamiento de los pagos de suscripción. Los datos de tu
            tarjeta son tratados directamente por Flow; nosotros no los recibimos ni almacenamos.
          </li>
        </ul>
      </Section>

      <Section n="7" titulo="Transferencia internacional de datos">
        <p>
          Algunos de nuestros proveedores alojan datos fuera de Chile: la base de datos opera en
          servidores ubicados en Brasil (São Paulo) y el alojamiento de la aplicación puede operar en
          Estados Unidos. Estas transferencias se realizan con resguardos de seguridad adecuados,
          incluyendo cifrado en tránsito y compromisos contractuales de los proveedores.
        </p>
      </Section>

      <Section n="8" titulo="Conservación">
        <p>
          Conservamos los datos mientras tu cuenta esté activa y por el tiempo necesario para cumplir
          las finalidades descritas. La información de respaldo tributario puede conservarse por el
          plazo que exija la ley (en general, hasta 6 años). Cumplidos los plazos, los datos se
          eliminan o anonimizan.
        </p>
      </Section>

      <Section n="9" titulo="Seguridad">
        <p>
          Aplicamos medidas técnicas y organizativas razonables para proteger los datos, incluyendo
          aislamiento por empresa (cada organización solo accede a sus propios datos), cifrado en
          tránsito (HTTPS), almacenamiento cifrado de contraseñas y control de credenciales de
          acceso. Ningún sistema es completamente infalible, por lo que no podemos garantizar
          seguridad absoluta; ante un incidente de seguridad relevante, adoptaremos las medidas y
          comunicaciones que correspondan.
        </p>
      </Section>

      <Section n="10" titulo="Tus derechos">
        <p>
          De acuerdo con la Ley N° 19.628, puedes ejercer tus derechos de acceso, rectificación,
          cancelación y oposición sobre tus datos personales. Para ello, escríbenos a{' '}
          <a href={`mailto:${LEGAL.emailContacto}`} className="text-primary underline-offset-4 hover:underline">
            {LEGAL.emailContacto}
          </a>
          ; responderemos en los plazos que exige la ley. Si consideras que tus derechos no han sido
          atendidos, puedes recurrir a las autoridades competentes en Chile (por ejemplo, el SERNAC
          en materia de consumo y los organismos de protección de datos personales).
        </p>
      </Section>

      <Section n="11" titulo="Cookies">
        <p>
          Utilizamos cookies estrictamente necesarias para mantener tu sesión iniciada y el correcto
          funcionamiento del Servicio. No usamos cookies con fines publicitarios. Si en el futuro
          incorporamos herramientas de analítica, serán respetuosas de la privacidad y sin cookies de
          seguimiento.
        </p>
      </Section>

      <Section n="12" titulo="Menores de edad">
        <p>
          El Servicio está dirigido a empresas y a personas mayores de edad con facultad para
          contratar. No está destinado a menores de edad ni recopilamos datos de ellos de forma
          deliberada.
        </p>
      </Section>

      <Section n="13" titulo="Cambios y contacto">
        <p>
          Podemos actualizar esta Política; los cambios relevantes se comunicarán por la plataforma o
          por correo. Ante cualquier duda, contáctanos en{' '}
          <a href={`mailto:${LEGAL.emailContacto}`} className="text-primary underline-offset-4 hover:underline">
            {LEGAL.emailContacto}
          </a>{' '}
          o revisa nuestros{' '}
          <a href="/legal/terminos" className="text-primary underline-offset-4 hover:underline">
            Términos y Condiciones
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
