import type { ListingSiteConfig } from "./types";
import { fullUrl } from "./urls";
import { toCsvBody } from "./csv-body";
import { EXPORT_COLUMNS } from "./export-columns";
import {
  CAMPAIGN_TYPE_STANDARD,
  COL,
  COMPONENT,
  DATE_PATTERN,
  EXPORT_VALUES,
  LIMITS,
  MATCH,
  NEGATIVE_MATCH,
  STATUS,
} from "./spec";
import { encodeShiftJis } from "./sjis";

/** キャンペーン設定（サイト側で管理）。null は「未確定」。推測値を正式設定にしない */
export interface YahooCampaignSettings {
  campaignName: string;
  /** 1日の予算（円・100円単位）。未確定は null */
  dailyBudgetYen: number | null;
  /** 広告グループの入札価格（円）。未確定は null */
  adGroupBidYen: number | null;
  searchScreen: "全て" | "ウェブサイト検索のみ";
  preferBest: "優先する" | "優先しない";
  /**
   * 開始日（YYYY/MM/DD）。実機のエクスポート形式では入力がある。**承認済みの配信開始日ではない**。
   * startDateProvisional が true の間は、検証用の仮値（配信設定はオフのため、配信は始まらない）。承認後に、運営者が置き換える。
   */
  startDate: string;
  startDateProvisional: boolean;
  /** 運営者の、配信開始の承認。明示的な承認があるまで false */
  operatorApproved?: boolean;
  /**
   * 配信設定を「オン」で生成するか。運営者が明示的に承認した場合だけ true にする(既定は false = 全行オフ)。
   * true のときも、広告管理ツールへのアップロード・有効化は行わない(人が、予算・開始日を確認して行う)。
   */
  deliveryOn?: boolean;
}

/** 未確定の予算・入札の代わりに入れる値。ヘルプに記載の「最小値」で、配信設定はオフ。正式な設定として扱わない */
export const PLACEHOLDER = { dailyBudgetYen: LIMITS.dailyBudgetStepYen, bidYen: LIMITS.bidYen.min } as const;

/**
 * 対象外キーワードの重複判定のキー。全角半角・大文字小文字の違いだけを吸収し、**ひらがな・カタカナ・ハイフン・空白は区別する**。
 * （媒体が、「up-t」と「upt」、「アップティー」と「あっぷてぃー」、「アップ ティー」と「アップティー」を同一視するとは限らない。
 * 広告主の禁止語は、それぞれ登録する）
 */
export function negativeKey(word: string): string {
  return word.normalize("NFKC").toLowerCase().trim();
}

/** 生成エラー: 必須の設定が不足している（推測で補わない） */
export class YahooGenerationError extends Error {}

/** 使う列。実機のエクスポートの列名・順序に合わせる（公式ヘルプの列名は使わない） */
const USED_COLUMNS = new Set<string>([
  COL.campaign, COL.adGroup, COL.component, COL.status, COL.matchType, COL.keyword, COL.bid, COL.adName,
  COL.finalUrl, COL.dailyBudget, COL.queryMatching, COL.startDate, COL.bidStrategy, COL.campaignType, COL.searchScreen,
  COL.preferBest, COL.geoMode, COL.targetUsers, COL.pcAdj, COL.spAdj, COL.tabletAdj, COL.adType,
]);

/** タイトル（最大15）・説明文（最大4）の列数に応じた、使う列（実機のエクスポートの列名・順序） */
export function importHeader(titles: number, descriptions: number): string[] {
  if (titles < 3 || titles > 15) throw new YahooGenerationError(`タイトルの数が3〜15ではない: ${titles}`);
  if (descriptions < 2 || descriptions > 4) throw new YahooGenerationError(`説明文の数が2〜4ではない: ${descriptions}`);
  const used = new Set(USED_COLUMNS);
  for (let n = 1; n <= titles; n++) [COL.title(n), COL.titlePos(n)].forEach((c) => used.add(c));
  for (let n = 1; n <= descriptions; n++) [COL.description(n), COL.descriptionPos(n)].forEach((c) => used.add(c));
  return EXPORT_COLUMNS.filter((c) => used.has(c));
}

/** 既定（タイトル3・説明文2）の列。互換用 */
export const IMPORT_HEADER: string[] = importHeader(3, 2);

type Row = string[];
function rowTools(header: string[]) {
  const blank = (): Row => header.map(() => "");
  const set = (r: Row, h: string, v: string | number) => {
    const i = header.indexOf(h);
    if (i < 0) throw new YahooGenerationError(`列がない（実機の列名と一致しない）: ${h}`);
    r[i] = String(v);
  };
  return { blank, set };
}

