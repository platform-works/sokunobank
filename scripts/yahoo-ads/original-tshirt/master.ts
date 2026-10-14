import type {
  AdGroupEntry,
  AdvertiserListingRule,
  IntentLandingText,
  KeywordEntry,
  KeywordMetrics,
  ListingSiteConfig,
  MatchType,
} from "../engine/types";
import type { YahooCampaignSettings } from "../engine/import";
import { getProduct } from "../../../src/data/lp/original-print-products";

/**
 * 広告マスター: オリジナルTシャツ（Up-T 送客LP /lp/original-print/）向け Yahoo!検索広告。
 * 運営者提供の A8.net 案件情報（2026-10-11）を正本とする。
 *  - プログラム: Up-T（s00000014629002）。リスティング: 一部OK
 *  - 禁止キーワード（商標・社名・サービス名）: up-t / アップティー / upt / あっぷてぃー（表記ゆれ・ローマ字・打ち間違い・複合語を含む）
 *  - 広告表示: 広告とわかる表示をファーストビューに（LP は PR バッジを設置済み）
 *  - 成果条件は公開しない（A8.net ルール）。報酬・EPC は内部管理で、LP・広告文に出さない
 *  - Up-T 公式で確認できていない事実（最短日数・即日対象・料金・割引・最低枚数）は、広告文に書かない
 * 検索ボリューム・CPC は未取得（null。推測を実績として入れない）。配信設定は、すべてオフ。
 */

const BASE_URL = "https://sokunobank.com/lp/original-print/";
export const CAMPAIGN_NAME = "OT_オリジナルTシャツ_整理LP_202610";
const AD_GROUP_PREFIX = "ag_";

// ───────── 広告主（Up-T）─────────
const UPT_SOURCE = "A8.net 案件情報（運営者提供 2026-10-11。リスティングNGワード）";
const upt: AdvertiserListingRule = {
  advertiserId: "upt",
  name: "Up-T",
  ngWords: [
    // 運営者提供の禁止キーワード
    ...["up-t", "アップティー", "upt", "あっぷてぃー"].map((word) => ({ word, source: UPT_SOURCE, verified: true })),
    // 表記ゆれ・ローマ字・空白・ドメイン・小書き文字（編集部の点検。A8.net ヘルプ: かな・カナ・ローマ字・打ち間違い・複合語も禁止の範囲）
    ...["up t", "up-t.jp", "upt.jp", "アップ ティー", "アップティ", "アップT", "あっぷ てぃー", "あっぷてぃ", "アップ T"].map((word) => ({
      word,
      source: "編集部の点検（表記揺れ・空白・ドメイン）",
      verified: false,
    })),
  ],
  listingApproved: true,
  scopeConfirmed: true,
  approvalNote: "一部OK（A8.net 案件情報 2026-10-11）。禁止キーワードを対象外キーワードに設定すれば可。商標は禁止指定外でも入札しない",
};

/** 他社の商標・ブランド名と、無駄なクリックを抑える語（対象外キーワード）。編集部の案で、商標は商標検索での照合が要る */
const WASTE_NEGATIVES: { word: string; reason: string }[] = [
  // 他社の商標・サービス名（A8.net ヘルプ: 商標は、禁止指定がなくても入札を控える）
  ...["ユニクロ", "UTme", "ラクスル", "raksul", "TMIX", "ティーミックス", "オリジナルプリント.jp"].map((word) => ({
    word,
    reason: "他社の商標・サービス名。入札を避ける（商標検索で照合する）",
  })),
  // 自作（DIY）・素材・テンプレート: 発注の検索ではない
  ...["作り方", "自作", "自分で", "手作り", "アイロンプリント", "転写紙", "転写シート", "型紙", "テンプレート", "フリー素材", "イラスト素材", "100均", "ダイソー"].map((word) => ({
    word,
    reason: "自作・素材・テンプレートの検索。発注の検索ではない（DIY）",
  })),
  // 価格だけを探す語: LP は価格を扱わず、広告文で価格を約束しない
  ...["無料", "激安", "格安", "安い", "最安", "最安値"].map((word) => ({
    word,
    reason: "価格だけを探す検索。LP は、価格・割引を扱わない（公式で未確認）",
  })),
  // 別の目的・別の商材
  ...["求人", "バイト", "工場", "卸", "仕入れ", "中古", "メルカリ", "ヤフオク", "フリマ", "見本市"].map((word) => ({
    word,
    reason: "別の目的（求人・卸・中古・フリマ）の検索",
  })),
];

