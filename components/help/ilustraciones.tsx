/**
 * Ilustraciones SVG del centro de ayuda y la landing. Son mini-pantallas
 * estilizadas de cada módulo, con datos realistas (nombres, precios, estados)
 * para que se vean como la app de verdad, no como un esqueleto de carga.
 * Usan las CSS vars del tema (`--card`/`--border`/`--primary`/`--foreground`/
 * `--muted-foreground`) → se ven bien en claro y oscuro y escalan sin perder
 * calidad. No dependen de screenshots.
 */
import type { ComponentType } from 'react';

const FONT = 'system-ui, -apple-system, sans-serif';
const FG = 'var(--foreground)';
const MF = 'var(--muted-foreground)';
const P = 'var(--primary)';
const CARD = 'var(--card)';
const BORDER = 'var(--border)';

// Acentos suaves por categoría (legibles en claro y oscuro como fills con opacidad).
const ACENTOS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f43f5e'];

/** Marco de "pantalla" compartido: tarjeta con barra de título de marca. */
function Marco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 400 250" role="img" aria-label={titulo} className="h-auto w-full" xmlns="http://www.w3.org/2000/svg">
      <rect x="0.5" y="0.5" width="399" height="249" rx="16" fill={CARD} stroke={BORDER} />
      <path d="M0 16 A16 16 0 0 1 16 0 H384 A16 16 0 0 1 400 16 V46 H0 Z" fill={P} />
      <circle cx="22" cy="23" r="4" fill="#fff" opacity="0.55" />
      <circle cx="36" cy="23" r="4" fill="#fff" opacity="0.35" />
      <circle cx="50" cy="23" r="4" fill="#fff" opacity="0.25" />
      <text x="70" y="28" fill="#fff" fontSize="13" fontWeight="700" fontFamily={FONT}>{titulo}</text>
      {children}
    </svg>
  );
}

function T({ x, y, children, size = 10, weight = 400, color = FG, anchor = 'start' }: {
  x: number; y: number; children: React.ReactNode; size?: number; weight?: number; color?: string; anchor?: 'start' | 'middle' | 'end';
}) {
  return <text x={x} y={y} fill={color} fontSize={size} fontWeight={weight} fontFamily={FONT} textAnchor={anchor}>{children}</text>;
}

export function PosFigura() {
  const prods = [
    { n: 'Café', p: '$1.500' }, { n: 'Bebida', p: '$1.200' }, { n: 'Pan', p: '$900' },
    { n: 'Jugo', p: '$1.000' }, { n: 'Agua', p: '$800' }, { n: 'Galleta', p: '$700' },
  ];
  return (
    <Marco titulo="Punto de venta">
      {prods.map((pr, i) => {
        const c = i % 3, r = Math.floor(i / 3);
        const x = 16 + c * 78, y = 62 + r * 74;
        return (
          <g key={pr.n}>
            <rect x={x} y={y} width="70" height="66" rx="10" fill={CARD} stroke={BORDER} />
            <rect x={x + 10} y={y + 10} width="22" height="22" rx="7" fill={ACENTOS[i]} opacity="0.2" />
            <circle cx={x + 21} cy={y + 21} r="5" fill={ACENTOS[i]} opacity="0.75" />
            <T x={x + 10} y={y + 48} size={9} weight={600}>{pr.n}</T>
            <T x={x + 10} y={y + 60} size={10} weight={700} color={P}>{pr.p}</T>
          </g>
        );
      })}
      {/* Carrito */}
      <rect x="258" y="62" width="126" height="170" rx="12" fill="var(--muted)" opacity="0.35" />
      <T x={272} y={80} size={11} weight={700}>Carrito</T>
      {[['Café', '$1.500'], ['Pan', '$900'], ['Agua', '$800']].map(([n, p], i) => (
        <g key={i}>
          <T x={272} y={104 + i * 20} size={9} color={MF}>{n}</T>
          <T x={372} y={104 + i * 20} size={9} weight={600} anchor="end">{p}</T>
        </g>
      ))}
      <line x1="272" y1="172" x2="372" y2="172" stroke={BORDER} />
      <T x={272} y={190} size={10} weight={600}>Total</T>
      <T x={372} y={190} size={12} weight={800} color={P} anchor="end">$3.200</T>
      <rect x="270" y="202" width="104" height="24" rx="8" fill={P} />
      <T x={322} y={218} size={11} weight={700} color="#fff" anchor="middle">Cobrar</T>
    </Marco>
  );
}

