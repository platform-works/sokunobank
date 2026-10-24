// 発電機・ポータブル電源ページのクライアント側ロジック(2026-09-30導入)。
// STEP選択・容量計算ツール・商品カード拡張が共有する「選択状態」と、ProductGrid.astroの
// 拡張ポイント(variant="generator")へ登録する処理をまとめている。
// 純関数(inRange/filterBySelection/deliveryText/buildTrackParams等)はテスト可能なように
// DOMに依存させず、window/documentを使うのは登録・イベント発火の関数だけにしている。
import { extractSpecs, type ExtractedSpecs } from "./extractSpecs";
import { prefectures } from "./prefectures";
import { useCases } from "./generatorContent";
import { amazonJanUrl } from "./amazonLink";

export const SLUG = "generator";

/** 商品カード等の配送欄に出す案内。配送日・在庫は商品ページで確認してもらう */
export const DELIVERY_NOTICE = "配送日・在庫は商品ページでご確認ください";
export const AREA_STORAGE_KEY = `sokunobank:commerce:${SLUG}:area`;

export type ProductType = "portable" | "gasoline" | "cassette";

export interface Range {
  min: number;
  /** nullは上限なし */
  max: number | null;
  label: string;
}

export interface BrandOption {
  id: string;
  label: string;
  /** 商品名またはブランド名(Yahoo!のbrand.name)に含まれる語(大文字小文字を区別しない) */
  words: string[];
}

export interface Selection {
  useCase: string | null;
  type: ProductType | null;
  capacity: Range | null;
  power: Range | null;
  /** 予算(円)。価格は全商品で取得できるため、判定不能による除外は起きない */
  budget: Range | null;
  /** ブランド。商品名・ブランド名に該当語が含まれる商品だけを残す(該当しない=そのブランドではない、と判定できる) */
  brand: BrandOption | null;
}

// 帯は閉区間(境界の値は両隣の帯に含まれる)。「500Wh以下」「1,000Wh以上」といった
// CTAの表記とそのまま一致させるため。
export const capacityBands: Range[] = [
  { min: 0, max: 500, label: "〜500Wh" },
  { min: 500, max: 1000, label: "500〜1,000Wh" },
  { min: 1000, max: 2000, label: "1,000〜2,000Wh" },
  { min: 2000, max: null, label: "2,000Wh以上" },
];

export const powerBands: Range[] = [
  { min: 0, max: 500, label: "〜500W" },
  { min: 500, max: 1000, label: "500〜1,000W" },
  { min: 1000, max: 1500, label: "1,000〜1,500W" },
  { min: 1500, max: null, label: "1,500W以上" },
];

// 予算の帯(税込の表示価格・円)。2026-10-24に取得済みの150件(最安約2.3万円〜最高約42万円、中央値約11万円)の
// 分布を測り、各帯におおむね同程度(32〜46件)が入るよう区切った。閉区間で、境界の値は両隣の帯に含まれる。
export const budgetBands: Range[] = [
  { min: 0, max: 70000, label: "〜7万円" },
  { min: 70000, max: 120000, label: "7〜12万円" },
  { min: 120000, max: 180000, label: "12〜18万円" },
  { min: 180000, max: null, label: "18万円以上" },
];

// ブランドの絞り込み選択肢(2026-10-24)。取得済み150件でブランド名・商品名に現れた件数の多い順(Jackery34・EENOUR18・
// Kareyou16・BLUETTI15・EcoFlow12・JESIMAIK7・Anker6・ホンダ5・工進5・DJI5)。語はカタカナ表記も含める。
// ヤマハは事業終了のため載せない。ブランドは商品名から確実に判定できるため、判定不能(unknown)は発生しない。
export const brandOptions: BrandOption[] = [
  { id: "jackery", label: "Jackery", words: ["jackery", "ジャクリ"] },
  { id: "eenour", label: "EENOUR", words: ["eenour", "イーノウ"] },
  { id: "kareyou", label: "Kareyou", words: ["kareyou"] },
  { id: "bluetti", label: "BLUETTI", words: ["bluetti", "ブルーティ"] },
  { id: "ecoflow", label: "EcoFlow", words: ["ecoflow", "エコフロー"] },
  { id: "jesimaik", label: "JESIMAIK", words: ["jesimaik"] },
  { id: "anker", label: "Anker", words: ["anker", "アンカー"] },
  { id: "honda", label: "Honda", words: ["honda", "ホンダ"] },
  { id: "koshin", label: "工進", words: ["工進", "koshin"] },
  { id: "dji", label: "DJI", words: ["dji"] },
];

