#!/usr/bin/env python3
"""
UE5 Shader Cheatsheet — Static Site Build Script
=================================================
Usage:   python build.py
Output:  materials.html, niagara.html, shaders.html

Each page is generated from data/<page>.yaml + templates/page.html.
index.html is hand-written and left untouched.

Requirements:
    pip install pyyaml
"""

import html as html_mod
import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    sys.exit("PyYAML not found.  Run:  pip install pyyaml")

ROOT     = Path(__file__).parent
TEMPLATE = ROOT / "templates" / "page.html"
DATA_DIR = ROOT / "data"

# ── HLSL Syntax Highlighter ────────────────────────────────────────────────

_TYPES = frozenset({
    "float", "float2", "float3", "float4",
    "half",  "half2",  "half3",  "half4",
    "int",   "int2",   "int3",   "int4",
    "uint",  "uint2",  "uint3",  "uint4",
    "bool",  "bool2",  "bool3",  "bool4",
    "void",  "double", "min16float", "min16float3", "min16float4",
    "int3",  "uint3",  "int32",
})

_KEYWORDS = frozenset({
    "struct", "return", "inout", "in", "out", "static", "const",
    "if", "else", "for", "while", "break", "continue", "do", "switch", "case",
    "groupshared", "cbuffer",
    "Buffer", "RWBuffer", "Texture2D", "RWTexture2D", "Texture2DArray",
    "SamplerState", "StructuredBuffer", "RWStructuredBuffer", "ByteAddressBuffer",
    "SV_DispatchThreadID", "SV_GroupThreadID", "SV_GroupID",
    "FStatelessParticle", "FStatelessParticleContext",
})

_BUILTINS = frozenset({
    "lerp", "saturate", "normalize", "dot", "cross", "length", "distance",
    "reflect", "refract", "pow", "abs", "sign", "sqrt", "rsqrt",
    "frac", "floor", "ceil", "round", "clamp", "min", "max",
    "sin", "cos", "tan", "asin", "acos", "atan2", "atan",
    "exp", "log", "log2", "exp2", "fmod",
    "smoothstep", "step", "ddx", "ddy", "mul", "transpose", "determinant",
    "Texture2DSample", "Texture2DSampleLevel", "Load", "SampleLevel",
    "GroupMemoryBarrierWithGroupSync", "AllMemoryBarrierWithGroupSync",
    "InterlockedAdd", "InterlockedMin", "InterlockedMax",
    "ExternalTexture", "TextureSample",
    # User-defined helpers shown in examples
    "QuatMultiply", "ReadFloat3FromBuffer", "ReadFloat4FromBuffer",
    "hash21", "glsl_mod", "SmoothMin", "PointDist", "SegmentDist",
    "MainCS", "MyModule_Initialize",
    "DECLARE_TILE_CACHE_FLOAT", "LOAD_TILE_SCROLLED",
})

_PREPROC_RE = re.compile(r"^(#\w+)(.*)", re.DOTALL)


def _hl_tokens(s: str) -> str:
    """Tokenise one line and emit syntax-highlighted HTML."""
    out = []
    i = 0
    while i < len(s):
        # Inline comment — rest of line
        if s[i:i+2] == "//":
            out.append(f'<span class="c">{s[i:]}</span>')
            break

        # Word / identifier
        if s[i].isalpha() or s[i] == "_":
            j = i
            while j < len(s) and (s[j].isalnum() or s[j] == "_"):
                j += 1
            word = s[i:j]
            # Look-ahead for '(' to detect any function call
            k = j
            while k < len(s) and s[k] == " ":
                k += 1
            is_call = k < len(s) and s[k] == "("

            if word in _TYPES or word in _KEYWORDS:
                out.append(f'<span class="kw">{word}</span>')
            elif word in _BUILTINS or is_call:
                out.append(f'<span class="fn">{word}</span>')
            else:
                out.append(word)
            i = j

        else:
            out.append(s[i])
            i += 1
    return "".join(out)


def hl(src: str) -> str:
    """Apply HLSL syntax highlighting to plain-text source, returning HTML."""
    # HTML-escape the whole source first so we never double-encode
    escaped = html_mod.escape(src)
    lines = escaped.split("\n")
    out_lines = []
    for line in lines:
        m = _PREPROC_RE.match(line)
        if m:
            # Preprocessor directive on its own line
            directive = f'<span class="kw">{m.group(1)}</span>'
            out_lines.append(directive + _hl_tokens(m.group(2)))
        else:
            out_lines.append(_hl_tokens(line))
    return "\n".join(out_lines)


# ── Content Block Renderers ───────────────────────────────────────────────

def _s(v) -> str:
    return str(v) if v is not None else ""


def render_rowlist(block: dict) -> str:
    rows        = block.get("rows", [])
    code_labels = block.get("code_labels", True)
    layout      = block.get("layout", "")   # "" (inline) | "stacked"
    items = []
    for r in rows:
        label     = _s(r.get("label", ""))
        text      = _s(r.get("text", ""))
        use_code  = r.get("code_label", code_labels)
        label_html = f"<code>{label}</code>" if use_code else label
        items.append(
            f'<div class="row">'
            f'<span class="row-label">{label_html}</span>'
            f'<span class="row-text">{text}</span>'
            f'</div>'
        )
    extra_cls  = f" {layout}" if layout else ""
    return f'<div class="row-list{extra_cls}">{"".join(items)}</div>'


_ICON = {"ok": "✓", "warn": "!", "no": "✗", "arrow": "→"}

