import type { EcSource, LicenseCapability, LicenseEntry, LicenseRegistry, PublishDecision, ReviewRecord } from "./types";

const unverified = (why: string): LicenseEntry => ({ status: "unverified", basis: why });
const denied = (why: string): LicenseEntry => ({ status: "denied", basis: why });
const NO_TEXT = "公式APIにレビュー本文の提供経路が確認できない";

/**
 * 許諾レジストリ(2026-10-24時点の調査結果、docs/review-intelligence-api-survey.md参照)。
 * 方針: 公式ドキュメントで確認できたものだけ allowed。確認できないものは unverified(=不許可扱い)。
 * 規約確認が取れたらここだけを更新する。
 */
export const LICENSE_REGISTRY: LicenseRegistry = {
  yahoo: {
    fetchAggregate: { status: "allowed", basis: "商品検索API v3 の hits/review/rate・count(公式、既存実装で利用中)" },
    publishAggregate: unverified("商品カードへの星評価表示は既存運用だが、独自分析としての再公開範囲は規約で未確認"),
    fetchText: denied("レビュー検索API(reviewSearch)は提供終了済み"),
    analyzeText: denied(NO_TEXT),
    storeText: denied(NO_TEXT),
    publishText: denied(NO_TEXT),
    publishImage: unverified("画像URLの表示条件(出典・リンク併設)を規約で未確認"),
  },
  rakuten: {
    fetchAggregate: { status: "allowed", basis: "市場商品検索API の reviewCount・reviewAverage(公式ドキュメント)" },
    publishAggregate: unverified("楽天ウェブサービス利用規約の表示条件が未確認"),
    fetchText: unverified("公式ドキュメントの出力項目に本文なし。別経路は未確認"),
    analyzeText: unverified(NO_TEXT),
    storeText: unverified(NO_TEXT),
    publishText: unverified(NO_TEXT),
    publishImage: unverified("画像の表示条件・クレジット表記を規約で未確認"),
  },
  amazon: {
    fetchAggregate: unverified("Creators API GetItems のドキュメントにレビュー評価・件数リソースの記載なし"),
    publishAggregate: unverified("同上"),
    fetchText: denied("スクレイピングは規約違反。公式APIに本文なし"),
    analyzeText: denied(NO_TEXT),
    storeText: denied(NO_TEXT),
    publishText: denied(NO_TEXT),
    publishImage: denied("検索結果からの画像取得・自社ホスティングは運営規約違反(CLAUDE.md参照)。Creators API利用可能後のみ"),
  },
};

export function isAllowed(source: EcSource, cap: LicenseCapability, reg: LicenseRegistry = LICENSE_REGISTRY): boolean {
  return reg[source][cap].status === "allowed";
}

/** 本文解析の対象にできるレビューだけを残す。許諾がない取得元の本文は解析に入れない */
export function filterAnalyzable(reviews: ReviewRecord[], reg: LicenseRegistry = LICENSE_REGISTRY) {
  const kept: ReviewRecord[] = [];
  let denied = 0;
  for (const r of reviews) {
    if (isAllowed(r.source, "fetchText", reg) && isAllowed(r.source, "analyzeText", reg)) kept.push(r);
    else denied++;
  }
  return { kept, denied };
}

/** 公開可否。許諾が未確認・不許可の項目を表示しようとしている場合は blockers に積む */
export function decidePublish(params: {
  sources: EcSource[];
  showsReviewText: boolean;
  showsAggregate: boolean;
  showsImages: boolean;
  hadApiError: boolean;
  reg?: LicenseRegistry;
}): PublishDecision {
  const reg = params.reg ?? LICENSE_REGISTRY;
  const blockers: string[] = [];
  if (params.hadApiError) blockers.push("API取得エラーまたは規約違反の疑いがあるため自動公開を停止");
  for (const s of params.sources) {
    if (params.showsReviewText && !isAllowed(s, "publishText", reg)) blockers.push(`${s}: レビュー本文の公開許諾なし`);
    if (params.showsAggregate && !isAllowed(s, "publishAggregate", reg)) blockers.push(`${s}: 評価集計の公開許諾が未確認`);
    if (params.showsImages && !isAllowed(s, "publishImage", reg)) blockers.push(`${s}: 商品画像の表示許諾が未確認`);
  }
  return { publishable: blockers.length === 0, blockers };
}

export function licenseSummary(sources: EcSource[], reg: LicenseRegistry = LICENSE_REGISTRY): string {
  return sources
    .map(
      (s) =>
        `${s}[集計取得:${reg[s].fetchAggregate.status}/集計公開:${reg[s].publishAggregate.status}/本文解析:${reg[s].analyzeText.status}/本文公開:${reg[s].publishText.status}/画像:${reg[s].publishImage.status}]`
    )
    .join(" ");
}