export function matchesBrand(product: { name: string; brand?: string | null }, brand: BrandOption | null): boolean {
  if (brand === null) return true;
  const text = `${product.name} ${product.brand ?? ""}`.toLowerCase();
  return brand.words.some((w) => text.includes(w.toLowerCase()));
}

export const typeLabels: Record<ProductType, string> = {
  portable: "ポータブル電源",
  gasoline: "ガソリン発電機",
  cassette: "カセットガス発電機",
};

// 用途は商品の属性として取得できないため、商品名に用途を示す語が明記されている商品だけを対象にする
// (推測で「防災向け」等に分類しない)。
export const useCaseKeywords: Record<string, string[]> = {
  disaster: ["防災", "災害", "非常用", "停電", "BCP"],
  home: ["家庭用", "家庭", "自宅"],
  work: ["工事", "業務用", "現場", "作業"],
  camp: ["キャンプ", "アウトドア"],
  vehicle: ["車中泊", "車載"],
};

export function matchesUseCase(name: string, useCase: string | null): boolean {
  if (useCase === null) return true;
  const words = useCaseKeywords[useCase];
  return !words || words.some((w) => name.includes(w));
}

export function inRange(value: number | null, range: Range | null): boolean {
  if (range === null) return true;
  if (value === null) return false;
  return value >= range.min && (range.max === null || value <= range.max);
}

const specCache = new WeakMap<object, ExtractedSpecs>();
export function specsOf(product: { name: string }): ExtractedSpecs {
  let s = specCache.get(product);
  if (!s) {
    s = extractSpecs(product.name);
    specCache.set(product, s);
  }
  return s;
}

export function isFiltering(sel: Selection): boolean {
  return sel.useCase !== null || sel.type !== null || sel.capacity !== null || sel.power !== null || (sel.budget ?? null) !== null || (sel.brand ?? null) !== null;
}

/**
 * 選択条件で絞り込む。商品名から該当の値を確認できない商品は推測で分類せず、絞り込み中は
 * 表示しない(unknownとして件数だけ返し、画面に注記する)。
 */
export function filterBySelection<T extends { name: string; price?: number; brand?: string | null }>(products: T[], sel: Selection): { visible: T[]; unknown: number } {
  if (!isFiltering(sel)) return { visible: products, unknown: 0 };
  const visible: T[] = [];
  let unknown = 0;
  for (const p of products) {
    if (!matchesUseCase(p.name, sel.useCase)) continue;
    if (!matchesBrand(p, sel.brand ?? null)) continue;
    const s = specsOf(p);
    let ok = true;
    let missing = false;
    if (isEngineBlocked(sel.useCase)) {
      // 車内で使う想定の用途: バッテリー式だけを残す。エンジン式は除外し、種類が確認できない商品は推測せず表示しない
      if (s.productType === null) missing = true;
      else if (s.productType !== "portable") ok = false;
    }
    if (sel.type !== null) {
      if (s.productType === null) missing = true;
      else if (s.productType !== sel.type) ok = false;
    }
    if (sel.capacity !== null) {
      if (s.capacityWh === null) missing = true;
      else if (!inRange(s.capacityWh, sel.capacity)) ok = false;
    }
    if (sel.power !== null) {
      if (s.ratedPowerW === null) missing = true;
      else if (!inRange(s.ratedPowerW, sel.power)) ok = false;
    }
    if (sel.budget) {
      // 価格は全商品で取得できる。万一取れない商品は、予算に合うと推測せず除外する
      if (typeof p.price !== "number" || !inRange(p.price, sel.budget)) ok = false;
    }
    if (!ok) continue;
    if (missing) {
      unknown++;
      continue;
    }
    visible.push(p);
  }
  return { visible, unknown };
}

