---
name: embed-valuecommerce-banner
description: Safely embeds a ValueCommerce affiliate ad snippet (a banner `<script>`+`<noscript>` pair, a smartphone `position=overlay` script, or any other ValueCommerce ad tag) into an Astro page in the SOKUNOBANK project without violating ValueCommerce's terms of service, which explicitly prohibit modifying, rewriting, or partially extracting ad code. Use this any time the user pastes a `valuecommerce.com` script/ad snippet and asks to place it on a page — trigger even if they just paste the code with a placement instruction like "この banner を右に表示" or "モバイルはこのバナー" without naming this skill.
---

# ValueCommerceバナーの埋め込み

## Why this needs its own procedure, not just "paste the HTML"

ValueCommerce's official NG-actions policy (`https://www.valuecommerce.ne.jp/policy/as/ad_ng.html`) explicitly lists "広告コードを改変する" (modifying ad code — rewriting it, extracting part of it, shortening the URL) as prohibited, with real consequences (提携解除・報酬支払いの停止). The failure mode here is subtle: **writing the vendor's `<script>`/`<noscript>` tags directly in an Astro `.astro` template is not safe**, even if you copy them character-for-character, because Astro's scoped-CSS system automatically injects a `data-astro-cid-*` attribute onto every element it template-renders — including the `<a>` and `<img>` nested inside a `<noscript>` block. That attribute injection happened the first time this was tried on this project (verified by inspecting the built HTML output) and is a real, if minor, modification of the vendor's markup. The fix is mechanical and always the same: never write the ad snippet as literal template markup.

## Procedure

1. **Take the snippet exactly as pasted.** Don't reformat, re-indent, reorder attributes, or "clean up" anything — even whitespace changes inside the tag are best avoided. If the user's paste includes an HTML comment with placement instructions (ValueCommerce often includes `<!-- 下記のコードを...貼り付けてください -->`), read it for guidance but don't include the comment itself in the embedded output.

2. **Store it as a raw string constant in the page's frontmatter**, then render it via `set:html` on a wrapper element you control:

   ```astro
   ---
   const vcBannerHtml = `<script language="javascript" src="//ad.jp.ap.valuecommerce.com/servlet/jsbanner?sid=...&pid=...">​</script><noscript><a href="//ck.jp.ap.valuecommerce.com/servlet/referral?sid=...&pid=..." rel="nofollow"><img src="//ad.jp.ap.valuecommerce.com/servlet/gifbanner?sid=...&pid=..." border="0"></a></noscript>`;
   ---
   <div class="your-own-wrapper-class" set:html={vcBannerHtml} />
   ```

   `set:html` bypasses Astro's template parser entirely and writes the string byte-for-byte into the output HTML — it's the only reliable way to guarantee zero modification. Never use Astro's normal JSX-like markup for the snippet itself, and never add `is:inline` to a literally-written `<script>` tag as a substitute — that still lets Astro's compiler walk any sibling/child tags (like `<noscript>`'s contents) and attach scoping attributes to them.

3. **Decide placement by the ad's own type**, since ValueCommerce's ad formats behave differently:
   - A **static image banner** (fixed pixel dimensions, e.g. `jsbanner`/`gifbanner` servlets) is a normal inline element — place it in the page flow where the user asked (e.g. "to the right of the H1"). Never resize it via width/height overrides or CSS transforms — the size is part of the registered creative. If the user wants it more visually prominent, achieve that through the *surrounding* layout (a bordered box, spacing, a small "PR" label) instead of touching the banner itself. On this project, the established convention (from the `projector` page) is a small bordered card (`background: var(--color-bg-soft)`, `border: 1px solid var(--color-border)`, `border-radius: var(--radius-md)`) with a `PR` label above it, positioned via flexbox next to the relevant content, and hidden below 720px width if a separate mobile-specific banner exists (see next point).
   - A **smartphone `position=overlay` script** (this ad type self-positions via its own injected CSS/JS — it's not meant to sit inline in your layout) should go at the very end of the page's own content, immediately before the shared `Footer` — matching ValueCommerce's own "paste before `</body>`" instruction as closely as possible without editing the shared `Layout.astro` for every page on the site. Only add it to `Layout.astro` directly if the user explicitly wants it site-wide; default to page-scoped since these ads are usually tied to one category's content.
   - If a page ends up with **both** a PC banner and a mobile overlay banner, hide the PC one below the project's existing mobile breakpoint (`@media (max-width: 720px) { display: none; }`) so they don't both render on a phone at once.

4. **Verify zero modification** after building: `npm run build`, then grep the output HTML for the ad's `pid` value and confirm the surrounding tag is byte-identical to what was pasted (no added attributes, no reordering). Example: `grep -o '<script[^>]*valuecommerce[^>]*></script>' dist/categories/<slug>/index.html`.

5. **Don't repeatedly fetch/curl the banner's own URLs while testing.** The ad-serving and click-through URLs (`ad.jp.ap.valuecommerce.com/servlet/...`, `ck.jp.ap.valuecommerce.com/servlet/referral...`) set real tracking cookies and can register impressions against the live account. If you need to know the creative's actual pixel dimensions or content (e.g. to judge layout), fetch it **once**, note the result, and don't re-fetch on every iteration — rely on your notes or a screenshot of the rendered page instead.

## What NOT to do

- Don't shorten, wrap, or proxy the click-through URL.
- Don't split the `<script>` and `<noscript>` into separate components/files if the user pasted them together — keep them as one atomic string.
- Don't add `async`/`defer`/`type="module"` to the script tag or otherwise change its loading behavior — some ValueCommerce banner scripts rely on `document.write()`, which only behaves correctly with classic synchronous script execution at its position in the document.
- Don't guess pixel dimensions or ad content without checking — if you need to know what the banner actually shows (for layout/relevance judgment), do the one-time fetch described above rather than assuming.