# Single-letter cost chip labels. `situational` uses `?` because that's the
# whole point — the cost is context-dependent.
_COST_LETTER = {
    "free":        "F",
    "cheap":       "C",
    "moderate":    "M",
    "expensive":   "E",
    "situational": "?",
}


def _render_cost_chip(cost: str) -> str:
    """Render a small cost chip — returns empty string if cost is unset/unknown."""
    if not cost:
        return ""
    cost = str(cost).lower().strip()
    letter = _COST_LETTER.get(cost)
    if not letter:
        return ""
    title = {
        "free":        "Free — effectively zero cost",
        "cheap":       "Cheap — negligible cost",
        "moderate":    "Moderate — budget carefully",
        "expensive":   "Expensive — hero assets only",
        "situational": "Situational — cost depends on context",
    }[cost]
    return (
        f'<span class="cost-chip cost-{cost}" title="{title}" '
        f'aria-label="{title}">{letter}</span>'
    )


# Setup-overhead / difficulty chip. Distinct signal from cost — "how cheap is
# this at runtime?" vs "how hard is it to ship?". A Fixed Bounds checkbox and a
# bespoke Scratch Pad module can have identical perf cost but wildly different
# setup difficulty. Three filled / half-filled dots match the GUI idiom for
# "tier of required knowledge" and stay distinct from the cost chip's circle+letter.
_DIFFICULTY_FILLS = {
    "beginner":     1,  # ●○○ — one checkbox / one setting / documented
    "intermediate": 2,  # ●●○ — requires understanding a system, multi-step
    "advanced":     3,  # ●●● — engine plumbing, per-platform, multi-system
}


def _render_difficulty_chip(difficulty: str) -> str:
    """Render a small 3-dot difficulty chip — empty string if unset/unknown."""
    if not difficulty:
        return ""
    key = str(difficulty).lower().strip()
    n_filled = _DIFFICULTY_FILLS.get(key)
    if n_filled is None:
        return ""
    title = {
        "beginner":     "Beginner setup — one checkbox / one setting",
        "intermediate": "Intermediate setup — multi-step, requires system understanding",
        "advanced":     "Advanced setup — engine plumbing, per-platform, multi-system",
    }[key]
    dots = "".join(
        f'<span class="dot{" fill" if i < n_filled else ""}"></span>'
        for i in range(3)
    )
    return (
        f'<span class="setup-chip setup-{key}" title="{title}" '
        f'aria-label="{title}">{dots}</span>'
    )


def _collect_item_tags(item: dict) -> str:
    """Normalise an item's `tags:` list into a space-separated data-tags value."""
    tags = item.get("tags") or []
    if isinstance(tags, str):
        tags = [tags]
    return " ".join(str(t).strip() for t in tags if str(t).strip())


def render_checklist(items: list) -> str:
    out = []
    for item in items:
        key = item.get("icon", "ok")
        # YAML parses bare `no` / `yes` as booleans — normalise back to strings
        if key is False:
            key = "no"
        elif key is True:
            key = "ok"
        else:
            key = str(key)
        char = _ICON.get(key, key)
        text = item.get("html", html_mod.escape(item.get("text", "")))
        cost_html = _render_cost_chip(item.get("cost", ""))
        diff_html = _render_difficulty_chip(item.get("difficulty", ""))
        detail    = item.get("detail", "")
        tags_str  = _collect_item_tags(item)
        tags_attr = f' data-tags="{tags_str}"' if tags_str else ""

        # Primary row — icon + optional cost chip + optional difficulty chip + text
        primary = (
            f'<span class="check-icon {key}">{char}</span>'
            f'<span class="check-body">{cost_html}{diff_html}{text}</span>'
        )

        if detail:
            # Progressive disclosure — <details><summary> hosts the primary row;
            # clicking reveals the detail paragraph. Mobile-friendly (tap, not
            # hover) and keyboard-native. Adds a marker class so CSS can flip
            # the outer flex layout without relying on :has().
            inner = (
                f'<details class="check-detail">'
                f'<summary>{primary}</summary>'
                f'<div class="check-detail-body">{detail}</div>'
                f'</details>'
            )
            wrapper_cls = "check-item check-item-expandable"
        else:
            inner = primary
            wrapper_cls = "check-item"

        out.append(f'<div class="{wrapper_cls}"{tags_attr}>{inner}</div>')
    return f'<div class="checklist">{"".join(out)}</div>'


def _gotcha_row(cls: str, label: str, text: str) -> str:
    return (
        f'<div class="gotcha-row {cls}">'
        f'<span class="gotcha-label">{label}</span>'
        f'<span class="gotcha-text">{text}</span>'
        f'</div>'
    )