/** 用途・種類だけで絞った商品のうち、商品名から容量(Wh)・出力(W)を確認できたものの最小/最大(0件時の案内用) */
export function availableRanges<T extends { name: string; price?: number; brand?: string | null }>(products: T[], sel: Selection) {
  const base = filterBySelection(products, Object.assign({}, sel, { capacity: null, power: null, budget: null })).visible;
  const prices = base.map((p) => p.price).filter((v): v is number => typeof v === "number" && v > 0);
  const caps = base.map((p) => specsOf(p).capacityWh).filter((v): v is number => v !== null);
  const pows = base.map((p) => specsOf(p).ratedPowerW).filter((v): v is number => v !== null);
  return {
    capacity: caps.length > 0 ? { min: Math.min(...caps), max: Math.max(...caps) } : null,
    power: pows.length > 0 ? { min: Math.min(...pows), max: Math.max(...pows) } : null,
    price: prices.length > 0 ? { min: Math.min(...prices), max: Math.max(...prices) } : null,
  };
}

export function prefectureName(code: string | undefined | null): string | null {
  if (!code) return null;
  const hit = prefectures.find((p) => p.code === code);
  return hit ? hit.name : null;
}

/**
 * 「東京都宛て:明日お届け対象」形式の配送表示。Yahoo!ショッピングAPIが判定した日数(1=明日、
 * 2=翌々日)と、その判定に使ったお届け先が分かる場合だけ返す。分からない場合はnull(呼び出し側は
 * 既存の「配送日は商品ページでご確認ください」を使う)。架空の日付は作らない。
 */
export function deliveryText(day: number | null, areaCode: string | undefined | null): string | null {
  const pref = prefectureName(areaCode);
  if (!pref) return null;
  if (day === 1) return `${pref}宛て:明日お届け対象`;
  if (day === 2) return `${pref}宛て:翌々日お届け対象`;
  return null;
}

interface TrackableProduct {
  name: string;
  deliveryDay: number | null;
  storeName?: string;
}

/** outbound_product_clickに追加するパラメータ(取得できないものはundefined=送信しない) */
export function buildTrackParams(p: TrackableProduct, sel: Selection) {
  const s = specsOf(p);
  return {
    use_case: sel.useCase ?? undefined,
    capacity_wh: s.capacityWh ?? undefined,
    power_w: s.ratedPowerW ?? undefined,
    // 2026-10-24: 取得はお届け先に依存せず、配送日(deliveryDay)はお届け先なしの値で、実際の配送日を表さないため、
    // 計測には送らない(常にundefined)。
    delivery_days: undefined,
    shop_name: p.storeName || undefined,
  };
}

export function describeSelection(sel: Selection): string[] {
  const parts: string[] = [];
  if (sel.useCase) parts.push(useCases.find((u) => u.id === sel.useCase)?.label ?? sel.useCase);
  if (sel.type) parts.push(typeLabels[sel.type]);
  if (sel.capacity) parts.push(sel.capacity.label);
  if (sel.power) parts.push(sel.power.label);
  if (sel.budget) parts.push(`予算${sel.budget.label}`);
  if (sel.brand) parts.push(sel.brand.label);
  return parts;
}

// ---- 選択状態(ページ内で共有) -------------------------------------------------

let selection: Selection = { useCase: null, type: null, capacity: null, power: null, budget: null, brand: null };

/**
 * URLのクエリから初期の絞り込みを作る(リスティング広告などから、条件を選んだ状態でページを開くため)。
 * 対応: use(用途id)・type(portable/gasoline/cassette)・brand(brandOptionsのid)・cap/power/budget(帯の番号、0始まり)。
 * 不正な値は無視する。ページのcanonicalはクエリを含まないため、検索エンジンには同一ページとして扱われる。
 */
export function selectionFromParams(params: URLSearchParams): Partial<Selection> {
  const out: Partial<Selection> = {};
  const use = params.get("use");
  if (use && useCases.some((u) => u.id === use)) out.useCase = use;
  const type = params.get("type");
  if (type && Object.prototype.hasOwnProperty.call(typeLabels, type)) out.type = type as ProductType;
  const brand = brandOptions.find((b) => b.id === params.get("brand"));
  if (brand) out.brand = brand;
  const band = (key: string, bands: Range[]): Range | null => {
    const v = params.get(key);
    return v !== null && /^\d+$/.test(v) ? (bands[Number(v)] ?? null) : null;
  };
  const cap = band("cap", capacityBands);
  if (cap) out.capacity = cap;
  const power = band("power", powerBands);
  if (power) out.power = power;
  const budget = band("budget", budgetBands);
  if (budget) out.budget = budget;
  return out;
}

export function isEngineType(t: ProductType | null): boolean {
  return t === "gasoline" || t === "cassette";
}

