import type { AdGroupEntry, KeywordEntry, KeywordMetrics, ListingSiteConfig, IntentLandingText, MatchType } from "../engine/types";
import type { YahooCampaignSettings } from "../engine/import";
import { PUBLISHED_PRODUCTS, getProduct } from "../../../src/data/lp/original-print-products";
import { ORIGINAL_TSHIRT } from "../original-tshirt/master";
import { weight } from "../engine/width";

/** 見出しの候補のうち、全角15文字(30単位)に収まる最初のものを返す。どれも収まらなければ null */
function fit(...candidates: string[]): string | null {
  return candidates.find((c) => weight(c) <= 30) ?? null;
}

/**
 * 広告マスター: オリジナルグッズ(アイテム別・法人需要)。Up-T 送客LP /lp/original-print/ の、細分化したカテゴリー向け。
 * 2026-10-15 追加。既存キャンペーン「OT_オリジナルTシャツ_整理LP_202610」(Tシャツ系6グループ+アイテム別9グループ)とは別の、
 * 新規キャンペーンとして取り込む(既存の編集は同一アカウントのIDが必要なため、IDの流用をしない)。
 *
 * 方針は Tシャツのマスターと同じ:
 *  - 広告主 Up-T(A8.net)の禁止キーワード・表記ゆれ・他社商標・無駄クリック抑制は、Tシャツのマスターの設定をそのまま使う
 *  - 広告文は、LP が整理する範囲(デザインの有無・商品・納期・数量・事前準備)だけ。
 *    「公式」・価格・割引・最短・即日・無料・No.1・おすすめ・保証 は使わない。Up-T公式で未確認の事実は書かない
 *  - 検索ボリューム・CPC は未取得(null)。推測を実績として入れない。配信設定は、すべてオフ。全グループ「保留」(初期配信の候補なし)
 *  - 既存アカウント(2026-10-15 の実機エクスポート)に、同じ広告グループ・キーワードがあるものは作らない
 */

const BASE_URL = ORIGINAL_TSHIRT.baseUrl;
export const GOODS_CAMPAIGN_NAME = "OT_オリジナルグッズ_アイテム別_202610";
const AD_GROUP_PREFIX = "ag_";

/** 入札価格(円)。運営者の指示(2026-10-15): 5円〜10円。法人需要の商品は上限の10円、それ以外は下限の5円 */
const BID_CORPORATE_YEN = 10;
const BID_STANDARD_YEN = 5;

/** 既存キャンペーン(Tシャツ系)に広告グループがある商品。ここでは作らない */
const ALREADY_IN_ACCOUNT = new Set(["tshirt", "mug", "hoodie", "polo", "cap", "apron", "tote", "towel", "phonecase", "keyholder"]);

interface ItemDef {
  id: string;
  /** 広告文・キーワードに使う名称 */
  name: string;
  /** キーワード(検索語)に使う名称。省略時は name */
  kw?: string;
  /** このグループのキーワードに必ず含まれる語(エンジンの信号語検証)。省略時は kw または name。他グループのキーワードに含まれる語は避ける */
  signals?: string[];
  /** LP のヒーローに出ている語(広告文の約束がLPにあるかの検証用)。省略時は商品マスターの shortName */
  promise?: string[];
  /** キーワード[語, 強さ, 理由] */
  keywords: [string, "high" | "medium", string][];
  /** 見出し1の上書き(「オリジナル○○を作る」が不自然な商品用) */
  headline1?: string;
  /** 用途キーワードなどの補足メモ(レポート用) */
  risk?: string;
}

const HOLD = "商品名＋発注意図。全グループ保留(初期配信の候補なし)。需要・CPC は未取得";