def render_gotcha(block: dict) -> str:
    """Structured gotcha block — two variants.

    COMPACT (default): Problem + Fix always visible; context/ref collapsed
    under a <details>. Supports `fixes:` list for ranked remedies.

    FULL (variant: full): Legacy 4-row PROBLEM / WHY / FIX / DETECT layout.
    Reserve for gotchas where forensic detail must be always-visible.
    """
    variant = block.get("variant", "compact")
    problem = block.get("problem", "")
    fix     = block.get("fix", "")

    if variant == "full":
        why     = block.get("why", "")
        why_ref = block.get("why_ref", "")
        detect  = block.get("detect", "")
        ref_html = f' <code class="gotcha-ref">{why_ref}</code>' if why_ref else ""
        rows = []
        if problem: rows.append(_gotcha_row("problem", "Problem", problem))
        if why:     rows.append(_gotcha_row("why", "Why", why + ref_html))
        if fix:     rows.append(_gotcha_row("fix", "Fix", fix))
        if detect:  rows.append(_gotcha_row("detect", "Detect", detect))
        return f'<div class="gotcha-block">{"".join(rows)}</div>'

    fixes   = block.get("fixes")
    context = block.get("context", "")
    ref     = block.get("ref", "")
    rows = []
    if problem:
        rows.append(_gotcha_row("problem", "Problem", problem))
    if fixes and isinstance(fixes, list):
        items = "".join(f"<li>{f}</li>" for f in fixes)
        rows.append(
            '<div class="gotcha-row fix">'
            '<span class="gotcha-label">Fix</span>'
            f'<ol class="gotcha-fixes">{items}</ol>'
            '</div>'
        )
    elif fix:
        rows.append(_gotcha_row("fix", "Fix", fix))
    if context or ref:
        ref_html = f' <code class="gotcha-ref">{ref}</code>' if ref else ""
        rows.append(
            '<details class="gotcha-context-details">'
            '<summary>Context &amp; detection</summary>'
            f'<div class="gotcha-context-body">{context}{ref_html}</div>'
            '</details>'
        )
    return f'<div class="gotcha-block gotcha-compact">{"".join(rows)}</div>'


def render_table(data: dict) -> str:
    style = data.get("style", "default")
    cols  = data.get("cols", [])
    rows  = data.get("rows", [])

    # Table class for CSS targeting
    if style == "conversion":
        table_cls = ' class="table-conversion"'
    elif len(cols) >= 3:
        table_cls = ' class="table-multi"'
    else:
        table_cls = ""

    thead = "".join(f"<th>{c}</th>" for c in cols)
    tbody_rows = []

    for row in rows:
        if style == "conversion":
            cells = list(row) if isinstance(row, list) else [
                row.get("bad", ""), row.get("good", ""), row.get("note", "")
            ]
            bad, good, note = cells[0], cells[1], cells[2] if len(cells) > 2 else ""
            bad_html  = f'<td class="bad" data-label="{cols[0]}"><code>{bad}</code></td>'
            # Italicise "good" cell if it's a placeholder like [USE UE NOISE NODE]
            g = good.strip()
            if g.startswith("[") or g.startswith("("):
                good_html = f'<td class="good" data-label="{cols[1]}"><em>{good}</em></td>'
            else:
                good_html = f'<td class="good" data-label="{cols[1]}"><code>{good}</code></td>'
            tbody_rows.append(
                f"<tr>{bad_html}{good_html}"
                f'<td class="note" data-label="{cols[2] if len(cols) > 2 else "Notes"}">{note}</td></tr>'
            )

        elif style == "feature_matrix":
            cells = list(row)
            label = cells[0]
            tds = f'<td data-label="{cols[0]}"><strong>{label}</strong></td>'
            for ci, cell in enumerate(cells[1:], 1):
                cls = "good" if "✓" in _s(cell) else "bad"
                col_label = cols[ci] if ci < len(cols) else ""
                tds += f'<td class="{cls}" data-label="{col_label}">{cell}</td>'
            tbody_rows.append(f"<tr>{tds}</tr>")

        else:
            # Default: backtick-wrapped → <code>
            tds = ""
            for ci, cell in enumerate(row):
                cell_text = re.sub(r"`([^`]+)`", r"<code>\1</code>", _s(cell))
                col_label = cols[ci] if ci < len(cols) else ""
                tds += f'<td data-label="{col_label}">{cell_text}</td>'
            tbody_rows.append(f"<tr>{tds}</tr>")

    return (
        f"<table{table_cls}>"
        f"<thead><tr>{thead}</tr></thead>"
        f"<tbody>{''.join(tbody_rows)}</tbody>"
        f"</table>"
    )


def render_code(data: dict) -> str:
    src = data.get("src", "").rstrip("\n")
    return f"<pre>{hl(src)}</pre>"


def render_prompt(data: dict) -> str:
    src = data.get("src", "").rstrip("\n")
    # Escape HTML, then expand {{tag:content}} markers
    escaped = html_mod.escape(src)
    escaped = re.sub(r"\{\{ph:([^}]*)\}\}",  r'<span class="ph">\1</span>',  escaped)
    escaped = re.sub(r"\{\{cm:([^}]*)\}\}",  r'<span class="cm">\1</span>',  escaped)
    escaped = re.sub(r"\{\{kw:([^}]*)\}\}",  r'<span class="kw">\1</span>',  escaped)
    return f'<div class="prompt-box">{escaped}</div>'


def render_prose(data: dict) -> str:
    text  = data.get("text", "")
    style = data.get("style",
        "font-size:13px; color:var(--text-dim); margin-bottom:10px;")
    return f'<p style="{style}">{text}</p>'


def render_nested_grid(data: dict) -> str:
    cols   = data.get("cols", 2)
    groups = data.get("groups", [])
    col_style = f'grid-template-columns: {" ".join(["1fr"] * cols)}; gap: 12px;'
    inner = "".join(render_checklist(g.get("items", [])) for g in groups)
    return f'<div class="grid" style="{col_style}">{inner}</div>'


def render_area_heading(group: dict) -> str:
    icon  = group.get("icon", "")
    title = group.get("title", "")
    return f'<div class="area-heading">{icon} {title}</div>\n'


def render_area_wrapper_open(group: dict) -> str:
    theme = group.get("theme", "ref")
    return f'<div class="area area-{theme}">\n'


def render_area_wrapper_close() -> str:
    return '</div>\n'