export function CajaFigura() {
  const movs = [['Apertura', '+$20.000'], ['Venta efectivo', '+$2.380'], ['Retiro proveedor', '−$5.000']];
  return (
    <Marco titulo="Caja">
      <rect x="16" y="62" width="368" height="74" rx="12" fill={P} opacity="0.1" />
      <T x={32} y={82} size={10} color={MF}>Efectivo en caja</T>
      <T x={32} y={116} size={28} weight={800} color={P}>$212.300</T>
      <rect x="286" y="78" width="84" height="26" rx="13" fill="#10b981" opacity="0.18" />
      <circle cx="305" cy="91" r="7" fill="#10b981" opacity="0.85" />
      <path d="M301.5 91 l2.5 2.5 l5 -5" stroke="#fff" strokeWidth="1.6" fill="none" />
      <T x={318} y={95} size={10} weight={700} color="#059669">Cuadrada</T>
      {movs.map(([n, v], i) => (
        <g key={i}>
          <rect x="16" y={148 + i * 30} width="368" height="24" rx="7" fill="var(--muted)" opacity="0.3" />
          <T x={28} y={164 + i * 30} size={10} color={MF}>{n}</T>
          <T x={372} y={164 + i * 30} size={10} weight={600} color={v.startsWith('−') ? '#e11d48' : FG} anchor="end">{v}</T>
        </g>
      ))}
    </Marco>
  );
}

export function InventarioFigura() {
  const items = [
    { n: 'Café molido 250g', s: '24 un', bajo: false },
    { n: 'Bebida 1.5 L', s: '8 un', bajo: false },
    { n: 'Pan amasado', s: '3 un', bajo: true },
    { n: 'Azúcar 1 kg', s: '15 un', bajo: false },
  ];
  return (
    <Marco titulo="Inventario">
      {items.map((it, i) => (
        <g key={i}>
          <rect x="16" y={62 + i * 42} width="368" height="34" rx="9" fill="var(--muted)" opacity="0.3" />
          <rect x="26" y={70 + i * 42} width="18" height="18" rx="5" fill={ACENTOS[i]} opacity="0.25" />
          <T x={54} y={84 + i * 42} size={10} weight={600}>{it.n}</T>
          {it.bajo ? (
            <>
              <rect x="300" y={72 + i * 42} width="74" height="16" rx="8" fill="#f59e0b" opacity="0.18" />
              <T x={337} y={84 + i * 42} size={9} weight={700} color="#b45309" anchor="middle">stock bajo</T>
            </>
          ) : (
            <T x={372} y={84 + i * 42} size={10} weight={600} color={MF} anchor="end">{it.s}</T>
          )}
        </g>
      ))}
    </Marco>
  );
}

export function ProductosFigura() {
  return (
    <Marco titulo="Nuevo producto">
      <T x={20} y={76} size={9} color={MF}>Nombre</T>
      <rect x="16" y="82" width="232" height="26" rx="8" fill={CARD} stroke={BORDER} />
      <T x={26} y={99} size={10} weight={600}>Café molido 250 g</T>
      <T x={20} y={128} size={9} color={MF}>Precio (con IVA)</T>
      <rect x="16" y="134" width="110" height="26" rx="8" fill={CARD} stroke={BORDER} />
      <T x={26} y={151} size={10} weight={700} color={P}>$2.490</T>
      {/* Categoría chip */}
      <rect x="134" y="134" width="114" height="26" rx="8" fill={P} opacity="0.1" />
      <T x={145} y={151} size={10} weight={600} color={P}>Cafetería ▾</T>
      {/* Foto */}
      <rect x="262" y="82" width="122" height="78" rx="10" fill={P} opacity="0.1" />
      <circle cx="323" cy="112" r="14" fill={P} opacity="0.4" />
      <path d="M316 113 l5 -5 l5 5 l4 -3 l4 4" stroke={CARD} strokeWidth="2" fill="none" />
      <T x={323} y={148} size={9} color={MF} anchor="middle">Foto del producto</T>
      <rect x="16" y="196" width="160" height="30" rx="9" fill={P} />
      <T x={96} y={216} size={11} weight={700} color="#fff" anchor="middle">Agregar producto</T>
    </Marco>
  );
}

