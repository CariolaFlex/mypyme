// Verificación de lib/boleta.ts → boletaHtml (lógica pura, sin DOM ni red).
// Uso: node scripts/verify-boleta.mjs
import { boletaHtml } from '../lib/boleta.ts';

let ok = true;
const results = [];
const check = (n, c, x = '') => { results.push({ n, c: !!c, x }); if (!c) ok = false; };

const data = {
  negocio: {
    razonSocial: 'Café <Test> & Co',
    rut: '76192083-9',
    giro: 'Cafetería',
    direccion: 'Calle 1',
    telefono: null,
    usaIva: true,
    tasaIva: 19,
  },
  lineas: [
    { nombre: 'Café', cantidad: 2, precioUnit: 2000, subtotal: 4000 },
    { nombre: 'Té', cantidad: 1, precioUnit: 1500, subtotal: 1500 },
  ],
  total: 5500,
  pagos: [{ nombre: 'Efectivo', monto: 6000 }],
  vuelto: 500,
  fecha: new Date('2026-06-15T15:00:00Z'),
  ref: 'ABCD1234',
};

const html = boletaHtml(data);

check('incluye razón social escapada', html.includes('Café &lt;Test&gt; &amp; Co'), 'sin escape');
check('NO contiene < sin escapar del nombre', !html.includes('<Test>'), 'fuga de HTML');
check('incluye RUT', html.includes('76192083-9'));
check('incluye giro y dirección', html.includes('Cafetería') && html.includes('Calle 1'));
check('NO incluye teléfono (null)', !/null/.test(html), 'filtró un null');
check('incluye líneas (Café, Té)', html.includes('Café') && html.includes('Té'));
check('muestra cantidad × precio', /2 ×/.test(html));
check('incluye desglose Neto', html.includes('Neto'));
check('incluye IVA (19%)', html.includes('IVA (19%)'));
// total 5500 con IVA 19 → neto 4622, iva 878
check('neto derivado correcto ($4.622)', html.includes('4.622'), 'neto mal');
check('TOTAL presente', html.includes('TOTAL'));
check('incluye método Efectivo', html.includes('Efectivo'));
check('muestra vuelto', html.includes('Vuelto'));
check('incluye N° de referencia', html.includes('ABCD1234'));
check('marca no-tributario', html.toLowerCase().includes('no válido como documento tributario'));

// usaIva = false → sin desglose
const sinIva = boletaHtml({ ...data, negocio: { ...data.negocio, usaIva: false } });
check('sin IVA → no muestra desglose Neto', !sinIva.includes('Neto'), 'mostró neto');

console.log('\n=== Resultados verificación boleta ===');
for (const r of results) console.log(`${r.c ? '✅' : '❌'} ${r.n}${r.c ? '' : '  → ' + r.x}`);
const passed = results.filter((r) => r.c).length;
console.log(`\n${passed}/${results.length} checks OK`);
process.exit(ok && passed === results.length ? 0 : 1);
