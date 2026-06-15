// Runner de la suite e2e: corre TODOS los scripts/verify-*.mjs en serie
// (en serie a propósito: pegan a la misma DB cloud y algunos usan RUTs fijos,
// en paralelo colisionarían). Reporta un resumen y sale con código !=0 si
// cualquiera falla — apto para CI.
//
// Uso: node scripts/test-all.mjs            (corre todos)
//      node scripts/test-all.mjs roles iva  (corre solo verify-roles, verify-iva)
import { readdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const filtros = process.argv.slice(2);

let scripts = readdirSync(here)
  .filter((f) => f.startsWith('verify-') && f.endsWith('.mjs'))
  .sort();

if (filtros.length) {
  scripts = scripts.filter((f) => filtros.some((q) => f.includes(q)));
}

if (!scripts.length) {
  console.error('No hay scripts verify-*.mjs que correr' + (filtros.length ? ` para: ${filtros.join(', ')}` : ''));
  process.exit(1);
}

function run(file) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const child = spawn(process.execPath, [join(here, file)], { stdio: 'inherit' });
    child.on('close', (code) => resolve({ file, code: code ?? 1, ms: Date.now() - t0 }));
  });
}

console.log(`\n▶ Corriendo ${scripts.length} suite(s) e2e en serie...\n`);
const results = [];
for (const file of scripts) {
  console.log(`\n──────── ${file} ────────`);
  results.push(await run(file));
}

console.log('\n\n════════ RESUMEN SUITE e2e ════════');
for (const r of results) {
  const s = (r.ms / 1000).toFixed(1) + 's';
  console.log(`${r.code === 0 ? '✅' : '❌'} ${r.file.padEnd(28)} ${s.padStart(7)}`);
}
const fallaron = results.filter((r) => r.code !== 0);
console.log(`\n${results.length - fallaron.length}/${results.length} suites OK`);
if (fallaron.length) {
  console.log(`Fallaron: ${fallaron.map((r) => r.file).join(', ')}`);
  process.exit(1);
}
process.exit(0);
