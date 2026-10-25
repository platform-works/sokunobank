// テレビ購入コンシェルジュ(診断・詳細検索・比較)のブラウザ側の処理(2026-10-25)。
// 判定ロジックは recommend.ts(純関数・テスト済み)に置き、ここは画面の組み立てと計測だけを行う。
// 商品は /api/tv/products/ から1回だけ取得し、診断・詳細検索・比較で共有する。取得に失敗したときは、
// 架空の商品で補わず、再試行とYahoo!ショッピングの検索リンクを案内する。
import {
  BRAND_PREFS,
  BUDGETS,
  BUDGET_ORDER,
  FEATURES,
  PICK_LABELS,
  SIZES,
  USES,
  emptyCriteria,
  filterProducts,
  makerCounts,
  recommend,
  sizeForDistance,
  sortProducts,
  type Answers,
  type BrandPref,
  type BudgetId,
  type FeatureId,
  type Pick,
  type SearchCriteria,
  type SearchSort,
  type SizeId,
  type TvProduct,
  type UseId,
} from "./recommend";
import { yahooImageUrl } from "../yahooImage";

type Track = (name: string, params?: Record<string, unknown>) => void;
type TrackOutbound = (params: Record<string, unknown>) => void;
type Debounce = (el: HTMLElement, fn: () => void) => void;

interface Win {
  sokunobankTrackEvent?: Track;
  sokunobankTrackOutboundClick?: TrackOutbound;
  sokunobankDebounceClick?: Debounce;
}
const w = window as unknown as Win;

const track: Track = (name, params) => {
  if (w.sokunobankTrackEvent) w.sokunobankTrackEvent(name, params ?? {});
};

const YAHOO_SEARCH = "https://shopping.yahoo.co.jp/search/%E6%B6%B2%E6%99%B6%E3%83%86%E3%83%AC%E3%83%93/0/?astk=2";
const SLUG = "tv";
const MAX_COMPARE = 3;
const SEARCH_PAGE = 20;

type Child = Node | string | null | undefined | false;
function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string | boolean | undefined> = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k === "class") el.className = String(v);
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, String(v));
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return el;
}

const yen = (n: number): string => `${n.toLocaleString("ja-JP")}円`;

// ---- 仕様の表示(確認できたものだけ「あり」と表示し、それ以外は「未確認」) ----

function specRows(p: TvProduct): [string, string, boolean][] {
  const s = p.tvSpecs;
  const ok = (t: string): [string, boolean] => [t, true];
  const unk = (): [string, boolean] => ["未確認", false];
  const rows: [string, [string, boolean]][] = [
    ["画面サイズ", s.sizeV !== null ? ok(`${s.sizeV}V型`) : unk()],
    ["解像度", s.resolution ? ok(s.resolution === "4K" ? "4K" : s.resolution === "フルHD" ? "フルハイビジョン" : "ハイビジョン") : unk()],
    ["パネル", s.panel && s.panel !== "液晶" ? ok(s.panel) : s.panel ? ok("液晶") : unk()],
    ["地上デジタル", s.tunerless ? ["非対応(チューナーレス)", true] : s.terrestrial ? ok("記載あり") : unk()],
    ["BS・CS", s.tunerless ? ["非対応(チューナーレス)", true] : s.bsCs ? ok("記載あり") : unk()],
    ["BS・CS4K放送", s.tunerless ? ["非対応(チューナーレス)", true] : s.bs4k ? ok("4Kチューナー内蔵の記載あり") : unk()],
    [
      "録画",
      s.tunerless ? ["非対応(チューナーレス)", true] : s.recording === "built-in" ? ok("内蔵の記載あり") : s.recording ? ok("外付けHDD(別売)に録画") : unk(),
    ],
    ["動画配信", s.streaming ? ok("記載あり") : unk()],
    ["ゲーム機能", s.gaming ? ok("記載あり") : unk()],
    ["保証", s.warranty ? ok(s.warranty) : ["商品ページで確認", false]],
    ["設置", s.installation ? ok(s.installation) : ["商品ページで確認", false]],
  ];
  return rows.map(([k, [v, c]]) => [k, v, c]);
}

// ---- 状態 ----

interface State {
  products: TvProduct[];
  load: "loading" | "ready" | "error";
  step: number;
  answers: Partial<Answers>;
  started: boolean;
  compare: string[];
  criteria: SearchCriteria;
  sort: SearchSort;
  shown: number;
  stage: "result" | "questions";
}

