# Contributing to UE5 Shader Cheatsheet

Thanks for taking the time to improve this reference! Here's how to contribute effectively.

---

## Quick Edits (Recommended)

For small fixes — a missing intrinsic, a typo, a corrected note — use the **"Edit on GitHub"** button on the site. This opens the file directly in GitHub's editor and lets you submit a PR without cloning anything.

---

## Larger Changes

1. **Fork** the repo
2. **Clone** your fork: `git clone https://github.com/YOUR_FORK/ue5-shader-cheatsheet.git`
3. Open `index.html` in your editor and make changes
4. Test locally by opening `index.html` in a browser
5. Submit a **Pull Request** with a clear description of what changed and why

---

## What Makes a Good Contribution

### ✓ Great additions
- A GLSL intrinsic not currently in the mapping table
- A UE5 version-specific behavior (e.g. something that changed in 5.3 vs 5.4)
- A platform gotcha (mobile ES3.1, Switch, PS5, Vulkan)
- A Niagara-specific HLSL rule
- An improved or additional prompt template
- A common Custom node error not yet listed

### ✗ Please avoid
- Reformatting or restyling without a functional reason
- Removing existing entries without a clear justification
- Adding entries you haven't personally verified in engine

---

## Style Guide

The site is a single self-contained `index.html`. When editing:

- **Intrinsic table rows** follow the pattern: `<td class="bad"><code>GLSL</code></td><td class="good"><code>HLSL</code></td><td class="note">explanation</td>`
- **Checklist items** use `.check-icon.ok` (✓), `.check-icon.no` (✗), or `.check-icon.warn` (!) 
- Keep notes concise — one sentence max per table cell
- Don't add external JS dependencies — the site should stay zero-dependency

---

## Reporting Errors

If something on the sheet is **factually wrong**, please open an Issue with:
- The incorrect entry
- What it should say instead
- A link or brief explanation of your source (UE docs, personal testing, etc.)

---

## Code of Conduct

Be respectful. This is a technical reference, not a debate forum. PRs that argue about personal workflow preferences without a clear correctness argument will be closed.