/** 法人需要が見込める商品 → 優先。個人・クラス系は後ろ */
const ITEMS: ItemDef[] = [
  // ===== 法人・店舗・イベント =====
  {
    id: "nobori", name: "のぼり旗",
    keywords: [["オリジナル のぼり旗 作成", "high", HOLD], ["のぼり旗 オーダー", "high", HOLD], ["店舗 のぼり旗 オリジナル", "medium", "店舗の用途。「のぼり」の単体語は、別の意味(登る等)を含むため避ける"]],
  },
  {
    id: "banner", name: "販促バナー", kw: "販促バナー", promise: ["バナー"],
    signals: ["バナー"],
    keywords: [["販促バナー 作成", "high", HOLD + "。「バナー」はウェブ広告の検索を含む恐れ。ウェブ系の語を対象外に設定"], ["展示会 バナー 印刷", "medium", "展示会の用途。保留"], ["店頭 バナー スタンド オリジナル", "medium", "用途からの検索。保留"]],
    risk: "ウェブバナー(デザイン)の検索を含む恐れ",
  },
  {
    id: "paper", name: "紙印刷", promise: ["紙印刷"], headline1: "名刺・カードを紙印刷で作る",
    signals: ["名刺", "カード", "印刷"],
    keywords: [["オリジナル 名刺 印刷", "medium", "名刺の検索は競合が多い。LP の紙印刷の入口と一致するが、意図は中程度"], ["ショップカード 印刷 オリジナル", "medium", "用途からの検索。保留"]],
    risk: "名刺・印刷は競合(ネット印刷)が多く、CPC が高い恐れ",
  },
  {
    id: "workwear", name: "ワークユニフォーム", kw: "ワークユニフォーム",
    signals: ["ワークユニフォーム", "作業服", "ユニフォーム"],
    keywords: [["ワークユニフォーム オリジナル", "high", HOLD], ["作業服 オリジナル 作成", "high", HOLD], ["店舗 ユニフォーム オリジナル", "medium", "用途からの検索。保留"]],
  },
  {
    id: "happi", name: "ハッピ", kw: "ハッピ",
    signals: ["ハッピ", "法被"],
    keywords: [["オリジナル ハッピ 作成", "high", HOLD], ["法被 オリジナル 注文", "high", HOLD], ["お祭り ハッピ オリジナル", "medium", "用途からの検索。保留"]],
  },
  {
    id: "coat", name: "ジャケット", kw: "ジャケット",
    keywords: [["オリジナル ジャケット 作成", "high", HOLD + "。既製品の通販の検索を含む恐れ"], ["チーム ジャケット オリジナル", "medium", "用途からの検索。保留"]],
    risk: "既製品の通販の検索を含む恐れ",
  },
  {
    id: "mask", name: "マスク", kw: "マスク",
    keywords: [["オリジナル マスク 作成", "high", HOLD], ["マスク 名入れ オリジナル", "medium", "名入れの用途。保留"]],
  },
  {
    id: "ecobag", name: "エコバッグ", kw: "エコバッグ",
    keywords: [["オリジナル エコバッグ 作成", "high", HOLD], ["ノベルティ エコバッグ オリジナル", "medium", "ノベルティは他の商材への流入が多い恐れ。保留"]],
  },
  {
    id: "bag-other", name: "バッグ・ポーチ", kw: "バッグ", promise: ["ポーチ"],
    signals: ["ポーチ", "巾着", "サコッシュ"],
    keywords: [["オリジナル ポーチ 作成", "medium", "ポーチ等の用途。保留"], ["オリジナル 巾着 作成", "medium", "巾着の用途。保留"], ["サコッシュ オリジナル 作成", "medium", "サコッシュの用途。保留"]],
  },
  {
    id: "badge", name: "バッジ", kw: "バッジ",
    keywords: [["オリジナル 缶バッジ 作成", "high", HOLD], ["缶バッジ オーダー", "high", HOLD], ["イベント 缶バッジ オリジナル", "medium", "用途からの検索。保留"]],
  },
  {
    id: "sticker", name: "ステッカー", kw: "ステッカー",
    keywords: [["オリジナル ステッカー 作成", "high", HOLD], ["ステッカー オーダー 印刷", "high", HOLD], ["ノベルティ ステッカー オリジナル", "medium", "ノベルティは他の商材への流入が多い恐れ。保留"]],
  },
  {
    id: "acrylic", name: "アクリルグッズ", kw: "アクリル",
    signals: ["アクリル", "アクスタ"],
    keywords: [["オリジナル アクリルスタンド 作成", "high", HOLD], ["アクリルキーホルダー オリジナル 作成", "high", HOLD], ["アクスタ オリジナル 作成", "medium", "略称。保留"]],
  },
  {
    id: "zakka", name: "雑貨", kw: "雑貨", promise: ["雑貨"],
    keywords: [["オリジナル 雑貨 作成", "medium", "広い語。意図は中程度。保留"], ["ノベルティ 雑貨 オリジナル", "medium", "ノベルティは他の商材への流入が多い恐れ。保留"]],
  },
  {
    id: "laser", name: "レーザー加工", kw: "レーザー加工",
    keywords: [["レーザー加工 名入れ オリジナル", "medium", "名入れの用途。保留"], ["レーザー加工 ノベルティ 作成", "medium", "ノベルティの用途。保留"]],
  },
  {
    id: "class-bibs", name: "ビブス", kw: "ビブス",
    keywords: [["オリジナル ビブス 作成", "high", HOLD], ["ビブス 名入れ オリジナル", "high", HOLD], ["チーム ビブス オーダー", "medium", "用途からの検索。保留"]],
  },
  // ===== ウェア・個人・クラス =====
  {
    id: "sportswear", name: "スポーツウェア", kw: "スポーツウェア",
    keywords: [["オリジナル スポーツウェア 作成", "high", HOLD], ["チーム スポーツウェア オリジナル", "medium", "用途からの検索。保留"]],
  },
  {
    id: "sweat", name: "スウェット", kw: "スウェット", signals: ["スウェット", "トレーナー"],
    keywords: [["スウェット 名入れ オリジナル", "high", HOLD + "。既存の ag_hoodie(オリジナルスウェット 作成)と語が近い。重複配信に注意"], ["オリジナル トレーナー 作成", "medium", "別名の検索。保留"]],
  },
  {
    id: "pants", name: "パンツ", kw: "パンツ",
    signals: ["パンツ"],
    keywords: [["オリジナル ハーフパンツ 作成", "medium", "部活・チームの用途。保留"], ["オリジナル ジャージ パンツ 作成", "medium", "用途からの検索。保留"]],
  },
  {
    id: "kids", name: "キッズウェア", kw: "キッズ", promise: ["キッズ"],
    signals: ["キッズ", "ベビー"],
    keywords: [["オリジナル キッズ ウェア 作成", "medium", "子ども向けの用途。保留"], ["オリジナル ベビー服 作成", "medium", "ベビー向け。保留"]],
  },
  {
    id: "petwear", name: "ペット服", kw: "ペット服", signals: ["ペット服", "犬服"],
    keywords: [["オリジナル ペット服 作成", "high", HOLD], ["犬服 オリジナル 作成", "medium", "犬服の用途。保留"]],
  },
  {
    id: "allover", name: "全面プリント", kw: "全面プリント",
    signals: ["全面プリント", "フルプリント"],
    keywords: [["全面プリント オリジナル 作成", "high", HOLD], ["フルプリント オリジナル 作成", "medium", "別名の検索。保留"]],
  },
  {
    id: "class-shirt", name: "クラスシャツ", kw: "クラスシャツ",
    signals: ["クラスシャツ"],
    keywords: [["クラスシャツ 作成", "high", HOLD], ["クラスシャツ オリジナル", "high", HOLD]],
  },
  {
    id: "class-polo", name: "クラスポロシャツ", kw: "クラスポロ", promise: ["ポロシャツ"],
    signals: ["クラスポロ"],
    keywords: [["クラスポロシャツ 作成", "high", HOLD], ["クラスポロ オリジナル", "medium", "略称。保留"]],
  },
  {
    id: "class-hoodie", name: "クラスパーカー", kw: "クラスパーカー",
    signals: ["クラスパーカー"],
    keywords: [["クラスパーカー 作成", "high", HOLD], ["クラスパーカー オリジナル", "high", HOLD]],
  },
  // ===== スマホ・雑貨 =====
  {
    id: "iphone", name: "iPhoneケース", kw: "iPhoneケース", promise: ["iPhone"],
    keywords: [["オリジナル iPhoneケース 作成", "high", HOLD], ["iPhoneケース オーダー", "high", HOLD]],
  },
  {
    id: "android", name: "Androidケース", kw: "Androidケース", promise: ["Android"], signals: ["Android"],
    keywords: [["オリジナル Androidケース 作成", "high", HOLD], ["Androidスマホケース オーダー", "high", HOLD]],
  },
  {
    id: "notebook-case", name: "手帳型ケース", kw: "手帳型スマホケース", promise: ["手帳型"],
    signals: ["手帳型"],
    keywords: [["オリジナル 手帳型スマホケース 作成", "high", HOLD], ["手帳型ケース オーダー", "medium", "略称。保留"]],
  },
  {
    id: "tablet", name: "タブレットケース", kw: "タブレットケース",
    signals: ["タブレット", "iPad"],
    keywords: [["オリジナル タブレットケース 作成", "high", HOLD], ["iPadケース オリジナル 作成", "medium", "機種名の検索。保留"]],
  },
  {
    id: "phone-acc", name: "スマホアクセサリー", kw: "スマホアクセサリー", promise: ["アクセサリー"],
    signals: ["スマホリング", "モバイルバッテリー"],
    keywords: [["オリジナル スマホリング 作成", "medium", "スマホリング等の用途。保留"], ["オリジナル モバイルバッテリー 作成", "medium", "ノベルティ用途。保留"]],
  },
  {
    id: "nail", name: "ネイル", kw: "ネイル",
    keywords: [["オリジナル ネイルシール 作成", "high", HOLD], ["ネイルチップ オリジナル デザイン 注文", "medium", "用途からの検索。保留"]],
  },
  {
    id: "print3d", name: "3Dプリント", kw: "3Dプリント",
    keywords: [["3Dプリント オリジナル グッズ 作成", "medium", "データ作成・機器の検索を含む恐れ。保留"], ["3Dプリント フィギュア 注文", "medium", "用途からの検索。保留"]],
    risk: "3Dプリンター(機器)・データ作成の検索を含む恐れ",
  },
];

