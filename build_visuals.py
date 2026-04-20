"""
build_visuals.py — patch and repack visuals.html from Resources/

Usage:
    python build_visuals.py

What it does:
  1. Decodes the __bundler/manifest and __bundler/template from visuals.html.
  2. Replaces JS assets whose content matches a file in Resources/js/ with the
     current file content (matched by first-line comment).
  3. Replaces the CSS asset with Resources/visuals.css.
  4. Applies HTML patches to the template (overdraw card legend + shape toggle).
  5. Re-encodes everything and writes a new visuals.html in-place.

Run after editing any file in Resources/ to regenerate visuals.html.
"""

import re, base64, gzip, json, sys, uuid as _uuid
sys.stdout.reconfigure(encoding="utf-8")
from pathlib import Path

ROOT = Path(__file__).parent
RESOURCES = ROOT / "Resources"
OUT = ROOT / "visuals.html"

# ── Helpers ──────────────────────────────────────────────────────────────────

def encode_asset(data: bytes, compress: bool = True) -> dict:
    if compress:
        compressed = gzip.compress(data, compresslevel=9)
        return {"data": base64.b64encode(compressed).decode(), "compressed": True}
    return {"data": base64.b64encode(data).decode(), "compressed": False}


def decode_asset(entry: dict) -> bytes:
    data = base64.b64decode(entry["data"])
    if entry.get("compressed"):
        data = gzip.decompress(data)
    return data


# ── Load existing bundle ──────────────────────────────────────────────────────

html = OUT.read_text(encoding="utf-8")

manifest_match = re.search(
    r'(<script type="__bundler/manifest">)(.*?)(</script>)', html, re.DOTALL)
template_match = re.search(
    r'(<script type="__bundler/template">)(.*?)(</script>)', html, re.DOTALL)

if not manifest_match or not template_match:
    sys.exit("Error: could not find __bundler/manifest or __bundler/template in visuals.html")

manifest: dict = json.loads(manifest_match.group(2).strip())
template: str  = json.loads(template_match.group(2).strip())

print(f"Loaded manifest: {len(manifest)} assets")

# ── Update JS assets from Resources/js/ ──────────────────────────────────────

js_files = {f.name: f.read_text(encoding="utf-8")
            for f in (RESOURCES / "js").glob("*.js")}

# Match existing manifest assets to Resource JS files by first-line comment
replaced_js = 0
for uid, entry in manifest.items():
    try:
        old_src = decode_asset(entry).decode("utf-8")
    except Exception:
        continue  # binary asset (font etc.) — skip
    # Find a matching Resource JS by comparing first non-empty line
    first_line = next((l.strip() for l in old_src.splitlines() if l.strip()), "")
    for fname, new_src in js_files.items():
        new_first = next((l.strip() for l in new_src.splitlines() if l.strip()), "")
        if first_line == new_first:
            manifest[uid] = encode_asset(new_src.encode("utf-8"))
            print(f"  Updated JS: {fname}  ({len(old_src)} → {len(new_src)} bytes)")
            replaced_js += 1
            break

print(f"Replaced {replaced_js} JS assets")

# ── Update CSS asset from Resources/visuals.css ───────────────────────────────

css_src = (RESOURCES / "visuals.css").read_text(encoding="utf-8")
replaced_css = 0
for uid, entry in manifest.items():
    try:
        old_src = decode_asset(entry).decode("utf-8")
    except Exception:
        continue
    if ".viz-card" in old_src or ".viz-media" in old_src:
        manifest[uid] = encode_asset(css_src.encode("utf-8"))
        print(f"  Updated CSS: visuals.css  ({len(old_src)} → {len(css_src)} bytes)")
        replaced_css += 1
        break

if not replaced_css:
    # No matching CSS found — inject as new asset
    new_uid = str(_uuid.uuid4())
    manifest[new_uid] = encode_asset(css_src.encode("utf-8"))
    print(f"  Injected CSS as new asset: {new_uid[:8]}...")

