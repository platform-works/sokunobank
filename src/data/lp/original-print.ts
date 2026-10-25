// Up-T(オリジナルプリント)LPの選択肢・コピー・案内文。
// 方針: 納期の計算・保証をしない。Up-T公式で確認できていない事実(最短日数・対象商品・
// 取扱カテゴリ・割引等)は一切書かない。広告コードは upt-ads.ts(原文のまま)。

import { getProduct } from "./original-print-products";

export const LP_SLUG = "original-print";

export type DesignAnswer = "data" | "rough" | "none";
export type DeadlineAnswer = "fastest" | "date";
export type QtyAnswer = "small" | "mid" | "large";

export interface Answers {
  design: DesignAnswer | null;
  /** 商品ID(original-print-products.ts の PRODUCTS[].id) */
  product: string | null;
  deadline: DeadlineAnswer | null;
  qty: QtyAnswer | null;
  /** deadline === "date" のときの、使用日までの暦日数(本日から数えた日数。納期の計算ではない) */
  daysLeft: number | null;
}

export const EMPTY_ANSWERS: Answers = { design: null, product: null, deadline: null, qty: null, daysLeft: null };

export type QuestionKey = "design" | "deadline" | "qty";

export const QUESTIONS: {
  key: QuestionKey;
  label: string;
  options: { value: string; label: string }[];
}[] = [
  {
    key: "design",
    label: "デザインはありますか?",
    options: [
      { value: "data", label: "入稿データあり" },
      { value: "rough", label: "ラフ案のみ" },
      { value: "none", label: "デザインなし" },
    ],
  },
  {
    key: "deadline",
    label: "いつまでに必要ですか?",
    options: [
      { value: "fastest", label: "できるだけ早く" },
      { value: "date", label: "使用日を指定" },
    ],
  },
  {
    key: "qty",
    label: "必要な数量は?",
    options: [
      { value: "small", label: "1〜9個" },
      { value: "mid", label: "10〜49個" },
      { value: "large", label: "50個以上" },
    ],
  },
];

export const DEFAULT_SUB = "デザインデータがあっても、なくても。必要な枚数と使用日から発注方法をチェック。";

/** 右側の訴求コピー。直近に選択した質問の回答に対応するコピーを表示する(実際の発送日・割引を保証する表現は使わない) */
export const HEADLINE_BY_ANSWER: Record<string, { headline: string; sub: string }> = {
  "design:data": {
    headline: "デザインがあるなら、すぐに発注準備。",
    sub: "入稿データを手元に、商品と条件を確認して進められます。",
  },
  "design:rough": {
    headline: "ラフ案があれば、そこから始められます。",
    sub: "ラフ案をもとに、進め方を決めていきましょう。",
  },
  "design:none": {
    headline: "デザインがなくても、オリジナルグッズを。",
    sub: "デザイン方法を決めてから、商品を選びます。",
  },
  "deadline:fastest": {
    headline: "イベントに間に合わせたい。急ぎの発注方法をチェック。",
    sub: "発送日と到着日は別です。確認のポイントを整理します。",
  },
  "deadline:date": {
    headline: "使用日から逆算して、発注の準備を。",
    sub: "発送日・到着日は商品や時期で異なります。注文前に表示された日付を見ておきましょう。",
  },
  "qty:small": {
    headline: "少しだけ作りたい。まず条件を確認。",
    sub: "少数での注文可否は商品ごとに異なります。",
  },
  "qty:mid": {
    headline: "仲間やチームの分をまとめて。条件を整理して発注。",
    sub: "サイズ・色ごとの内訳を決めておくとスムーズです。",
  },
  "qty:large": {
    headline: "クラス・サークル・企業のまとめ注文にも。",
    sub: "集金・承認・支払い方法など、事前確認のポイントを整理します。",
  },
};

export interface Guide {
  method: string;
  prepare: string[];
  deadline: string;
  ctaLead: string;
}

const METHOD: Record<DesignAnswer, string> = {
  data: "入稿データを使って、商品を選んで注文する流れが基本です。入稿の形式・サイズ・印刷位置は商品ごとの案内に従います。",
  rough: "ラフ案をもとに、デザインの進め方(自分で整える・相談するなど)を決めてから注文します。",
  none: "まずデザイン方法(自分で作る・相談するなど)を決めてから、商品を選んで注文します。",
};

