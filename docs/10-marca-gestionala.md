# Marca Gestionala — Identidad y Sistema de Diseño

**Versión:** 1.0 · **Fecha:** 2026-06-16

> Documento de respaldo de la identidad de marca. **Fuente de verdad** para el
> nombre, la paleta, el logo y el sistema de diseño. Para cualquier trabajo de
> UI, partir de aquí.

---

## 1. Nombre

**Gestionala** (reemplaza a "mypyme", que ya existía).

### Reglas de uso del nombre
- **Marca visible:** siempre "Gestionala".
- **NO se cambia** (identificadores técnicos, romperían cosas):
  - Flow plan IDs: `mypyme_emprende` / `mypyme_pyme` (ya creados en Flow).
  - Repo GitHub (`CariolaFlex/mypyme`), proyecto Supabase (`igpplasotoshtuwbdzmf`,
    `config.toml` project_id), proyecto Vercel (`mypyme-blond`).
  - Dexie DB name (`lib/db.ts` → 'mypyme'): interno, cambiarlo borra colas offline.
  - `package.json` name, comentarios en migraciones aplicadas (historia inmutable).
- Dominio/email definitivos (`@gestionala.cl` u otro) → cuando se compre el dominio.

---

## 2. Logo e isologo

Assets en `public/brand/` (originales del usuario):

| Archivo | Qué es | Uso en la app |
|---|---|---|
| `logo.svg` | isologo horizontal (símbolo + "Gestionala") vector | sidebar, login, headers |
| `logo-mark.svg` | isotipo solo (la "G" hexagonal) vector | compacto, badges, favicon source |
| `og_isologo+texto.png` | horizontal PNG | emails (no soportan SVG) |
| `og_isologo_v1.png` / `og_isologo_v2.png` | isotipo PNG | imagen OG / fallback |
| `icon-512.png` (512×512) | icono | `app/icon.png` (favicon + PWA) |
| `icon-192.png` (192×192) | icono | PWA manifest |
| `icon-maskable-512.png` (512×512, zona segura 80%) | icono | PWA Android (recorte circular) |
| `apple-icon.png` (180×180) | icono | iOS home screen |

El isotipo es una **"G" hexagonal** con cinta 3D en degradado navy→acero. "Gestion"
va en navy (#0D1B2A/#1E293B) y "ala" en gris acero (#475569/#64748B).

---

## 3. Paleta de colores

### Principal
| Nombre | Hex |
|---|---|
| Azul Marino | `#0D1B2A` |
| Azul Pizarra | `#1E293B` |
| Gris Acero | `#475569` |
| Gris Grafito | `#64748B` |
| Gris Plata | `#CBD5E1` |

### Secundaria
| Nombre | Hex |
|---|---|
| Azul Profundo | `#1E3A8A` |
| **Azul Real (primario de acción)** | `#2563EB` |
| Azul Hielo | `#647DA6` |
| Carbón | `#111827` |
| Gris Niebla | `#94A3B8` |

### Neutra
| Nombre | Hex |
|---|---|
| Negro Azulado | `#0B1220` |
| Negro Suave | `#1F2937` |
| Gris Oscuro | `#374151` |
| Gris Medio | `#6B7280` |
| Gris Claro | `#E5E7EB` |
| Gris Muy Claro | `#F1F5F9` |
| Blanco | `#FFFFFF` |

### Gradientes
- **Principal (logo):** `#0D1B2A → #1E293B → #475569 → #64748B → #CBD5E1`
- **Alternativo:** `#111827 → #1F2937 → #374151 → #6B7280 → #CBD5E1`
- **Acción/vivo** (botones, hero accent): `#1E3A8A → #2563EB`

---

## 4. Mapeo a tokens (`app/globals.css`)

| Token | Claro | Oscuro |
|---|---|---|
| `--primary` (acción) | `#2563EB` | `#3B82F6` |
| `--foreground` (texto) | `#0D1B2A` | `#F1F5F9` |
| `--background` | `#FFFFFF` | `#0B1220` |
| `--card` | `#FFFFFF` | `#1F2937` |
| `--muted-foreground` | `#475569` | `#94A3B8` |
| `--border` | `#E5E7EB` | `rgba(255,255,255,.10)` |
| `--ring` | `#2563EB` | `#3B82F6` |
| `--chart-1..5` | marino · azul real · acero · grafito · hielo | (mismos / aclarados) |
| `--sidebar` | `#F1F5F9` tinte navy | `#111827` |

### Utilidades de degradado (clases globales)
- `.grad-brand` — degradado principal (navy→plata), para fondos/headers.
- `.grad-brand-vivid` — `#1E3A8A→#2563EB`, para botones primarios / hero.
- `.text-grad-brand` — degradado aplicado a texto (hero headings).
- `.grad-alt` — degradado alternativo (carbón→plata).

---

## 5. Dirección de diseño

Referencia de **formato/animaciones** (no de color): estilo tipo "ProjectLab"
(dark, nav flotante glass, cards redondeadas, hero con texto en degradado, stat
cards, animaciones de entrada/hover). **El color es el navy/azul/slate de arriba**
— NO el rosa/morado de la referencia.

Aplicar degradados en: hero/headers de sección, iconos, viñetas, KPI cards,
botones primarios, bordes sutiles, gráficos. Login renovado al mismo estándar.
