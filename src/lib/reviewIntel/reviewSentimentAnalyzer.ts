import type { ReviewAnalysis, ReviewRecord, ThemeStat } from "./types";
import { filterAnalyzable } from "./sourceLicenseValidator";

/**
 * Review Sentiment Analyzer。許諾済みで取得できたレビューだけを、決定的なルール辞書で集計する。
 * LLM等の外部解析器に差し替える場合も、入力は filterAnalyzable を通した本文に限ること。
 * 出力は「件数」であり、主観的な意見を客観的な性能として断定しない。
 */
interface ThemeRule {
  theme: string;
  positive: RegExp;
  negative: RegExp;
}

export const THEME_RULES: ThemeRule[] = [
  { theme: "性能", positive: /(パワフル|よく(乾|冷|温|切)|十分な(性能|パワー)|性能.{0,4}(良|高|満足))/, negative: /(パワー(不足|が弱)|性能.{0,4}(悪|低|不満)|思ったより.{0,4}(弱|遅))/ },
  { theme: "使いやすさ", positive: /(使いやすい|簡単|扱いやすい|操作.{0,3}(楽|分かりやすい))/, negative: /(使いにくい|扱いにくい|操作.{0,3}(難|分かりにくい))/ },
  { theme: "品質", positive: /(品質.{0,3}(良|高)|しっかり(した|して)|作りが(良|丁寧))/, negative: /(安っぽい|品質.{0,3}(悪|低)|作りが(雑|粗))/ },
  { theme: "デザイン", positive: /(おしゃれ|デザイン.{0,3}(良|好き|気に入)|見た目が(良|いい))/, negative: /(デザイン.{0,3}(微妙|いまいち|悪)|見た目が(悪|微妙))/ },
  { theme: "コスパ", positive: /(コスパ.{0,3}(良|高|最高)|価格.{0,3}(以上|満足)|お買い得)/, negative: /(高すぎ|割高|価格.{0,3}(不満|見合わ))/ },
  { theme: "耐久性", positive: /(長持ち|丈夫|壊れにくい|耐久.{0,3}(良|高))/, negative: /(すぐ(壊|故障)|数(日|週間|ヶ月)で(壊|故障)|耐久.{0,3}(低|悪|不安))/ },
  { theme: "故障・不具合", positive: /$^/, negative: /(故障|不具合|動かな|電源が入らな|初期不良)/ },
  { theme: "重量・サイズ", positive: /(軽い|軽量|コンパクト|場所を取らない)/, negative: /(重い|大きすぎ|かさばる|場所を取る)/ },
  { theme: "静音", positive: /(静か|静音|音が(小さい|気にならない))/, negative: /(うるさい|騒音|音が(大きい|気になる))/ },
  { theme: "想定との相違", positive: /$^/, negative: /(思っていたのと違|イメージと違|写真と違|説明と違)/ },
];

const USE_CASES: { label: string; re: RegExp }[] = [
  { label: "一人暮らし", re: /(一人暮らし|ひとり暮らし|単身)/ },
  { label: "家族・複数人", re: /(家族|子供|子ども|夫婦)/ },
  { label: "オフィス・業務", re: /(会社|オフィス|職場|業務)/ },
  { label: "プレゼント", re: /(プレゼント|ギフト|贈り物)/ },
  { label: "旅行・持ち運び", re: /(旅行|出張|持ち運び)/ },
];

const normText = (s: string) => s.normalize("NFKC");

export function analyzeReviews(productKey: string, reviews: ReviewRecord[]): ReviewAnalysis {
  const { kept, denied } = filterAnalyzable(reviews);
  const seen = new Set<string>();
  const seenText = new Set<string>();
  let duplicate = 0;
  let storeOnly = 0;
  const targets: ReviewRecord[] = [];
  for (const r of kept) {
    const idKey = `${r.source}:${r.reviewId}`;
    const textKey = `${r.source}:${normText(r.text).replace(/\s/g, "")}`;
    if (seen.has(idKey) || seenText.has(textKey)) {
      duplicate++;
      continue;
    }
    seen.add(idKey);
    seenText.add(textKey);
    // 販売店の配送・梱包等だけのレビューは商品の品質評価に混ぜない
    if (r.target === "store") {
      storeOnly++;
      continue;
    }
    targets.push(r);
  }

  const stats = new Map<string, ThemeStat>();
  for (const rule of THEME_RULES) stats.set(rule.theme, { theme: rule.theme, positive: 0, negative: 0, mentions: 0 });
  const uc = new Map<string, number>();
  for (const r of targets) {
    const t = normText(r.text);
    for (const rule of THEME_RULES) {
      const s = stats.get(rule.theme)!;
      const pos = rule.positive.test(t);
      const neg = rule.negative.test(t);
      if (pos) s.positive++;
      if (neg) s.negative++;
      if (pos || neg) s.mentions++;
    }
    for (const u of USE_CASES) if (u.re.test(t)) uc.set(u.label, (uc.get(u.label) ?? 0) + 1);
  }

  const dates = targets.map((r) => r.postedAt).sort();
  return {
    productKey,
    analyzedCount: targets.length,
    period: dates.length ? { from: dates[0], to: dates[dates.length - 1] } : null,
    themes: [...stats.values()].filter((s) => s.mentions > 0).sort((a, b) => b.mentions - a.mentions),
    useCases: [...uc.entries()].map(([label, mentions]) => ({ label, mentions })).sort((a, b) => b.mentions - a.mentions),
    excluded: { duplicate, storeOnly, licenseDenied: denied },
  };
}
