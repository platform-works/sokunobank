// テレビ診断・詳細検索・比較の判定ロジック(2026-10-25)。画面に依存しない純関数だけを置き、tests/tvRecommend.test.ts で検証する。
// 方針:
//  - 必須条件(予算・サイズ・選んだ機能)を満たす商品だけを候補にする。仕様が「未確認」の商品は、その仕様を必須にした場合は候補にしない。
//  - 必須条件を、利用者の承諾なしに緩めない。0件のときは緩和の選択肢を件数つきで示し、選ぶのは利用者。
//  - スコアは候補の中での並べ替えにだけ使う(予算30・サイズ25・機能20・ブランド等15・画質/用途10)。
//  - 商品に無い仕様を補わない。理由・注意はすべて、読み取れた仕様か価格・評価から作る。

import type { TvSpecs } from "./extractTvSpecs";

export interface TvProduct {
  code: string;
  name: string;
  image: string;
  brand: string | null;
  price: number;
  reviewRate: number;
  reviewCount: number;
  storeName: string;
  storeIsBestSeller: boolean;
  productUrl: string;
  janCode?: string;
  tvSpecs: TvSpecs;
}

export type UseId = "broadcast" | "streaming" | "movie-sports" | "game" | "all";
export type BudgetId = "u30" | "30-50" | "50-100" | "100-150" | "o150";
export type SizeId = "s24-32" | "s40-43" | "s50-55" | "s65" | "unknown";
export type BrandPref = "domestic" | "cospa" | "any";
export type FeatureId = "terrestrial" | "bs4k" | "recording" | "streaming" | "gaming";

export interface Answers {
  use: UseId;
  budget: BudgetId;
  size: SizeId;
  brand: BrandPref;
  features: FeatureId[];
}

export interface Band {
  label: string;
  min: number;
  /** nullは上限なし */
  max: number | null;
}

export const BUDGETS: Record<BudgetId, Band> = {
  u30: { label: "3万円以下", min: 0, max: 30000 },
  "30-50": { label: "3万〜5万円", min: 30000, max: 50000 },
  "50-100": { label: "5万〜10万円", min: 50000, max: 100000 },
  "100-150": { label: "10万〜15万円", min: 100000, max: 150000 },
  o150: { label: "15万円以上", min: 150000, max: null },
};
export const BUDGET_ORDER: BudgetId[] = ["u30", "30-50", "50-100", "100-150", "o150"];

// サイズの帯。24〜32のように間が空く画面サイズ(33〜39型など)は実在しにくいため、近いサイズを帯に含める。
export const SIZES: Record<Exclude<SizeId, "unknown">, Band> = {
  "s24-32": { label: "24〜32V型", min: 10, max: 39 },
  "s40-43": { label: "40〜43V型", min: 40, max: 49 },
  "s50-55": { label: "50〜55V型", min: 50, max: 60 },
  s65: { label: "65V型以上", min: 61, max: null },
};

export const USES: Record<UseId, string> = {
  broadcast: "地上波・BS放送",
  streaming: "YouTube・Netflixなどの動画配信",
  "movie-sports": "映画・スポーツ",
  game: "ゲーム",
  all: "幅広く利用",
};

export const FEATURES: Record<FeatureId, string> = {
  terrestrial: "地上波テレビ放送",
  bs4k: "BS・CS4K放送",
  recording: "録画",
  streaming: "YouTube・動画配信",
  gaming: "ゲーム向け機能",
};

export const BRAND_PREFS: Record<BrandPref, string> = {
  domestic: "国内ブランド優先",
  cospa: "コストパフォーマンス優先",
  any: "ブランド指定なし",
};

/** 「国内ブランド優先」で優先するメーカー(日本の企業名で展開されているブランド) */
export const DOMESTIC_MAKERS = ["REGZA(レグザ)", "ソニー", "パナソニック", "シャープ", "三菱電機", "JVC", "FUNAI(フナイ)"];
/** 「コストパフォーマンス優先」で優先するメーカー(価格を抑えたモデルを多く展開するブランド) */
export const VALUE_MAKERS = ["ハイセンス", "TCL", "MAXZEN(マクスゼン)", "アイリスオーヤマ", "山善", "Xiaomi", "CHiQ", "TEES", "ドウシシャ", "オリオン"];

export const inBand = (v: number, b: Band): boolean => v >= b.min && (b.max === null || v <= b.max);

