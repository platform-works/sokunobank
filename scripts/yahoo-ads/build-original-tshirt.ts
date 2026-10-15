/**
 * 即納バンク: オリジナルTシャツ（Up-T 送客LP）向け Yahoo!検索広告のインポート用ファイルを生成・検証する。
 * 実行: npm run ads:tshirt:build（esbuild でバンドルして node で実行）。
 * 生成先: docs/ads/<dir>/generated/ 。広告管理ツールへのアップロード・配信開始は行わない（全行オフ）。
 */
import { createHash } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { toCsv } from "./engine/csv";
import { normalizeForMatch } from "./engine/normalize";
import {
  PLACEHOLDER,
  allRows,
  buildYahooImportModel,
  expandToExportColumns,
  negativeBreakdown,
  serializeShiftJis,
  type YahooImportModel,
} from "./engine/import";
import { EXPORT_COLUMNS } from "./engine/export-columns";
import { UNVERIFIED, YAHOO_SPEC_CHECKED_AT } from "./engine/spec";
import type { Issue, ListingSiteConfig } from "./engine/types";
import { finalUrl, fullUrl } from "./engine/urls";
import { validateListing } from "./engine/validate";
import { validateYahooImport } from "./engine/validate-import";
import { weight } from "./engine/width";
import { ACCOUNT_ID, CAMPAIGN_NAME, ORIGINAL_TSHIRT, SETTINGS } from "./original-tshirt/master";

/** 生成の文脈。既定は オリジナルTシャツ(既存キャンペーン)。別キャンペーンは、設定・名称・出力先を渡して生成する */
export interface BuildContext {
  settings: typeof SETTINGS;
  campaignName: string;
  accountId: string;
  /** レポートの見出し用の名称(例: オリジナルTシャツ) */
  title: string;
  /** docs/ads/<dir>/generated に出力する */
  dir: string;
  /** マスターのファイルパス(手順書の表記用) */
  masterPath: string;
  /** 新規キャンペーンを取り込む旨の補足(手順書用) */
  itemNote: string;
}
export const TSHIRT_CONTEXT: BuildContext = {
  settings: SETTINGS,
  campaignName: CAMPAIGN_NAME,
  accountId: ACCOUNT_ID,
  title: "オリジナルTシャツ",
  dir: "original-tshirt",
  masterPath: "scripts/yahoo-ads/original-tshirt/master.ts",
  itemNote: "/lp/original-print/?item=tshirt&utm_source=yahoo…（全グループ item=tshirt。utm_content は広告グループ名）",
};

export interface Generated {
  name: string;
  content: string | Uint8Array;
}

const DECISION_LABEL = { initial: "初期候補", hold: "保留", exclude: "除外" } as const;

/** 初期配信の候補（広告グループ・キーワード）だけに絞った設定 */
function candidateOnly(cfg: ListingSiteConfig<string>): ListingSiteConfig<string> {
  const groups = cfg.adGroups.filter((g) => g.initialCandidate);
  const names = new Set(groups.map((g) => g.adGroupName));
  return { ...cfg, adGroups: groups, keywords: cfg.keywords.filter((k) => names.has(k.adGroupName) && k.decision === "initial") };
}

