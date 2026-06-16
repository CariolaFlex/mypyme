import type { Metadata } from 'next';
import { LEGAL } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Política de Privacidad — Gestionala',
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
        Esta Política describe cómo <strong>{LEGAL.razonSocial}</strong> (RUT {LEGAL.rut}), titular
        del servicio <strong>{LEGAL.marca}</strong>, trata los datos personales de sus usuarios,
        conforme a la Ley N° 19.628 sobre Protección de la Vida Privada y demás normativa chilena
        aplicable.
      </p>

      <Section n="1" titulo="Datos que recopilamos">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>De registro:</strong> nombre, correo electrónico y contraseña (almacenada de
            forma cifrada).
          </li>
          <li>
            <strong>De la empresa:</strong> razón social, RUT, configuración tributaria y datos de
            contacto que ingreses.
          </li>
          <li>
            <strong>Operacionales:</strong> productos, ventas, movimientos de caja, inventario,
            compras y gastos que registras en el Servicio.
          </li>
          <li>
            <strong>Técnicos:</strong> datos de uso necesarios para operar la plataforma (por
            ejemplo, registros de actividad y auditoría).
          </li>
        </ul>
      </Section>

      <Section n="2" titulo="Finalidad del tratamiento">
        <p>
          Usamos los datos para: prestar y mantener el Servicio; autenticar usuarios y controlar
          accesos por rol; procesar pagos de suscripción; brindar soporte; cumplir obligaciones
          legales; y mejorar la plataforma. No vendemos tus datos personales a terceros.
        </p>
      </Section>

      <Section n="3" titulo="Encargados y terceros">
        <p>
          Para operar, utilizamos proveedores de infraestructura y servicios (alojamiento de base de
          datos y aplicación, y procesamiento de pagos), que actúan como encargados de tratamiento y
          solo procesan datos conforme a nuestras instrucciones y a la normativa aplicable. Estos
          proveedores pueden alojar datos en servidores ubicados dentro o fuera de Chile, con
          resguardos de seguridad adecuados.
        </p>
      </Section>

      <Section n="4" titulo="Conservación">
        <p>
          Conservamos los datos mientras tu cuenta esté activa y por el tiempo necesario para cumplir
          las finalidades descritas y las obligaciones legales (por ejemplo, tributarias). Tras ello,
          se eliminan o anonimizan.
        </p>
      </Section>

      <Section n="5" titulo="Seguridad">
        <p>
          Aplicamos medidas técnicas y organizativas razonables para proteger los datos, incluyendo
          control de acceso multi-empresa (aislamiento por organización), cifrado en tránsito y
          gestión de credenciales. Ningún sistema es completamente infalible, por lo que no podemos
          garantizar seguridad absoluta.
        </p>
      </Section>

      <Section n="6" titulo="Tus derechos">
        <p>
          De acuerdo con la Ley N° 19.628, puedes ejercer tus derechos de acceso, rectificación,
          cancelación y oposición sobre tus datos personales. Para ello, escríbenos a{' '}
          <a href={`mailto:${LEGAL.emailContacto}`} className="text-primary underline-offset-4 hover:underline">
            {LEGAL.emailContacto}
          </a>
          . Responderemos en los plazos que exige la ley.
        </p>
      </Section>

      <Section n="7" titulo="Cookies">
        <p>
          Utilizamos cookies estrictamente necesarias para mantener tu sesión iniciada y el correcto
          funcionamiento del Servicio. No las usamos con fines publicitarios.
        </p>
      </Section>

      <Section n="8" titulo="Cambios y contacto">
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

      <p className="rounded-md border border-amber-300/50 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
        <strong>Borrador.</strong> Documento de referencia mínimo, pendiente de revisión y
        aprobación final antes del lanzamiento público.
      </p>
    </article>
  );
}

function Section({ n, titulo, children }: { n: string; titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold">
        {n}. {titulo}
      </h2>
      {children}
    </section>
  );
}
