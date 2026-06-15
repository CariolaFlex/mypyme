import { Mail, MessageCircle, Clock } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { SOPORTE, whatsappUrl, mailtoSoporte } from '@/lib/legal';

export const metadata = { title: 'Soporte — mypyme' };

export default function SoportePage() {
  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        icon={MessageCircle}
        title="Soporte"
        description="¿Necesitas ayuda? Escríbenos y te respondemos a la brevedad."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {/* WhatsApp — solo si hay número configurado */}
        {SOPORTE.whatsapp && (
          <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer" className="group">
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardContent className="flex flex-col items-start gap-3 pt-6">
                <div className="flex size-11 items-center justify-center rounded-xl bg-green-500/10 text-green-600 dark:text-green-400">
                  <MessageCircle className="size-6" />
                </div>
                <div>
                  <div className="font-semibold group-hover:text-primary">WhatsApp</div>
                  <p className="text-sm text-muted-foreground">Respuesta rápida en horario hábil.</p>
                </div>
              </CardContent>
            </Card>
          </a>
        )}

        {/* Email */}
        <a href={mailtoSoporte()} className="group">
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardContent className="flex flex-col items-start gap-3 pt-6">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Mail className="size-6" />
              </div>
              <div>
                <div className="font-semibold group-hover:text-primary">Correo</div>
                <p className="text-sm text-muted-foreground">{SOPORTE.email}</p>
              </div>
            </CardContent>
          </Card>
        </a>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="size-4" />
        <span>Horario de atención: {SOPORTE.horario}</span>
      </div>
    </div>
  );
}