/** 推薦の対象にしない状態(中古・訳あり・展示品、配送エリア限定、予約) */
export function hasBlockingFlag(p: TvProduct): boolean {
  return p.tvSpecs.flags.length > 0;
}

export type FeatureCheck = (s: TvSpecs) => boolean;
/** 機能を「確認できた」とみなす条件。未確認(null)は満たさない */
export const FEATURE_CHECKS: Record<FeatureId, FeatureCheck> = {
  terrestrial: (s) => s.terrestrial === true,
  bs4k: (s) => s.bs4k === true,
  recording: (s) => s.recording !== null && s.recording !== false,
  streaming: (s) => s.streaming === true,
  gaming: (s) => s.gaming === true,
};

export interface Constraint {
  kind: "budget" | "size" | "feature" | "tuner";
  id: string;
  label: string;
}

/** 診断で適用した必須条件の一覧(結果画面にそのまま表示する) */
export function requiredConditions(a: Answers): Constraint[] {
  const list: Constraint[] = [{ kind: "budget", id: a.budget, label: `予算 ${BUDGETS[a.budget].label}` }];
  if (a.size !== "unknown") list.push({ kind: "size", id: a.size, label: `サイズ ${SIZES[a.size].label}(商品名にサイズの記載があるもの)` });
  for (const f of a.features) list.push({ kind: "feature", id: f, label: `${FEATURES[f]}(記載で確認できるもの)` });
  const needsTuner = a.use === "broadcast" || a.use === "all" || a.features.some((f) => f === "terrestrial" || f === "bs4k" || f === "recording");
  if (needsTuner) list.push({ kind: "tuner", id: "tuner", label: "チューナーレスでない(放送を受信できる)" });
  return list;
}

export function isEligible(p: TvProduct, a: Answers, skip?: { budget?: boolean; size?: boolean; feature?: FeatureId; tuner?: boolean }): boolean {
  if (hasBlockingFlag(p)) return false;
  const s = p.tvSpecs;
  if (!skip?.budget && !inBand(p.price, BUDGETS[a.budget])) return false;
  if (!skip?.size && a.size !== "unknown") {
    if (s.sizeV === null || !inBand(s.sizeV, SIZES[a.size])) return false;
  }
  for (const f of a.features) {
    if (skip?.feature === f) continue;
    if (!FEATURE_CHECKS[f](s)) return false;
  }
  const needsTuner = a.use === "broadcast" || a.use === "all" || a.features.some((f) => f === "terrestrial" || f === "bs4k" || f === "recording");
  if (!skip?.tuner && needsTuner && s.tunerless) return false;
  return true;
}

/** 同じ商品を複数の販売店が出していることがあるため、型番(なければ商品名)とサイズで同一商品とみなし、最も安いものを残す */
export function dedupeProducts(list: TvProduct[]): TvProduct[] {
  const best = new Map<string, TvProduct>();
  for (const p of list) {
    const key = `${p.tvSpecs.model ?? p.name.replace(/\s+/g, "")}|${p.tvSpecs.sizeV ?? ""}`;
    const cur = best.get(key);
    if (!cur || p.price < cur.price) best.set(key, p);
  }
  const keep = new Set([...best.values()].map((p) => p.code));
  return list.filter((p) => keep.has(p.code));
}

export interface ScoreBreakdown {
  budget: number;
  size: number;
  features: number;
  brand: number;
  quality: number;
  total: number;
}

const PREMIUM_PANELS = new Set(["有機EL", "Mini LED", "量子ドット"]);

export function qualityIndex(s: TvSpecs): number {
  let q = s.resolution === "4K" ? 4 : s.resolution === "フルHD" ? 2 : s.resolution === "HD" ? 1 : 0;
  if (s.panel && PREMIUM_PANELS.has(s.panel)) q += 3;
  if (s.bs4k) q += 1;
  if (s.recording) q += 1;
  if (s.streaming) q += 1;
  if (s.gaming) q += 1;
  return q;
}

