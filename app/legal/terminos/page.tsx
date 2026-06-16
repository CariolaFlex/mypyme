import type { Metadata } from 'next';
import { LEGAL } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Términos y Condiciones — Gestionala',
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
        Estos Términos y Condiciones (los «Términos») regulan el uso del servicio{' '}
        <strong>{LEGAL.marca}</strong> (el «Servicio»), una plataforma de punto de venta y gestión
        para pequeñas y micro empresas, provista por <strong>{LEGAL.razonSocial}</strong>, RUT{' '}
        {LEGAL.rut}, con domicilio en {LEGAL.domicilio} (el «Proveedor»). Al registrarte o utilizar
        el Servicio aceptas estos Términos.
      </p>

      <Section n="1" titulo="Descripción del Servicio">
        <p>
          {LEGAL.marca} permite registrar ventas, gestionar caja, inventario, compras, gastos y
          generar reportes. El Servicio se ofrece «tal cual» y puede evolucionar con nuevas
          funcionalidades o ajustes. Algunas funciones requieren conexión a internet; otras operan
          de forma offline y se sincronizan al reconectar.
        </p>
      </Section>

      <Section n="2" titulo="Cuenta y responsabilidad del usuario">
        <p>
          Eres responsable de la veracidad de los datos de registro, de mantener la
          confidencialidad de tus credenciales y de toda actividad realizada bajo tu cuenta. Debes
          notificar al Proveedor ante cualquier uso no autorizado. Cada empresa administra sus
          propios usuarios y los roles (administrador y empleado) que les asigna.
        </p>
      </Section>

      <Section n="3" titulo="Uso aceptable">
        <p>
          Te comprometes a usar el Servicio conforme a la legislación chilena vigente y a no
          utilizarlo para fines ilícitos, ni a intentar vulnerar su seguridad, integridad o
          disponibilidad. El Proveedor podrá suspender cuentas que infrinjan estos Términos.
        </p>
      </Section>

      <Section n="4" titulo="Planes, pagos y suscripción">
        <p>
          El Servicio puede ofrecerse con un período de prueba gratuito y planes de pago por
          suscripción. Los precios se informan en la plataforma e incluyen los impuestos aplicables.
          Los cobros se realizan a través del proveedor de pagos contratado. Puedes cancelar tu
          suscripción en cualquier momento; la cancelación surte efecto al término del período ya
          pagado, sin reembolsos por períodos parciales, salvo lo que exija la Ley N° 19.496 sobre
          Protección de los Derechos de los Consumidores.
        </p>
      </Section>

      <Section n="5" titulo="Disponibilidad y datos del cliente">
        <p>
          El Proveedor procura una alta disponibilidad del Servicio, pero no garantiza un
          funcionamiento ininterrumpido ni libre de errores. Los datos que cargas (catálogo, ventas,
          clientes, etc.) son de tu propiedad. El Proveedor los trata según la{' '}
          <a href="/legal/privacidad" className="text-primary underline-offset-4 hover:underline">
            Política de Privacidad
          </a>
          . Es tu responsabilidad cumplir con tus propias obligaciones tributarias y legales (p. ej.
          emisión de documentos ante el SII cuando corresponda).
        </p>
      </Section>

      <Section n="6" titulo="Limitación de responsabilidad">
        <p>
          En la máxima medida permitida por la ley, el Proveedor no será responsable por daños
          indirectos, lucro cesante o pérdida de datos derivados del uso o imposibilidad de uso del
          Servicio. Nada en estos Términos limita los derechos irrenunciables que la ley reconoce a
          los consumidores.
        </p>
      </Section>

      <Section n="7" titulo="Modificaciones">
        <p>
          El Proveedor podrá actualizar estos Términos. Los cambios relevantes se comunicarán por la
          plataforma o por correo. El uso continuado del Servicio tras la entrada en vigencia
          implica su aceptación.
        </p>
      </Section>

      <Section n="8" titulo="Ley aplicable y contacto">
        <p>
          Estos Términos se rigen por las leyes de la República de Chile. Para consultas o
          ejercicio de derechos, escribe a{' '}
          <a href={`mailto:${LEGAL.emailContacto}`} className="text-primary underline-offset-4 hover:underline">
            {LEGAL.emailContacto}
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
