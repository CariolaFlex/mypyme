/**
 * Ilustraciones SVG del centro de ayuda. Son mini-pantallas estilizadas de cada
 * módulo, hechas a mano para combinar con la marca. Usan las CSS vars del tema
 * (`--card`/`--border`/`--primary`/`--muted`/`--muted-foreground`) → se ven bien
 * en claro y oscuro y escalan sin perder calidad. No dependen de screenshots.
 */
import type { ComponentType } from 'react';

/** Marco de "pantalla" compartido: tarjeta con barra de título de marca. */
function Marco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 400 250" role="img" aria-label={titulo} className="h-auto w-full" xmlns="http://www.w3.org/2000/svg">
      <rect x="0.5" y="0.5" width="399" height="249" rx="16" fill="var(--card)" stroke="var(--border)" />
      {/* Header con esquinas superiores redondeadas */}
      <path d="M0 16 A16 16 0 0 1 16 0 H384 A16 16 0 0 1 400 16 V44 H0 Z" fill="var(--primary)" />
      <circle cx="22" cy="22" r="4" fill="#fff" opacity="0.55" />
      <circle cx="36" cy="22" r="4" fill="#fff" opacity="0.35" />
      <circle cx="50" cy="22" r="4" fill="#fff" opacity="0.25" />
      <text x="70" y="27" fill="#fff" fontSize="13" fontWeight="700" fontFamily="system-ui, sans-serif">
        {titulo}
      </text>
      {children}
    </svg>
  );
}

const P = 'var(--primary)';
const M = 'var(--muted)';
const MF = 'var(--muted-foreground)';

/** Barra placeholder de texto. */
function L({ x, y, w, h = 7, c = M, o = 1 }: { x: number; y: number; w: number; h?: number; c?: string; o?: number }) {
  return <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={c} opacity={o} />;
}

export function PosFigura() {
  return (
    <Marco titulo="Punto de venta">
      {/* Grid de productos */}
      {[0, 1, 2].map((c) =>
        [0, 1].map((r) => (
          <g key={`${c}-${r}`}>
            <rect x={16 + c * 78} y={60 + r * 64} width="70" height="56" rx="10" fill={M} opacity="0.5" />
            <rect x={16 + c * 78} y={60 + r * 64} width="70" height="34" rx="8" fill={P} opacity="0.18" />
            <L x={24 + c * 78} y={100 + r * 64} w={40} h={6} c={MF} o={0.7} />
          </g>
        ))
      )}
      {/* Carrito */}
      <rect x="258" y="60" width="126" height="172" rx="12" fill={M} opacity="0.4" />
      <L x={270} y={74} w={70} c={MF} o={0.8} />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <L x={270} y={98 + i * 22} w={60} h={6} c={MF} o={0.5} />
          <L x={344} y={98 + i * 22} w={28} h={6} c={MF} o={0.5} />
        </g>
      ))}
      <rect x="270" y="196" width="102" height="26" rx="8" fill={P} />
      <text x="321" y="213" fill="#fff" fontSize="11" fontWeight="700" textAnchor="middle" fontFamily="system-ui, sans-serif">
        Cobrar
      </text>
    </Marco>
  );
}

export function CajaFigura() {
  return (
    <Marco titulo="Caja">
      <rect x="16" y="60" width="368" height="70" rx="12" fill={P} opacity="0.1" />
      <L x={32} y={76} w={90} h={6} c={MF} o={0.7} />
      <text x="32" y="112" fill={P} fontSize="26" fontWeight="800" fontFamily="system-ui, sans-serif">
        $212.300
      </text>
      <rect x="270" y="74" width="98" height="44" rx="10" fill="var(--card)" stroke="var(--border)" />
      <L x={284} y={86} w={56} h={6} c={MF} o={0.6} />
      <text x="284" y="108" fill="var(--foreground)" fontSize="13" fontWeight="700" fontFamily="system-ui, sans-serif">
        Cuadrada
      </text>
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x="16" y={144 + i * 30} width="368" height="22" rx="6" fill={M} opacity="0.35" />
          <L x={28} y={151 + i * 30} w={120} h={6} c={MF} o={0.55} />
          <L x={320} y={151 + i * 30} w={48} h={6} c={MF} o={0.55} />
        </g>
      ))}
    </Marco>
  );
}

export function InventarioFigura() {
  return (
    <Marco titulo="Inventario">
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x="16" y={60 + i * 40} width="368" height="32" rx="8" fill={M} opacity="0.35" />
          <rect x="26" y={68 + i * 40} width="16" height="16" rx="4" fill={P} opacity="0.3" />
          <L x={52} y={72 + i * 40} w={130} h={7} c={MF} o={0.6} />
          <L x={300} y={72 + i * 40} w={30} h={7} c={MF} o={0.6} />
        </g>
      ))}
      {/* Badge stock bajo en una fila */}
      <rect x="340" y="146" width="34" height="16" rx="8" fill="#f59e0b" opacity="0.85" />
      <text x="357" y="158" fill="#fff" fontSize="9" fontWeight="700" textAnchor="middle" fontFamily="system-ui, sans-serif">
        bajo
      </text>
    </Marco>
  );
}