// ───────── LP の訴求（広告とLPの整合の検証用）─────────
const intents: Record<string, IntentLandingText> = {
  general: {
    h1: "オリジナルTシャツの発注前に、条件を整理",
    subcopy: "デザインの有無・商品・納期・数量から、発注方法と事前準備を整理します",
    description: "デザインの有無・商品・納期・数量から、発注方法と事前準備を整理します。",
    tags: ["PR"],
    promiseWords: ["Tシャツ", "整理"],
    keywordWords: [],
  },
  tshirt: {
    h1: "オリジナルTシャツの発注前に、条件を整理",
    subcopy: "デザインの有無・商品・納期・数量から、発注方法と事前準備を整理します",
    description: "デザインの有無・商品・納期・数量から、発注方法と事前準備を整理します。",
    tags: ["PR"],
    promiseWords: ["Tシャツ"],
    keywordWords: ["Tシャツ", "クラスT", "クラT", "チームT"],
  },
};

const NO_METRICS: KeywordMetrics = { monthlySearchVolume: null, cpcLowYen: null, cpcHighYen: null, dataSource: null, fetchedAt: null };

// ───────── 広告グループ（検索意図）─────────
// 見出し ≤ 全角15（30）、説明文 ≤ 全角45（90）。LP が整理する範囲（デザインの有無・商品・納期・数量・事前準備）だけを述べる。
// 禁止: ブランド名・「公式」・価格・割引・最短・即日・無料・No.1・おすすめ。納期・発送日は、保証しない（商品・時期で異なる）。
const COMMON_D1 = "デザインの有無・商品・納期・数量から、発注方法と事前準備を整理できます。";
const COMMON_D2 = "制作・発送は提携先サービスが行います。当サイトで条件を整理してから進められます。";

interface GroupDef {
  name: string;
  /** LP の ?item= の値(商品ID)。省略時は tshirt */
  intent?: string;
  searchIntent: string;
  headlines: string[];
  /** 説明文1・2の上書き(省略時は COMMON_D1/D2) */
  d1?: string;
  d2?: string;
  d3: string;
  d4: string;
  initialCandidate: boolean;
  keywords: [string, "high" | "medium" | "low", "initial" | "hold" | "exclude", string][];
}

