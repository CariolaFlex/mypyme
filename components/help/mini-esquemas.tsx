/**
 * Mini-esquemas SVG compactos para las tarjetas de "features" de la landing.
 * Más pequeños que las ilustraciones de pantalla completa: una micro-visual por
 * beneficio. Theme-aware (CSS vars de la marca), fondo transparente.
 */
const FONT = 'system-ui, -apple-system, sans-serif';
const FG = 'var(--foreground)';
const MF = 'var(--muted-foreground)';
const P = 'var(--primary)';
const CARD = 'var(--card)';
const BORDER = 'var(--border)';

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 240 70" className="h-auto w-full" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {children}
    </svg>
  );
}

function Flecha({ x1, x2, y }: { x1: number; x2: number; y: number }) {
  return (
    <g stroke={MF} strokeWidth="1.5" opacity="0.6">
      <line x1={x1} y1={y} x2={x2 - 4} y2={y} />
      <path d={`M${x2 - 6} ${y - 3} L${x2} ${y} L${x2 - 6} ${y + 3}`} fill={MF} stroke="none" />
    </g>
  );
}

function Nodo({ x, y, w, label, color = P }: { x: number; y: number; w: number; label: string; color?: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height="30" rx="8" fill={color} opacity="0.1" />
      <text x={x + w / 2} y={y + 19} fill={color} fontSize="9.5" fontWeight={700} fontFamily={FONT} textAnchor="middle">{label}</text>
    </g>
  );
}

export function MiniPos() {
  const ac = ['#2563eb', '#10b981', '#f59e0b'];
  return (
    <Svg>
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={4 + i * 34} y="20" width="30" height="30" rx="8" fill={CARD} stroke={BORDER} />
          <circle cx={19 + i * 34} cy="35" r="6" fill={ac[i]} opacity="0.7" />
        </g>
      ))}
      <Flecha x1={112} x2={140} y={35} />
      <rect x="146" y="20" width="90" height="30" rx="9" fill={P} />
      <text x="191" y="39" fill="#fff" fontSize="11" fontWeight={700} fontFamily={FONT} textAnchor="middle">Cobrar</text>
    </Svg>
  );
}

export function MiniOffline() {
  return (
    <Svg>
      <Nodo x={2} y={20} w={66} label="Vendes" />
      <Flecha x1={70} x2={88} y={35} />
      <Nodo x={88} y={20} w={64} label="Se guarda" color={MF} />
      <Flecha x1={154} x2={172} y={35} />
      <Nodo x={172} y={20} w={66} label="Sincroniza" color="#10b981" />
      <text x="205" y="60" fill="#059669" fontSize="8.5" fontWeight={700} fontFamily={FONT} textAnchor="middle">al volver la red ✓</text>
    </Svg>
  );
}

export function MiniCaja() {
  const rows = [['Esperado', '$50.000'], ['Contado', '$50.000']];
  return (
    <Svg>
      {rows.map(([l, v], i) => (
        <g key={i}>
          <text x="6" y={20 + i * 18} fill={MF} fontSize="9.5" fontFamily={FONT}>{l}</text>
          <text x="150" y={20 + i * 18} fill={FG} fontSize="9.5" fontWeight={600} fontFamily={FONT} textAnchor="end">{v}</text>
        </g>
      ))}
      <rect x="166" y="20" width="72" height="34" rx="9" fill="#10b981" opacity="0.14" />
      <circle cx="184" cy="37" r="7" fill="#10b981" opacity="0.85" />
      <path d="M180.5 37 l2.5 2.5 l5 -5" stroke="#fff" strokeWidth="1.6" fill="none" />
      <text x="196" y="35" fill="#059669" fontSize="8.5" fontWeight={700} fontFamily={FONT}>Diferencia</text>
      <text x="196" y="46" fill="#059669" fontSize="9.5" fontWeight={800} fontFamily={FONT}>$0</text>
    </Svg>
  );
}

export function MiniInventario() {
  const bars = [
    { h: 30, c: P, o: 0.5 }, { h: 44, c: P, o: 0.65 }, { h: 14, c: '#f59e0b', o: 0.85 }, { h: 38, c: P, o: 0.8 },
  ];
  return (
    <Svg>
      {bars.map((b, i) => (
        <rect key={i} x={10 + i * 30} y={54 - b.h} width="22" height={b.h} rx="5" fill={b.c} opacity={b.o} />
      ))}
      <line x1="6" y1="54" x2="134" y2="54" stroke={BORDER} strokeWidth="1.5" />
      <rect x="150" y="22" width="86" height="22" rx="11" fill="#f59e0b" opacity="0.16" />
      <text x="193" y="37" fill="#b45309" fontSize="9" fontWeight={700} fontFamily={FONT} textAnchor="middle">stock bajo</text>
    </Svg>
  );
}

export function MiniCompras() {
  return (
    <Svg>
      <Nodo x={2} y={20} w={62} label="Orden" />
      <Flecha x1={66} x2={84} y={35} />
      <Nodo x={84} y={20} w={62} label="Recibe" color="#10b981" />
      <Flecha x1={148} x2={166} y={35} />
      <Nodo x={166} y={20} w={62} label="Paga" color="#10b981" />
      <text x="120" y="60" fill={MF} fontSize="8.5" fontFamily={FONT} textAnchor="middle">stock e IVA crédito al día</text>
    </Svg>
  );
}

export function MiniReportes() {
  const bars = [22, 36, 28, 46];
  return (
    <Svg>
      {bars.map((h, i) => (
        <rect key={i} x={10 + i * 26} y={54 - h} width="18" height={h} rx="4" fill={P} opacity={0.4 + i * 0.14} />
      ))}
      <line x1="6" y1="54" x2="120" y2="54" stroke={BORDER} strokeWidth="1.5" />
      <rect x="150" y="20" width="86" height="34" rx="10" fill={P} opacity="0.1" />
      <text x="162" y="33" fill={MF} fontSize="8" fontFamily={FONT}>IVA a pagar</text>
      <text x="162" y="48" fill={P} fontSize="13" fontWeight={800} fontFamily={FONT}>F29</text>
    </Svg>
  );
}
