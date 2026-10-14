import { containsTerm } from "./normalize";
import type { Issue, ListingSiteConfig } from "./types";
import { weight } from "./width";
import { parseCsv } from "./csv-parse";
import { EXPORT_COLUMNS, ID_COLUMNS } from "./export-columns";
import { decodeShiftJis, encodeShiftJis, urlBytes } from "./sjis";
import {
  ALL_COMPONENTS,
  BID_STRATEGIES,
  COL,
  COMPONENT,
  DATE_PATTERN,
  EXPORT_VALUES,
  LIMITS,
  MATCH,
  NEGATIVE_MATCH,
  POSITIONS,
  PREFER_BEST,
  QUERY_MATCHING_KNOWN,
  REQUIRED_COLUMNS,
  SEARCH_SCREEN,
  STATUS,
} from "./spec";

const err = (code: string, where: string, message: string): Issue => ({ level: "error", code, where, message });

const GOOGLE_ONLY_HEADERS = ["Campaign", "Ad Group", "Keyword", "Criterion Type", "Headline 1", "Description 1", "Final URL", "Path 1", "Status"];

/** 公式ヘルプの列名と、実機のエクスポートの列名が違うもの（実機の列名を使う） */
const RENAMED: Record<string, string> = { "入札戦略": "入札戦略タイプ", "タイトル1": "アセット（タイトル1）", "リンク先URL": "最終リンク先URL" };

/**
 * 生成したインポート用ファイル（Shift_JIS のバイト列）を、読み戻して検証する。
 * 検証の基準は、(1) 公式ヘルプの仕様、(2) 実機のキャンペーンエディターのエクスポート形式（列名・必須の設定。spec.ts / export-columns.ts）。
 * 過去に、公式ヘルプだけを基準にして、実機で入力値エラー（検索クエリーマッチング・開始日・入札戦略タイプなどの未入力）になった。
 * 実機（キャンペーンエディター）でのインポートの代わりにはならない。
 */