export function ProductosFigura() {
  return (
    <Marco titulo="Nuevo producto">
      <rect x="16" y="60" width="240" height="60" rx="10" fill={M} opacity="0.4" />
      <L x={28} y={72} w={60} h={6} c={MF} o={0.7} />
      <L x={28} y={88} w={170} h={9} c={MF} o={0.45} />
      <L x={28} y={104} w={120} h={9} c={MF} o={0.45} />
      {/* Foto */}
      <rect x="268" y="60" width="116" height="60" rx="10" fill={P} opacity="0.12" />
      <circle cx="326" cy="84" r="12" fill={P} opacity="0.4" />
      <rect x="306" y="100" width="40" height="8" rx="4" fill={P} opacity="0.4" />
      {[0, 1].map((i) => (
        <g key={i}>
          <rect x={16 + i * 190} y="134" width="178" height="34" rx="8" fill={M} opacity="0.4" />
          <L x={28 + i * 190} y={147} w={70} h={7} c={MF} o={0.55} />
        </g>
      ))}
      <rect x="16" y="200" width="160" height="30" rx="8" fill={P} />
      <text x="96" y="219" fill="#fff" fontSize="11" fontWeight="700" textAnchor="middle" fontFamily="system-ui, sans-serif">
        Agregar producto
      </text>
    </Marco>
  );
}

export function EscanerFigura() {
  return (
    <Marco titulo="Escanear">
      <rect x="90" y="60" width="220" height="120" rx="12" fill="#0d1b2a" opacity="0.85" />
      {/* Código de barras */}
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <rect key={i} x={120 + i * 18} y="92" width={i % 3 === 0 ? 7 : 3} height="56" fill="#fff" opacity="0.9" />
      ))}
      {/* Esquinas del visor */}
      {[
        [98, 68, 1, 1], [302, 68, -1, 1], [98, 172, 1, -1], [302, 172, -1, -1],
      ].map(([x, y, sx, sy], i) => (
        <path
          key={i}
          d={`M${x} ${(y as number) + 16 * (sy as number)} V${y} H${(x as number) + 16 * (sx as number)}`}
          stroke={P}
          strokeWidth="3"
          fill="none"
        />
      ))}
      <rect x="90" y="116" width="220" height="3" fill={P} opacity="0.9" />
      <rect x="120" y="196" width="160" height="26" rx="8" fill={P} opacity="0.15" />
      <text x="200" y="213" fill={P} fontSize="11" fontWeight="700" textAnchor="middle" fontFamily="system-ui, sans-serif">
        Producto encontrado
      </text>
    </Marco>
  );
}

export function ComprasFigura() {
  return (
    <Marco titulo="Cuentas por pagar">
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x="16" y={60 + i * 46} width="368" height="38" rx="8" fill={M} opacity="0.35" />
          <rect x="26" y={70 + i * 46} width="18" height="18" rx="4" fill={P} opacity="0.3" />
          <L x={54} y={70 + i * 46} w={120} h={7} c={MF} o={0.6} />
          <L x={54} y={84 + i * 46} w={80} h={6} c={MF} o={0.4} />
          <L x={300} y={76 + i * 46} w={64} h={8} c={MF} o={0.6} />
        </g>
      ))}
      <rect x="290" y="68" width="84" height="20" rx="10" fill="#f59e0b" opacity="0.2" />
      <text x="332" y="82" fill="#b45309" fontSize="9" fontWeight="700" textAnchor="middle" fontFamily="system-ui, sans-serif">
        pendiente
      </text>
      <rect x="252" y="114" width="60" height="20" rx="10" fill="#10b981" opacity="0.2" />
      <text x="282" y="128" fill="#047857" fontSize="9" fontWeight="700" textAnchor="middle" fontFamily="system-ui, sans-serif">
        pagada
      </text>
    </Marco>
  );
}