const NO_METRICS: KeywordMetrics = { monthlySearchVolume: null, cpcLowYen: null, cpcHighYen: null, dataSource: null, fetchedAt: null };

const intents: Record<string, IntentLandingText> = {};
const adGroups: AdGroupEntry<string>[] = [];
const keywords: KeywordEntry<string>[] = [];

const COMMON_TAIL = "制作・発送は提携先サービスが行います。当サイトは条件整理を担当します。";

ITEMS.forEach((it, gi) => {
  const product = getProduct(it.id);
  if (!product) throw new Error("商品マスターにない: " + it.id);
  if (ALREADY_IN_ACCOUNT.has(it.id)) throw new Error("既存の広告グループがある商品: " + it.id);

  intents[it.id] = {
    h1: `オリジナル${product.shortName}、${product.catchcopy}`,
    subcopy: product.subcopy,
    description: "デザインの有無・商品・納期・数量から、発注方法と事前準備を整理します。",
    tags: ["PR"],
    promiseWords: it.promise ?? [product.shortName],
    keywordWords: it.signals ?? [it.kw ?? it.name],
  };

  const n = it.name;
  const catchLine = product.catchcopy.replace(/。$/, "");
  const uses = product.uses.map((u) => u.title);
  const groupName = `${AD_GROUP_PREFIX}${it.id}`;

  adGroups.push({
    campaignName: GOODS_CAMPAIGN_NAME,
    adGroupName: groupName,
    bidYen: product.corporate ? BID_CORPORATE_YEN : BID_STANDARD_YEN,
    intent: it.id,
    headlines: [
      fit(it.headline1 ?? `オリジナル${n}を作る`, `オリジナル${n}を作る`, `${n}を作る`, `${n}の制作`),
      fit(`${n}の発注方法を確認`, `${n}の発注方法`, `${n}の注文方法`),
      fit(`${n}の発注前チェック`, `${n}の発注前に`),
      fit(`${n}制作の準備を整理`, `${n}の準備を整理`),
      fit(catchLine),
      "条件を確認してから注文へ",
      "商品を選んで条件を確認",
      "デザインの進め方も確認",
    ].filter((h): h is string => h !== null),
    descriptions: [
      `${n}の発注前に、デザイン・個数・使用日から確認ポイントを整理できます。`,
      product.subcopy,
      `${uses[0]}・${uses[1]}などの用途から、準備のポイントを整理できます。`,
      COMMON_TAIL,
    ],
    path1: "",
    path2: "",
    status: "draft",
    searchIntent: `アイテム別(${product.name})${product.corporate ? "・法人" : ""}`,
    targetProgramId: "upt",
    secondaryProgramIds: [],
    headlineVariant: `${it.id}_v1`,
    conversionGoal: "A8.net 成果確定（新規会員登録・新規購入。成果条件は公開しない）",
    initialCandidate: false,
  });

  it.keywords.forEach(([kw, strength, reason], ki) => {
    keywords.push({
      keywordId: `ogk_${String(gi + 1).padStart(2, "0")}_${String(ki + 1).padStart(2, "0")}`,
      category: `アイテム別(${product.name})`,
      keyword: kw,
      matchType: "phrase" as MatchType,
      intent: it.id,
      adGroupName: groupName,
      status: "draft" as const,
      intentStrength: strength,
      decision: "hold",
      decisionReason: it.risk ? `${reason}。注意: ${it.risk}` : reason,
      metrics: { ...NO_METRICS },
      note: null,
    });
  });
});