const GROUPS: GroupDef[] = [
  {
    name: "deadline",
    searchIntent: "納期・急ぎ",
    initialCandidate: true,
    // 2026-10-11 改善: 購入意欲のある検索語に合わせ、13本に拡充(重複・汎用の見出しを入れ替え)
    headlines: [
      "オリジナルTシャツを急ぎで作る",
      "Tシャツの納期が気になる方へ",
      "使用日に間に合うか確認",
      "短納期のTシャツ制作を検討",
      "希望日程の確認ポイント",
      "使用日から逆算して整理",
      "発送日・到着日の確認ポイント",
      "納期の目安は注文前に確認",
      "枚数に合わせた準備を確認",
      "Tシャツ制作の流れを確認",
      "オリジナルTシャツの発注前に",
      "商品を選んで条件を確認",
      "条件を整理してから注文へ",
    ],
    d1: "使用日から逆算して、発注前に確認したい点を整理。商品を選んで注文へ進めます。",
    d2: "デザインの有無・数量・使用日を選ぶだけ。準備のポイントがわかります。",
    d3: "発送日と到着日は別です。目安は商品・時期で異なるため、注文前に確認できます。",
    d4: "制作・発送は提携先サービスが行います。当サイトは条件整理を担当します。",
    keywords: [
      ["オリジナルTシャツ 急ぎ", "high", "initial", "納期の不安が、検索語に明示。LP（使用日から逆算して整理）と一致"],
      ["オリジナルTシャツ 納期", "high", "initial", "納期の確認が目的。LP の中心機能と一致。発送日は保証しない"],
      ["オリジナルTシャツ 間に合う", "high", "initial", "間に合うかの不安。LP（準備の目安）と一致"],
      ["オリジナルTシャツ 短納期", "high", "initial", "納期重視。LP と一致"],
      ["Tシャツ 作成 急ぎ", "high", "initial", "納期の不安が明示。「Tシャツ」の語を含み、他の商材への流入が少ない"],
      ["オリジナルTシャツ 即日", "medium", "hold", "即日の対応は、公式で未確認。LP は保証しない。期待のずれ（無駄クリック）のリスク"],
      ["オリジナルTシャツ 最短", "medium", "hold", "最短の日数は、公式で未確認。期待のずれのリスク"],
      ["オリジナルTシャツ 当日", "medium", "hold", "当日の対応は、公式で未確認。期待のずれのリスク"],
    ],
  },
  {
    name: "class",
    searchIntent: "クラスT・学校行事",
    initialCandidate: true,
    // 2026-10-11 改善: 13本に拡充(「文化祭・体育祭のTシャツ準備」「学校行事のTシャツ制作に」は新見出しと重複のため入れ替え)
    headlines: [
      "クラスTシャツを作りたい方へ",
      "文化祭のオリジナルTシャツ",
      "体育祭のクラスTシャツ制作",
      "クラス全員でおそろいの一着",
      "行事に合わせたTシャツ制作",
      "クラスTシャツの注文前整理",
      "クラスTの発注前チェック",
      "人数・サイズ・集金の確認",
      "行事の日程から逆算して準備",
      "クラスTシャツ 発注方法を確認",
      "注文前のサイズ集計を整理",
      "デザインなしの進め方も確認",
      "条件を整理してから注文へ",
    ],
    d1: "クラスTの発注前に、人数・サイズ・集金・承認者の確認ポイントを整理できます。",
    d2: "行事の日程から逆算して、準備の段取りを確認。デザインがなくても進め方を確認できます。",
    d3: "文化祭・体育祭など学校行事に。商品を選んで、注文前の条件を確認できます。",
    d4: "制作・発送は提携先サービスが行います。発送日・到着日は商品や時期で異なります。",
    keywords: [
      ["クラスTシャツ 作成", "high", "initial", "クラスTの発注意図。LP のペルソナ（学校）と一致"],
      ["クラスTシャツ オリジナル", "high", "initial", "同上"],
      ["クラスT 作成", "high", "initial", "略称（クラT）での検索。「T」の語で、Tシャツに限定"],
      ["文化祭 Tシャツ 作成", "high", "initial", "学校行事の発注意図。季節性あり（需要は未確認）"],
      ["体育祭 Tシャツ 作成", "high", "initial", "同上"],
      ["学園祭 Tシャツ オリジナル", "medium", "hold", "大学の学園祭は、LP の想定（学校）に含まれるが、需要・競合が未確認"],
      ["クラスTシャツ デザイン", "medium", "hold", "デザイン案・素材を探す検索を含む（発注意図が弱い）"],
    ],
  },
  {
    name: "team",
    searchIntent: "チーム・サークル・イベント",
    initialCandidate: false,
    headlines: [
      "チームTシャツの発注前に",
      "サークルTシャツの準備整理",
      "イベント用Tシャツの準備",
      "人数・サイズ・納期を整理",
      "デザインなしの進め方も確認",
      "発注方法と事前準備を確認",
      "条件を整理してから注文へ",
      "商品を選んで条件を確認",
    ],
    d3: "チームやサークルの人数・サイズ・使用日から、発注の準備を整理できます。",
    d4: "数量ごとの条件や、デザインがない場合の進め方も確認できます。",
    keywords: [
      ["チームTシャツ 作成", "high", "hold", "発注意図。初期は2グループに絞るため保留"],
      ["サークル Tシャツ オリジナル", "high", "hold", "同上"],
      ["部活 Tシャツ 作成", "high", "hold", "同上"],
      ["イベント Tシャツ 作成", "high", "hold", "同上。イベント種別が広い"],
      ["オリジナルTシャツ 1枚から", "medium", "hold", "1枚からの対応は、公式で未確認。期待のずれのリスク"],
      ["オリジナルTシャツ 少人数", "medium", "hold", "少数注文の可否は商品ごと（公式で確認）。期待のずれのリスク"],
    ],
  },
  {
    name: "business",
    searchIntent: "法人・ノベルティ",
    initialCandidate: false,
    headlines: [
      "企業向けTシャツの発注前に",
      "ノベルティ制作の準備整理",
      "イベントスタッフ用Tシャツ",
      "数量・納期・承認を整理",
      "社内共有しやすい条件整理",
      "発注方法と事前準備を確認",
      "条件を整理してから注文へ",
      "商品を選んで条件を確認",
    ],
    d3: "数量・納期・承認者・支払い方法など、社内で確認する項目を整理できます。",
    d4: "請求書払い等の可否は、注文前に確認が必要です。条件を整理して進められます。",
    keywords: [
      ["オリジナルTシャツ 法人", "high", "hold", "法人の発注意図。支払い・請求書の対応は公式で未確認。保留"],
      ["会社 オリジナルTシャツ 作成", "high", "hold", "同上"],
      ["ノベルティ Tシャツ オリジナル", "medium", "hold", "ノベルティは他の商材への流入が多い恐れ"],
      ["イベント スタッフ Tシャツ 作成", "medium", "hold", "同上"],
    ],
  },
  {
    name: "nodesign",
    searchIntent: "デザインなし・相談",
    initialCandidate: false,
    headlines: [
      "デザインがなくても整理",
      "オリジナルTシャツの進め方",
      "デザインの進め方を確認",
      "入稿データなしの準備整理",
      "納期・枚数・デザインを整理",
      "発注方法と事前準備を確認",
      "条件を整理してから注文へ",
      "商品を選んで条件を確認",
    ],
    d3: "デザインがない場合の進め方（自分で作る・相談するなど）は、注文前に確認できます。",
    d4: "ラフ案の段階でも、準備する内容と進め方を整理できます。",
    keywords: [
      ["オリジナルTシャツ デザインなし", "medium", "hold", "デザインの不安。LP のパターン（デザインなし）と一致。意図は中程度"],
      ["オリジナルTシャツ デザイン 相談", "medium", "hold", "相談の対応範囲は公式で確認。期待のずれのリスク"],
      ["オリジナルTシャツ デザイン 依頼", "low", "exclude", "デザイナーへの依頼の検索を含み、LP の目的と異なる"],
    ],
  },
  {
    name: "general",
    searchIntent: "一般（オリジナルTシャツ）",
    initialCandidate: false,
    headlines: [
      "オリジナルTシャツの発注前に",
      "条件を整理してから注文へ",
      "デザイン・商品・納期を整理",
      "発注方法と事前準備を確認",
      "数量ごとの準備も整理",
      "商品を選んで条件を確認",
      "発送日・到着日の確認ポイント",
      "制作前の確認事項をまとめて",
    ],
    d3: "オリジナルTシャツの発注前に確認したい項目を、まとめて整理できます。",
    d4: "納期の目安は商品や時期で異なります。注文前に確認しましょう。",
    keywords: [
      ["オリジナルTシャツ 作成", "high", "hold", "広い検索語。競合が多く、LP は整理型。初期は、意図の強い語に絞る"],
      ["オリジナルTシャツ 注文", "high", "hold", "同上"],
      ["オリジナルTシャツ オーダー", "high", "hold", "同上"],
      ["オリジナルTシャツ 比較", "high", "hold", "比較の意図は LP（条件整理）と一致。需要・CPC の確認後に再検討"],
      ["オリジナルTシャツ 作りたい", "medium", "hold", "情報収集の段階を含む"],
    ],
  },
];