def render_viz_tbn(block: dict) -> str:
    number  = html_mod.escape(str(block.get("number", "07")))
    title   = html_mod.escape(block.get("title", "Coord Spaces · TBN → World → View"))
    caption = block.get("caption", "")
    # caption allows inline <code>/<strong> so don't escape — authors control it
    return (
        '<div class="viz viz-tbn" data-viz-tbn>\n'
        f'  <div class="viz-header">'
        f'<span class="viz-num">{number}</span>'
        f'<span class="viz-title">{title}</span>'
        '</div>\n'
        '  <div class="viz-chips" data-viz-chips>'
        '<span class="viz-chip viz-chip-state" data-chip-state>TANGENT</span>'
        '<span class="viz-chip"><span class="viz-dot t"></span>T tangent</span>'
        '<span class="viz-chip"><span class="viz-dot b"></span>B bitangent</span>'
        '<span class="viz-chip"><span class="viz-dot n"></span>N normal</span>'
        '<span class="viz-chip viz-chip-meta" data-chip-meta>BASIS T↦B↦N · HANDED RIGHT</span>'
        '</div>\n'
        '  <div class="viz-body">\n'
        '    <svg class="viz-svg" viewBox="0 0 560 320" preserveAspectRatio="xMidYMid meet" aria-label="Coordinate-space basis vectors">\n'
        '      <defs>\n'
        '        <marker id="viz-arrow-t" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">\n'
        '          <path d="M 0 0 L 10 5 L 0 10 z" fill="#ff6b35"/></marker>\n'
        '        <marker id="viz-arrow-b" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">\n'
        '          <path d="M 0 0 L 10 5 L 0 10 z" fill="#b8ff57"/></marker>\n'
        '        <marker id="viz-arrow-n" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">\n'
        '          <path d="M 0 0 L 10 5 L 0 10 z" fill="#00e5ff"/></marker>\n'
        '      </defs>\n'
        '      <g data-viz-grid></g>\n'
        '      <g data-viz-patch></g>\n'
        '      <g data-viz-vectors>\n'
        '        <line data-vec="t" x1="280" y1="200" x2="280" y2="200" stroke="#ff6b35" stroke-width="3" marker-end="url(#viz-arrow-t)"/>\n'
        '        <line data-vec="b" x1="280" y1="200" x2="280" y2="200" stroke="#b8ff57" stroke-width="3" marker-end="url(#viz-arrow-b)"/>\n'
        '        <line data-vec="n" x1="280" y1="200" x2="280" y2="200" stroke="#00e5ff" stroke-width="3" marker-end="url(#viz-arrow-n)"/>\n'
        '        <text data-lbl="t" fill="#ff6b35" font-family="JetBrains Mono, monospace" font-size="13" font-weight="600">T</text>\n'
        '        <text data-lbl="b" fill="#b8ff57" font-family="JetBrains Mono, monospace" font-size="13" font-weight="600">B</text>\n'
        '        <text data-lbl="n" fill="#00e5ff" font-family="JetBrains Mono, monospace" font-size="13" font-weight="600">N</text>\n'
        '      </g>\n'
        '      <g data-viz-uv style="display:none">\n'
        '        <rect x="180" y="60" width="160" height="160" fill="none" stroke="#1e2530" stroke-width="1"/>\n'
        '        <rect x="180" y="60" width="160" height="160" fill="url(#viz-uv-pat)"/>\n'
        '        <text x="170" y="64" text-anchor="end" fill="#6b7a8d" font-family="JetBrains Mono, monospace" font-size="11" data-uv-top>1</text>\n'
        '        <text x="170" y="224" text-anchor="end" fill="#6b7a8d" font-family="JetBrains Mono, monospace" font-size="11" data-uv-bot>0</text>\n'
        '        <text x="180" y="245" fill="#6b7a8d" font-family="JetBrains Mono, monospace" font-size="11">u 0</text>\n'
        '        <text x="340" y="245" text-anchor="end" fill="#6b7a8d" font-family="JetBrains Mono, monospace" font-size="11">u 1</text>\n'
        '        <text x="260" y="150" text-anchor="middle" fill="#cdd6e0" font-family="JetBrains Mono, monospace" font-size="14" data-uv-label>Shadertoy (Y-up)</text>\n'
        '      </g>\n'
        '      <defs>\n'
        '        <pattern id="viz-uv-pat" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">\n'
        '          <rect width="40" height="40" fill="#0e131a"/>\n'
        '          <path d="M 0 0 H 40 M 0 0 V 40" stroke="#1e2530" stroke-width="1"/>\n'
        '        </pattern>\n'
        '      </defs>\n'
        '    </svg>\n'
        '    <div class="viz-caption">' + caption + '</div>\n'
        '  </div>\n'
        '  <div class="viz-controls">\n'
        '    <div class="viz-steps" role="tablist">\n'
        '      <button class="viz-step active" data-step="0" type="button">1 · TANGENT</button>\n'
        '      <button class="viz-step" data-step="1" type="button">2 · OBJECT</button>\n'
        '      <button class="viz-step" data-step="2" type="button">3 · WORLD</button>\n'
        '      <button class="viz-step" data-step="3" type="button">4 · VIEW</button>\n'
        '      <button class="viz-step" data-step="4" type="button">5 · UV (Shadertoy)</button>\n'
        '    </div>\n'
        '    <div class="viz-toggles">\n'
        '      <button class="viz-toggle" data-play type="button">▶ PLAY</button>\n'
        '      <button class="viz-toggle" data-toggle-handed type="button">HANDED: RIGHT</button>\n'
        '      <button class="viz-toggle" data-toggle-yflip type="button">Y-FLIP: OFF</button>\n'
        '    </div>\n'
        '  </div>\n'
        '</div>\n'
    )