export interface YahooImportModel {
  header: string[];
  campaign: Row[];
  adGroups: Row[];
  ads: Row[];
  keywords: Row[];
  negatives: Row[];
  /** 仮値を使った項目（レポートに出す） */
  placeholders: string[];
}

const MATCH_LABEL = { phrase: MATCH.phrase, exact: MATCH.exact } as const;

/** 広告マスターから、インポート用の行を作る。すべて配信設定「オフ」。必須の設定が不足していれば、生成エラー */
export function buildYahooImportModel(yahooCfg: ListingSiteConfig, settings: YahooCampaignSettings): YahooImportModel {
  if (!settings.campaignName.trim()) throw new YahooGenerationError("キャンペーン名が未設定");
  if (!DATE_PATTERN.test(settings.startDate ?? "")) throw new YahooGenerationError(`開始日が YYYY/MM/DD ではない（または未設定）: ${settings.startDate}`);
  const groups = yahooCfg.adGroups.filter((g) => g.campaignName === settings.campaignName);
  if (groups.length === 0) throw new YahooGenerationError(`キャンペーン「${settings.campaignName}」に、広告グループがない`);

  // 広告グループごとのタイトル・説明文の数（最大）に応じて、列を決める
  const nTitles = Math.max(...groups.map((g) => g.headlines.length));
  const nDescs = Math.max(...groups.map((g) => g.descriptions.length));
  const header = importHeader(nTitles, nDescs);
  const { blank, set } = rowTools(header);
  const STATE = settings.deliveryOn ? STATUS.on : STATUS.off;

  const placeholders: string[] = [];
  const budget = settings.dailyBudgetYen ?? (placeholders.push(`1日の予算: 仮値 ${PLACEHOLDER.dailyBudgetYen}円（未確定）`), PLACEHOLDER.dailyBudgetYen);
  const bid = settings.adGroupBidYen ?? (placeholders.push(`広告グループの入札価格: 仮値 ${PLACEHOLDER.bidYen}円（未確定）`), PLACEHOLDER.bidYen);
  if (settings.startDateProvisional)
    placeholders.push(
      settings.deliveryOn
        ? `開始日: 仮値 ${settings.startDate}（未承認。配信設定は「オン」のため、この日付から配信が始まる。承認後に置き換える）`
        : `開始日: 仮値 ${settings.startDate}（検証用。承認済みの配信開始日ではない。配信設定はオフ）`,
    );

  const c = blank();
  set(c, COL.campaign, settings.campaignName);
  set(c, COL.component, COMPONENT.campaign);
  set(c, COL.status, STATE);
  set(c, COL.dailyBudget, budget);
  set(c, COL.queryMatching, EXPORT_VALUES.queryMatching);
  set(c, COL.startDate, settings.startDate);
  set(c, COL.bidStrategy, EXPORT_VALUES.bidStrategy);
  set(c, COL.campaignType, CAMPAIGN_TYPE_STANDARD);
  set(c, COL.searchScreen, settings.searchScreen);
  set(c, COL.geoMode, EXPORT_VALUES.geoMode);
  set(c, COL.pcAdj, EXPORT_VALUES.adjustment);
  set(c, COL.spAdj, EXPORT_VALUES.adjustment);
  set(c, COL.tabletAdj, EXPORT_VALUES.adjustment);
  set(c, COL.targetUsers, EXPORT_VALUES.targetUsers);

  const adGroups: Row[] = [];
  const ads: Row[] = [];
  const keywords: Row[] = [];
  for (const g of groups) {
    const ag = blank();
    set(ag, COL.campaign, settings.campaignName);
    set(ag, COL.adGroup, g.adGroupName);
    set(ag, COL.component, COMPONENT.adGroup);
    set(ag, COL.status, STATE);
    set(ag, COL.bid, g.bidYen ?? bid);
    set(ag, COL.queryMatching, EXPORT_VALUES.queryMatching);
    set(ag, COL.bidStrategy, EXPORT_VALUES.bidStrategy);
    set(ag, COL.campaignType, CAMPAIGN_TYPE_STANDARD);
    set(ag, COL.preferBest, settings.preferBest);
    set(ag, COL.targetUsers, EXPORT_VALUES.targetUsers);
    adGroups.push(ag);

    const ad = blank();
    set(ad, COL.campaign, settings.campaignName);
    set(ad, COL.adGroup, g.adGroupName);
    set(ad, COL.component, COMPONENT.ad);
    set(ad, COL.status, STATE);
    set(ad, COL.adName, `${g.adGroupName}_rsa_v1`);
    g.headlines.forEach((h, i) => {
      set(ad, COL.title(i + 1), h);
      set(ad, COL.titlePos(i + 1), EXPORT_VALUES.position);
    });
    g.descriptions.forEach((d, i) => {
      set(ad, COL.description(i + 1), d);
      set(ad, COL.descriptionPos(i + 1), EXPORT_VALUES.position);
    });
    set(ad, COL.finalUrl, fullUrl(yahooCfg, settings.campaignName, g.adGroupName, g.intent));
    set(ad, COL.adType, EXPORT_VALUES.adType);
    ads.push(ad);

    for (const k of yahooCfg.keywords.filter((x) => x.adGroupName === g.adGroupName)) {
      const kw = blank();
      set(kw, COL.campaign, settings.campaignName);
      set(kw, COL.adGroup, g.adGroupName);
      set(kw, COL.component, COMPONENT.keyword);
      set(kw, COL.status, STATE);
      set(kw, COL.matchType, MATCH_LABEL[k.matchType]);
      set(kw, COL.keyword, k.keyword);
      set(kw, COL.bid, "一括入札"); // 広告グループの入札価格を適用（ヘルプ記載の値。実機で未確認）
      keywords.push(kw);
    }
  }

  // 対象外キーワード（キャンペーン）: 配信設定は空欄（ヘルプの指定）。広告グループ名は、実機のエクスポートに合わせて「キャンペーンレベル」
  const seen = new Set<string>();
  const negatives: Row[] = [];
  const addNegative = (word: string) => {
    const key = negativeKey(word);
    if (seen.has(key)) return;
    seen.add(key);
    const n = blank();
    set(n, COL.campaign, settings.campaignName);
    set(n, COL.adGroup, EXPORT_VALUES.campaignLevel);
    set(n, COL.component, COMPONENT.negativeCampaign);
    set(n, COL.matchType, NEGATIVE_MATCH);
    set(n, COL.keyword, word);
    negatives.push(n);
  };
  // 広告主の商標・社名・サービス名・サイト名と表記揺れ
  for (const a of yahooCfg.advertisers) for (const w of a.ngWords) addNegative(w.word);
  // 無駄なクリックを抑える対象外キーワード（資格のない検索者・情報収集・別の職種）
  for (const w of yahooCfg.wasteNegatives ?? []) addNegative(w.word);

  return { header, campaign: [c], adGroups, ads, keywords, negatives, placeholders };
}