/**
 * 車内(車中泊)で使う用途では、エンジン式発電機(ガソリン・カセットガス)を選べない。自動車内やテント内での
 * エンジン式発電機の使用は、屋内と同等以上の危険があるとされている(NITE・消費者庁)ため、
 * 種類の選択も、商品の絞り込み(エンジン式・種類が確認できない商品を除外)も、バッテリー式に限定する。
 */
export function isEngineBlocked(useCase: string | null): boolean {
  return useCase === "vehicle";
}

/**
 * エンジン式の発電機には容量(Wh)の表記が無いため、種類と容量は同時に指定できない
 * (両方指定すると必ず0件になる)。後から指定した方を優先し、矛盾する方を解除する。
 */
export function mergeSelection(prev: Selection, patch: Partial<Selection>): Selection {
  const next = Object.assign({}, prev, patch);
  // 車中泊では、エンジン式の選択を受け付けない(後から車中泊を選んだ場合は種類を解除する)
  if (isEngineBlocked(next.useCase) && isEngineType(next.type)) next.type = patch.type ? prev.type : null;
  if (isEngineType(next.type) && next.capacity !== null) {
    if (patch.capacity) next.type = null;
    else next.capacity = null;
  }
  return next;
}

export function getSelection(): Selection {
  return selection;
}

export function setSelection(patch: Partial<Selection>): void {
  selection = mergeSelection(selection, patch);
  document.dispatchEvent(new CustomEvent("generator:selection-change", { detail: { selection } }));
  document.dispatchEvent(new CustomEvent("commerce:rerender", { detail: { slug: SLUG } }));
}

export function trackFilterUse(filterName: string, filterValue?: string): void {
  const w = window as unknown as { sokunobankTrackEvent?: (name: string, params: Record<string, unknown>) => void };
  if (!w.sokunobankTrackEvent) return;
  w.sokunobankTrackEvent("filter_use", {
    category: SLUG,
    filter_name: filterName,
    filter_value: filterValue,
    use_case: selection.useCase ?? undefined,
    page_path: window.location.pathname,
  });
}

// ---- ProductGridの拡張ポイントへの登録 -----------------------------------------

interface GridProduct {
  name: string;
  janCode?: string;
  brand: string | null;
  deliveryDay: number | null;
  storeName?: string;
}
interface GridContext {
  params?: { area?: string };
}

/**
 * Yahoo!ボタンの下に置く「AmazonでJAN検索」ボタン(JANがある商品のみ)。decorateCardの時点ではCTAがまだ
 * 無いため、ここでは目印(.gen-amazon)付きで追加し、afterRenderでカード末尾(CTAの後)へ移す。
 * 表記は「JAN検索」とし、同じ商品の出品は保証しない(Amazonの価格・評価・在庫は表示しない)。
 */
function createAmazonJanSlot(p: GridProduct): HTMLElement | null {
  const url = amazonJanUrl(p.janCode);
  if (!url) return null;
  const wrap = document.createElement("div");
  wrap.className = "gen-amazon";
  const a = document.createElement("a");
  a.className = "btn btn-secondary gen-amazon-btn";
  a.href = url;
  a.target = "_blank";
  a.rel = "sponsored noopener";
  a.textContent = "AmazonでJAN検索 →";
  a.addEventListener("click", () => {
    const w = window as unknown as {
      sokunobankDebounceClick?: (el: Element, fn: () => void) => void;
      sokunobankTrackEvent?: (name: string, params: Record<string, unknown>) => void;
    };
    if (!w.sokunobankDebounceClick) return;
    w.sokunobankDebounceClick(a, () => {
      w.sokunobankTrackEvent?.("generator_usage_outbound", {
        category: SLUG,
        value: "amazon_jan",
        link_type: "amazon_jan",
        link_url: a.href,
        link_text: "AmazonでJAN検索",
        page_path: window.location.pathname,
      });
    });
  });
  const note = document.createElement("p");
  note.className = "gen-amazon-note";
  note.textContent = "PR・同じ商品の出品は保証されません";
  wrap.append(a, note);
  return wrap;
}