const state: State = {
  products: [],
  load: "loading",
  step: 0,
  answers: { features: [] },
  started: false,
  compare: [],
  criteria: emptyCriteria(),
  sort: "recommended",
  shown: SEARCH_PAGE,
  stage: "questions",
};

const byCode = (code: string): TvProduct | undefined => state.products.find((p) => p.code === code);

// ---- 商品カード ----

const seenImpression = new Set<string>();
let io: IntersectionObserver | null = null;
function observeImpression(el: HTMLElement, p: TvProduct, source: string, position: number): void {
  if (!("IntersectionObserver" in window)) return;
  if (!io) {
    io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const t = e.target as HTMLElement;
          const key = `${t.dataset.source}:${t.dataset.code}`;
          io?.unobserve(t);
          if (seenImpression.has(key)) continue;
          seenImpression.add(key);
          track("tv_product_impression", { category: SLUG, product_id: t.dataset.code, source: t.dataset.source, position: Number(t.dataset.position), price: Number(t.dataset.price) });
        }
      },
      { threshold: 0.5 }
    );
  }
  el.dataset.code = p.code;
  el.dataset.source = source;
  el.dataset.position = String(position);
  el.dataset.price = String(p.price);
  io.observe(el);
}

function ctaLink(p: TvProduct, source: string, position: number, label: string, cls: string): HTMLAnchorElement {
  const a = h("a", { class: cls, href: p.productUrl, target: "_blank", rel: "sponsored noopener" }, label);
  a.addEventListener("click", () => {
    const run = (): void => {
      const common = { category: SLUG, product_id: p.code, brand: p.tvSpecs.maker ?? p.brand ?? undefined, price: p.price, source, position };
      track("tv_product_click", common);
      // a.href は、LinkSwitchが変換した後のURL(クリック時点)になる
      track("tv_affiliate_click", { ...common, destination: "yahoo_shopping", link_url: a.href });
      // 既存の離脱クリック計測(GA4 outbound_product_click とLINEヤフー広告のCV)を従来どおり送る
      if (w.sokunobankTrackOutboundClick) {
        w.sokunobankTrackOutboundClick({
          destination: "yahoo_shopping",
          category: SLUG,
          brand: p.tvSpecs.maker ?? p.brand ?? undefined,
          product_name: p.name,
          price: p.price,
          page_path: window.location.pathname,
          link_url: a.href,
          link_text: label,
          position,
        });
      }
    };
    if (w.sokunobankDebounceClick) w.sokunobankDebounceClick(a, run);
    else run();
  });
  return a;
}

function compareToggle(p: TvProduct, source: string): HTMLElement {
  const id = `cmp-${source}-${p.code}`;
  const input = h("input", { type: "checkbox", id, "data-compare": p.code });
  input.checked = state.compare.includes(p.code);
  input.addEventListener("change", () => {
    toggleCompare(p.code, input.checked, source);
  });
  return h("label", { class: "tv-compare-toggle", for: id }, input, h("span", {}, "比較に追加"));
}

function productCard(p: TvProduct, source: string, position: number, pick?: Pick): HTMLElement {
  const s = p.tvSpecs;
  const rows = specRows(p);
  const li = h("li", { class: "tv-card" });
  if (pick) li.append(h("p", { class: `tv-pick-badge tv-pick-${pick.type}` }, PICK_LABELS[pick.type]));
  const imgLink = ctaLink(p, source, position, "", "tv-card-image");
  imgLink.append(h("img", { src: yahooImageUrl(p.image, "j"), alt: p.name, loading: "lazy", width: "200", height: "200" }));
  imgLink.setAttribute("aria-label", `${p.name}(販売店のページを開く)`);
  const body = h("div", { class: "tv-card-body" });
  body.append(h("p", { class: "tv-card-maker" }, s.maker ?? p.brand ?? "メーカー・ブランド:未確認"));
  body.append(h("p", { class: "tv-card-name" }, p.name));
  body.append(h("p", { class: "tv-card-model" }, `型番:${s.model ?? "未確認"}`));
  body.append(h("p", { class: "tv-card-price" }, h("strong", {}, yen(p.price)), h("small", {}, "(取得時点の販売価格・税込表記は商品ページで確認)")));
  body.append(h("p", { class: "tv-card-store" }, `販売店:${p.storeName || "商品ページで確認"}${p.reviewCount > 0 ? ` ／ Yahoo!ショッピングのレビュー ${p.reviewRate.toFixed(1)}点(${p.reviewCount}件)` : ""}`));
  const dl = h("dl", { class: "tv-specs" });
  for (const [k, v, confirmed] of rows) dl.append(h("div", { class: confirmed ? "tv-spec" : "tv-spec is-unknown" }, h("dt", {}, k), h("dd", {}, v)));
  body.append(h("details", { class: "tv-specs-wrap", open: pick ? true : undefined }, h("summary", {}, "仕様(商品名・説明に記載のあるもの)"), dl));
  if (pick) {
    body.append(h("div", { class: "tv-why" }, h("h4", {}, "おすすめする理由"), h("ul", {}, ...pick.reasons.map((r) => h("li", {}, r)))));
    body.append(h("div", { class: "tv-caution" }, h("h4", {}, "購入前に確認すること"), h("ul", {}, ...pick.cautions.map((r) => h("li", {}, r)))));
  }
  const actions = h("div", { class: "tv-card-actions" }, ctaLink(p, source, position, "このテレビの価格・配送を確認", "btn btn-primary"), compareToggle(p, source));
  body.append(actions);
  li.append(imgLink, body);
  observeImpression(li, p, source, position);
  return li;
}