export function EscanerFigura() {
  return (
    <Marco titulo="Escanear">
      <rect x="90" y="62" width="220" height="118" rx="12" fill="#0d1b2a" />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <rect key={i} x={120 + i * 18} y="90" width={i % 3 === 0 ? 7 : 3} height="54" fill="#fff" opacity="0.92" />
      ))}
      {([[98, 70, 1, 1], [302, 70, -1, 1], [98, 172, 1, -1], [302, 172, -1, -1]] as const).map(([x, y, sx, sy], i) => (
        <path key={i} d={`M${x} ${y + 16 * sy} V${y} H${x + 16 * sx}`} stroke={P} strokeWidth="3" fill="none" />
      ))}
      <rect x="90" y="117" width="220" height="3" fill={P} opacity="0.9" />
      {/* Resultado */}
      <rect x="90" y="194" width="220" height="32" rx="10" fill="#10b981" opacity="0.14" />
      <circle cx="110" cy="210" r="8" fill="#10b981" opacity="0.85" />
      <path d="M106 210 l3 3 l5 -5" stroke="#fff" strokeWidth="1.7" fill="none" />
      <T x={126} y={207} size={10} weight={700} color="#059669">Coca-Cola 1.5 L</T>
      <T x={126} y={219} size={8} color={MF}>Producto encontrado</T>
    </Marco>
  );
}

export function ComprasFigura() {
  const rows = [
    { n: 'Distribuidora Andina', m: '$11.881', est: 'pendiente', c: '#f59e0b' },
    { n: 'Coca-Cola Embonor', m: '$115.000', est: 'pagada', c: '#10b981' },
    { n: 'Proveedor ABC', m: '$45.200', est: 'pagada', c: '#10b981' },
  ];
  return (
    <Marco titulo="Cuentas por pagar">
      {rows.map((r, i) => (
        <g key={i}>
          <rect x="16" y={64 + i * 50} width="368" height="42" rx="10" fill="var(--muted)" opacity="0.3" />
          <rect x="28" y={76 + i * 50} width="20" height="20" rx="6" fill={P} opacity="0.18" />
          <path d={`M33 ${88 + i * 50} h10 M33 ${84 + i * 50} h10`} stroke={P} strokeWidth="1.5" opacity="0.6" />
          <T x={58} y={82 + i * 50} size={10} weight={600}>{r.n}</T>
          <T x={58} y={96 + i * 50} size={9} color={MF}>{r.m}</T>
          <rect x="300" y={76 + i * 50} width="74" height="18" rx="9" fill={r.c} opacity="0.18" />
          <T x={337} y={89 + i * 50} size={9} weight={700} color={r.c} anchor="middle">{r.est}</T>
        </g>
      ))}
    </Marco>
  );
}

export function GastosFigura() {
  const cats = [['Arriendo', '$350.000'], ['Servicios básicos', '$48.000'], ['Insumos', '$92.500']];
  return (
    <Marco titulo="Gastos">
      {cats.map(([n, v], i) => (
        <g key={i}>
          <rect x="16" y={64 + i * 42} width="368" height="34" rx="9" fill="var(--muted)" opacity="0.3" />
          <circle cx="38" cy={81 + i * 42} r="10" fill={ACENTOS[i]} opacity="0.22" />
          <T x={56} y={85 + i * 42} size={10} weight={600}>{n}</T>
          <T x={372} y={85 + i * 42} size={10} weight={600} color={MF} anchor="end">{v}</T>
        </g>
      ))}
      <rect x="16" y="196" width="368" height="32" rx="9" fill={P} opacity="0.1" />
      <T x={28} y={216} size={10} weight={600} color={P}>IVA crédito del mes</T>
      <T x={372} y={216} size={13} weight={800} color={P} anchor="end">$93.000</T>
    </Marco>
  );
}

export function ReportesFigura() {
  const bars = [40, 70, 55, 90, 65, 110];
  const meses = ['E', 'F', 'M', 'A', 'M', 'J'];
  return (
    <Marco titulo="Reportes e IVA">
      {bars.map((h, i) => (
        <g key={i}>
          <rect x={28 + i * 40} y={188 - h} width="26" height={h} rx="5" fill={P} opacity={0.3 + i * 0.11} />
          <T x={41 + i * 40} y={204} size={8} color={MF} anchor="middle">{meses[i]}</T>
        </g>
      ))}
      <line x1="20" y1="188" x2="280" y2="188" stroke={BORDER} strokeWidth="1.5" />
      {/* Tarjeta F29 */}
      <rect x="296" y="64" width="88" height="60" rx="11" fill={P} opacity="0.1" />
      <T x={310} y={82} size={9} color={MF}>IVA a pagar</T>
      <T x={310} y={104} size={16} weight={800} color={P}>$98.760</T>
      <T x={310} y={117} size={8} weight={600} color="#059669">F29 · junio</T>
      <T x={20} y={224} size={9} color={MF}>Ventas del mes · $2.480.500</T>
    </Marco>
  );
}