// ───────── アイテム別の広告グループ(2026-10-11 追加。すべて保留=初期配信の対象外) ─────────
// 最終リンク先は ?item=<商品ID>。LP は、商品マスター(src/data/lp/original-print-products.ts)の
// catchcopy / subcopy をヒーローに表示する。広告とLPの文言は、同じマスターから作って整合させる。
// 検索ボリューム・CPC は未取得(null)。商品の取り扱い・仕様は、公式で未確認のため、広告文は LP が整理する範囲に限る。
interface ItemDef {
  id: string;
  /** 広告文に使う名称 */
  name: string;
  keywordWords: string[];
  promiseWords: string[];
  headlines: [string, string, string, string];
  d2: string;
  d3: string;
  keywords: [string, "high" | "medium", string][];
}
const ITEM_HOLD = "商品名＋発注意図。初期は納期・クラスTの2グループに絞るため保留。需要・CPC は未取得";
const ITEMS: ItemDef[] = [
  {
    id: "mug", name: "マグカップ", keywordWords: ["マグカップ", "マグ"], promiseWords: ["マグカップ"],
    headlines: ["オリジナルマグカップを作る", "ノベルティ用のマグカップに", "卒業記念のマグカップ制作", "プレゼント用のマグカップ"],
    d2: "印刷できる範囲や色の再現は商品ごとに異なります。注文前に確認できます。",
    d3: "企業の配布用・卒業記念・プレゼントなど、用途から準備のポイントを整理できます。",
    keywords: [["オリジナルマグカップ 作成", "high", ITEM_HOLD], ["オリジナルマグカップ 注文", "high", ITEM_HOLD],
      ["ノベルティ マグカップ オリジナル", "medium", "ノベルティは他の商材への流入が多い恐れ。保留"], ["卒業記念 マグカップ オリジナル", "medium", "季節性あり(需要は未確認)。保留"]],
  },
  {
    id: "hoodie", name: "パーカー", keywordWords: ["パーカー", "スウェット", "トレーナー"], promiseWords: ["パーカー", "スウェット"],
    headlines: ["オリジナルパーカーを作る", "スウェットのチームウェアに", "部活・サークルのパーカー", "パーカーの色・サイズを整理"],
    d2: "サイズ展開と色を全員分そろえて決めておくと、注文を進めやすくなります。",
    d3: "部活・サークル・学校・企業のチームウェアに。印刷位置と枚数から準備を整理できます。",
    keywords: [["オリジナルパーカー 作成", "high", ITEM_HOLD], ["オリジナルスウェット 作成", "high", ITEM_HOLD + "。「スウェット」は別商品(パンツ等)の検索を含む"],
      ["オリジナルパーカー 注文", "high", ITEM_HOLD], ["部活 パーカー オリジナル", "medium", "用途からの検索。保留"]],
  },
  {
    id: "polo", name: "ポロシャツ", keywordWords: ["ポロシャツ"], promiseWords: ["ポロシャツ"],
    headlines: ["オリジナルポロシャツを作る", "スタッフ用ポロシャツの準備", "店舗・受付のユニフォームに", "ロゴの位置と大きさを確認"],
    d2: "ロゴの位置と大きさ、サイズ別の枚数を決めておくと確認がスムーズです。",
    d3: "店舗・受付・展示会・チームのユニフォームに。用途から準備のポイントを整理できます。",
    keywords: [["オリジナルポロシャツ 作成", "high", ITEM_HOLD], ["オリジナルポロシャツ 注文", "high", ITEM_HOLD],
      ["ポロシャツ ユニフォーム オリジナル", "medium", "用途からの検索。保留"]],
  },
  {
    id: "cap", name: "キャップ", keywordWords: ["キャップ"], promiseWords: ["キャップ"],
    headlines: ["オリジナルキャップを作る", "イベントスタッフの目印に", "チームでそろえるキャップ", "加工方法は商品ごとに確認"],
    d2: "刺しゅう・プリントなどの加工方法は商品ごとに異なります。注文前に確認できます。",
    d3: "イベントスタッフ・チーム・販促など、用途から個数と色の準備を整理できます。",
    keywords: [["オリジナルキャップ 作成", "high", ITEM_HOLD + "。「キャップ」は別の意味(ペットボトル等)の検索を含む恐れ"], ["オリジナルキャップ 注文", "high", ITEM_HOLD],
      ["チーム キャップ オリジナル", "medium", "用途からの検索。保留"]],
  },
  {
    id: "apron", name: "エプロン", keywordWords: ["エプロン", "作業着"], promiseWords: ["エプロン"],
    headlines: ["オリジナルエプロンを作る", "店舗・工房の制服に", "イベント運営の制服に", "丈やサイズは商品ごと確認"],
    d2: "丈やサイズ展開は商品ごとに異なります。商品ページで確認できます。",
    d3: "店舗・工房・イベント運営の制服に。サイズ別の枚数から準備を整理できます。",
    keywords: [["オリジナルエプロン 作成", "high", ITEM_HOLD], ["オリジナルエプロン 注文", "high", ITEM_HOLD],
      ["店舗 エプロン オリジナル", "medium", "用途からの検索。保留"]],
  },
  {
    id: "tote", name: "トートバッグ", keywordWords: ["トート", "エコバッグ"], promiseWords: ["トート", "バッグ"],
    headlines: ["オリジナルトートを作る", "展示会の配布用バッグに", "ショップのノベルティに", "印刷範囲とサイズを確認"],
    d2: "印刷範囲とサイズを決めておくと、注文前の確認がスムーズです。",
    d3: "展示会・イベントの配布やショップのノベルティに。個数から準備を整理できます。",
    keywords: [["オリジナルトートバッグ 作成", "high", ITEM_HOLD], ["オリジナルトートバッグ 注文", "high", ITEM_HOLD],
      ["ノベルティ トートバッグ オリジナル", "medium", "ノベルティは他の商材への流入が多い恐れ。保留"]],
  },
  {
    id: "towel", name: "タオル", keywordWords: ["タオル"], promiseWords: ["タオル"],
    headlines: ["オリジナルタオルを作る", "応援・イベント配布用に", "周年記念のタオル制作", "デザインの入る範囲を確認"],
    d2: "デザインを入れられる範囲は商品ごとに異なります。注文前に確認できます。",
    d3: "応援・イベント配布・周年記念に。個数と使用日から準備を整理できます。",
    keywords: [["オリジナルタオル 作成", "high", ITEM_HOLD], ["オリジナルタオル 注文", "high", ITEM_HOLD],
      ["イベント タオル オリジナル", "medium", "用途からの検索。保留"]],
  },
  {
    id: "phonecase", name: "スマホケース", keywordWords: ["スマホケース"], promiseWords: ["スマホケース"],
    headlines: ["オリジナルスマホケース作成", "自分だけのデザインで作る", "対応機種は商品ごとに確認", "イベントグッズにも"],
    d2: "対応機種は商品ごとに異なります。機種名を決めておくと確認がスムーズです。",
    d3: "個人制作やイベントグッズに。機種とデザインから準備のポイントを整理できます。",
    keywords: [["オリジナルスマホケース 作成", "high", ITEM_HOLD], ["オリジナルスマホケース 注文", "high", ITEM_HOLD],
      ["スマホケース オリジナル 作りたい", "medium", "情報収集の段階を含む。保留"]],
  },
  {
    id: "keyholder", name: "キーホルダー", keywordWords: ["キーホルダー"], promiseWords: ["キーホルダー"],
    headlines: ["オリジナルキーホルダー作成", "イベント配布・記念品に", "形やサイズは商品ごと確認", "配布用の個数を整理"],
    d2: "形やサイズは商品ごとに異なります。注文前に確認できます。",
    d3: "イベント配布や記念品に。個数と使用日から準備のポイントを整理できます。",
    keywords: [["オリジナルキーホルダー 作成", "high", ITEM_HOLD], ["オリジナルキーホルダー 注文", "high", ITEM_HOLD],
      ["イベント キーホルダー オリジナル", "medium", "用途からの検索。保留"]],
  },
];