def render_viz_interp(block: dict) -> str:
    """Lerp vs Smoothstep vs Step — three side-by-side SVG plots driven by a
    shared `t` slider. The IIFE in templates/page.html hydrates [data-viz-interp]
    elements: draws the curves, tracks a vertical marker, updates the readout."""
    number  = html_mod.escape(str(block.get("number", "01")))
    title   = html_mod.escape(block.get("title", "Lerp vs Smoothstep vs Step"))
    caption = block.get("caption", "")

    def plot(kind: str, formula: str, dot_class: str) -> str:
        return (
            f'    <div class="viz-plot" data-plot="{kind}">\n'
            f'      <div class="viz-plot-label"><span class="viz-dot {dot_class}"></span>{kind}</div>\n'
            f'      <svg viewBox="0 0 160 120" preserveAspectRatio="xMidYMid meet" class="viz-plot-svg">\n'
            f'        <rect x="0" y="0" width="160" height="120" fill="#0a0d12"/>\n'
            f'        <g stroke="#1e2530" stroke-width="0.5" fill="none">\n'
            f'          <line x1="16" y1="12"  x2="152" y2="12"/>\n'
            f'          <line x1="16" y1="46"  x2="152" y2="46"/>\n'
            f'          <line x1="16" y1="80"  x2="152" y2="80"/>\n'
            f'          <line x1="16" y1="108" x2="152" y2="108"/>\n'
            f'        </g>\n'
            f'        <path data-curve d="" fill="none" stroke-width="2"/>\n'
            f'        <line data-marker x1="16" y1="12" x2="16" y2="108" stroke="#cdd6e0" stroke-width="0.8" stroke-dasharray="2 3"/>\n'
            f'        <circle data-dot cx="16" cy="108" r="3" fill="#cdd6e0"/>\n'
            f'        <text x="12" y="16"  text-anchor="end" fill="#6b7a8d" font-family="JetBrains Mono, monospace" font-size="8">1</text>\n'
            f'        <text x="12" y="112" text-anchor="end" fill="#6b7a8d" font-family="JetBrains Mono, monospace" font-size="8">0</text>\n'
            f'      </svg>\n'
            f'      <div class="viz-plot-formula"><code>{formula}</code></div>\n'
            f'      <div class="viz-plot-out"><span data-out>—</span></div>\n'
            f'    </div>\n'
        )

    plots = (
        plot("STEP",       "step(0.5, t)",            "t")
      + plot("LERP",       "lerp(0, 1, t)",           "b")
      + plot("SMOOTHSTEP", "smoothstep(0, 1, t)",     "n")
    )

    return (
        '<div class="viz viz-interp" data-viz-interp>\n'
        f'  <div class="viz-header">'
        f'<span class="viz-num">{number}</span>'
        f'<span class="viz-title">{title}</span>'
        '</div>\n'
        '  <div class="viz-chips">'
        '<span class="viz-chip viz-chip-state" data-chip-t>t = 0.50</span>'
        '<span class="viz-chip"><span class="viz-dot t"></span>step = 1</span>'
        '<span class="viz-chip"><span class="viz-dot b"></span>lerp = 0.50</span>'
        '<span class="viz-chip"><span class="viz-dot n"></span>smoothstep = 0.50</span>'
        '</div>\n'
        '  <div class="viz-body">\n'
        '    <div class="viz-plots">\n'
        f'{plots}'
        '    </div>\n'
        '    <div class="viz-slider-row">\n'
        '      <span class="viz-slider-label">t</span>\n'
        '      <input type="range" min="0" max="1000" value="500" step="1" data-slider aria-label="interpolation parameter t">\n'
        '      <span class="viz-slider-val" data-slider-val>0.500</span>\n'
        '    </div>\n'
        '    <div class="viz-caption">' + caption + '</div>\n'
        '  </div>\n'
        '</div>\n'
    )


def _viz_canvas_shell(
    block: dict,
    tag: str,
    default_num: str,
    default_title: str,
    chips_html: str,
    controls_html: str,
) -> str:
    """Shared wrapper for canvas-based visualizers."""
    number  = html_mod.escape(str(block.get("number", default_num)))
    title   = html_mod.escape(block.get("title", default_title))
    caption = block.get("caption", "")
    return (
        f'<div class="viz {tag}" data-{tag}>\n'
        f'  <div class="viz-header">'
        f'<span class="viz-num">{number}</span>'
        f'<span class="viz-title">{title}</span>'
        f'</div>\n'
        f'  <div class="viz-chips">{chips_html}</div>\n'
        f'  <div class="viz-body">\n'
        f'    <canvas class="viz-canvas" data-canvas></canvas>\n'
        f'    <div class="viz-caption">{caption}</div>\n'
        f'  </div>\n'
        f'  <div class="viz-controls">\n{controls_html}'
        f'  </div>\n'
        f'</div>\n'
    )


def render_viz_depth(block: dict) -> str:
    chips = (
        '<span class="viz-chip viz-chip-state" data-chip-mode>HARD EDGE</span>'
        '<span class="viz-chip">depth diff <b data-chip-diff style="color:var(--accent)">—</b></span>'
        '<span class="viz-chip">opacity <b data-chip-alpha style="color:var(--accent3)">1.00</b></span>'
    )
    controls = (
        '    <div class="viz-steps">\n'
        '      <button class="viz-step active" data-mode="hard" type="button">HARD EDGE</button>\n'
        '      <button class="viz-step" data-mode="soft" type="button">SOFT FADE</button>\n'
        '    </div>\n'
        '    <div class="viz-slider-row" style="flex:1;min-width:160px;">\n'
        '      <span class="viz-slider-label">FADE</span>\n'
        '      <input type="range" min="1" max="100" value="30" data-fade-dist aria-label="fade distance">\n'
        '      <span class="viz-slider-val" data-fade-val>30</span>\n'
        '    </div>\n'
    )
    return _viz_canvas_shell(block, "viz-depth", "02", "Depth Fade · Soft Particles", chips, controls)