export function GastosFigura() {
  return (
    <Marco titulo="Gastos">
      {['Arriendo', 'Servicios', 'Insumos'].map((t, i) => (
        <g key={t}>
          <rect x="16" y={60 + i * 44} width="368" height="36" rx="8" fill={M} opacity="0.35" />
          <circle cx="36" cy={78 + i * 44} r="9" fill={P} opacity="0.25" />
          <text x="54" y={82 + i * 44} fill={MF} fontSize="11" fontWeight="600" fontFamily="system-ui, sans-serif">
            {t}
          </text>
          <L x={300} y={74 + i * 44} w={64} h={8} c={MF} o={0.55} />
        </g>
      ))}
      <rect x="16" y="200" width="368" height="30" rx="8" fill={P} opacity="0.1" />
      <L x={28} y={211} w={70} h={7} c={MF} o={0.6} />
      <text x="372" y="220" fill={P} fontSize="13" fontWeight="800" textAnchor="end" fontFamily="system-ui, sans-serif">
        IVA crédito
      </text>
    </Marco>
  );
}

export function ReportesFigura() {
  const bars = [40, 70, 55, 90, 65, 110];
  return (
    <Marco titulo="Reportes e IVA">
      {bars.map((h, i) => (
        <rect key={i} x={30 + i * 44} y={190 - h} width="28" height={h} rx="5" fill={P} opacity={0.35 + i * 0.1} />
      ))}
      <line x1="20" y1="190" x2="384" y2="190" stroke="var(--border)" strokeWidth="2" />
      <rect x="300" y="60" width="84" height="44" rx="10" fill={P} opacity="0.1" />
      <L x={312} y={72} w={50} h={6} c={MF} o={0.6} />
      <text x="312" y="96" fill={P} fontSize="15" fontWeight="800" fontFamily="system-ui, sans-serif">
        F29
      </text>
      <L x={30} y={206} w={324} h={6} c={MF} o={0.35} />
    </Marco>
  );
}

export function UsuariosFigura() {
  return (
    <Marco titulo="Usuarios y roles">
      {[
        { rol: 'Admin', c: P },
        { rol: 'Empleado', c: MF },
        { rol: 'Empleado', c: MF },
      ].map((u, i) => (
        <g key={i}>
          <rect x="16" y={60 + i * 50} width="368" height="42" rx="10" fill={M} opacity="0.35" />
          <circle cx="40" cy={81 + i * 50} r="14" fill={u.c} opacity="0.3" />
          <circle cx="40" cy={76 + i * 50} r="5" fill={u.c} opacity="0.7" />
          <path d={`M30 ${90 + i * 50} a10 7 0 0 1 20 0`} fill={u.c} opacity="0.7" />
          <L x={64} y={74 + i * 50} w={120} h={7} c={MF} o={0.6} />
          <L x={64} y={88 + i * 50} w={80} h={6} c={MF} o={0.4} />
          <rect x="308" y={72 + i * 50} width="64" height="20" rx="10" fill={u.c} opacity="0.18" />
          <text x="340" y={86 + i * 50} fill={u.c === P ? P : MF} fontSize="9" fontWeight="700" textAnchor="middle" fontFamily="system-ui, sans-serif">
            {u.rol}
          </text>
        </g>
      ))}
    </Marco>
  );
}

export function SuscripcionFigura() {
  return (
    <Marco titulo="Suscripción">
      <rect x="16" y="60" width="368" height="40" rx="10" fill="#10b981" opacity="0.12" />
      <circle cx="38" cy="80" r="9" fill="#10b981" opacity="0.8" />
      <path d="M34 80 l3 3 l6 -6" stroke="#fff" strokeWidth="2" fill="none" />
      <L x={56} y={70} w={120} h={7} c={MF} o={0.7} />
      <L x={56} y={86} w={80} h={6} c={MF} o={0.45} />
      {[0, 1].map((i) => (
        <g key={i}>
          <rect x={16 + i * 190} y="116" width="178" height="114" rx="12" fill={M} opacity={i === 1 ? 0.5 : 0.3} stroke={i === 1 ? P : 'var(--border)'} strokeWidth={i === 1 ? 2 : 1} />
          <L x={32 + i * 190} y={132} w={70} h={7} c={MF} o={0.7} />
          <text x={32 + i * 190} y={166} fill={P} fontSize="18" fontWeight="800" fontFamily="system-ui, sans-serif">
            {i === 0 ? '$9.990' : '$19.990'}
          </text>
          {[0, 1, 2].map((r) => (
            <L key={r} x={32 + i * 190} y={182 + r * 14} w={130} h={5} c={MF} o={0.4} />
          ))}
        </g>
      ))}
    </Marco>
  );
}

/** Registro de ilustraciones por slug de módulo. */
export const ILUSTRACIONES: Record<string, ComponentType> = {
  pos: PosFigura,
  caja: CajaFigura,
  inventario: InventarioFigura,
  productos: ProductosFigura,
  'escaner-ocr': EscanerFigura,
  compras: ComprasFigura,
  gastos: GastosFigura,
  'reportes-iva': ReportesFigura,
  usuarios: UsuariosFigura,
  suscripcion: SuscripcionFigura,
};