for (const it of ITEMS) {
  const product = getProduct(it.id);
  if (!product) throw new Error("商品マスターにない: " + it.id);
  // LP のヒーロー(h1・サブコピー)は商品マスターから作る。広告文の整合検証もこの文言で行う
  intents[it.id] = {
    h1: `オリジナル${product.shortName}、${product.catchcopy}`,
    subcopy: product.subcopy,
    description: "デザインの有無・商品・納期・数量から、発注方法と事前準備を整理します。",
    tags: ["PR"],
    promiseWords: it.promiseWords,
    keywordWords: it.keywordWords,
  };
  GROUPS.push({
    name: it.id,
    intent: it.id,
    searchIntent: `アイテム別(${product.name})`,
    initialCandidate: false,
    headlines: [
      ...it.headlines,
      `${it.name}の発注方法を確認`,
      `${it.name}の発注前チェック`,
      `${it.name}制作の準備を整理`,
      "条件を確認してから注文へ",
    ],
    d1: `${it.name}の発注前に、デザイン・個数・使用日から確認ポイントを整理できます。`,
    d2: it.d2,
    d3: it.d3,
    d4: "制作・発送は提携先サービスが行います。当サイトは条件整理を担当します。",
    keywords: it.keywords.map(([kw, strength, reason]) => [kw, strength, "hold", reason] as GroupDef["keywords"][number]),
  });
}