/** 対象外キーワードの件数の内訳（マスターとの照合用） */
export function negativeBreakdown(yahooCfg: ListingSiteConfig): { brandTotal: number; brandUnique: number; wasteTotal: number; overlap: number; total: number } {
  const brand = yahooCfg.advertisers.flatMap((a) => a.ngWords.map((w) => negativeKey(w.word)));
  const waste = (yahooCfg.wasteNegatives ?? []).map((w) => negativeKey(w.word));
  const brandUnique = new Set(brand);
  const wasteUnique = new Set(waste);
  const overlap = [...wasteUnique].filter((w) => brandUnique.has(w)).length;
  return { brandTotal: brand.length, brandUnique: brandUnique.size, wasteTotal: waste.length, overlap, total: brandUnique.size + wasteUnique.size - overlap };
}

/** CSV（Shift_JIS・CRLF・BOMなし）にする。変換できない文字があれば、その一覧も返す */
export function serializeShiftJis(header: string[], rows: Row[]): { bytes: Uint8Array; unmappable: string[] } {
  const r = encodeShiftJis(toCsvBody(header, rows));
  return { bytes: r.bytes, unmappable: r.unmappable };
}

export function allRows(m: YahooImportModel): Row[] {
  return [...m.campaign, ...m.adGroups, ...m.ads, ...m.keywords, ...m.negatives];
}

/** 使う列だけの行を、実機のエクスポートの全列（141列）に展開する（予備の形式。ID・状況の列は空） */
export function expandToExportColumns(header: string[], rows: Row[]): { header: string[]; rows: Row[] } {
  const pos = header.map((h) => EXPORT_COLUMNS.indexOf(h));
  return {
    header: [...EXPORT_COLUMNS],
    rows: rows.map((r) => {
      const out = EXPORT_COLUMNS.map(() => "");
      r.forEach((v, i) => {
        if (pos[i] >= 0) out[pos[i]] = v;
      });
      return out;
    }),
  };
}
