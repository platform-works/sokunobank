// 発電機・ポータブル電源ページのクライアント側ロジック(2026-09-30導入)。
// STEP選択・容量計算ツール・商品カード拡張が共有する「選択状態」と、ProductGrid.astroの
// 拡張ポイント(variant="generator")へ登録する処理をまとめている。
// 純関数(inRange/filterBySelection/deliveryText/buildTrackParams等)はテスト可能なように
// DOMに依存させず、window/documentを使うのは登録・イベント発火の関数だけにしている。
import { extractSpecs, type ExtractedSpecs } from "./extractSpecs";
import { prefectures } from "./prefectures";
import { useCases } from "./generatorContent";

export const SLUG = "generator";
export const AREA_STORAGE_KEY = `sokunobank:commerce:${SLUG}:area`;

export type ProductType = "portable" | "gasoline" | "cassette";

export interface Range {
  min: number;
  /** nullは上限なし */
  max: number | null;
  label: string;
}

export interface Selection {
  useCase: string | null;
  type: ProductType | null;
  capacity: Range | null;
  power: Range | null;
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
  return sel.useCase !== null || sel.type !== null || sel.capacity !== null || sel.power !== null;
}

/**
 * 選択条件で絞り込む。商品名から該当の値を確認できない商品は推測で分類せず、絞り込み中は
 * 表示しない(unknownとして件数だけ返し、画面に注記する)。
 */
export function filterBySelection<T extends { name: string }>(products: T[], sel: Selection): { visible: T[]; unknown: number } {
  if (!isFiltering(sel)) return { visible: products, unknown: 0 };
  const visible: T[] = [];
  let unknown = 0;
  for (const p of products) {
    if (!matchesUseCase(p.name, sel.useCase)) continue;
    const s = specsOf(p);
    let ok = true;
    let missing = false;
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
export function availableRanges<T extends { name: string }>(products: T[], sel: Selection) {
  const base = filterBySelection(products, Object.assign({}, sel, { capacity: null, power: null })).visible;
  const caps = base.map((p) => specsOf(p).capacityWh).filter((v): v is number => v !== null);
  const pows = base.map((p) => specsOf(p).ratedPowerW).filter((v): v is number => v !== null);
  return {
    capacity: caps.length > 0 ? { min: Math.min(...caps), max: Math.max(...caps) } : null,
    power: pows.length > 0 ? { min: Math.min(...pows), max: Math.max(...pows) } : null,
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
    delivery_days: p.deliveryDay ?? undefined,
    shop_name: p.storeName || undefined,
  };
}

export function describeSelection(sel: Selection): string[] {
  const parts: string[] = [];
  if (sel.useCase) parts.push(useCases.find((u) => u.id === sel.useCase)?.label ?? sel.useCase);
  if (sel.type) parts.push(typeLabels[sel.type]);
  if (sel.capacity) parts.push(sel.capacity.label);
  if (sel.power) parts.push(sel.power.label);
  return parts;
}

// ---- 選択状態(ページ内で共有) -------------------------------------------------

let selection: Selection = { useCase: null, type: null, capacity: null, power: null };

export function isEngineType(t: ProductType | null): boolean {
  return t === "gasoline" || t === "cassette";
}

/**
 * エンジン式の発電機には容量(Wh)の表記が無いため、種類と容量は同時に指定できない
 * (両方指定すると必ず0件になる)。後から指定した方を優先し、矛盾する方を解除する。
 */
export function mergeSelection(prev: Selection, patch: Partial<Selection>): Selection {
  const next = Object.assign({}, prev, patch);
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
  brand: string | null;
  deliveryDay: number | null;
  storeName?: string;
}
interface GridContext {
  params?: { area?: string };
}

function decorateCard(p: GridProduct, body: HTMLElement): void {
  const anchor = body.querySelector(".product-name");
  if (!anchor) return;
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
    deliveryText: (p: GridProduct, ctx: GridContext) => deliveryText(p.deliveryDay, ctx.params?.area),
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
      return text + "条件を変えるか、絞り込みを解除してください。";
    },
    afterRender: (info: { root: HTMLElement; shown: number; total: number }) => {
      updateFilterNote(info.root, info.shown, info.total, lastUnknown);
      document.dispatchEvent(
        new CustomEvent("generator:result", {
          detail: { shown: info.shown, total: info.total, unknown: lastUnknown, filtering: isFiltering(getSelection()) },
        })
      );
    },
  };
}