/** この新規キャンペーン用の追加の対象外キーワード(ウェブ・ソフト・求人など、別の意味の検索) */
const EXTRA_WASTE = ["ウェブ", "web", "ホームページ", "バナー広告", "アプリ", "フリーソフト", "ダウンロード", "テンプレ", "ロゴ 作成", "ゲーム", "dtp"].map((word) => ({
  word,
  reason: "別の意味の検索(ウェブ・ソフト・素材)。発注の検索ではない",
}));

export const ORIGINAL_GOODS: ListingSiteConfig<string> = {
  ...ORIGINAL_TSHIRT,
  intents,
  adGroups,
  keywords,
  campaigns: [
    { campaignName: GOODS_CAMPAIGN_NAME, platform: "yahoo", utmSource: "yahoo", utmMedium: "cpc", utmCampaign: "sb_original_goods_v1" },
  ],
  wasteNegatives: [...ORIGINAL_TSHIRT.wasteNegatives, ...EXTRA_WASTE],
  // 全グループ保留(初期候補なし)のため、この判定は使われない
  initialKeywordSignal: { pattern: ".", reason: "" },
};

/** キャンペーン設定。承認済みの値のみ。未承認は null → 仮値(全行オフ) */
export const GOODS_SETTINGS: YahooCampaignSettings = {
  campaignName: GOODS_CAMPAIGN_NAME,
  dailyBudgetYen: null,
  adGroupBidYen: BID_STANDARD_YEN,
  searchScreen: "全て",
  preferBest: "優先する",
  // 開始日・1日の予算は、運営者から承認の値を受けていない(仮値。レポートに明記される)
  startDate: "2026/12/31",
  startDateProvisional: true,
  // 運営者の指示(2026-10-15): 配信設定は「オン」、入札価格は 5〜10円
  operatorApproved: true,
  deliveryOn: true,
};

export const GOODS_ACCOUNT_ID = "1469491";
/** 商品マスターで公開しているが、この新規キャンペーンの対象にしない商品(既存の広告グループ、または広告に向かない) */
export const GOODS_EXCLUDED = PUBLISHED_PRODUCTS.map((p) => p.id).filter((id) => !ITEMS.some((i) => i.id === id));
