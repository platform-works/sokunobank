---
name: add-popular-brand-section
description: Adds or extends the "即納人気ブランドから探す" (popular in-stock brands) card section on a SOKUNOBANK Yahoo!ショッピング商品ランキング型 category page (the same pattern first built for office-chair/エルゴヒューマン・FlexiSpot・SANWA SUPPLY) — brand cards with a real Yahoo product image, fact-checked description/history/features, and a verified Yahoo!ショッピング search link with the 優良配送 filter. Use this whenever the user asks to add a brand showcase / pickup-brand section to a commerce category, wants to add a new brand to an existing one, or asks to extract a brand's product link and write brand copy from its official site. Trigger on phrases like "ピックアップブランドを追加", "人気ブランドから探すセクション", "◯◯というブランドを追加して", or any request to pull a brand's product/link + write a caption/description from a brand's site, even if the user doesn't name this skill directly.
---

# 「即納人気ブランドから探す」ブランドカードの追加

> **2026-10-03 改訂**: generator / shredder / printer で使った方式(キーワード検索型URL・除外検索・データからのブランド選定・画像と事実の確認基準)を追記した。事実確認の一般ルールは `content-source-check` スキルも参照。

## Why this skill exists

This section replaced an earlier ValueCommerce MyLinkBox PoC on the office-chair category (2026-09-27). MyLinkBox required manually creating one ad space per brand in ValueCommerce's dashboard with no API and no way to parametrize by brand — this self-built version has neither limitation, and is the standard template for every future commerce category, not office-chair-specific. Building it from scratch again would silently reintroduce two real bugs that were found and fixed the first time: an invalid nested-interactive-content HTML bug (`<details>` inside a wrapping `<a>`, which broke both the toggle and the navigation), and a guessed-vs-verified URL parameter that turned out wrong on the first attempt. Full narrative background is in the memory file `project_yahoo_shopping_affiliate_pattern.md` (this Claude Code installation's memory store for this project) under "即納人気ブランドから探す popular-brands section — standard template".

## Before you start: confirm scope with the user

If the user names the brands, use exactly those. If they only say "add the popular-brand section" (shredder and printer were requested this way), **decide from data, not from memory**: fetch ~400 products with the category's own queries and required/exclude keywords, count `brand.name` (and brand words in the product name — `brand.name` mixes maker names with series names such as PIXUS/カラリオ/JUSTIO/プリビオ, so group them by maker), and include only the makers that clearly stand out. Printer: ブラザー 165 / キヤノン 150 / エプソン 94, next was リコー at 3 → three brands, not four. Show the counts in your report. Don't pad the list to a round number.

Don't invent brand names or assume a fixed count — the office-chair section shipped with exactly the 3 brands the user named, and it explicitly deferred others (Herman Miller/Okamura/ITOKI/COFO/Steelcase) to a later, separate request rather than adding them speculatively.

## ブランドセクションを付けない判断(2026-10-04)

次のカテゴリーでは付けない、またはユーザーに件数を見せて相談する。載せるブランドが「人気」と言えないまま、確認コスト(公式サイトの事実確認・画像選定・URL検証)だけがかかるため。

- **ストアブランドが大半のカテゴリー**: ホワイトボード・オフィスデスク/書庫は `brand.name` が「ブランド登録なし」「(なし)」と、販売店名(オフィスコム・LOOKIT・カグクロ等)ばかりで、メーカーブランドは FlexiSpot が 339件中29件程度。メーカーが全体の2割以上を占めて突出していることを、`profile_category.cjs` のブランド上位で確認できたときだけ作る。
- 既に付けているカテゴリー(office-chair・projector・monitor・generator・shredder・printer)は、メーカーが突出していた例。

## Two URL styles — choose first

- **Genre style** (office-chair, projector, monitor): the category maps to one Yahoo genre → Steps 1-2 below, `/search/<カテゴリ名>+<ブランド名>/<genreCategoryId>/?astk=2`.
- **Keyword style** (generator, shredder, printer): the category spans several Yahoo genres (e.g. shredder = 業務用 68899 + 家庭用 50149; generator = その他発電機 + ポータブル電源), so use genre `0`: `/search/<キーワード>+<ブランド名>/0/?astk=2`. Build the path by joining `encodeURIComponent` of each word with `+` (a node one-liner is fine). Skip the facet step but still do the mandatory count verification in Step 2.
- **Consumables-heavy categories need an exclusion search.** For printers, `複合機+ブラザー` put compatible ink cartridges at the top of the results. Yahoo supports minus words in the path: `複合機+ブラザー+-互換+-カートリッジ+-トナー+-用紙+-ケーブル+-セットアップ` (minus words are URL-encoded individually; the `-` stays literal). Open the result and confirm the first ~10 items are all main units. Note `-ケーブル`/`-セットアップ` were added because "プリンターケーブル" and "セットアップ用インク" remained after the first round. Don't use minus words that genuine main units contain.

