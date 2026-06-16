# brand-source

Archivos fuente de marca **no servidos** (fuera de `public/`, no se deployan).

- `logo.svg` / `logo-mark.svg` — isologo / isotipo (la "G" hexagonal). Son SVG con
  raster embebido (~1.4MB c/u), no vectores reales. La app **no** los usa; sirve los
  PNG optimizados de `public/brand/` (ver `docs/10-marca-gestionala.md`).
- `paleta_gestionala.png` — lámina de referencia de la paleta navy.

Se movieron acá desde `public/brand/` para sacar ~3.9MB de peso muerto del deploy.
Si se necesita un isotipo vectorial liviano para la app, hay que reconstruirlo a
SVG real (a mano), no reusar estos.