export function scoreProduct(p: TvProduct, a: Answers): ScoreBreakdown {
  const s = p.tvSpecs;
  const band = BUDGETS[a.budget];
  // 予算30: 帯に収まっていれば満点に近く、帯の中では安いほどわずかに高い(上限なしの帯は満点)
  const pos = band.max === null ? 0 : Math.min(1, Math.max(0, (p.price - band.min) / (band.max - band.min)));
  const budget = 30 * (0.75 + 0.25 * (1 - pos));
  // サイズ25: 指定があり条件を満たせば満点。「サイズが分からない」は中立
  const size = a.size === "unknown" ? 15 : 25;
  // 機能20: 選んだ機能は必須で満たしているため基礎点14(選んでいなければ8)、選んでいない機能のうち確認できたものを加点(最大6)
  const extras = (["terrestrial", "bs4k", "recording", "streaming"] as FeatureId[]).filter((f) => !a.features.includes(f) && FEATURE_CHECKS[f](s)).length;
  const features = (a.features.length > 0 ? 14 : 8) + Math.min(6, extras * 1.5);
  // ブランド等15: ブランド希望7 + 保証の記載2 + 売れ筋ストア2 + レビュー4
  let brand = 0;
  if (a.brand === "any") brand += 4;
  else if (a.brand === "domestic" && s.maker && DOMESTIC_MAKERS.includes(s.maker)) brand += 7;
  else if (a.brand === "cospa" && s.maker && VALUE_MAKERS.includes(s.maker)) brand += 7;
  if (s.warranty) brand += 2;
  if (p.storeIsBestSeller) brand += 2;
  if (p.reviewCount >= 10 && p.reviewRate >= 3.5) brand += Math.min(4, (p.reviewRate - 3.5) * (4 / 1.5));
  // 画質・用途10
  let quality = s.resolution === "4K" ? 4 : s.resolution === "フルHD" ? 2 : s.resolution === "HD" ? 1 : 0;
  if (s.panel && PREMIUM_PANELS.has(s.panel)) quality += 2;
  if (a.use === "movie-sports") quality += (s.resolution === "4K" ? 2 : 0) + (s.bs4k ? 2 : 0);
  else if (a.use === "game") quality += s.gaming ? 4 : 0;
  else if (a.use === "streaming") quality += s.streaming ? 4 : 0;
  else if (a.use === "broadcast") quality += (s.terrestrial ? 2 : 0) + (s.bsCs || s.bs4k ? 2 : 0);
  else quality += 2;
  quality = Math.min(10, quality);
  const total = budget + size + features + brand + quality;
  return { budget, size, features, brand, quality, total };
}

export type PickType = "value" | "balanced" | "premium";
export const PICK_LABELS: Record<PickType, string> = { value: "価格重視", balanced: "バランス重視", premium: "画質・機能重視" };

export interface Pick {
  type: PickType;
  product: TvProduct;
  score: ScoreBreakdown;
  reasons: string[];
  cautions: string[];
}

export interface RecommendResult {
  conditions: Constraint[];
  /** 必須条件を満たした商品の数(重複除去後) */
  eligibleCount: number;
  picks: Pick[];
  /** 0件のとき、利用者が選べる緩和の選択肢 */
  relaxations: Relaxation[];
}

export interface Relaxation {
  id: string;
  label: string;
  count: number;
  /** 適用後の回答 */
  answers: Answers;
}

const yen = (n: number): string => `${n.toLocaleString("ja-JP")}円`;

export function buildReasons(p: TvProduct, a: Answers, type: PickType): string[] {
  const s = p.tvSpecs;
  const r: string[] = [];
  r.push(`価格 ${yen(p.price)} は、選んだ予算(${BUDGETS[a.budget].label})に収まっています。`);
  if (s.sizeV !== null) r.push(a.size === "unknown" ? `商品名に${s.sizeV}V型と記載があります。` : `商品名に${s.sizeV}V型と記載があり、選んだサイズ(${SIZES[a.size].label})に合います。`);
  for (const f of a.features) r.push(`${FEATURES[f]}の記載を確認できました。`);
  if (s.resolution === "4K") r.push("4K画面の記載があります。");
  if (s.panel && PREMIUM_PANELS.has(s.panel)) r.push(`${s.panel}パネルの記載があります。`);
  if (a.brand === "domestic" && s.maker && DOMESTIC_MAKERS.includes(s.maker)) r.push(`${s.maker}は、希望された国内ブランドです。`);
  if (a.brand === "cospa" && s.maker && VALUE_MAKERS.includes(s.maker)) r.push(`${s.maker}は、価格を抑えたモデルを多く展開するブランドです。`);
  if (p.reviewCount >= 10) r.push(`Yahoo!ショッピングのレビューは${p.reviewRate.toFixed(1)}点(${p.reviewCount}件)です。`);
  if (type === "value") r.push("条件を満たす商品の中で、価格が抑えられている商品です。");
  if (type === "premium") r.push("条件を満たす商品の中で、画質・機能の記載が多い商品です。");
  return r.filter((x) => x.trim() !== "").slice(0, 6);
}

