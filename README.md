# ⚗ UE5 Shader Conversion Cheatsheet

A practical, community-maintained reference for converting **GLSL/HLSL shaders** (Shadertoy, raw GLSL, standalone HLSL) into **Unreal Engine 5** compatible shader code.

🌐 **Live site:** https://stylerm.github.io/UE5-HLSL-Cheatsheet

---

## Pages

| Page | Content |
|------|---------|
| [**Home**](index.html) | Hub overview, core GLSL→HLSL conversions, UE globals quick reference |
| [**Materials**](materials.html) | Custom node rules, full intrinsic table, Shadertoy porting guide, WPO/vertex patterns, prompt templates |
| [**Niagara**](niagara.html) | Scratch Pad HLSL, attribute namespaces, Stateless module patterns, GPU sim restrictions, compute buffer access |
| [**Shaders**](shaders.html) | `.usf`/`.ush` file rules, compute shader patterns, TGSM, feature level matrix, platform guards, texture sampling |
| [**Visuals**](visuals.html) | Interactive visualizers for overdraw, bounds, thread groups, stateless particles, and other engine concepts |
| [**Fundamentals**](fundamentals.html) | Skill-tiered walkthroughs — beginner / intermediate / advanced interactive demos, one concept per card |

---

## What's Inside

### Materials
- **GLSL → HLSL intrinsic mapping** — 20-row table: `mix`, `fract`, `mod`, `atan`, `smoothstep`, `textureLod`, and more
- **Custom node DOs and DON'Ts** — struct workaround for helper functions (C2059 fix), Include File Paths
- **Shadertoy porting guide** — `iTime`, `iResolution`, `iMouse` mappings; UV/coordinate differences; multi-pass limitations
- **World Position Offset** — WPO basics, available vertex data, limitations
- **Prompt templates** — copy-paste AI prompts for Custom node and Shadertoy conversion

### Niagara
- **Scratch Pad HLSL patterns** — pin binding, `Particles.X` namespace, output pin writes
- **Stateless module patterns** — `FStatelessParticle` / `FStatelessParticleContext` structs
- **GPU sim restrictions** — no raw texture calls, no `ddx`/`ddy`, use Texture Sample Data Interface
- **GPU buffer access** — `Buffer<float>` stride reads, indexing strategies
- **Attribute reference** — `Particles.X` namespace vs Stateless struct fields

### Shaders (.usf / .ush)
- **File structure** — include guards, virtual shader paths, `#pragma once`
- **Compute shader patterns** — `[numthreads]`, `SV_DispatchThreadID`, resource types
- **TGSM** — `groupshared`, halo loading, `GroupMemoryBarrierWithGroupSync`
- **Feature level matrix** — ES3.1 / SM5 / SM6 capability comparison
- **Platform guards** — `FEATURE_LEVEL`, `COMPILER_HLSL`, Vulkan/Metal conditionals

---

## Usage

### Run locally

```bash
git clone https://github.com/stylerm/UE5-HLSL-Cheatsheet.git
cd UE5-HLSL-Cheatsheet
# Open index.html in your browser, or use any static server:
npx serve .
# or:
python -m http.server 3000
```

### Editing content

The three sub-pages (`materials.html`, `niagara.html`, `shaders.html`) are **generated** — don't edit them directly. Edit the YAML source files instead, then rebuild:

```bash
# One-time setup
pip install pyyaml

# After editing any data/*.yaml file:
python build.py
```

| File | Edits |
|------|-------|
| `data/materials.yaml` | Custom node rules, GLSL→HLSL table, Shadertoy guide, WPO, prompt templates |
| `data/niagara.yaml`   | Scratch Pad patterns, attribute table, Stateless patterns, tips |
| `data/shaders.yaml`   | File rules, compute patterns, TGSM, feature matrix, sampling |
| `templates/page.html` | Shared HTML layout (sidenav, topbar, JS — affects all pages) |
| `index.html`          | Hand-written hub page — edit directly |
| `styles.css`          | Shared stylesheet — edit directly |

### Adding a new table row (example)

Open `data/materials.yaml`, find the `syntax` section, add a row to the `rows` list:

```yaml
- ["myGLSLFunc(x)", "myHLSLFunc(x)", "Brief note about the difference"]
```

Then run `python build.py`. Done.

---

## Contributing

Contributions are very welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Good candidates for PRs:**
- Missing GLSL → HLSL intrinsic mappings
- Platform-specific gotchas (mobile, console, Vulkan)
- Niagara Scratch Pad / Stateless patterns
- Better or more complete prompt templates
- Version-specific UE5 changes (5.1 / 5.2 / 5.3 / 5.4+)

**Opening an issue is also fine** if you spot an error or want to request a section.

---

## Structure

```
UE5-HLSL-Cheatsheet/
├── build.py              ← Build script (python build.py)
├── data/
│   ├── materials.yaml    ← Materials page content (source of truth)
│   ├── niagara.yaml      ← Niagara page content (source of truth)
│   └── shaders.yaml      ← Shaders page content (source of truth)
├── templates/
│   └── page.html         ← Shared HTML layout template
├── index.html            ← Hand-written hub page
├── materials.html        ← GENERATED — do not edit directly
├── niagara.html          ← GENERATED — do not edit directly
├── shaders.html          ← GENERATED — do not edit directly
├── styles.css            ← Shared stylesheet (all pages)
├── README.md
├── CONTRIBUTING.md
└── LICENSE
```

`index.html` and `styles.css` are edited directly. Everything else is generated from `data/*.yaml` + `templates/page.html` by running `python build.py`.

---

## License

[CC BY 4.0](LICENSE) — use freely, attribution required.