// ---- 比較 ----

function toggleCompare(code: string, on: boolean, source: string): void {
  const i = state.compare.indexOf(code);
  if (on && i < 0) {
    if (state.compare.length >= MAX_COMPARE) {
      notice(`比較できるのは${MAX_COMPARE}台までです。外してから追加してください。`);
      syncCompareChecks();
      return;
    }
    state.compare.push(code);
    track("tv_product_compare", { category: SLUG, action: "add", product_id: code, compare_count: state.compare.length, source });
  } else if (!on && i >= 0) {
    state.compare.splice(i, 1);
    track("tv_product_compare", { category: SLUG, action: "remove", product_id: code, compare_count: state.compare.length, source });
  }
  syncCompareChecks();
  renderTray();
  if (!document.querySelector("[data-tv-compare-panel]")?.hasAttribute("hidden")) renderCompareTable();
}

function syncCompareChecks(): void {
  document.querySelectorAll<HTMLInputElement>("input[data-compare]").forEach((el) => {
    el.checked = state.compare.includes(el.dataset.compare ?? "");
  });
}

let noticeTimer: number | undefined;
function notice(text: string): void {
  const el = document.querySelector<HTMLElement>("[data-tv-notice]");
  if (!el) return;
  el.textContent = text;
  el.hidden = false;
  window.clearTimeout(noticeTimer);
  noticeTimer = window.setTimeout(() => (el.hidden = true), 4000);
}