export function buildCautions(p: TvProduct, a: Answers): string[] {
  const s = p.tvSpecs;
  const c: string[] = [];
  if (s.resolution === null) c.push("画面の解像度(4K・フルHD等)は、商品名・説明から確認できませんでした(未確認)。");
  if (s.terrestrial === null) c.push("地上デジタル放送の受信は、記載から確認できませんでした(未確認)。");
  if (s.bs4k === null) c.push("BS・CS4K放送の受信は、記載から確認できませんでした(未確認)。");
  if (s.recording === null) c.push("録画機能は、記載から確認できませんでした(未確認)。");
  else if (s.recording === "external") c.push("録画には外付けHDD(別売)が必要です。対応機種・容量は商品ページで確認してください。");
  if (s.streaming === null) c.push("動画配信への対応は、記載から確認できませんでした(未確認)。");
  if (s.bs4k) c.push("4K放送を見るには、アンテナ・配線も4K放送に対応している必要があります。");
  if (s.sizeV !== null && s.sizeV >= 50) c.push("大型のため、搬入経路と設置場所の寸法を購入前に確認してください。");
  if (s.installation) c.push(`商品名に「${s.installation}」の記載があります。対象地域・条件は商品ページで確認してください。`);
  else c.push("設置サービスの有無・料金は商品ページで確認してください。");
  c.push("保証内容・配送日・在庫は商品ページで確認してください(このページでは確認できません)。");
  if (a.use === "game" && !s.gaming) c.push("ゲーム向け機能(ゲームモード等)の記載は確認できませんでした。");
  return c;
}

export function recommend(all: TvProduct[], a: Answers): RecommendResult {
  const conditions = requiredConditions(a);
  const eligible = dedupeProducts(all.filter((p) => isEligible(p, a)));
  const scored = eligible.map((p) => ({ p, score: scoreProduct(p, a) })).sort((x, y) => y.score.total - x.score.total || y.p.reviewCount - x.p.reviewCount);
  const used = new Set<string>();
  const picks: Pick[] = [];
  const take = (type: PickType, ordered: typeof scored): void => {
    const hit = ordered.find((x) => !used.has(x.p.code));
    if (!hit) return;
    used.add(hit.p.code);
    picks.push({ type, product: hit.p, score: hit.score, reasons: buildReasons(hit.p, a, type), cautions: buildCautions(hit.p, a) });
  };
  if (scored.length > 0) {
    const top = scored[0].score.total;
    // 価格重視: 総合点が最高点の80%以上の商品のうち、最も安いもの(極端に条件の弱い安価品を避ける)
    take("value", scored.filter((x) => x.score.total >= top * 0.8).sort((x, y) => x.p.price - y.p.price));
    // バランス: 価格重視で選んだ商品を除き、総合点が最も高い商品
    take("balanced", scored);
    // 画質・機能重視: 画質・機能の記載が最も多いもの(同点は総合点)
    take("premium", [...scored].sort((x, y) => qualityIndex(y.p.tvSpecs) - qualityIndex(x.p.tvSpecs) || y.score.total - x.score.total));
  }
  // 並びは「価格重視 → バランス → 画質・機能」の順に統一する
  const order: PickType[] = ["value", "balanced", "premium"];
  picks.sort((x, y) => order.indexOf(x.type) - order.indexOf(y.type));
  return { conditions, eligibleCount: eligible.length, picks, relaxations: picks.length === 0 ? relaxations(all, a) : [] };
}