function decorateCard(p: GridProduct, body: HTMLElement): void {
  const anchor = body.querySelector(".product-name");
  if (!anchor) return;
  const amazon = createAmazonJanSlot(p);
  if (amazon) body.appendChild(amazon);
  const s = specsOf(p);
  const specParts: string[] = [];
  if (s.capacityWh !== null) specParts.push(`容量 ${s.capacityWh.toLocaleString("en-US")}Wh`);
  if (s.outputLabel !== null) specParts.push(`定格出力 ${s.outputLabel}`);

  let ref: Element = anchor;
  if (p.brand) {
    const brand = document.createElement("p");
    brand.className = "gen-card-brand";
    brand.textContent = p.brand;
    ref.insertAdjacentElement("afterend", brand);
    ref = brand;
  }
  if (specParts.length > 0) {
    const spec = document.createElement("p");
    spec.className = "gen-card-spec";
    spec.textContent = specParts.join(" / ");
    ref.insertAdjacentElement("afterend", spec);
  }
}

function updateFilterNote(root: HTMLElement, shown: number, total: number, unknown: number): void {
  const anchor = root.querySelector('[data-role="list"]');
  let note = root.querySelector(".gen-filter-note") as HTMLElement | null;
  const sel = getSelection();
  if (!isFiltering(sel)) {
    if (note) note.remove();
    return;
  }
  if (!note) {
    note = document.createElement("p");
    note.className = "gen-filter-note";
    note.setAttribute("role", "status");
    if (anchor) anchor.insertAdjacentElement("beforebegin", note);
    else root.prepend(note);
  }
  const cond = describeSelection(sel).join("・");
  let text = `絞り込み中(${cond}):取得済みの${total}件のうち${shown}件を表示しています。`;
  if (sel.useCase) text += "用途は、商品名に「防災」「車中泊」などの表記がある商品で絞り込んでいます。";
  if (unknown > 0) {
    text += `商品名から該当の値を確認できない${unknown}件は、推測で分類せず表示していません。絞り込みを解除すると表示されます。`;
  }
  note.textContent = text;
}

export function registerGeneratorExtension(): void {
  const w = window as unknown as { sokunobankCardExtensions?: Record<string, unknown> };
  if (!w.sokunobankCardExtensions) w.sokunobankCardExtensions = {};
  let lastUnknown = 0;
  let lastAll: GridProduct[] = [];
  w.sokunobankCardExtensions[SLUG] = {
    decorateCard,
    // 2026-10-24: お届け先ごとの配送日は取得しない(取得はお届け先に依存しない)ため、固定の案内にする
    deliveryText: () => DELIVERY_NOTICE,
    trackParams: (p: GridProduct) => buildTrackParams(p, getSelection()),
    filterProducts: (products: GridProduct[]) => {
      lastAll = products;
      const r = filterBySelection(products, getSelection());
      lastUnknown = r.unknown;
      return r.visible;
    },
    emptyMessage: () => {
      const sel = getSelection();
      if (!isFiltering(sel)) return null;
      let text = `選択した条件(${describeSelection(sel).join("・")})に該当する商品が、取得済みの商品の中にありませんでした。`;
      const r = availableRanges(lastAll, sel);
      const fmt = (n: number) => n.toLocaleString("en-US");
      if (sel.capacity) {
        text += r.capacity ? `この条件で容量を確認できた商品は${fmt(r.capacity.min)}〜${fmt(r.capacity.max)}Whです。` : "この条件では、商品名から容量を確認できた商品がありません。";
      }
      if (sel.power) {
        text += r.power ? `この条件で出力(W)を確認できた商品は${fmt(r.power.min)}〜${fmt(r.power.max)}Wです。` : "この条件では、商品名から出力(W)を確認できた商品がありません(kVA表記のみの商品はW換算しません)。";
      }
      if (sel.budget) {
        text += r.price ? `この条件で価格を確認できた商品は${fmt(r.price.min)}〜${fmt(r.price.max)}円です。` : "";
      }
      return text + "条件を変えるか、絞り込みを解除してください。";
    },
    afterRender: (info: { root: HTMLElement; shown: number; total: number }) => {
      // Amazonボタンをカード末尾(Yahoo!ボタンの下)へ移す。既に末尾なら何も起きない
      info.root.querySelectorAll<HTMLElement>(".product-body > .gen-amazon").forEach((el) => el.parentElement?.appendChild(el));
      updateFilterNote(info.root, info.shown, info.total, lastUnknown);
      document.dispatchEvent(
        new CustomEvent("generator:result", {
          detail: { shown: info.shown, total: info.total, unknown: lastUnknown, filtering: isFiltering(getSelection()) },
        })
      );
    },
  };
}