const PREPARE_DESIGN: Record<DesignAnswer, string[]> = {
  data: ["入稿するデータ(ロゴ・イラスト等)", "他者の画像・ロゴを使う場合は、使用許諾・著作権の確認"],
  rough: ["ラフ案(手書き・文字案など)", "入れたい文言・色・配置のメモ", "他者の画像・ロゴを使う場合は、使用許諾・著作権の確認"],
  none: ["用途のイメージ(誰が・いつ・どこで使うか)", "入れたい文言や使いたい色", "著作権を侵害する画像・ロゴは使用できません"],
};

const PREPARE_QTY: Record<QtyAnswer, string> = {
  small: "少数での注文可否と1点あたりの条件(商品ごとに異なります)",
  mid: "サイズ・色ごとの内訳と、予備の要否",
  large: "集金・承認者・支払い方法と、サイズ・色ごとの内訳",
};

const CTA_LEAD: Record<DesignAnswer, string> = {
  data: "準備ができていれば、Up-Tで商品を選んで注文に進めます。",
  rough: "ラフ案を手元に、Up-Tで商品を選んで進められます。",
  none: "Up-Tで、商品を選んで注文に進めます。",
};

export const DEADLINE_NOTE_COMMON =
  "発送日と到着日は別です。発送日・到着日は商品・数量・時期・配送状況で異なるため、注文画面や商品ページの表示を必ずご確認ください。当ページでは納期の計算・保証は行っていません。";

export function buildGuide(a: Answers): Guide {
  const method = a.design ? METHOD[a.design] : "「デザインはありますか?」を選ぶと、発注方法の目安を表示します。";

  const prepare: string[] = [];
  if (a.design) prepare.push(...PREPARE_DESIGN[a.design]);
  const product = getProduct(a.product);
  if (product) prepare.push(...product.checks.slice(0, 2));
  if (a.qty) prepare.push(PREPARE_QTY[a.qty]);
  if (product && product.id !== "other") {
    prepare.push("選んだ商品の取り扱い・仕様は、Up-T公式の商品ページで確認");
  }
  if (prepare.length === 0) prepare.push("質問に答えると、事前に準備するものを表示します。");

  let deadline: string;
  if (a.deadline === "fastest") {
    deadline = `「最短」の発送日は、商品・時期・数量で異なります。商品ごとの発送目安の表示を確認してください。${DEADLINE_NOTE_COMMON}`;
  } else if (a.deadline === "date") {
    deadline =
      a.daysLeft === null
        ? "使用したい日を入力すると、確認のポイントを表示します。"
        : a.daysLeft < 0
          ? "入力された日付は過去です。使用日を確認してください。"
          : `本日から使用日まで、暦の上で${a.daysLeft}日です(納期の目安ではありません)。余裕を持った注文をおすすめします。${DEADLINE_NOTE_COMMON}`;
  } else {
    deadline = "「いつまでに必要ですか?」を選ぶと、納期確認のポイントを表示します。";
  }

  return {
    method,
    prepare,
    deadline,
    ctaLead: a.design ? CTA_LEAD[a.design] : "Up-T公式サイトで、商品と条件を確認できます。",
  };
}

export const FAQ_ITEMS = [
  {
    question: "「最短即日発送」はすべての商品が対象ですか?",
    answer:
      "対象は商品・条件によります。即日発送の対象商品や条件はUp-T公式の各商品ページでご確認ください。当ページでは納期の計算や保証は行っていません。",
  },
  {
    question: "発送日と到着日は同じですか?",
    answer:
      "異なります。発送日は商品の出荷日、到着日は配送状況によって変わります。注文画面や商品ページの表示をご確認ください。",
  },
  {
    question: "デザインがなくても注文できますか?",
    answer:
      "デザイン方法の選択肢はUp-T公式でご確認ください。当ページでは、デザインの有無に応じた事前準備の目安を整理しています。",
  },
  {
    question: "少数でも、まとめ注文でも頼めますか?",
    answer:
      "最低数量や数量ごとの条件は商品ごとに異なります。公式の商品ページでご確認ください。",
  },
  {
    question: "このページは広告ですか?",
    answer:
      "はい。このページはアフィリエイト広告(PR)を含みます。即納バンクは、条件整理のための情報を提供しており、制作・発送はUp-Tが行います。",
  },
];