def render_viz_flipbook(block: dict) -> str:
    chips = (
        '<span class="viz-chip viz-chip-state" data-chip-frame>FRAME 1 / 16</span>'
        '<span class="viz-chip" data-chip-fps>FPS 8</span>'
        '<span class="viz-chip" data-chip-interp>INTERP OFF</span>'
    )
    controls = (
        '    <div class="viz-steps">\n'
        '      <button class="viz-toggle active" data-interp="off" type="button">INTERP: OFF</button>\n'
        '      <button class="viz-toggle" data-interp="on" type="button">INTERP: ON</button>\n'
        '    </div>\n'
        '    <div class="viz-slider-row" style="flex:1;min-width:160px;">\n'
        '      <span class="viz-slider-label">FPS</span>\n'
        '      <input type="range" min="1" max="30" value="8" data-fps aria-label="frames per second">\n'
        '      <span class="viz-slider-val" data-fps-val>8</span>\n'
        '    </div>\n'
    )
    return _viz_canvas_shell(block, "viz-flipbook", "03", "Sub-UV Flipbook Timing", chips, controls)


def render_viz_channels(block: dict) -> str:
    chips = (
        '<span class="viz-chip viz-chip-state" data-chip-ch>RGB COMPOSITE</span>'
        '<span class="viz-chip"><span class="viz-dot t"></span>R = roughness</span>'
        '<span class="viz-chip"><span class="viz-dot b"></span>G = height</span>'
        '<span class="viz-chip"><span class="viz-dot n"></span>B = AO</span>'
        '<span class="viz-chip" style="color:var(--accent2)">● A = emissive</span>'
    )
    controls = (
        '    <div class="viz-steps">\n'
        '      <button class="viz-step active" data-ch="rgb" type="button">RGB</button>\n'
        '      <button class="viz-step" data-ch="r" type="button" style="color:#ff5757">R</button>\n'
        '      <button class="viz-step" data-ch="g" type="button" style="color:#b8ff57">G</button>\n'
        '      <button class="viz-step" data-ch="b" type="button" style="color:#00e5ff">B</button>\n'
        '      <button class="viz-step" data-ch="a" type="button" style="color:#ffb347">A</button>\n'
        '      <button class="viz-step" data-ch="rgba" type="button" style="color:var(--warn)">RGBA</button>\n'
        '    </div>\n'
    )
    return _viz_canvas_shell(block, "viz-channels", "04", "Channel Packing (RGBA)", chips, controls)


def render_viz_uvflow(block: dict) -> str:
    chips = (
        '<span class="viz-chip viz-chip-state" data-chip-mode>PANNER ONLY</span>'
        '<span class="viz-chip">distortion <b data-chip-str style="color:var(--accent)">0.00</b></span>'
        '<span class="viz-chip">t = <b data-chip-time style="color:var(--accent3)">0.00</b></span>'
    )
    controls = (
        '    <div class="viz-slider-row" style="flex:1;min-width:160px;">\n'
        '      <span class="viz-slider-label">DISTORT</span>\n'
        '      <input type="range" min="0" max="100" value="0" data-strength aria-label="distortion strength">\n'
        '      <span class="viz-slider-val" data-strength-val>0.00</span>\n'
        '    </div>\n'
    )
    return _viz_canvas_shell(block, "viz-uvflow", "01", "UV Flow / Distortion", chips, controls)


def render_viz_burst(block: dict) -> str:
    chips = (
        '<span class="viz-chip viz-chip-state" data-chip-t>t = 0.0 s</span>'
        '<span class="viz-chip"><span class="viz-dot b"></span>rate <b data-chip-rate style="color:var(--accent3)">0</b> alive</span>'
        '<span class="viz-chip"><span class="viz-dot t"></span>burst <b data-chip-burst style="color:var(--accent2)">0</b> alive</span>'
    )
    controls = (
        '    <div class="viz-steps">\n'
        '      <button class="viz-toggle" data-play type="button">▶ PLAY</button>\n'
        '      <button class="viz-toggle" data-reset type="button">RESET</button>\n'
        '    </div>\n'
    )
    return _viz_canvas_shell(block, "viz-burst", "02", "Spawn Rate vs Burst", chips, controls)


def render_viz_sortorder(block: dict) -> str:
    chips = (
        '<span class="viz-chip viz-chip-state" data-chip-order>BACK-TO-FRONT</span>'
        '<span class="viz-chip" data-chip-result style="color:var(--accent3)">✓ CORRECT</span>'
    )
    controls = (
        '    <div class="viz-steps">\n'
        '      <button class="viz-step active" data-order="btf" type="button">BACK-TO-FRONT</button>\n'
        '      <button class="viz-step" data-order="ftb" type="button">FRONT-TO-BACK</button>\n'
        '      <button class="viz-step" data-order="unsorted" type="button">UNSORTED</button>\n'
        '    </div>\n'
    )
    return _viz_canvas_shell(block, "viz-sortorder", "03", "Sort Order Artifacts", chips, controls)