export function UsuariosFigura() {
  const us = [
    { n: 'Andrés', rol: 'Admin', admin: true },
    { n: 'María', rol: 'Empleado', admin: false },
    { n: 'Juan', rol: 'Empleado', admin: false },
  ];
  return (
    <Marco titulo="Usuarios y roles">
      {us.map((u, i) => {
        const c = u.admin ? P : MF;
        return (
          <g key={i}>
            <rect x="16" y={64 + i * 52} width="368" height="44" rx="11" fill="var(--muted)" opacity="0.3" />
            <circle cx="42" cy={86 + i * 52} r="15" fill={c} opacity="0.2" />
            <circle cx="42" cy={81 + i * 52} r="5.5" fill={c} opacity="0.8" />
            <path d={`M31 ${96 + i * 52} a11 8 0 0 1 22 0`} fill={c} opacity="0.8" />
            <T x={66} y={82 + i * 52} size={11} weight={600}>{u.n}</T>
            <T x={66} y={96 + i * 52} size={8} color={MF}>{u.admin ? 'Acceso total' : 'Operación diaria'}</T>
            <rect x="304" y={76 + i * 52} width="70" height="20" rx="10" fill={c} opacity="0.18" />
            <T x={339} y={90 + i * 52} size={9} weight={700} color={u.admin ? P : MF} anchor="middle">{u.rol}</T>
          </g>
        );
      })}
    </Marco>
  );
}

export function SuscripcionFigura() {
  const planes = [
    { n: 'Emprende', p: '$9.990', feats: 2, dest: false },
    { n: 'Pyme', p: '$19.990', feats: 3, dest: true },
  ];
  return (
    <Marco titulo="Planes">
      {planes.map((pl, i) => {
        const x = 16 + i * 190;
        return (
          <g key={i}>
            <rect x={x} y="64" width="178" height="168" rx="12" fill={pl.dest ? P : 'var(--muted)'} opacity={pl.dest ? 0.08 : 0.3} stroke={pl.dest ? P : BORDER} strokeWidth={pl.dest ? 2 : 1} />
            {pl.dest && (
              <>
                <rect x={x + 49} y="54" width="80" height="20" rx="10" fill={P} />
                <T x={x + 89} y={68} size={9} weight={700} color="#fff" anchor="middle">Más completo</T>
              </>
            )}
            <T x={x + 16} y={94} size={11} weight={700}>{pl.n}</T>
            <T x={x + 16} y={124} size={22} weight={800} color={P}>{pl.p}</T>
            <T x={x + 16} y={138} size={8} color={MF}>por mes</T>
            {Array.from({ length: pl.feats + 2 }).map((_, r) => (
              <g key={r}>
                <circle cx={x + 20} cy={154 + r * 16} r="5" fill="#10b981" opacity="0.2" />
                <path d={`M${x + 17} ${154 + r * 16} l2.2 2.2 l4 -4.2`} stroke="#10b981" strokeWidth="1.4" fill="none" />
                <rect x={x + 32} y={150 + r * 16} width={110 - (r % 2) * 24} height="6" rx="3" fill={MF} opacity="0.4" />
              </g>
            ))}
          </g>
        );
      })}
    </Marco>
  );
}

/** Modal de venta a granel (peso ↔ monto). Esquema extra para POS/escáner. */
export function GranelFigura() {
  return (
    <Marco titulo="Venta a granel">
      <T x={20} y={80} size={11} weight={700}>Queso mantecoso</T>
      <T x={20} y={96} size={9} color={MF}>$8.000 por kg</T>
      {/* Toggle Peso / Monto */}
      <rect x="16" y="108" width="368" height="34" rx="10" fill="var(--muted)" opacity="0.35" />
      <rect x="20" y="112" width="180" height="26" rx="8" fill={P} />
      <T x={110} y={129} size={10} weight={700} color="#fff" anchor="middle">Por peso</T>
      <T x={292} y={129} size={10} weight={600} color={MF} anchor="middle">Por monto</T>
      {/* Input peso */}
      <T x={20} y={166} size={9} color={MF}>Peso</T>
      <rect x="16" y="172" width="368" height="30" rx="9" fill={CARD} stroke={BORDER} />
      <T x={28} y={192} size={12} weight={700}>0,350 kg</T>
      <T x={372} y={192} size={11} weight={700} color={P} anchor="end">$2.800</T>
      <rect x="16" y="210" width="368" height="22" rx="8" fill={P} opacity="0.12" />
      <T x={200} y={225} size={9} weight={600} color={P} anchor="middle">Agregar al carrito · $2.800</T>
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
