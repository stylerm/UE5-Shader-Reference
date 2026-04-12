# ⚗ UE5 Shader Conversion Cheatsheet

A practical, community-maintained reference for converting **GLSL/HLSL shaders** (Shadertoy, raw GLSL, standalone HLSL) into **Unreal Engine 5** compatible shader code.

🌐 **Live site:** https://stylerm.github.io/UE5-HLSL-Cheatsheet

---

## What's Inside

- **Context checklist** — what to declare before writing any UE5 shader
- **GLSL → HLSL intrinsic mapping table** — `mix`, `fract`, `mod`, `atan`, and more
- **Custom node rules** — what's allowed and what breaks compilation
- **`.usf` / `.ush` file rules** — include guards, virtual paths, feature level guards
- **Copy-paste prompt templates** — for AI-assisted shader writing and Shadertoy ports
- **Feature level matrix** — SM5 vs SM6 vs ES3.1 capability comparison
- **Common gotchas** — UV flipping, matrix order, integer division, swizzle mismatches

---

## Usage

This is a **single-file static site** — just `index.html`. No build step, no dependencies, no framework.

### Run locally

```bash
git clone https://github.com/stylerm/UE5-HLSL-Cheatsheet.git
cd UE5-HLSL-Cheatsheet
# Open index.html in your browser, or use any static server:
npx serve .
```

---

## Contributing

Contributions are very welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Good candidates for PRs:**
- Missing GLSL → HLSL intrinsic mappings
- Platform-specific gotchas (mobile, console, Vulkan)
- Niagara-specific HLSL rules
- Better or more complete prompt templates
- Version-specific UE5 changes (5.1 / 5.2 / 5.3 / 5.4+)

**Opening an issue is also fine** if you spot an error or want to request a section.

---

## Structure

```
UE5-HLSL-Cheatsheet/
├── index.html        ← entire site (self-contained)
├── README.md
├── CONTRIBUTING.md
└── LICENSE
```

Because the site is a single HTML file with embedded CSS, all edits happen in `index.html`. This makes it easy to propose changes without needing any toolchain.

---

## License

[MIT](LICENSE) — use freely, attribution appreciated.