# ── Patch HTML template ───────────────────────────────────────────────────────
#
# Changes to the overdraw card:
#  1. Add class "viz-legend-top" to the .viz-legend div so it floats top-left
#     and doesn't collide with the layer-count controls at bottom-right.
#  2. Add DISC / SQUARE shape-toggle buttons to .viz-controls, separated from
#     the layer-count buttons by a .viz-ctrl-sep divider.
#  3. Add "· SHAPE <b id="overdraw-shape">DISC</b>" to the readout chip so the
#     active shape is always visible in the status strip.

# Inject patch styles before </head>
STYLE_INJECT = (
    '<style>'
    '.viz-legend.viz-legend-top{'
    'top:42px;bottom:auto;right:auto;left:12px;'
    'background:rgba(8,10,14,0.78);border:1px solid #1e2530;'
    'border-radius:2px;padding:5px 10px;gap:12px;'
    'color:#cdd6e0;z-index:2;width:auto;display:inline-flex;}'
    '</style>'
    '</head>'
)
template = template.replace('</head>', STYLE_INJECT, 1)

OLD_LEGEND = '<div class="viz-legend">'
NEW_LEGEND  = '<div class="viz-legend viz-legend-top">'

OLD_READOUT = (
    '<div class="viz-readout">'
    'LAYERS <b id="overdraw-layers">5</b>'
    ' · SHADED PIXELS <b id="overdraw-pixels">—</b>'
    ' · COST <b id="overdraw-cost" class="warn-b">—</b>'
    '</div>'
)
NEW_READOUT = (
    '<div class="viz-readout">'
    'LAYERS <b id="overdraw-layers">5</b>'
    ' · SHADED PIXELS <b id="overdraw-pixels">—</b>'
    ' · COST <b id="overdraw-cost" class="warn-b">—</b>'
    ' · SHAPE <b id="overdraw-shape">DISC</b>'
    '</div>'
)

OLD_CONTROLS = (
    '<div class="viz-controls">'
    '\n          <button class="viz-btn" data-ov="1">1</button>'
    '\n          <button class="viz-btn" data-ov="3">3</button>'
    '\n          <button class="viz-btn active" data-ov="5">5</button>'
    '\n          <button class="viz-btn" data-ov="8">8</button>'
    '\n        </div>'
)
NEW_CONTROLS = (
    '<div class="viz-controls">'
    '\n          <button class="viz-btn" data-ov="1">1</button>'
    '\n          <button class="viz-btn" data-ov="3">3</button>'
    '\n          <button class="viz-btn active" data-ov="5">5</button>'
    '\n          <button class="viz-btn" data-ov="8">8</button>'
    '\n          <span class="viz-ctrl-sep">·</span>'
    '\n          <button class="viz-btn active" data-shape="disc">DISC ●</button>'
    '\n          <button class="viz-btn" data-shape="square">SQUARE ○</button>'
    '\n        </div>'
)

patches = [
    (OLD_LEGEND,   NEW_LEGEND,   "legend → viz-legend-top"),
    (OLD_READOUT,  NEW_READOUT,  "readout + SHAPE chip"),
    (OLD_CONTROLS, NEW_CONTROLS, "controls + shape buttons"),
]

for old, new, desc in patches:
    if old in template:
        template = template.replace(old, new, 1)
        print(f"  Patched: {desc}")
    else:
        print(f"  WARNING: could not find patch target: {desc}")
        print(f"    Looking for: {repr(old[:80])}...")

# ── Re-encode and write ───────────────────────────────────────────────────────

new_manifest_json = json.dumps(manifest, separators=(",", ":"))
# Must escape </ so the browser doesn't prematurely close the <script> tag
# when parsing the HTML. <\/ is valid JSON (the backslash is a no-op escape).
new_template_json = json.dumps(template, ensure_ascii=False).replace("</", "<\\/")

html = html[:manifest_match.start(2)] + new_manifest_json + html[manifest_match.end(2):]

# Re-find template match position after manifest replacement
template_match2 = re.search(
    r'(<script type="__bundler/template">)(.*?)(</script>)', html, re.DOTALL)
html = html[:template_match2.start(2)] + new_template_json + html[template_match2.end(2):]

OUT.write_text(html, encoding="utf-8")
print(f"\nDone → {OUT.name}  ({len(html):,} bytes)")