export function validateYahooImport(bytes: Uint8Array, yahooCfg: ListingSiteConfig, campaignName: string): Issue[] {
  const out: Issue[] = [];
  const text = decodeShiftJis(bytes);

  // 文字コード: Shift_JIS で往復して一致すること（変換不能な文字・文字化けがない）。改行は CRLF
  const re = encodeShiftJis(text);
  if (re.unmappable.length) out.push(err("encoding", "file", `Shift_JIS に変換できない文字: ${re.unmappable.join(" ")}`));
  if (re.bytes.length !== bytes.length || re.bytes.some((b, i) => b !== bytes[i])) out.push(err("encoding_roundtrip", "file", "Shift_JIS の往復変換が一致しない"));
  if (text.includes("�")) out.push(err("encoding", "file", "文字化け（置換文字）を含む"));
  if (bytes[0] === 0xef && bytes[1] === 0xbb) out.push(err("bom", "file", "BOM つき UTF-8。Shift_JIS のファイルにする"));
  if (/(^|[^\r])\n/.test(text)) out.push(err("newline", "file", "CRLF ではない改行（LF のみ）を含む"));

  let rows: string[][];
  try {
    rows = parseCsv(text);
  } catch (e) {
    return [...out, err("csv_parse", "file", String(e))];
  }
  const header = rows[0] ?? [];
  const body = rows.slice(1);
  const col = (h: string) => header.indexOf(h);

  // ヘッダー: 実機のエクスポートの列名だけ。公式ヘルプの別名・Google の列名・不明な列名を、エラーにする
  if (new Set(header).size !== header.length) out.push(err("header_dup", "header", "列名が重複"));
  for (const h of header) {
    if (GOOGLE_ONLY_HEADERS.includes(h)) out.push(err("google_header", h, `Google 広告エディタの列名が混入: ${h}`));
    else if (!EXPORT_COLUMNS.includes(h))
      out.push(err("unknown_header", h, `実機のエクスポートにない列名: 「${h}」${RENAMED[h] ? `（実機の列名は「${RENAMED[h]}」）` : ""}`));
  }
  const requiredAll = [...new Set(Object.values(REQUIRED_COLUMNS).flat())];
  for (const h of requiredAll) if (col(h) < 0) out.push(err("header_missing", h, `必須の列がない: ${h}`));
  for (const r of body)
    if (r.length !== header.length) out.push(err("column_count", `行${body.indexOf(r) + 2}`, `列数が ${header.length} ではない（${r.length}）`));

  const get = (r: string[], h: string) => (col(h) >= 0 ? (r[col(h)] ?? "") : "");
  const where = (r: string[], i: number) => `行${i + 2} ${get(r, COL.component)} ${get(r, COL.adGroup) || get(r, COL.campaign)}`;

  // ID: 新規作成では、空（別アカウントの ID を持ち込まない）
  for (const h of ID_COLUMNS)
    if (col(h) >= 0 && body.some((r) => get(r, h) !== "")) out.push(err("id_reuse", h, `新規作成のファイルに、ID の値がある（別アカウントの ID の流用を避ける）: ${h}`));

  const campaigns = new Set<string>();
  const groups = new Set<string>();
  const adNames = new Set<string>();
  const ngTerms = yahooCfg.advertisers.flatMap((a) => a.ngWords.map((w) => ({ ...w, advertiser: a.name })));
  const intentOf = new Map(yahooCfg.adGroups.map((g) => [g.adGroupName, g.intent]));
  const keywordCountByGroup = new Map<string, number>();
  const adCountByGroup = new Map<string, number>();
  let campaignRow: string[] | null = null;

  const requireCols = (cols: readonly string[], r: string[], w: string) => {
    for (const h of cols) if (col(h) >= 0 && get(r, h) === "") out.push(err("required_blank", w, `入力が必要な項目が空（実機で入力値エラーになる）: ${h}`));
  };

  body.forEach((r, i) => {
    const w = where(r, i);
    const comp = get(r, COL.component);
    const status = get(r, COL.status);
    const camp = get(r, COL.campaign);
    const group = get(r, COL.adGroup);

    if (!ALL_COMPONENTS.includes(comp)) out.push(err("component", w, `コンポーネントの種類が仕様にない: 「${comp}」`));
    if (!camp) out.push(err("campaign_name", w, "キャンペーン名が空（全てのコンポーネントで必須）"));
    if (camp.length > LIMITS.nameChars || group.length > LIMITS.nameChars) out.push(err("name_len", w, `名称が${LIMITS.nameChars}文字を超える`));
    if (camp !== campaignName) out.push(err("campaign_mismatch", w, `想定外のキャンペーン名: ${camp}`));

    // 配信設定: すべてオフ（対象外キーワードは空欄）
    if (comp === COMPONENT.negativeCampaign || comp === COMPONENT.negativeAdGroup) {
      if (status !== "") out.push(err("status", w, "対象外キーワードの配信設定は空欄にする（ヘルプ）"));
    } else if (status === STATUS.on) out.push(err("status_on", w, "配信設定が「オン」。入稿時に配信が始まる状態にしない"));
    else if (status !== STATUS.off) out.push(err("status", w, `配信設定が「オフ」ではない: 「${status}」`));

    if (comp === COMPONENT.campaign) {
      campaignRow = r;
      requireCols(REQUIRED_COLUMNS.campaign, r, w);
      if (campaigns.has(camp)) out.push(err("dup_campaign", w, `キャンペーン名が重複: ${camp}`));
      campaigns.add(camp);
      const b = Number(get(r, COL.dailyBudget));
      if (!Number.isInteger(b) || b < 100 || b % LIMITS.dailyBudgetStepYen !== 0) out.push(err("budget", w, `1日の予算が100円以上・100円単位ではない: ${get(r, COL.dailyBudget)}`));
      if (!(BID_STRATEGIES as readonly string[]).includes(get(r, COL.bidStrategy))) out.push(err("bid_strategy", w, `入札戦略タイプが不正: ${get(r, COL.bidStrategy)}`));
      if (!(SEARCH_SCREEN as readonly string[]).includes(get(r, COL.searchScreen))) out.push(err("search_screen", w, `広告を表示する検索画面が不正: ${get(r, COL.searchScreen)}`));
      if (!DATE_PATTERN.test(get(r, COL.startDate))) out.push(err("start_date", w, `開始日が YYYY/MM/DD ではない: ${get(r, COL.startDate)}`));
      if (get(r, COL.endDate) !== "" && !DATE_PATTERN.test(get(r, COL.endDate))) out.push(err("end_date", w, `終了日が YYYY/MM/DD ではない: ${get(r, COL.endDate)}`));
      for (const h of [COL.pcAdj, COL.spAdj, COL.tabletAdj]) {
        const n = Number(get(r, h));
        if (!Number.isInteger(n) || n < -100 || n > 900) out.push(err("adjustment", w, `${h}が、-100〜900 の整数ではない: ${get(r, h)}`));
      }
      if (get(r, COL.geoMode) !== EXPORT_VALUES.geoMode) out.push(err("geo_mode", w, "配信地域判定が、実機の既定の値（配信設定なし…）と異なる"));
    }

    // 検索クエリーマッチング・入札戦略タイプ・配信対象ユーザー: 値の確認
    if (comp === COMPONENT.campaign || comp === COMPONENT.adGroup) {
      if (get(r, COL.queryMatching) !== "" && !(QUERY_MATCHING_KNOWN as readonly string[]).includes(get(r, COL.queryMatching)))
        out.push(err("query_matching", w, `検索クエリーマッチングの値が、実機で確認できた値（${QUERY_MATCHING_KNOWN.join("・")}）ではない: ${get(r, COL.queryMatching)}`));
      if (get(r, COL.targetUsers) !== "" && get(r, COL.targetUsers) !== EXPORT_VALUES.targetUsers)
        out.push(err("target_users", w, `配信対象ユーザーが「${EXPORT_VALUES.targetUsers}」ではない: ${get(r, COL.targetUsers)}`));
    }

    if (comp === COMPONENT.adGroup) {
      requireCols(REQUIRED_COLUMNS.adGroup, r, w);
      const key = `${camp}\u0000${group}`;
      if (!group) out.push(err("group_name", w, "広告グループ名が空"));
      if (groups.has(key)) out.push(err("dup_group", w, `広告グループ名が重複: ${group}`));
      groups.add(key);
      const b = Number(get(r, COL.bid));
      if (!Number.isInteger(b) || b < LIMITS.bidYen.min || b > LIMITS.bidYen.max) out.push(err("bid", w, `入札価格が1〜80,000円の整数ではない: ${get(r, COL.bid)}`));
      if (!(PREFER_BEST as readonly string[]).includes(get(r, COL.preferBest))) out.push(err("prefer_best", w, `効果の高い広告の優先表示が不正: ${get(r, COL.preferBest)}`));
      if (!intentOf.has(group)) out.push(err("group_intent", w, `広告グループがマスターにない（intent 不明）: ${group}`));
      // キャンペーンと広告グループの設定の一致
      if (campaignRow)
        for (const h of [COL.queryMatching, COL.bidStrategy, COL.campaignType, COL.targetUsers])
          if (get(r, h) !== get(campaignRow, h)) out.push(err("campaign_group_mismatch", w, `${h}が、キャンペーン（${get(campaignRow, h)}）と広告グループ（${get(r, h)}）で一致しない`));
    }

    if (comp === COMPONENT.ad) {
      requireCols(REQUIRED_COLUMNS.ad, r, w);
      const name = get(r, COL.adName);
      if (!groups.has(`${camp}\u0000${group}`)) out.push(err("ad_group_ref", w, `広告グループが先に定義されていない: ${group}`));
      if (name.length > LIMITS.nameChars) out.push(err("ad_name_len", w, "広告名が256文字を超える"));
      const nk = `${camp}\u0000${group}\u0000${name}`;
      if (adNames.has(nk)) out.push(err("dup_ad", w, `広告名が同一広告グループ内で重複: ${name}`));
      adNames.add(nk);
      adCountByGroup.set(group, (adCountByGroup.get(group) ?? 0) + 1);
      if (get(r, COL.adType) !== EXPORT_VALUES.adType) out.push(err("ad_type", w, `広告タイプが「${EXPORT_VALUES.adType}」ではない: ${get(r, COL.adType)}`));
      // RSA: タイトル1〜3・説明文1〜2が必須。上限は全角=2で 30 / 90。入力したアセットには、表示位置も入れる（実機の形式）
      for (let n = 1; n <= LIMITS.titleCount.max; n++) {
        const t = col(COL.title(n)) >= 0 ? get(r, COL.title(n)) : "";
        if (n <= LIMITS.titleCount.min && !t) out.push(err("title_missing", w, `アセット（タイトル${n}）が空（1〜3は必須）`));
        if (t && weight(t) > LIMITS.titleUnits) out.push(err("title_len", w, `タイトル${n}が${weight(t)}（上限${LIMITS.titleUnits}。全角15文字）: ${t}`));
        if (t) {
          const p = get(r, COL.titlePos(n));
          if (!(POSITIONS as readonly string[]).includes(p)) out.push(err("position", w, `${COL.titlePos(n)}が空、または不正: 「${p}」`));
        }
      }
      for (let n = 1; n <= LIMITS.descriptionCount.max; n++) {
        const d = col(COL.description(n)) >= 0 ? get(r, COL.description(n)) : "";
        if (n <= LIMITS.descriptionCount.min && !d) out.push(err("description_missing", w, `アセット（説明文${n}）が空（1〜2は必須）`));
        if (d && weight(d) > LIMITS.descriptionUnits) out.push(err("description_len", w, `説明文${n}が${weight(d)}（上限${LIMITS.descriptionUnits}。全角45文字）: ${d}`));
        if (d) {
          const p = get(r, COL.descriptionPos(n));
          if (!(POSITIONS as readonly string[]).includes(p)) out.push(err("position", w, `${COL.descriptionPos(n)}が空、または不正: 「${p}」`));
        }
      }
      // 最終リンク先URL
      const url = get(r, COL.finalUrl);
      if (!url) out.push(err("final_url", w, "最終リンク先URLが空（広告で必須）"));
      else {
        if (urlBytes(url) > LIMITS.urlBytes) out.push(err("url_bytes", w, `最終リンク先URLが${LIMITS.urlBytes}バイトを超える`));
        let u: URL | null = null;
        try {
          u = new URL(url);
        } catch {
          out.push(err("url_parse", w, `URL として解釈できない: ${url}`));
        }
        if (u) {
          const base = new URL(yahooCfg.baseUrl);
          if (u.origin + u.pathname !== base.origin + base.pathname) out.push(err("url_base", w, `基本LPのURLではない: ${url}`));
          const expected = intentOf.get(group);
          const got = u.searchParams.get(yahooCfg.intentParam) ?? "general";
          if (expected && got !== expected) out.push(err("url_intent", w, `広告グループの intent（${expected}）と URL の intent（${got}）が不一致`));
          if (u.searchParams.get("utm_source") !== "yahoo") out.push(err("url_utm", w, "utm_source=yahoo がない（Google と混同しない）"));
          if (u.searchParams.get("utm_content") !== group) out.push(err("url_utm", w, "utm_content が広告グループ名と一致しない"));
        }
      }
    }

    if (comp === COMPONENT.keyword || comp === COMPONENT.negativeCampaign) {
      const kw = get(r, COL.keyword);
      const mt = get(r, COL.matchType);
      if (!kw) out.push(err("keyword_empty", w, "キーワードが空"));
      if ([...kw].length > LIMITS.keywordChars) out.push(err("keyword_len", w, `キーワードが${LIMITS.keywordChars}文字を超える`));
      if (comp === COMPONENT.keyword) {
        requireCols(REQUIRED_COLUMNS.keyword, r, w);
        if (![MATCH.exact, MATCH.intent, MATCH.phrase].includes(mt as never)) out.push(err("match_type", w, `マッチタイプが不正: 「${mt}」`));
        if (!groups.has(`${camp}\u0000${group}`)) out.push(err("keyword_group", w, `広告グループが定義されていない: ${group}`));
        const b = get(r, COL.bid);
        if (b !== "一括入札" && !(Number.isInteger(Number(b)) && Number(b) >= 1 && Number(b) <= 80000)) out.push(err("bid", w, `入札価格が不正: ${b}`));
        keywordCountByGroup.set(group, (keywordCountByGroup.get(group) ?? 0) + 1);
        for (const t of ngTerms) if (containsTerm(kw, t.word)) out.push(err("brand_ng", w, `NGワード「${t.word}」（${t.advertiser}）をキーワードに含む: ${kw}`));
      } else {
        requireCols(REQUIRED_COLUMNS.negativeCampaign, r, w);
        if (group !== EXPORT_VALUES.campaignLevel) out.push(err("negative_group", w, `キャンペーンレベルの対象外キーワードの広告グループ名が「${EXPORT_VALUES.campaignLevel}」ではない: 「${group}」`));
        if (mt !== NEGATIVE_MATCH && mt !== MATCH.phrase && mt !== MATCH.exact) out.push(err("negative_match", w, `対象外キーワードのマッチタイプが不正: 「${mt}」`));
      }
    }

    // 広告主の商標・社名・サービス名を、広告文・URL・名称に含めない（対象外キーワードの行を除く）
    if (comp !== COMPONENT.negativeCampaign && comp !== COMPONENT.negativeAdGroup) {
      for (const [h, v] of r.map((v, k) => [header[k], v] as const)) {
        if (!v || h === COL.keyword) continue;
        for (const t of ngTerms) if (containsTerm(v, t.word)) out.push(err("brand_ng", w, `NGワード「${t.word}」（${t.advertiser}）を「${h}」に含む: ${v}`));
      }
    }
  });

  // 広告グループとキーワード・広告の対応
  for (const g of yahooCfg.adGroups.filter((x) => x.campaignName === campaignName)) {
    if (!(keywordCountByGroup.get(g.adGroupName) ?? 0)) out.push(err("group_no_keyword", g.adGroupName, "キーワードがない広告グループ"));
    if ((adCountByGroup.get(g.adGroupName) ?? 0) !== 1) out.push(err("group_ad_count", g.adGroupName, "広告が1件ではない"));
    const expected = yahooCfg.keywords.filter((k) => k.adGroupName === g.adGroupName).length;
    if ((keywordCountByGroup.get(g.adGroupName) ?? 0) !== expected)
      out.push(err("group_keyword_count", g.adGroupName, `キーワード数がマスターと一致しない（${keywordCountByGroup.get(g.adGroupName) ?? 0}/${expected}）`));
  }
  if (campaigns.size !== 1) out.push(err("campaign_count", "file", `キャンペーン行が1件ではない（${campaigns.size}）`));
  return out;
}