## Step 1 — Find the category's `genreCategoryId` and confirm the brand exists in it

Navigate a real browser to `https://shopping.yahoo.co.jp/category/<genreCategoryId>/list/` (the same genre ID already used by the category's `fetchCandidates`/`searchQueries` — check the existing `<slug>.config.ts` or ask if this is a brand-new category). Open the "ブランド" facet list in the left sidebar (read the accessibility tree — `read_page` with `filter: all` — rather than relying on `find`, since the facet list is long and plain-text screenshots are not reliable for this). Confirm the brand appears there with a non-trivial item count. If it doesn't appear at all, tell the user before proceeding — don't fabricate a brand's presence in a category.

## Step 2 — Derive and verify the `yahooSearchUrl` — never guess this

The correct, empirically-confirmed URL shape is:

```
https://shopping.yahoo.co.jp/search/<カテゴリ名>+<ブランド名>/<genreCategoryId>/?astk=2
```

- The path segment is `<カテゴリ名(スペース)ブランド名>` URL-encoded (space → `%20` or `+`), followed by `/<genreCategoryId>/`. This is a keyword search scoped to the category, not the plain `/category/<id>/list/` browse URL.
- `astk=2` is Yahoo's "優良配送:すべて" (certified delivery, all) filter. **This is not a documented itemSearch API parameter — it only exists on the consumer-facing search UI.** It was discovered by actually opening `/category/<genreId>/list/`, opening "こだわり条件" in the browser, and reading the real `href` of the 優良配送 checkbox from the accessibility tree — do not assume `astk=2` is universal without having derived it this way at least once per session, and re-verify it for the specific category/brand combination you're adding.
- **Verification is mandatory, not optional**: navigate to the constructed URL and read the result count (`get_page_text`, the number before "件"). Compare it against the same URL with `?astk=2` removed — the filtered count must be meaningfully smaller, and the visible product results must all genuinely belong to the target brand (skim a few names). If the count barely changes or results look unrelated to the brand, the URL is wrong — do not ship it. This matches the project's standing rule ("推測でURLパラメータを作らない") that was set specifically because a first guess (`?p=<query>` on the plain category URL) silently failed to filter anything.

## Step 3 — Get a real product image, don't guess or synthesize one

Navigate to the brand's filtered category page (`https://shopping.yahoo.co.jp/category/<genreCategoryId>/<brandId>/brand/` — the brand ID is visible in the facet list's link href from Step 1) and extract an image via `javascript_tool`:

```js
Array.from(document.querySelectorAll('main img'))
  .filter(img => img.src && img.src.includes('item-shopping.c.yimg.jp'))
  .slice(0, 5)
  .map(img => ({ src: img.src, alt: img.alt }));
```

**Inspect every candidate image yourself** (download with `curl -s -o x.jpg "<url>?resolution=2x"` and open it with the Read tool). Reject images that contain: ranking badges ("ランキング第1位"), "No.1"/crown icons, promotional overlay text ("60分連続・17枚同時"), price or discount stamps, shop logos, or lifestyle photos where the product is not the clear subject. A shop's own official-store images are the usual offenders (sanwadirect, irisplaza); large retailers' plain white-background photos (y-kojima, yamada-denki, aprice) are usually clean. Confirm the URL returns 200 and a decent size (the Yahoo CDN `?resolution=2x` suffix is what the existing cards use). Write the `alt` from the product name shown in the listing; don't state a model number you haven't seen.