const adGroups: AdGroupEntry<string>[] = GROUPS.map((g) => ({
  campaignName: CAMPAIGN_NAME,
  adGroupName: `${AD_GROUP_PREFIX}${g.name}`,
  intent: g.intent ?? "tshirt",
  headlines: g.headlines,
  descriptions: [g.d1 ?? COMMON_D1, g.d2 ?? COMMON_D2, g.d3, g.d4],
  path1: "",
  path2: "",
  status: "draft",
  searchIntent: g.searchIntent,
  targetProgramId: "upt",
  secondaryProgramIds: [],
  headlineVariant: `${g.name}_v1`,
  conversionGoal: "A8.net 成果確定（新規会員登録・新規購入。成果条件は公開しない）",
  initialCandidate: g.initialCandidate,
}));

const keywords: KeywordEntry<string>[] = GROUPS.flatMap((g, gi) =>
  g.keywords.map(([keyword, strength, decision, reason], ki) => ({
    keywordId: `okw_${String(gi + 1).padStart(2, "0")}_${String(ki + 1).padStart(2, "0")}`,
    category: g.searchIntent,
    keyword,
    // 初期候補は完全一致（拡張を抑える）。それ以外は、配信前にマッチタイプを再検討する
    matchType: (decision === "initial" ? "exact" : "phrase") as MatchType,
    intent: g.intent ?? "tshirt",
    adGroupName: `${AD_GROUP_PREFIX}${g.name}`,
    status: "draft" as const,
    intentStrength: strength,
    decision,
    decisionReason: reason,
    metrics: { ...NO_METRICS },
    note: null,
  })),
);