export function buildAll(
  cfg: ListingSiteConfig<string> = ORIGINAL_TSHIRT,
  ctx: BuildContext = TSHIRT_CONTEXT,
): { files: Generated[]; issues: Issue[]; model: YahooImportModel } {
  const { settings: SETTINGS_, campaignName: CAMPAIGN, accountId: ACCOUNT } = ctx;
  const model = buildYahooImportModel(cfg, SETTINGS_);
  const rows = allRows(model);
  const main = serializeShiftJis(model.header, rows);
  const full = expandToExportColumns(model.header, rows);
  const cand = candidateOnly(cfg);
  // 初期候補が0件のキャンペーン(全グループ保留)では、初期候補だけのファイルは作らない
  const candModel = cand.adGroups.length > 0 ? buildYahooImportModel(cand, SETTINGS_) : null;
  const sha = createHash("sha256").update(main.bytes).digest("hex");

  // 検証: 広告マスター（文字数・禁止語・広告とLPの整合）＋ 生成ファイルの読み戻し（実機の形式）
  const issues: Issue[] = [
    ...validateListing(cfg),
    ...validateYahooImport(main.bytes, cfg, SETTINGS_.campaignName, { allowOn: SETTINGS_.deliveryOn }),
    ...validateYahooImport(serializeShiftJis(full.header, full.rows).bytes, cfg, SETTINGS_.campaignName, { allowOn: SETTINGS_.deliveryOn }),
  ];
  if (main.unmappable.length) issues.push({ level: "error", code: "encoding", where: "yahoo-search-import.csv", message: `Shift_JIS に変換できない文字: ${main.unmappable.join(" ")}` });
  // 初期候補: 広告グループは最大2つ。意図の強さが low でなく、キーワードに商標を含まない
  if (cfg.adGroups.filter((g) => g.initialCandidate).length > 2) issues.push({ level: "error", code: "candidate_count", where: "adGroups", message: "初期配信の候補は、最大2広告グループ" });
  for (const k of cfg.keywords.filter((x) => x.decision === "initial"))
    if (k.intentStrength === "low") issues.push({ level: "error", code: "initial_low_intent", where: k.keywordId, message: "意図が弱いキーワードを初期候補にしている" });
  for (const w of [...cfg.wasteNegatives])
    for (const k of cfg.keywords)
      if (normalizeForMatch(k.keyword).includes(normalizeForMatch(w.word))) issues.push({ level: "error", code: "keyword_vs_negative", where: k.keywordId, message: `対象外キーワード「${w.word}」を含む` });
  issues.push({ level: "warn", code: "not_imported", where: "yahoo-search-import.csv", message: "キャンペーンエディターでの実機のインポートは未検証（静的検証のみ）" });
  for (const p of model.placeholders) issues.push({ level: "warn", code: "placeholder", where: "yahoo-search-import.csv", message: p });

  const errors = issues.filter((i) => i.level === "error");
  const nb = negativeBreakdown(cfg);
  const counts = (d: string) => cfg.keywords.filter((k) => k.decision === d).length;
  const files: Generated[] = [];
  const add = (name: string, content: string | Uint8Array) => files.push({ name, content });

  add("yahoo-search-import.csv", main.bytes);
  add("yahoo-search-import.utf8.csv", toCsv(model.header, rows));
  add("yahoo-search-import.full-columns.csv", serializeShiftJis(full.header, full.rows).bytes);
  if (candModel) add("yahoo-search-import.initial-candidates.csv", serializeShiftJis(candModel.header, allRows(candModel)).bytes);

  add(
    "keyword-classification.csv",
    toCsv(
      ["keyword_id", "keyword", "ad_group", "match_type", "intent_strength", "decision", "reason", "monthly_search_volume", "cpc_low_yen", "cpc_high_yen"],
      cfg.keywords.map((k) => [
        k.keywordId, k.keyword, k.adGroupName, k.matchType === "exact" ? "完全一致" : "フレーズ一致", k.intentStrength, DECISION_LABEL[k.decision], k.decisionReason,
        k.metrics.monthlySearchVolume, k.metrics.cpcLowYen, k.metrics.cpcHighYen,
      ]),
    ),
  );
  add(
    "negative-keywords.csv",
    toCsv(
      ["negative_keyword", "match_type", "kind", "source", "verified_with_asp"],
      [
        ...cfg.advertisers.flatMap((a) => a.ngWords.map((w) => [w.word, "部分一致", `禁止キーワード（${a.name}）`, w.source, w.verified ? "yes" : "no（編集部の点検）"])),
        ...cfg.wasteNegatives.map((w) => [w.word, "部分一致", "他社商標・無駄クリック抑制", w.reason, "no（編集部の案）"]),
      ],
    ),
  );
  add(
    "ad-group-copy.csv",
    toCsv(
      ["ad_group", "search_intent", "initial_candidate", "keyword_count", "max_title_units", "max_description_units", "titles", "descriptions", "final_url"],
      cfg.adGroups.map((g) => [
        g.adGroupName, g.searchIntent, g.initialCandidate ? "yes" : "no", cfg.keywords.filter((k) => k.adGroupName === g.adGroupName).length,
        Math.max(...g.headlines.map(weight)), Math.max(...g.descriptions.map(weight)), g.headlines.join(" / "), g.descriptions.join(" / "),
        fullUrl(cfg, g.campaignName, g.adGroupName, g.intent),
      ]),
    ),
  );
  add(
    "keyword-lp-map.csv",
    toCsv(
      ["keyword_id", "keyword", "ad_group", "decision", "lp_url", "final_url_with_tracking"],
      cfg.keywords.map((k) => {
        const g = cfg.adGroups.find((x) => x.adGroupName === k.adGroupName)!;
        return [k.keywordId, k.keyword, g.adGroupName, DECISION_LABEL[k.decision], finalUrl(cfg, g.intent), fullUrl(cfg, g.campaignName, g.adGroupName, g.intent)];
      }),
    ),
  );

  add(
    "import-validation-report.md",
    [
      `# Yahoo!検索広告（${ctx.title}）インポート検証レポート（自動生成・手で編集しない）`,
      "",
      `- 対象: キャンペーンエディターの「インポート」用ファイル（Shift_JIS・CRLF）。広告アカウント ${ACCOUNT}（即納バンク）に、**新規キャンペーン**として追加する。既存のキャンペーンは、変更しない`,
      `- 送客先: 即納バンクの広告LP ${cfg.baseUrl}（noindex）。送客先の広告主: Up-T（A8.net。リスティング一部OK）`,
      `- 形式: 公式ヘルプ（${YAHOO_SPEC_CHECKED_AT} 確認）＋実機のキャンペーンエディターのエクスポート形式（列名 ${EXPORT_COLUMNS.length}列。値・ID は流用しない）。必要な列 ${model.header.length}列／予備: 全列`,
      `- 構成: キャンペーン 1／広告グループ ${model.adGroups.length}／広告（RSA。見出し8・説明文4）${model.ads.length}／キーワード ${model.keywords.length}／対象外キーワード ${model.negatives.length}`,
      `- キーワードの採用判断: 初期候補 ${counts("initial")}／保留 ${counts("hold")}／除外 ${counts("exclude")}（初期候補は ${cand.adGroups.length} 広告グループ・完全一致）`,
      `- 対象外キーワード: 禁止語・表記揺れ ${nb.brandUnique}語＋他社商標・無駄クリック抑制 ${nb.wasteTotal}語 = ${nb.total}語`,
      SETTINGS_.deliveryOn
        ? "- 配信設定: **すべて「オン」**（運営者の指示 2026-10-15）。ファイルは生成のみ。アップロード・有効化は、人が予算・開始日を確認して行う"
        : "- 配信設定: すべて「オフ」。アップロード・配信開始・有効化は行わない",
      `- 静的検証: エラー ${errors.length}／警告 ${issues.length - errors.length}`,
      "- **実機検証（キャンペーンエディターへのインポート）: 未実施。「インポート検証成功」とは断定しない**",
      "",
      "## 禁止キーワード（A8.net 案件情報 2026-10-11）",
      "- Up-T: up-t／アップティー／upt／あっぷてぃー。リスティング一部OK（禁止キーワードを対象外に設定すれば可）",
      "- キーワード・広告文・見出し・説明文・URL に含めない。ひらがな・カタカナ・ローマ字・空白・ドメインを除外に登録。略称・打ち間違いは、配信後に検索語句レポートで確認する",
      "- 広告文に、「公式」・価格・割引・最短・即日・無料・No.1 を使わない（A8.net ヘルプ・Up-T 公式で未確認）",
      "",
      "## 仮値（正式な設定ではない）",
      ...(model.placeholders.length ? model.placeholders.map((p) => `- ${p}`) : ["- なし"]),
      `- 運営者が承認した予算・入札価格・開始日を \`${ctx.masterPath}\` の SETTINGS に入力して、再生成する`,
      "",
      "## 未確認の事項",
      ...UNVERIFIED.map((u) => `- ${u}`),
      "- 検索ボリューム・想定CPC（未取得。null）。競合が多い領域のため、少額での検証が前提",
      "- LINEヤフー広告の広告掲載基準（アフィリエイト送客LP）。ASP の許可（一部OK）とは別",
      "- Up-T の納期・料金・取扱いの公式情報（広告文には書かない）",
      "",
      "## 検証結果",
      ...(issues.length ? issues.map((i) => `- [${i.level}] ${i.code} ${i.where}: ${i.message}`) : ["- 指摘なし"]),
      "",
    ].join("\n"),
  );

  add(
    "import-rehearsal-checklist.md",
    [
      `# キャンペーンエディター 実機インポート検証の手順（即納バンク・${ctx.title}・自動生成）`,
      "",
      "- 実機検証の状況: **未実施**",
      `- 対象の広告アカウント: **即納バンク（${ACCOUNT}）**。新規キャンペーン「${CAMPAIGN}」を追加する形で取り込む。既存のキャンペーン（プロジェクター・発電機・オフィスチェア・PCモニター等）は、変更しない`,
      "- **広告費が発生するのは、広告配信が始まったときだけ。ローカルへのインポート・プレビューでは、発生しない。「アップロード」は押さない。**",
      "",
      "## 対象ファイル（`docs/ads/original-tshirt/generated/`）",
      `- 第一候補: \`yahoo-search-import.csv\`（Shift_JIS・CRLF・${rows.length + 1}行［ヘッダー含む］・${model.header.length}列・${main.bytes.length}バイト）`,
      `- SHA-256: \`${sha}\`（取り込むファイルが、この値と一致することを確認する。PowerShell: \`Get-FileHash <ファイル> -Algorithm SHA256\`）`,
      "- 予備（列の対応・必須項目のエラーが残る場合）: `yahoo-search-import.full-columns.csv`（実機のエクスポートと同じ全列。ID・状況の列は空）",
      candModel
        ? `- 初期候補だけ: \`yahoo-search-import.initial-candidates.csv\`（${cand.adGroups.length}広告グループ・${candModel.keywords.length}キーワード）`
        : "- 初期候補: なし(全広告グループ・キーワードが保留。初期配信の候補を決めてから、別ファイルで取り込む)",
      `- 配信設定は、すべて「${SETTINGS_.deliveryOn ? "オン" : "オフ"}」。予算（${SETTINGS_.dailyBudgetYen ?? PLACEHOLDER.dailyBudgetYen}円）・入札価格（${SETTINGS_.adGroupBidYen ?? PLACEHOLDER.bidYen}円）・開始日（${SETTINGS_.startDate}）は、**検証用の仮値**（承認済みの設定ではない）`,
      "",
      "## 事前の確認",
      `- [ ] アカウント **${ACCOUNT}** を選択している`,
      "- [ ] SHA-256 が一致している",
      `- [ ] アカウント内に、同名のキャンペーン「${CAMPAIGN}」がない`,
      "",
      "## 手順（人が実施。ローカルのインポートまで）",
      "1. キャンペーンエディターで、即納バンクのアカウントを開き、**最新のデータをダウンロード**しておく（既存のキャンペーンを上書きしないため）。",
      "2. 「インポート」→ ファイルを選ぶ → **文字エンコードが「Shift_JIS」**であることを確認 →「プレビュー」。",
      "3. 項目名の対応を確認する（対応していない列は、「…」から正しい項目を選び、選んだ内容を記録する）。",
      "4. 問題がなければ「データのインポート」→ 内容を確認 →「実行」。",
      "5. 新規キャンペーンの、キャンペーン・広告グループ・広告・キーワード・対象外キーワードを開き、**赤いセル・入力値エラー**がないかを確認する。",
      SETTINGS_.deliveryOn
        ? "6. 配信設定が「オン」になっている。**アップロードすると、開始日から配信が始まり、広告費が発生する。** 予算・開始日・入札価格を、必ず確認する。"
        : "6. すべての配信状況が「オフ」であることを確認する。",
      SETTINGS_.deliveryOn
        ? "7. 確認が終わったら、予算・開始日・入札価格を承認した値にしてから「アップロード」する。確認だけの場合は、アップロードせずに終了する（取り込んだデータは、エディター上で削除できる）。"
        : "7. **「アップロード」は押さない。** 確認が終わったら、そのまま終了する（取り込んだ新規キャンペーンを破棄する場合は、エディター上で削除する。ローカルのデータ）。",
      "",
      "## 確認する期待値",
      "| 場所 | 項目 | 期待する値 |",
      "|---|---|---|",
      "| キャンペーン | 検索クエリーマッチング | 利用しない |",
      `| キャンペーン | 開始日・1日の予算・配信設定 | ${SETTINGS_.startDate}（仮値）・${SETTINGS_.dailyBudgetYen ?? PLACEHOLDER.dailyBudgetYen}円（仮値）・オフ |`,
      "| 広告グループ | 入札価格・入札戦略タイプ | 仮値・個別クリック単価 |",
      "| 広告 | 見出し1〜13（初期2グループ。他は1〜8）・説明文1〜4・表示位置 | 文字数エラーなし・固定しない |",
      `| 広告 | 最終リンク先URL | ${ctx.itemNote} |`,
      "| 対象外キーワード | 広告グループ名・マッチタイプ | キャンペーンレベル・部分一致 |",
      "",
      "## 赤いエラーが出た場合",
      "1. 行・列・メッセージを、スクリーンショットで記録して共有する。",
      "2. 生成ロジック（scripts/yahoo-ads/engine/）を修正して、再生成する。予備の全列ファイルで、切り分ける。",
      "",
    ].join("\n"),
  );

  return { files, issues, model };
}

function main() {
  const out = join(process.cwd(), "docs", "ads", TSHIRT_CONTEXT.dir, "generated");
  const { files, issues } = buildAll();
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  for (const f of files) writeFileSync(join(out, f.name), f.content);
  const errors = issues.filter((i) => i.level === "error");
  console.log(`生成: ${out}（${files.length}ファイル）`);
  console.log(`検証: エラー ${errors.length} / 警告 ${issues.length - errors.length}`);
  for (const i of issues) console.log(`  [${i.level}] ${i.code} ${i.where}: ${i.message}`);
  process.exit(errors.length ? 1 : 0);
}

// テストから import されたときは、実行しない
if (process.argv[1] && /build-original-tshirt/.test(process.argv[1])) main();