/** 0件のとき、条件を1つ緩めたら何件になるかを示す。適用は利用者の操作(自動では緩めない) */
export function relaxations(all: TvProduct[], a: Answers): Relaxation[] {
  const out: Relaxation[] = [];
  const count = (next: Answers, skip?: Parameters<typeof isEligible>[2]): number => dedupeProducts(all.filter((p) => isEligible(p, next, skip))).length;
  const bi = BUDGET_ORDER.indexOf(a.budget);
  if (bi < BUDGET_ORDER.length - 1) {
    const up = BUDGET_ORDER[bi + 1];
    const next = { ...a, budget: up };
    const n = count(next);
    if (n > 0) out.push({ id: "budget-up", label: `予算を「${BUDGETS[up].label}」に上げる`, count: n, answers: next });
  }
  if (bi > 0) {
    const down = BUDGET_ORDER[bi - 1];
    const next = { ...a, budget: down };
    const n = count(next);
    if (n > 0) out.push({ id: "budget-down", label: `予算を「${BUDGETS[down].label}」に下げる`, count: n, answers: next });
  }
  if (a.size !== "unknown") {
    const next: Answers = { ...a, size: "unknown" };
    const n = count(next);
    if (n > 0) out.push({ id: "size-any", label: "サイズの指定をなくす", count: n, answers: next });
  }
  for (const f of a.features) {
    const next: Answers = { ...a, features: a.features.filter((x) => x !== f) };
    const n = count(next);
    if (n > 0) out.push({ id: `feature-${f}`, label: `「${FEATURES[f]}」の条件を外す`, count: n, answers: next });
  }
  return out.sort((x, y) => y.count - x.count);
}

// ---- 詳細検索 ----

export interface SearchCriteria {
  sizes: Exclude<SizeId, "unknown">[];
  budgets: BudgetId[];
  makers: string[];
  resolution: "4K" | "フルHD" | null;
  terrestrial: boolean;
  bs4k: boolean;
  recording: boolean;
  streaming: boolean;
  gaming: boolean;
}

export const emptyCriteria = (): SearchCriteria => ({
  sizes: [],
  budgets: [],
  makers: [],
  resolution: null,
  terrestrial: false,
  bs4k: false,
  recording: false,
  streaming: false,
  gaming: false,
});

/** 詳細検索: 選んだ条件は「記載で確認できる商品だけ」に絞る。未確認の仕様を条件に当てはめない */
export function filterProducts(all: TvProduct[], c: SearchCriteria): TvProduct[] {
  return all.filter((p) => {
    const s = p.tvSpecs;
    if (c.sizes.length > 0 && !(s.sizeV !== null && c.sizes.some((id) => inBand(s.sizeV as number, SIZES[id])))) return false;
    if (c.budgets.length > 0 && !c.budgets.some((id) => inBand(p.price, BUDGETS[id]))) return false;
    if (c.makers.length > 0 && !(s.maker && c.makers.includes(s.maker))) return false;
    if (c.resolution && s.resolution !== c.resolution) return false;
    if (c.terrestrial && !FEATURE_CHECKS.terrestrial(s)) return false;
    if (c.bs4k && !FEATURE_CHECKS.bs4k(s)) return false;
    if (c.recording && !FEATURE_CHECKS.recording(s)) return false;
    if (c.streaming && !FEATURE_CHECKS.streaming(s)) return false;
    if (c.gaming && !FEATURE_CHECKS.gaming(s)) return false;
    return true;
  });
}

export type SearchSort = "recommended" | "priceAsc" | "priceDesc" | "reviewCount";

export function sortProducts(list: TvProduct[], sort: SearchSort): TvProduct[] {
  const copy = [...list];
  // recommended は取得APIの並び(レビュー評価・件数などを総合)をそのまま使う
  if (sort === "priceAsc") copy.sort((a, b) => a.price - b.price);
  else if (sort === "priceDesc") copy.sort((a, b) => b.price - a.price);
  else if (sort === "reviewCount") copy.sort((a, b) => b.reviewCount - a.reviewCount);
  return copy;
}

/** メーカー名の一覧(件数の多い順) */
export function makerCounts(all: TvProduct[]): [string, number][] {
  const m = new Map<string, number>();
  for (const p of all) if (p.tvSpecs.maker) m.set(p.tvSpecs.maker, (m.get(p.tvSpecs.maker) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

/** 視聴距離(m)から、画面の高さの目安(4Kは約1.5倍、フルHDは約3倍)で収まる画面サイズ(V型)の上限を求める。16:9の画面。 */
export function sizeForDistance(distanceM: number, resolution: "4K" | "フルHD"): number {
  const heightM = distanceM / (resolution === "4K" ? 1.5 : 3);
  // 16:9の画面の高さ = 対角 × 9/√(16²+9²)
  const diagonalInch = heightM / (9 / Math.sqrt(337)) / 0.0254;
  return Math.floor(diagonalInch);
}
