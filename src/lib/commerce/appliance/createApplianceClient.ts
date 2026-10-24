// 「条件で絞り込むYahoo!商品ページ」のクライアント側ロジック(発電機の generatorClient.ts を汎用化、炊飯器へ展開)。
// STEP選択・おすすめ商品・誘導元の帯・商品カード拡張が共有する「選択状態」と、ProductGrid.astroの
// 拡張ポイント(variant=slug)へ登録する処理をまとめている。カテゴリー固有の値は ApplianceProfile から受け取る。
// 純関数(inRange/filterBySelection/deliveryText等)はDOMに依存させずテストできるようにし、
// window/documentを使うのは登録・イベント発火の関数だけにしている。
import { prefectures } from "../prefectures";
import { amazonJanUrl } from "../amazonLink";
import type { ApplianceProfile, BrandOption, ProfileSpecs, Range, Selection } from "./types";

/** 商品カード等の配送欄に出す案内。配送日・在庫は商品ページで確認してもらう */
export const DELIVERY_NOTICE = "配送日・在庫は商品ページでご確認ください";

export function inRange(value: number | null, range: Range | null): boolean {
  if (range === null) return true;
  if (value === null) return false;
  return value >= range.min && (range.max === null || value <= range.max);
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

export function matchesBrand(product: { name: string; brand?: string | null }, brand: BrandOption | null): boolean {
  if (brand === null) return true;
  const text = `${product.name} ${product.brand ?? ""}`.toLowerCase();
  return brand.words.some((w) => text.includes(w.toLowerCase()));
}

export interface Landing {
  /** 絞り込みに使われたクエリ(use/type/brand/cap/power/budgetのみ、正規化した並び) */
  filters: string;
  utm: Record<string, string>;
}

const FILTER_KEYS = ["use", "type", "brand", "cap", "power", "budget"];
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];

interface GridProduct {
  name: string;
  janCode?: string;
  brand: string | null;
  deliveryDay: number | null;
  storeName?: string;
}

interface TrackableProduct {
  name: string;
  deliveryDay: number | null;
  storeName?: string;
}