function renderTray(): void {
  const tray = document.querySelector<HTMLElement>("[data-tv-tray]");
  if (!tray) return;
  tray.replaceChildren();
  tray.hidden = state.compare.length === 0;
  if (state.compare.length === 0) return;
  const names = state.compare.map((c) => byCode(c)).filter((p): p is TvProduct => !!p);
  const list = h("ul", { class: "tv-tray-list" });
  for (const p of names) {
    const rm = h("button", { type: "button", class: "tv-tray-remove", "aria-label": `${p.name}を比較から外す` }, "×");
    rm.addEventListener("click", () => toggleCompare(p.code, false, "tray"));
    list.append(h("li", {}, h("span", { class: "tv-tray-name" }, `${p.tvSpecs.maker ?? p.brand ?? ""} ${p.tvSpecs.model ?? p.name}`.trim().slice(0, 28)), rm));
  }
  const go = h("button", { type: "button", class: "btn btn-primary" }, state.compare.length >= 2 ? `この${state.compare.length}台を比較する` : "あと1台選ぶと比較できます");
  (go as HTMLButtonElement).disabled = state.compare.length < 2;
  go.addEventListener("click", () => {
    renderCompareTable();
    const panel = document.querySelector<HTMLElement>("[data-tv-compare-panel]");
    panel?.removeAttribute("hidden");
    panel?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  const clear = h("button", { type: "button", class: "tv-tray-clear" }, "すべて外す");
  clear.addEventListener("click", () => {
    state.compare = [];
    syncCompareChecks();
    renderTray();
    document.querySelector("[data-tv-compare-panel]")?.setAttribute("hidden", "");
  });
  tray.append(list, go, clear);
}

function renderCompareTable(): void {
  const panel = document.querySelector<HTMLElement>("[data-tv-compare-panel]");
  const host = document.querySelector<HTMLElement>("[data-tv-compare]");
  if (!panel || !host) return;
  const items = state.compare.map((c) => byCode(c)).filter((p): p is TvProduct => !!p);
  host.replaceChildren();
  if (items.length < 2) {
    panel.hidden = true;
    return;
  }
  const rowDefs: [string, (p: TvProduct) => string][] = [
    ["価格", (p) => yen(p.price)],
    ["画面サイズ", (p) => specRows(p)[0][1]],
    ["画質・解像度", (p) => `${specRows(p)[1][1]}${p.tvSpecs.panel && p.tvSpecs.panel !== "液晶" ? ` ／ ${p.tvSpecs.panel}` : ""}`],
    ["ブランド", (p) => p.tvSpecs.maker ?? p.brand ?? "未確認"],
    ["地デジ対応", (p) => specRows(p)[3][1]],
    ["4K放送(BS・CS4K)", (p) => specRows(p)[5][1]],
    ["録画機能", (p) => specRows(p)[6][1]],
    ["動画配信", (p) => specRows(p)[7][1]],
    ["ゲーム機能", (p) => specRows(p)[8][1]],
    ["保証", (p) => specRows(p)[9][1]],
    ["配送条件", (p) => p.tvSpecs.installation ?? "商品ページで確認"],
    ["販売店", (p) => p.storeName || "商品ページで確認"],
  ];
  const table = h("table", { class: "tv-compare-table" });
  const head = h("tr", {}, h("th", { scope: "col", class: "tv-cmp-corner" }, "比較項目"));
  items.forEach((p, i) => {
    head.append(
      h(
        "th",
        { scope: "col" },
        h("img", { src: yahooImageUrl(p.image, "i"), alt: "", width: "80", height: "80", loading: "lazy" }),
        h("span", { class: "tv-cmp-name" }, p.tvSpecs.model ?? p.name.slice(0, 30)),
        ctaLink(p, "compare", i + 1, "価格・配送を確認", "btn btn-primary tv-cmp-cta")
      )
    );
  });
  table.append(h("thead", {}, head));
  const tb = h("tbody");
  for (const [label, get] of rowDefs) {
    const vals = items.map(get);
    const differs = new Set(vals).size > 1;
    const tr = h("tr", { class: differs ? "is-diff" : undefined }, h("th", { scope: "row" }, label));
    vals.forEach((v) => tr.append(h("td", { class: v === "未確認" ? "is-unknown" : undefined }, v)));
    tb.append(tr);
  }
  table.append(tb);
  host.append(h("div", { class: "tv-compare-scroll" }, table), h("p", { class: "tv-note" }, "背景色のある行は、商品間で表示が異なる項目です。「未確認」は商品名・説明に記載がないもので、非対応という意味ではありません。"));
  panel.hidden = false;
}

// ---- 診断 ----

interface Question {
  key: keyof Answers;
  title: string;
  hint?: string;
  multi?: boolean;
  options: { id: string; label: string }[];
}

const QUESTIONS: Question[] = [
  { key: "use", title: "Q1. テレビの主な用途は？", options: (Object.keys(USES) as UseId[]).map((id) => ({ id, label: USES[id] })) },
  { key: "budget", title: "Q2. 予算は？", options: BUDGET_ORDER.map((id) => ({ id, label: BUDGETS[id].label })) },
  {
    key: "size",
    title: "Q3. 希望のサイズは？",
    hint: "商品名にサイズの記載がある商品だけが対象になります。",
    options: [...(Object.keys(SIZES) as (keyof typeof SIZES)[]).map((id) => ({ id, label: SIZES[id].label })), { id: "unknown", label: "サイズが分からない" }],
  },
  { key: "brand", title: "Q4. ブランドへのこだわりは？", hint: "ブランドは「優先」であり、条件に合う他のブランドも候補に残ります。", options: (Object.keys(BRAND_PREFS) as BrandPref[]).map((id) => ({ id, label: BRAND_PREFS[id] })) },
  {
    key: "features",
    title: "Q5. 必要な機能は？(複数選択可)",
    hint: "選んだ機能は、商品名・説明に記載がある商品だけを候補にします。",
    multi: true,
    options: [...(Object.keys(FEATURES) as FeatureId[]).map((id) => ({ id, label: FEATURES[id] })), { id: "none", label: "特に指定なし" }],
  },
];

function answerLabel(q: Question): string {
  const a = state.answers[q.key];
  if (q.key === "features") {
    const f = (a as FeatureId[] | undefined) ?? [];
    return f.length === 0 ? "指定なし" : f.map((x) => FEATURES[x]).join("・");
  }
  return q.options.find((o) => o.id === a)?.label ?? "";
}

function resetDiagnosis(): void {
  state.step = 0;
  state.answers = { features: [] };
  state.started = false;
  answeredFeatures = false;
  state.stage = "questions";
  renderWizard();
}

function renderWizard(): void {
  const host = document.querySelector<HTMLElement>("[data-tv-wizard]");
  if (!host) return;
  host.replaceChildren();
  if (state.load === "error") {
    host.append(errorBlock());
    return;
  }
  if (state.stage === "result") {
    renderResult(host);
    return;
  }
  const q = QUESTIONS[state.step];
  // 進捗
  host.append(
    h(
      "div",
      { class: "tv-progress", role: "group", "aria-label": `質問 ${state.step + 1}/${QUESTIONS.length}` },
      h("p", { class: "tv-progress-text" }, `質問 ${state.step + 1} / ${QUESTIONS.length}`),
      h("div", { class: "tv-progress-bar" }, h("span", { style: `width:${((state.step + 1) / QUESTIONS.length) * 100}%` }))
    )
  );
  // これまでの回答(押すとその質問に戻って修正できる)
  if (state.step > 0) {
    const chips = h("ul", { class: "tv-answer-chips" });
    QUESTIONS.slice(0, state.step).forEach((pq, i) => {
      const b = h("button", { type: "button", class: "tv-chip" }, answerLabel(pq));
      b.setAttribute("aria-label", `${pq.title} 回答:${answerLabel(pq)}(押すと修正できます)`);
      b.addEventListener("click", () => {
        state.step = i;
        renderWizard();
      });
      chips.append(h("li", {}, b));
    });
    host.append(chips);
  }
  host.append(h("h3", { class: "tv-q-title" }, q.title));
  if (q.hint) host.append(h("p", { class: "tv-q-hint" }, q.hint));
  const opts = h("div", { class: "tv-options", role: q.multi ? "group" : "radiogroup", "aria-label": q.title });
  for (const o of q.options) {
    const feats = (state.answers.features ?? []) as string[];
    const selected = q.multi ? (o.id === "none" ? answeredFeatures && feats.length === 0 : feats.includes(o.id)) : state.answers[q.key] === o.id;
    const b = h("button", { type: "button", class: `tv-option${selected ? " is-selected" : ""}`, "aria-pressed": selected ? "true" : "false" }, o.label);
    b.addEventListener("click", () => onAnswer(q, o.id));
    opts.append(b);
  }
  host.append(opts);
  if (q.key === "size" && state.answers.size === "unknown") host.append(sizeHelper());
  const nav = h("div", { class: "tv-wizard-nav" });
  if (state.step > 0) {
    const back = h("button", { type: "button", class: "btn btn-secondary" }, "← 前の質問に戻る");
    back.addEventListener("click", () => {
      state.step -= 1;
      renderWizard();
    });
    nav.append(back);
  }
  if (q.multi) {
    const next = h("button", { type: "button", class: "btn btn-primary" }, "診断結果を見る");
    next.addEventListener("click", finishDiagnosis);
    nav.append(next);
  } else if (state.answers[q.key] !== undefined && state.step < QUESTIONS.length - 1) {
    const next = h("button", { type: "button", class: "btn btn-primary" }, "次へ →");
    next.addEventListener("click", () => {
      state.step += 1;
      renderWizard();
    });
    nav.append(next);
  }
  host.append(nav);
}

let answeredFeatures = false;

function onAnswer(q: Question, id: string): void {
  if (!state.started) {
    state.started = true;
    track("tv_diagnosis_start", { category: SLUG });
  }
  if (q.multi) {
    const cur = new Set((state.answers.features ?? []) as FeatureId[]);
    answeredFeatures = true;
    if (id === "none") cur.clear();
    else if (cur.has(id as FeatureId)) cur.delete(id as FeatureId);
    else cur.add(id as FeatureId);
    state.answers.features = [...cur];
    renderWizard();
    return;
  }
  (state.answers as Record<string, unknown>)[q.key] = id;
  // サイズが分からない場合は補助案内を出すため、自動では進まない
  if (q.key === "size" && id === "unknown") {
    renderWizard();
    return;
  }
  state.step += 1;
  renderWizard();
}

function sizeHelper(): HTMLElement {
  const box = h("div", { class: "tv-size-helper" });
  box.append(h("h4", {}, "視聴距離からサイズの目安を調べる"));
  box.append(
    h(
      "p",
      { class: "tv-note" },
      "目安は、画面の高さの約1.5倍(4Kテレビ)・約3倍(フルハイビジョン)の距離で見る考え方です(パナソニックの解説に基づく目安)。画面の高さにはフレームやスタンドを含みません。部屋の広さ・置く台の幅も合わせて確認してください。"
    )
  );
  const input = h("input", { type: "number", id: "tv-distance", min: "0.5", max: "6", step: "0.1", inputmode: "decimal", value: "2.0" });
  const out = h("p", { class: "tv-size-out", "aria-live": "polite" });
  const calc = (): void => {
    const d = Number((input as HTMLInputElement).value);
    if (!(d >= 0.5 && d <= 6)) {
      out.textContent = "0.5〜6mの範囲で入力してください。";
      return;
    }
    const k = sizeForDistance(d, "4K");
    const f = sizeForDistance(d, "フルHD");
    out.textContent = `${d.toFixed(1)}mの距離なら、4Kテレビは約${k}V型まで、フルハイビジョンは約${f}V型までが、画面の高さの目安に収まります。これは画面が大きくなりすぎない上限の目安です。部屋の広さと置き場所の幅に合わせて、小さめのサイズも選べます。上の候補から近いサイズを選んでください。`;
  };
  input.addEventListener("input", calc);
  box.append(h("label", { for: "tv-distance" }, "ソファや椅子からテレビまでの距離(m)"), input, out);
  calc();
  return box;
}

function finishDiagnosis(): void {
  const a = state.answers;
  if (!a.use || !a.budget || !a.size || !a.brand) {
    // 未回答の質問に戻す
    const idx = QUESTIONS.findIndex((q) => q.key !== "features" && a[q.key] === undefined);
    state.step = Math.max(0, idx);
    notice("未回答の質問があります。回答してください。");
    renderWizard();
    return;
  }
  state.stage = "result";
  const ans = answersComplete();
  const r = recommend(state.products, ans);
  track("tv_diagnosis_complete", {
    category: SLUG,
    use: ans.use,
    budget: ans.budget,
    size: ans.size,
    brand_pref: ans.brand,
    features: ans.features.join(",") || "none",
    result_count: r.picks.length,
    eligible_count: r.eligibleCount,
  });
  renderWizard();
  document.querySelector("#tv-diagnosis")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function answersComplete(): Answers {
  const a = state.answers;
  return { use: a.use as UseId, budget: a.budget as BudgetId, size: a.size as SizeId, brand: a.brand as BrandPref, features: (a.features ?? []) as FeatureId[] };
}

function renderResult(host: HTMLElement): void {
  const ans = answersComplete();
  const r = recommend(state.products, ans);
  host.append(h("h3", { class: "tv-q-title" }, "診断結果"));
  const chips = h("ul", { class: "tv-answer-chips" });
  QUESTIONS.forEach((q, i) => {
    const b = h("button", { type: "button", class: "tv-chip" }, answerLabel(q));
    b.setAttribute("aria-label", `${q.title} 回答:${answerLabel(q)}(押すと修正できます)`);
    b.addEventListener("click", () => {
      state.stage = "questions";
      state.step = i;
      renderWizard();
    });
    chips.append(h("li", {}, b));
  });
  host.append(chips, h("p", { class: "tv-note" }, "回答を押すと、その質問から修正できます。"));
  host.append(
    h(
      "div",
      { class: "tv-conditions" },
      h("h4", {}, "適用した必須条件"),
      h("ul", {}, ...r.conditions.map((c) => h("li", {}, c.label))),
      h("p", { class: "tv-note" }, `これらをすべて満たす商品(同じ商品は1件にまとめています)は${r.eligibleCount}件でした。中古・訳あり・展示品、配送エリアが限られる商品は推薦から除いています。ブランドの希望と用途は、並べ方にだけ反映しています。`)
    )
  );
  if (r.picks.length === 0) {
    const box = h("div", { class: "tv-zero" }, h("h4", {}, "条件に合うテレビが見つかりませんでした"), h("p", {}, "条件は自動では変えていません。次の中から、緩める条件を選べます。"));
    if (r.relaxations.length > 0) {
      const ul = h("ul", { class: "tv-relax" });
      for (const x of r.relaxations) {
        const b = h("button", { type: "button", class: "btn btn-secondary" }, `${x.label}(${x.count}件)`);
        b.addEventListener("click", () => {
          state.answers = { ...x.answers };
          track("tv_diagnosis_complete", { category: SLUG, use: x.answers.use, budget: x.answers.budget, size: x.answers.size, brand_pref: x.answers.brand, features: x.answers.features.join(",") || "none", result_count: recommend(state.products, x.answers).picks.length, relaxed: x.id });
          renderWizard();
        });
        ul.append(h("li", {}, b));
      }
      box.append(ul);
    } else {
      box.append(h("p", {}, "条件を1つ緩めても該当する商品がありませんでした。診断をやり直すか、詳細検索で条件を選び直してください。"));
    }
    host.append(box);
  } else {
    const ul = h("ul", { class: "tv-card-list" });
    r.picks.forEach((p, i) => ul.append(productCard(p.product, "diagnosis", i + 1, p)));
    host.append(ul);
    if (r.picks.length < 3) host.append(h("p", { class: "tv-note" }, `条件を満たす商品が${r.picks.length}件のため、${r.picks.length}台だけを表示しています。`));
  }
  const again = h("button", { type: "button", class: "btn btn-secondary" }, "条件を変えてやり直す");
  again.addEventListener("click", resetDiagnosis);
  host.append(h("div", { class: "tv-wizard-nav" }, again));
}

// ---- 詳細検索 ----

let filterTimer: number | undefined;
function onCriteriaChanged(): void {
  state.shown = SEARCH_PAGE;
  renderResults();
  window.clearTimeout(filterTimer);
  filterTimer = window.setTimeout(() => {
    const c = state.criteria;
    const any = c.sizes.length + c.budgets.length + c.makers.length + (c.resolution ? 1 : 0) + [c.terrestrial, c.bs4k, c.recording, c.streaming, c.gaming].filter(Boolean).length;
    if (any === 0) return;
    track("tv_filter_apply", {
      category: SLUG,
      sizes: c.sizes.join(",") || undefined,
      budgets: c.budgets.join(",") || undefined,
      makers: c.makers.join(",") || undefined,
      resolution: c.resolution ?? undefined,
      features: ["terrestrial", "bs4k", "recording", "streaming", "gaming"].filter((k) => c[k as keyof SearchCriteria] === true).join(",") || undefined,
      sort: state.sort,
      result_count: filterProducts(state.products, c).length,
    });
  }, 700);
}

function checkbox(label: string, checked: boolean, on: (v: boolean) => void): HTMLElement {
  const input = h("input", { type: "checkbox" });
  input.checked = checked;
  input.addEventListener("change", () => on(input.checked));
  return h("label", { class: "tv-check" }, input, h("span", {}, label));
}

function toggleIn<T>(arr: T[], v: T, on: boolean): T[] {
  const set = new Set(arr);
  if (on) set.add(v);
  else set.delete(v);
  return [...set];
}

function renderFilters(): void {
  const host = document.querySelector<HTMLElement>("[data-tv-filters]");
  if (!host) return;
  host.replaceChildren();
  if (state.load !== "ready") return;
  const c = state.criteria;
  const group = (title: string, ...kids: Node[]): HTMLElement => h("fieldset", { class: "tv-fgroup" }, h("legend", {}, title), ...kids);
  host.append(
    group(
      "画面サイズ",
      ...(Object.keys(SIZES) as (keyof typeof SIZES)[]).map((id) =>
        checkbox(SIZES[id].label, c.sizes.includes(id), (v) => {
          c.sizes = toggleIn(c.sizes, id, v);
          onCriteriaChanged();
        })
      )
    ),
    group(
      "価格帯",
      ...BUDGET_ORDER.map((id) =>
        checkbox(BUDGETS[id].label, c.budgets.includes(id), (v) => {
          c.budgets = toggleIn(c.budgets, id, v);
          onCriteriaChanged();
        })
      )
    ),
    group(
      "ブランド",
      ...makerCounts(state.products)
        .slice(0, 12)
        .map(([name, n]) =>
          checkbox(`${name}(${n})`, c.makers.includes(name), (v) => {
            c.makers = toggleIn(c.makers, name, v);
            onCriteriaChanged();
          })
        )
    )
  );
  const resSel = h("select", { id: "tv-res" }, h("option", { value: "" }, "指定なし"), h("option", { value: "4K" }, "4K"), h("option", { value: "フルHD" }, "フルハイビジョン"));
  (resSel as HTMLSelectElement).value = c.resolution ?? "";
  resSel.addEventListener("change", () => {
    c.resolution = ((resSel as HTMLSelectElement).value || null) as SearchCriteria["resolution"];
    onCriteriaChanged();
  });
  host.append(group("画面解像度", h("label", { for: "tv-res", class: "tv-sr" }, "画面解像度"), resSel));
  const feats: [keyof SearchCriteria, string][] = [
    ["terrestrial", "地デジチューナー"],
    ["bs4k", "BS・CS4K放送対応"],
    ["recording", "録画対応"],
    ["streaming", "動画配信対応"],
    ["gaming", "ゲーム向け機能"],
  ];
  host.append(
    group(
      "機能(記載を確認できた商品だけ)",
      ...feats.map(([k, label]) =>
        checkbox(label, c[k] === true, (v) => {
          (c as unknown as Record<string, unknown>)[k] = v;
          onCriteriaChanged();
        })
      )
    )
  );
  const reset = h("button", { type: "button", class: "btn btn-secondary" }, "条件をクリア");
  reset.addEventListener("click", () => {
    state.criteria = emptyCriteria();
    renderFilters();
    onCriteriaChanged();
  });
  host.append(reset);
}

function renderResults(): void {
  const host = document.querySelector<HTMLElement>("[data-tv-results]");
  const meta = document.querySelector<HTMLElement>("[data-tv-results-meta]");
  if (!host || !meta) return;
  host.replaceChildren();
  if (state.load === "loading") {
    meta.textContent = "商品情報を取得しています…";
    return;
  }
  if (state.load === "error") {
    meta.textContent = "";
    host.append(errorBlock());
    return;
  }
  const list = sortProducts(filterProducts(state.products, state.criteria), state.sort);
  meta.textContent = `${list.length}件(全${state.products.length}件中)`;
  if (list.length === 0) {
    host.append(
      h(
        "div",
        { class: "tv-zero" },
        h("p", {}, "条件に合う商品がありません。仕様の記載が確認できない商品は、その仕様を条件にすると表示されません。条件を減らして検索してください。")
      )
    );
    const reset = h("button", { type: "button", class: "btn btn-secondary" }, "条件をクリアする");
    reset.addEventListener("click", () => {
      state.criteria = emptyCriteria();
      renderFilters();
      onCriteriaChanged();
    });
    host.append(reset);
    return;
  }
  const ul = h("ul", { class: "tv-card-list" });
  list.slice(0, state.shown).forEach((p, i) => ul.append(productCard(p, "search", i + 1)));
  host.append(ul);
  if (list.length > state.shown) {
    const more = h("button", { type: "button", class: "btn btn-secondary" }, "もっと見る");
    more.addEventListener("click", () => {
      state.shown += SEARCH_PAGE;
      renderResults();
    });
    host.append(h("div", { class: "tv-more" }, more));
  }
}

function errorBlock(): HTMLElement {
  const retry = h("button", { type: "button", class: "btn btn-primary" }, "もう一度読み込む");
  retry.addEventListener("click", () => void loadProducts());
  const link = h("a", { class: "btn btn-secondary", href: YAHOO_SEARCH, target: "_blank", rel: "sponsored noopener" }, "Yahoo!ショッピングでテレビを探す");
  return h("div", { class: "tv-error", role: "alert" }, h("p", {}, "現在、商品情報を取得できません。時間をおいて再度お試しいただくか、Yahoo!ショッピングで直接お探しください。"), h("div", { class: "tv-wizard-nav" }, retry, link));
}

// ---- 取得・初期化 ----

async function loadProducts(): Promise<void> {
  const root = document.querySelector<HTMLElement>("[data-tv-root]");
  const apiPath = root?.dataset.apiPath ?? "/api/tv/products/";
  state.load = "loading";
  renderAll();
  try {
    const res = await fetch(`${apiPath}?sort=recommended`, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as { products?: TvProduct[]; error?: string };
    const list = (data.products ?? []).filter((p) => p && p.tvSpecs && p.productUrl && typeof p.price === "number");
    if (list.length === 0) throw new Error(data.error ?? "empty");
    state.products = list;
    state.load = "ready";
  } catch {
    state.products = [];
    state.load = "error";
  }
  renderAll();
}

function renderAll(): void {
  const loading = document.querySelector<HTMLElement>("[data-tv-loading]");
  if (loading) loading.hidden = state.load !== "loading";
  renderWizard();
  renderFilters();
  renderResults();
  renderTray();
}

export function initTvConcierge(): void {
  const root = document.querySelector<HTMLElement>("[data-tv-root]");
  if (!root) return;
  document.querySelectorAll<HTMLElement>("[data-tv-open]").forEach((el) => {
    el.addEventListener("click", (e) => {
      const target = el.dataset.tvOpen === "search" ? "#tv-search" : "#tv-diagnosis";
      const node = document.querySelector<HTMLElement>(target);
      if (!node) return;
      e.preventDefault();
      node.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  const sortSel = document.querySelector<HTMLSelectElement>("[data-tv-sort]");
  sortSel?.addEventListener("change", () => {
    state.sort = sortSel.value as SearchSort;
    state.shown = SEARCH_PAGE;
    renderResults();
  });
  void loadProducts();
}