def render_viz_precision(block: dict) -> str:
    chips = (
        '<span class="viz-chip viz-chip-state" data-chip-range>0.000 → 1.000</span>'
        '<span class="viz-chip"><span class="viz-dot b"></span>fp32 — smooth</span>'
        '<span class="viz-chip"><span class="viz-dot t"></span>fp16 — 10-bit mantissa</span>'
    )
    controls = (
        '    <div class="viz-steps">\n'
        '      <button class="viz-step active" data-zoom="full" type="button">0 → 1</button>\n'
        '      <button class="viz-step" data-zoom="near" type="button">NEAR ZERO</button>\n'
        '      <button class="viz-step" data-zoom="mid" type="button">MID RANGE</button>\n'
        '    </div>\n'
    )
    return _viz_canvas_shell(block, "viz-precision", "04", "float vs half Precision", chips, controls)


def render_block(block: dict) -> str:
    t = block.get("type")
    dispatch = {
        "rowlist":     lambda: render_rowlist(block),
        "checklist":   lambda: render_checklist(block.get("items", [])),
        "table":       lambda: render_table(block),
        "code":        lambda: render_code(block),
        "prompt":      lambda: render_prompt(block),
        "prose":       lambda: render_prose(block),
        "nested_grid": lambda: render_nested_grid(block),
        "gotcha":      lambda: render_gotcha(block),
        "viz-tbn":        lambda: render_viz_tbn(block),
        "viz-interp":     lambda: render_viz_interp(block),
        "viz-depth":      lambda: render_viz_depth(block),
        "viz-flipbook":   lambda: render_viz_flipbook(block),
        "viz-channels":   lambda: render_viz_channels(block),
        "viz-uvflow":     lambda: render_viz_uvflow(block),
        "viz-burst":      lambda: render_viz_burst(block),
        "viz-sortorder":  lambda: render_viz_sortorder(block),
        "viz-precision":  lambda: render_viz_precision(block),
        "raw":         lambda: block.get("html", ""),
    }
    fn = dispatch.get(t)
    return fn() if fn else f"<!-- unknown block type: {t} -->"


def render_card(card: dict) -> str:
    color = card.get("color", "blue")
    title = card.get("title", "")
    span  = card.get("span", "")
    cls   = f"card {color}" + (f" {span}" if span else "")
    inner = "".join(render_block(b) for b in card.get("content", []))
    return (
        f'<div class="{cls}">\n'
        f'<div class="card-title"><span class="dot"></span> {title}</div>\n'
        f"{inner}"
        f"</div>\n"
    )


def _section_filter_strip(section: dict) -> str:
    """Emit a per-section tag filter strip IF any checklist item in the section
    carries `tags:`. Click a tag → `.tag-dimmed` on items that don't match.
    Zero output when the section has no tagged items — no visual bloat.
    """
    # Collect the unique tag set from every checklist item in every card
    tagset = []
    seen = set()
    for card in section.get("cards", []):
        for block in card.get("content", []):
            if block.get("type") != "checklist":
                continue
            for item in block.get("items", []):
                tags = item.get("tags") or []
                if isinstance(tags, str):
                    tags = [tags]
                for t in tags:
                    t = str(t).strip()
                    if t and t not in seen:
                        seen.add(t)
                        tagset.append(t)
    if not tagset:
        return ""
    buttons = "".join(
        f'<button type="button" class="filter-tag" data-tag="{t}" '
        f'aria-pressed="false">{t}</button>'
        for t in tagset
    )
    return (
        '<div class="filter-strip" role="group" aria-label="Filter by tag">'
        '<span class="filter-strip-label">Filter:</span>'
        '<button type="button" class="filter-tag filter-all active" '
        'data-tag="" aria-pressed="true">All</button>'
        f'{buttons}'
        '</div>\n'
    )


def render_section(section: dict) -> str:
    sid        = section.get("id", "")
    label      = section.get("label", "")
    grid_class = section.get("grid", "grid")
    priority   = section.get("priority", "")
    cards      = "".join(render_card(c) for c in section.get("cards", []))
    priority_attr = f' data-priority="{priority}"' if priority else ""
    filter_strip = _section_filter_strip(section)
    return (
        f'<div id="{sid}" class="section-label"{priority_attr}>{label}</div>\n'
        f'{filter_strip}'
        f'<div class="{grid_class}">\n'
        f"{cards}"
        f"</div>\n\n"
    )


# ── Page Assembler ────────────────────────────────────────────────────────

_PAGES = [
    ("index.html",     "home",      "HOME"),
    ("materials.html", "materials", "MATERIALS"),
    ("niagara.html",   "niagara",   "NIAGARA"),
    ("shaders.html",   "shaders",   "SHADERS"),
    ("visuals.html",   "visuals",   "VISUALS"),
    ("fundamentals.html", "fundamentals", "FUNDAMENTALS"),
]


def _expand_includes(data: dict, data_file: Path) -> None:
    """Expand `include:` references on each section_group.

    A page can split its content across `data/<page>/*.yaml` files. Each
    included file is a top-level YAML sequence of section dicts. The files
    listed in `include:` are loaded in order and appended to any inline
    `sections:` the group already has. Mechanical — no content munging.
    """
    page_dir = data_file.parent / data_file.stem
    for group in data.get("section_groups", []) or []:
        includes = group.get("include")
        if not includes:
            continue
        sections = list(group.get("sections", []) or [])
        for inc in includes:
            inc_path = page_dir / inc
            with open(inc_path, encoding="utf-8") as f:
                inc_sections = yaml.safe_load(f)
            if inc_sections:
                sections.extend(inc_sections)
        group["sections"] = sections