export const ORIGINAL_TSHIRT: ListingSiteConfig<string> = {
  siteName: "即納バンク",
  baseUrl: BASE_URL,
  intentParam: "item",
  intents,
  advertisers: [upt],
  campaigns: [{ campaignName: CAMPAIGN_NAME, platform: "yahoo", utmSource: "yahoo", utmMedium: "cpc", utmCampaign: "sb_original_tshirt_v1" }],
  adGroups,
  keywords,
  initialKeywordSignal: { pattern: "Tシャツ|クラスT|クラT|チームT", reason: "Tシャツを示す語を含まない。他の商材に配信される" },
  wasteNegatives: WASTE_NEGATIVES,
  avoidPhrases: [
    "必ず", "絶対", "保証", "確約", "最安", "最安値", "格安", "激安", "最短", "即日", "当日", "無料", "割引", "No.1", "NO.1", "公式",
    "おすすめ", "オススメ", "今なら", "ランキング", "口コミ", "評判", "日以内",
  ],
  inferencePhrases: [/\d+代/, /\d+歳/, "あなたは", "お悩みの方", "お困りの方"],
};

/**
 * キャンペーン設定。運営者が承認した値だけを入れる。承認前は null（未確定）→ 仕様の最小値を仮値として入れ、全行オフ。
 * 開始日は、実機のエクスポート形式では入力がある。承認済みの配信開始日ではなく、検証用の仮値。
 */
export const SETTINGS: YahooCampaignSettings = {
  campaignName: CAMPAIGN_NAME,
  dailyBudgetYen: null,
  adGroupBidYen: null,
  searchScreen: "全て",
  preferBest: "優先する",
  startDate: "2026/12/31",
  startDateProvisional: true,
  operatorApproved: false,
};

/** 広告アカウント（手順書の表記用。CSV には含めない）。既存のキャンペーンには触れず、新規キャンペーンとして追加する */
export const ACCOUNT_ID = "1469491";