Pick a result whose `alt` text actually matches the product type this category is about (skip results like あぐらチェア/floor chairs turning up in an office-chair brand's own listing — sellers' listings aren't perfectly curated). Use the `src` URL directly in `PopularBrand.image.src` — **do not download and rehost the image**; this is a hotlink to Yahoo's own CDN, which is fine for ValueCommerce/Yahoo (unlike Amazon, where rehosting search-result images is a ToS violation — don't casually extend this pattern to Amazon).

## Step 4 — Write fact-checked copy, not marketing copy

Get the page text of the official product pages with WebFetch; if it returns 403 (irisohyama.co.jp did), open the page in the browser pane and use `get_page_text`. **A WebSearch result summary is not evidence** — it only tells you which URLs exist; open the page and read the specification. Only use facts you read there, and attach the model they belong to (e.g. "OF16Jは最大16枚…(公式仕様)"). Do not use a maker's self-claimed rank or share ("国内シェアNo.1") — it can't be verified with a source and survey date. Also check the brand is still active: Yamaha's generator business ended in December 2025 (transferred to Willbe), so it was not added although the user listed it.

Visit the brand's own official site (not a reseller page, not a summary) and extract only verifiable facts: founding/launch year, distributor/manufacturer relationship, named product lines, and concrete named features (e.g. "独立式ランバーサポート"). Do not write unfounded superlatives — "No.1", "最高", "圧倒的人気", "腰痛改善", "必ず快適" are explicitly prohibited by the original spec for this section. If a fact can't be confirmed from the official site, omit it rather than guess — same principle as this project's site-wide "要確認" convention (see CLAUDE.md's SEO section).

Fill in `PopularBrand` (defined in `src/lib/commerce/types.ts`):

```ts
{
  brand: string;            // internal slug-like name, e.g. "Ergohuman"
  displayName: string;      // shown on the card, e.g. "エルゴヒューマン / Ergohuman"
  description: string;      // 1-2 sentence fact-based summary
  history: string;          // founding/launch facts, shown inside the <details> disclosure
  features: string[];       // short fact-based bullet points
  popularTypes: string[];   // representative model/line names
  image: { src: string; alt: string };  // from Step 3
  yahooSearchUrl: string;   // from Step 2, already verified
}
```

Add it to the category's `popularBrands` array in `src/lib/commerce/categories/<slug>.config.ts`.

## Step 5 — Don't touch the shared component unless the markup genuinely needs to change

`src/components/commerce/PickupBrandSection.astro` renders the whole `popularBrands` array generically — adding a brand is purely a data change in the category config, never a component edit. Only touch the component if the user asks for a structural/visual change to the section itself, and if you do:

- **Keep the "stretched link" pattern.** The card needs to be fully clickable (image/name/description/features/CTA) AND contain an independent `<details>/<summary>` toggle for "成り立ち・特徴". Wrapping the whole card in one `<a>` and nesting `<details>` inside it is invalid HTML (interactive content can't nest) — confirmed broken in-browser (the toggle either did nothing or fought with navigation). The fix already in place: an absolutely-positioned transparent `<a>` (`z-index: 1`) as a sibling covering the whole card, with `.brand-card-history { position: relative; z-index: 2; }` so the summary's own click lands on it, not the link underneath. Reuse this exact pattern rather than reverting to a single wrapping anchor.
- **Hard rule (also in CLAUDE.md, do not relax without an explicit new user instruction): PC (721px+) always defaults to OPEN, mobile (720px and below) always defaults to CLOSED.** The `<details>` renders `open` unconditionally server-side (best for no-JS/crawlers and this project's GEO/AI-citability goal of maximizing extractable visible text), and a synchronous `<script is:inline>` (not Astro's default deferred bundled script) placed immediately after the markup checks `matchMedia('(max-width: 720px)')` and removes the `open` attribute before first paint if mobile. Placing this as a deferred/module script instead would cause a visible flash of open-then-closed content on mobile. Every new category that adds this section must verify both states (see Step 6.2) — this is not a one-time office-chair/projector fix, it's a permanent behavior requirement for the shared component.
- Don't reintroduce ValueCommerce MyLinkBox for this or any future brand-showcase need — this component was built specifically to replace it.

## Step 6 — Verify before asking to deploy

1. `npm run build` then `npm run test` — the snapshot tests must show zero diff for every *other* category (this component is shared; a markup change here affects every category that sets `popularBrands`).
2. In a local `wrangler dev` browser session: click "成り立ち・特徴を見る" and confirm it toggles without navigating away, at both desktop and mobile viewport widths (`resize_window`) — confirm `document.querySelectorAll('.brand-card-history')[...].open` is `true` on desktop load and `false` on mobile load via `javascript_tool`.
3. Grep the built HTML for `astk=2` occurring once per brand card. (A grep for `mylinkbox` in `src/` still finds explanatory comments in `PickupBrandSection.astro`, `officeChair.config.ts` and `types.ts`; that's expected — only look for actual MyLinkBox scripts/ids. `pickupBrand` also matches the component name, so don't grep for it.)
3b. After LinkSwitch has converted a card's link (`dalr.valuecommerce.com`), confirm the destination is intact: the original URL is in the `vcurl` query parameter (not `vc_url`); `decodeURIComponent` it and check it still contains `astk=2` and, for exclusion searches, the `-互換`-style minus words. Also click a card once with navigation prevented (`document.addEventListener('click', e => { if (e.target.closest('a[target=_blank]')) e.preventDefault(); }, true)`) and confirm `dataLayer` gains exactly one `outbound_product_click` and one `brand_click`.
4. Follow this project's standing rule: confirm with the user before `wrangler deploy`, even after a clean local build/test — unless they've already said "deploy" for this specific change.

## Reference

- Keyword-style examples with the facts-and-images workflow described above: `src/lib/commerce/categories/shredder.config.ts` (4 brands) and `printer.config.ts` (3 brands, exclusion search).
- The office-chair implementation is the best worked example for the genre style: `src/lib/commerce/categories/officeChair.config.ts` (3 `popularBrands` entries), `src/components/commerce/PickupBrandSection.astro`, `src/components/commerce/CommerceCategoryPage.astro` (renders it between hero and the filter panel — don't move this without an explicit new instruction).
- `project_yahoo_shopping_affiliate_pattern.md` memory file has the full incident history (the nested-`<details>` bug, the URL-guessing failure, the disclosure-default follow-up request) if you need the reasoning behind a rule above, not just the rule itself.