def build_page(data_file: Path, template: str) -> None:
    with open(data_file, encoding="utf-8") as f:
        data = yaml.safe_load(f)

    _expand_includes(data, data_file)

    meta     = data.get("meta", {})
    page_id  = meta.get("active", "")
    out_file = ROOT / (data_file.stem + ".html")

    # Side nav — page links
    page_links  = '<a href="index.html">HOME</a>\n'
    page_links += '<div class="sidenav-divider"></div>\n'
    page_links += '<span class="sidenav-section">PAGES</span>\n'
    for href, pid, label in _PAGES:
        if pid == "home":
            continue
        active = ' class="active"' if pid == page_id else ""
        page_links += f'<a href="{href}"{active}>{label}</a>\n'

    # Side nav — on-this-page anchors (supports {divider: "label"} separators).
    # Each link is tagged with data-area="ref" | "optim" so the subpage toggle
    # can filter which anchors are visible.
    # Determine the starting area from the first themed group on the page. For a
    # legacy `ref/optim/engine` page this stays "ref"; a fundamentals-style
    # `beginner/intermediate/advanced` page starts as "beginner". Anchors above
    # any explicit divider inherit this area.
    default_area = "ref"
    if data.get("section_groups"):
        first_theme = data["section_groups"][0].get("theme")
        if first_theme:
            default_area = first_theme
    current_area = default_area
    link_parts = []
    # Initial "ON THIS PAGE" divider — tagged with the default area so it only
    # shows on the subpage it belongs to.
    link_parts.append(
        f'<div class="sidenav-divider area-{default_area}"></div>\n'
        f'<span class="sidenav-section area-{default_area}">ON THIS PAGE</span>'
    )
    for a in meta.get("anchors", []):
        if "divider" in a:
            area = a.get("area", current_area)
            link_parts.append(
                f'<div class="sidenav-divider area-{area}"></div>\n'
                f'<span class="sidenav-section area-{area}">{a["divider"]}</span>'
            )
            current_area = area
            continue
        link_parts.append(
            f'<a href="#{a["id"]}" data-area="{current_area}">{a["label"]}</a>'
        )
    section_links = "\n".join(link_parts)

    # Sidenav subpage switcher — rendered only when the page has 2+ themed
    # groups. Emitted as {{SUBPAGE_NAV}} between page links and section anchors
    # so it stays visible while the user scrolls the content.
    groups = data.get("section_groups", [])
    themed = [g for g in groups if g.get("theme")] if groups else []
    multi  = len(themed) >= 2

    if multi:
        nav_parts = [
            '<div class="sidenav-divider"></div>\n'
            '<span class="sidenav-section">VIEW</span>\n'
            '<div class="sidenav-subpage-tabs" role="tablist" aria-label="Page view">\n'
        ]
        for i, g in enumerate(themed):
            theme    = g.get("theme", "ref")
            icon     = g.get("icon", "")
            title    = g.get("title", "")
            selected = "true" if i == 0 else "false"
            nav_parts.append(
                f'<button class="subpage-tab" role="tab" '
                f'data-subpage="{theme}" aria-selected="{selected}">'
                f'<span class="subpage-tab-icon">{icon}</span> {title}</button>\n'
            )
        nav_parts.append('</div>\n')
        subpage_nav = "".join(nav_parts)
    else:
        subpage_nav = ""

    # Main content
    if groups:
        parts = []
        for g in groups:
            theme      = g.get("theme", "ref")
            is_subpage = multi and bool(g.get("theme"))
            if is_subpage:
                parts.append(f'<section class="subpage" data-subpage="{theme}" role="tabpanel">\n')
            parts.append(render_area_wrapper_open(g))
            parts.append(render_area_heading(g))
            parts.extend(render_section(s) for s in g.get("sections", []))
            parts.append(render_area_wrapper_close())
            if is_subpage:
                parts.append('</section>\n')
        content = "".join(parts)
    else:
        content = "".join(render_section(s) for s in data.get("sections", []))

    # Footer links (other pages)
    footer_links = " · ".join(
        f'<a href="{p[0]}">{p[2].title()}</a>'
        for p in _PAGES if p[1] != page_id
    )

    # Header right — newlines → <br>
    header_right = meta.get("header_right", "").strip().replace("\n", "<br>\n      ")

    result = template
    for placeholder, value in {
        "{{PAGE_TITLE}}":       meta.get("title", ""),
        "{{PAGE_DESCRIPTION}}": meta.get("description", ""),
        "{{PAGE_FAVICON}}":     meta.get("favicon", "📄"),
        "{{HEADER_TAG}}":       meta.get("header_tag", ""),
        "{{HEADER_H1}}":        meta.get("header_h1", ""),
        "{{HEADER_RIGHT}}":     header_right,
        "{{PAGE_LINKS}}":       page_links,
        "{{SUBPAGE_NAV}}":      subpage_nav,
        "{{SECTION_LINKS}}":    section_links,
        "{{MAIN_CONTENT}}":     content,
        "{{FOOTER_LINKS}}":     footer_links,
    }.items():
        result = result.replace(placeholder, value)

    out_file.write_text(result, encoding="utf-8")
    print(f"  OK  {out_file.name}")


def main() -> None:
    if not TEMPLATE.exists():
        sys.exit(f"Error: {TEMPLATE} not found — run from repo root.")

    template   = TEMPLATE.read_text(encoding="utf-8")
    yaml_files = sorted(DATA_DIR.glob("*.yaml"))

    if not yaml_files:
        sys.exit(f"No .yaml files found in {DATA_DIR}")

    print("Building pages...")
    for yf in yaml_files:
        if yf.stem == "index":
            continue
        build_page(yf, template)
    print("Done.")


if __name__ == "__main__":
    main()