export function createApplianceClient(profile: ApplianceProfile) {
  const SLUG = profile.slug;
  const EVENT_CHANGE = "appliance:selection-change";
  const EVENT_RESULT = "appliance:result";
  const none = (): Selection => ({ useCase: null, type: null, capacity: null, power: null, budget: null, brand: null });

  // ---- 用途・種類の規則 -------------------------------------------------------

  /** その用途で選べる種類。nullは制限なし */
  function allowedTypesFor(useCase: string | null): string[] | null {
    return profile.allowedTypes ? profile.allowedTypes(useCase) : null;
  }
  /** 用途により選べる種類が制限されているか(発電機の車中泊: バッテリー式のみ) */
  function isTypeRestricted(useCase: string | null): boolean {
    return allowedTypesFor(useCase) !== null;
  }
  function isTypeBlocked(useCase: string | null, type: string | null): boolean {
    const allowed = allowedTypesFor(useCase);
    return allowed !== null && type !== null && !allowed.includes(type);
  }
  /** 容量を商品名から確認できない種類か(発電機のエンジン式) */
  function isNoCapacityType(type: string | null): boolean {
    return type !== null && (profile.noCapacityTypes ?? []).includes(type);
  }

  // ---- 絞り込み -------------------------------------------------------------

  function matchesUseCase(name: string, useCase: string | null): boolean {
    if (useCase === null) return true;
    const words = profile.useCaseKeywords[useCase];
    return !words || words.some((w) => name.includes(w));
  }

  const specCache = new WeakMap<object, ProfileSpecs & Record<string, unknown>>();
  function specsOf(product: { name: string }): ProfileSpecs & Record<string, unknown> {
    let s = specCache.get(product);
    if (!s) {
      s = profile.extract(product.name) as ProfileSpecs & Record<string, unknown>;
      specCache.set(product, s);
    }
    return s;
  }

  function isFiltering(sel: Selection): boolean {
    return sel.useCase !== null || sel.type !== null || sel.capacity !== null || sel.power !== null || (sel.budget ?? null) !== null || (sel.brand ?? null) !== null;
  }

  /**
   * 選択条件で絞り込む。商品名から該当の値を確認できない商品は推測で分類せず、絞り込み中は
   * 表示しない(unknownとして件数だけ返し、画面に注記する)。
   */
  function filterBySelection<T extends { name: string; price?: number; brand?: string | null }>(products: T[], sel: Selection): { visible: T[]; unknown: number } {
    if (!isFiltering(sel)) return { visible: products, unknown: 0 };
    const visible: T[] = [];
    let unknown = 0;
    const allowed = allowedTypesFor(sel.useCase);
    for (const p of products) {
      if (!matchesUseCase(p.name, sel.useCase)) continue;
      if (!matchesBrand(p, sel.brand ?? null)) continue;
      const s = specsOf(p);
      let ok = true;
      let missing = false;
      if (allowed !== null) {
        // 種類が制限される用途(発電機の車中泊): 許可された種類だけを残し、種類が確認できない商品は推測せず表示しない
        if (s.productType === null) missing = true;
        else if (!allowed.includes(s.productType)) ok = false;
      }
      if (sel.type !== null) {
        if (s.productType === null) missing = true;
        else if (s.productType !== sel.type) ok = false;
      }
      if (sel.capacity !== null) {
        if (s.capacity === null) missing = true;
        else if (!inRange(s.capacity, sel.capacity)) ok = false;
      }
      if (sel.power !== null) {
        if (s.power === null) missing = true;
        else if (!inRange(s.power, sel.power)) ok = false;
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

  /** 用途・種類だけで絞った商品のうち、商品名から容量・出力を確認できたものの最小/最大(0件時の案内用) */
  function availableRanges<T extends { name: string; price?: number; brand?: string | null }>(products: T[], sel: Selection) {
    const base = filterBySelection(products, Object.assign({}, sel, { capacity: null, power: null, budget: null })).visible;
    const prices = base.map((p) => p.price).filter((v): v is number => typeof v === "number" && v > 0);
    const caps = base.map((p) => specsOf(p).capacity).filter((v): v is number => v !== null);
    const pows = base.map((p) => specsOf(p).power).filter((v): v is number => v !== null);
    return {
      capacity: caps.length > 0 ? { min: Math.min(...caps), max: Math.max(...caps) } : null,
      power: pows.length > 0 ? { min: Math.min(...pows), max: Math.max(...pows) } : null,
      price: prices.length > 0 ? { min: Math.min(...prices), max: Math.max(...prices) } : null,
    };
  }

  /** outbound_product_clickに追加するパラメータ(取得できないものはundefined=送信しない) */
  function buildTrackParams(p: TrackableProduct, sel: Selection) {
    const s = specsOf(p);
    return {
      use_case: sel.useCase ?? undefined,
      ...profile.trackSpecParams(s),
      // 2026-10-24: 取得はお届け先に依存せず、配送日(deliveryDay)はお届け先なしの値で、実際の配送日を表さないため、
      // 計測には送らない(常にundefined)。
      delivery_days: undefined,
      shop_name: p.storeName || undefined,
      ...landingTrackParams(),
    };
  }

  function describeSelection(sel: Selection): string[] {
    const parts: string[] = [];
    if (sel.useCase) parts.push(profile.useCases.find((u) => u.id === sel.useCase)?.label ?? sel.useCase);
    if (sel.type) parts.push(profile.typeLabels[sel.type] ?? sel.type);
    if (sel.capacity) parts.push(sel.capacity.label);
    if (sel.power) parts.push(sel.power.label);
    if (sel.budget) parts.push(`予算${sel.budget.label}`);
    if (sel.brand) parts.push(sel.brand.label);
    return parts;
  }

  // ---- 選択状態(ページ内で共有) ---------------------------------------------

  let selection: Selection = none();

  /**
   * URLのクエリから初期の絞り込みを作る(リスティング広告などから、条件を選んだ状態でページを開くため)。
   * 対応: use(用途id)・type(種類id)・brand(brandOptionsのid)・cap/power/budget(帯の番号、0始まり)。
   * 不正な値は無視する。ページのcanonicalはクエリを含まないため、検索エンジンには同一ページとして扱われる。
   */
  function selectionFromParams(params: URLSearchParams): Partial<Selection> {
    const out: Partial<Selection> = {};
    const use = params.get("use");
    if (use && profile.useCases.some((u) => u.id === use)) out.useCase = use;
    const type = params.get("type");
    if (type && Object.prototype.hasOwnProperty.call(profile.typeLabels, type)) out.type = type;
    const brand = profile.brandOptions.find((b) => b.id === params.get("brand"));
    if (brand) out.brand = brand;
    const band = (key: string, bands: Range[]): Range | null => {
      const v = params.get(key);
      return v !== null && /^\d+$/.test(v) ? (bands[Number(v)] ?? null) : null;
    };
    const cap = band("cap", profile.capacityBands);
    if (cap) out.capacity = cap;
    const power = band("power", profile.powerBands);
    if (power) out.power = power;
    const budget = band("budget", profile.budgetBands);
    if (budget) out.budget = budget;
    return out;
  }

  /**
   * 矛盾する条件を整える。
   * - 用途で選べる種類が制限される場合(発電機の車中泊)、制限外の種類は選べない(後から用途を選んだ場合は種類を解除する)
   * - 容量を確認できない種類(エンジン式)は容量と同時に指定できない(両方指定すると必ず0件になる)。
   *   後から指定した方を優先し、矛盾する方を解除する。
   */
  function mergeSelection(prev: Selection, patch: Partial<Selection>): Selection {
    const next = Object.assign({}, prev, patch);
    if (isTypeBlocked(next.useCase, next.type)) next.type = patch.type ? prev.type : null;
    if (isNoCapacityType(next.type) && next.capacity !== null) {
      if (patch.capacity) next.type = null;
      else next.capacity = null;
    }
    return next;
  }

  function getSelection(): Selection {
    return selection;
  }

  // ---- 誘導元(広告・外部リンクなど)の情報 --------------------------------------
  // 条件付きURLで開かれたとき(例: ?brand=zojirushi&use=family)の条件と、utm_*を覚えておき、商品クリック等の計測に添える。
  // 広告の識別子(gclid等)は送らない。utm_*はURLに付いているものだけ。

  /** URLのクエリから誘導元の情報を作る。絞り込みの条件もutm_*も無ければnull */
  function landingFromParams(params: URLSearchParams): Landing | null {
    const valid = selectionFromParams(params);
    const filters = new URLSearchParams();
    for (const k of FILTER_KEYS) {
      const v = params.get(k);
      if (v === null) continue;
      // 実際に有効と解釈された条件だけ残す(不正な値は計測にも含めない)
      const recognized =
        (k === "use" && valid.useCase) || (k === "type" && valid.type) || (k === "brand" && valid.brand) ||
        (k === "cap" && valid.capacity) || (k === "power" && valid.power) || (k === "budget" && valid.budget);
      if (recognized) filters.set(k, v);
    }
    const utm: Record<string, string> = {};
    for (const k of UTM_KEYS) {
      const v = params.get(k);
      if (v) utm[k] = v.slice(0, 100);
    }
    if (filters.toString() === "" && Object.keys(utm).length === 0) return null;
    return { filters: filters.toString(), utm };
  }

  let landing: Landing | null = null;
  function getLanding(): Landing | null {
    return landing;
  }
  function setLanding(l: Landing | null): void {
    landing = l;
  }

  /** 計測に添える誘導元のパラメータ(無ければ空) */
  function landingTrackParams(): Record<string, string> {
    if (!landing) return {};
    const out: Record<string, string> = { ...landing.utm };
    if (landing.filters) out.landing_filters = landing.filters;
    return out;
  }

  // 直近の商品取得に使ったブランドID。ブランドが変わったとき(商品の取り直しが必要なとき)だけ再取得を促す
  let fetchedBrandId: string | null | undefined = undefined;

  function setSelection(patch: Partial<Selection>): void {
    selection = mergeSelection(selection, patch);
    document.dispatchEvent(new CustomEvent(EVENT_CHANGE, { detail: { selection } }));
    // ブランドは取得にも使う(追加候補を集めるため)。取得済みのブランドと違うときだけ取り直す
    const nowBrand = selection.brand?.id ?? null;
    if (fetchedBrandId !== undefined && fetchedBrandId !== nowBrand) {
      document.dispatchEvent(new CustomEvent("commerce:reload", { detail: { slug: SLUG } }));
    } else {
      document.dispatchEvent(new CustomEvent("commerce:rerender", { detail: { slug: SLUG } }));
    }
  }

  /** 取得APIに添えるブランド指定(取得した時点のブランドを記録する) */
  function brandFetchParam(): string | null {
    const id = selection.brand?.id ?? null;
    fetchedBrandId = id;
    return id;
  }

  /** 条件をすべて解除する。URLのクエリも消す(再読み込みで条件が復活しないように) */
  function clearSelection(): void {
    setSelection(none());
    try {
      if (window.location.search) window.history.replaceState(null, "", window.location.pathname + window.location.hash);
    } catch {
      // URLの書き換えができない環境でも、解除自体は有効
    }
  }

  function trackFilterUse(filterName: string, filterValue?: string): void {
    const w = window as unknown as { sokunobankTrackEvent?: (name: string, params: Record<string, unknown>) => void };
    if (!w.sokunobankTrackEvent) return;
    w.sokunobankTrackEvent("filter_use", {
      category: SLUG,
      filter_name: filterName,
      filter_value: filterValue,
      use_case: selection.useCase ?? undefined,
      page_path: window.location.pathname,
      ...landingTrackParams(),
    });
  }

  // ---- ProductGridの拡張ポイントへの登録 -------------------------------------

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
    const specParts = profile.specFacts(specsOf(p)).map(([k, v]) => `${k} ${v}`);

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
    if (sel.useCase) text += profile.text.useCaseFilterNote;
    if (unknown > 0) {
      text += `商品名から該当の値を確認できない${unknown}件は、推測で分類せず表示していません。絞り込みを解除すると表示されます。`;
    }
    note.textContent = text;
    const reset = document.createElement("button");
    reset.type = "button";
    reset.className = "btn btn-secondary gen-filter-reset";
    reset.textContent = "条件をすべて解除";
    reset.addEventListener("click", () => {
      trackFilterUse("reset", "条件をすべて解除");
      clearSelection();
    });
    note.append(" ", reset);
  }

  function registerExtension(): void {
    const w = window as unknown as { sokunobankCardExtensions?: Record<string, unknown> };
    if (!w.sokunobankCardExtensions) w.sokunobankCardExtensions = {};
    let lastUnknown = 0;
    let lastAll: GridProduct[] = [];
    w.sokunobankCardExtensions[SLUG] = {
      decorateCard,
      // 商品取得APIへ添える追加パラメータ(ブランド指定のとき、そのブランドの追加候補を集めてもらう)
      extraParams: () => {
        const id = brandFetchParam();
        return id ? { brand: id } : null;
      },
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
        if (sel.capacity) text += profile.text.emptyCapacity(r.capacity);
        if (sel.power) text += profile.text.emptyPower(r.power);
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
          new CustomEvent(EVENT_RESULT, {
            detail: { shown: info.shown, total: info.total, unknown: lastUnknown, filtering: isFiltering(getSelection()) },
          })
        );
      },
    };
  }

  /** ページを開いた時点のURL(?brand=...等)から、初期の絞り込みと誘導元を反映する(ブラウザのみ) */
  function initFromLocation(): void {
    if (typeof window === "undefined") return;
    const initial = new URLSearchParams(window.location.search);
    selection = mergeSelection(selection, selectionFromParams(initial));
    landing = landingFromParams(initial);
  }

  return {
    slug: SLUG,
    profile,
    EVENT_CHANGE,
    EVENT_RESULT,
    allowedTypesFor,
    isTypeRestricted,
    isTypeBlocked,
    isNoCapacityType,
    matchesUseCase,
    specsOf,
    isFiltering,
    filterBySelection,
    availableRanges,
    buildTrackParams,
    describeSelection,
    selectionFromParams,
    mergeSelection,
    getSelection,
    landingFromParams,
    getLanding,
    setLanding,
    landingTrackParams,
    setSelection,
    brandFetchParam,
    clearSelection,
    trackFilterUse,
    registerExtension,
    initFromLocation,
  };
}

export type ApplianceClient = ReturnType<typeof createApplianceClient>;
