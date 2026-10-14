import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildAll } from "../../scripts/yahoo-ads/build-original-tshirt";
import { parseCsv } from "../../scripts/yahoo-ads/engine/csv-parse";
import { EXPORT_COLUMNS, ID_COLUMNS } from "../../scripts/yahoo-ads/engine/export-columns";
import { containsTerm } from "../../scripts/yahoo-ads/engine/normalize";
import { decodeShiftJis } from "../../scripts/yahoo-ads/engine/sjis";
import { PUBLISHED_PRODUCTS } from "../../src/data/lp/original-print-products";
import { ORIGINAL_TSHIRT, SETTINGS } from "../../scripts/yahoo-ads/original-tshirt/master";

/**
 * オリジナルTシャツ（Up-T 送客LP）向け Yahoo!検索広告のインポート用ファイル。
 * 条件の出典: A8.net 案件情報（運営者提供 2026-10-11）。リスティング一部OK／禁止キーワード: up-t, アップティー, upt, あっぷてぃー。
 */
const built = buildAll();
const bytesOf = (name: string) => built.files.find((f) => f.name === name)!.content as Uint8Array;
const textOf = (name: string) => decodeShiftJis(bytesOf(name));
const rows = parseCsv(textOf("yahoo-search-import.csv"));
const header = rows[0];
const body = rows.slice(1);
const col = (n: string) => header.indexOf(n);
const NG = ["up-t", "アップティー", "upt", "あっぷてぃー"];

describe("オリジナルTシャツ Yahoo!検索広告", () => {
  it("検証でエラーがない（文字数・禁止語・広告とLPの整合・実機の形式）。実機は未検証", () => {
    expect(built.issues.filter((i) => i.level === "error")).toEqual([]);
    expect(built.issues.some((i) => i.code === "not_imported")).toBe(true);
  });

  it("禁止キーワード（Up-T）が、キーワード・広告文・URL・名称に含まれない。対象外キーワードに登録されている", () => {
    for (const r of body) {
      if (r[col("コンポーネントの種類")] === "対象外キーワード（キャンペーン）") continue;
      for (const v of r) for (const w of NG) expect(containsTerm(v, w), `${w}: ${v}`).toBe(false);
    }
    const negatives = body.filter((r) => r[col("コンポーネントの種類")] === "対象外キーワード（キャンペーン）").map((r) => r[col("キーワード")]);
    for (const w of NG) expect(negatives).toContain(w);
    // 表記揺れ・空白・ドメイン
    for (const w of ["up t", "up-t.jp", "アップティ", "アップ ティー", "あっぷてぃ"]) expect(negatives).toContain(w);
    // 他社の商標・DIY・価格だけの検索
    for (const w of ["ユニクロ", "ラクスル", "作り方", "無料", "安い"]) expect(negatives).toContain(w);
  });

  it("構成: キャンペーン1・広告グループ6・広告6・キーワード（マスターと同数）。すべて配信オフ", () => {
    const count = (k: string) => body.filter((r) => r[col("コンポーネントの種類")] === k).length;
    expect(count("キャンペーン")).toBe(1);
    expect(count("広告グループ")).toBe(ORIGINAL_TSHIRT.adGroups.length);
    expect(count("広告")).toBe(ORIGINAL_TSHIRT.adGroups.length);
    expect(count("キーワード")).toBe(ORIGINAL_TSHIRT.keywords.length);
    for (const r of body) {
      if (r[col("コンポーネントの種類")].startsWith("対象外キーワード")) expect(r[col("配信設定")]).toBe("");
      else expect(r[col("配信設定")]).toBe("オフ");
    }
  });

  it("初期配信の候補は最大2広告グループ。初期候補のキーワードは完全一致・意図が強い", () => {
    const groups = ORIGINAL_TSHIRT.adGroups.filter((g) => g.initialCandidate);
    expect(groups.length).toBeLessThanOrEqual(2);
    const initial = ORIGINAL_TSHIRT.keywords.filter((k) => k.decision === "initial");
    expect(initial.length).toBeGreaterThan(0);
    for (const k of initial) {
      expect(k.matchType).toBe("exact");
      expect(k.intentStrength).not.toBe("low");
      expect(groups.map((g) => g.adGroupName)).toContain(k.adGroupName);
    }
    // インテントマッチは使わない（拡張を抑える）
    expect(body.some((r) => r[col("マッチタイプ")] === "インテントマッチ")).toBe(false);
  });

  it("広告: 見出し8以上・説明文4。文字数は全角換算で上限内。広告文に、未確認の事実・誇大表現を使わない", () => {
    const ads = body.filter((r) => r[col("コンポーネントの種類")] === "広告");
    for (const r of ads) {
      for (let n = 1; n <= 8; n++) expect(r[col(`アセット（タイトル${n}）`)], `タイトル${n}`).not.toBe("");
      for (let n = 1; n <= 4; n++) expect(r[col(`アセット（説明文${n}）`)], `説明文${n}`).not.toBe("");
      const text = r.join(" ");
      for (const w of ["公式", "最短", "即日", "当日", "最安", "格安", "激安", "無料", "割引", "No.1", "おすすめ", "日以内", "円〜"]) expect(text, w).not.toContain(w);
    }
  });

  it("最終リンク先: 広告LP + ?item=<広告グループの商品> + utm（utm_source=yahoo・utm_content=広告グループ）。検索語を含まない", () => {
    const ads = body.filter((r) => r[col("コンポーネントの種類")] === "広告");
    for (const r of ads) {
      const u = new URL(r[col("最終リンク先URL")]);
      expect(u.origin + u.pathname).toBe("https://sokunobank.com/lp/original-print/");
      const group = ORIGINAL_TSHIRT.adGroups.find((g) => g.adGroupName === r[col("広告グループ名")])!;
      expect(u.searchParams.get("item")).toBe(group.intent);
      expect(u.searchParams.get("utm_source")).toBe("yahoo");
      expect(u.searchParams.get("utm_content")).toBe(r[col("広告グループ名")]);
      expect(u.searchParams.has("utm_term")).toBe(false);
    }
    // LP は、?item= で商品を自動選択する（広告と LP の整合）
    const lp = readFileSync("src/pages/lp/original-print.astro", "utf8");
    expect(lp).toMatch(/\["item", "product"/);
    // LP の最初の表示に「PR」の表記がある（A8.net: 広告とわかる表示）
    expect(lp.indexOf('class="pr-badge">PR')).toBeGreaterThan(-1);
    expect(lp.indexOf('class="pr-badge">PR')).toBeLessThan(lp.indexOf("main-ad-label"));
  });

  it("実機の形式: 列名はエクスポートの列名のみ。ID 列は空。必須の設定（検索クエリーマッチング・開始日など）がある", () => {
    for (const h of header) expect(EXPORT_COLUMNS).toContain(h);
    for (const h of ID_COLUMNS) expect(header).not.toContain(h);
    expect(header).toContain("入札戦略タイプ");
    expect(header).not.toContain("入札戦略");
    const c = body.find((r) => r[col("コンポーネントの種類")] === "キャンペーン")!;
    expect(c[col("検索クエリーマッチング")]).toBe("利用しない");
    expect(c[col("開始日")]).toMatch(/^\d{4}\/\d{2}\/\d{2}$/);
    expect(SETTINGS.startDateProvisional).toBe(true);
    for (const r of body.filter((x) => x[col("コンポーネントの種類")] === "広告グループ")) {
      expect(r[col("検索クエリーマッチング")]).toBe("利用しない");
      expect(r[col("入札戦略タイプ")]).toBe("個別クリック単価");
      expect(r[col("配信対象ユーザー")]).toBe("全ユーザー");
    }
    for (const r of body.filter((x) => x[col("コンポーネントの種類")] === "対象外キーワード（キャンペーン）"))
      expect(r[col("広告グループ名")]).toBe("キャンペーンレベル");
  });

  it("文字コード・改行: Shift_JIS・CRLF。予備の全列ファイルは141列で、同じ内容", () => {
    const text = textOf("yahoo-search-import.csv");
    expect(text).not.toContain("�");
    expect(/(^|[^\r])\n/.test(text)).toBe(false);
    const full = parseCsv(textOf("yahoo-search-import.full-columns.csv"));
    expect(full[0]).toEqual([...EXPORT_COLUMNS]);
    expect(full.length).toBe(rows.length);
    for (let i = 1; i < rows.length; i++) for (const n of header) expect(full[i][full[0].indexOf(n)]).toBe(rows[i][header.indexOf(n)]);
  });

  it("別アカウント・他サイトの値を含まない。成果条件・報酬を、生成物に書かない", () => {
    const all = built.files.map((f) => (typeof f.content === "string" ? f.content : decodeShiftJis(f.content))).join("\n");
    expect(all).not.toContain("1471514"); // ファーマバンクのアカウント
    expect(all).not.toMatch(/397\.04|82\.5%|12％|12%|新規会員登録100円/); // 報酬・EPC・確定率（管理画面の非公開情報）
    expect(all).not.toMatch(/初めて(を)?利用|広告主新規/); // 成果条件
  });

  it("アイテム別の広告グループ: 商品マスターの公開商品だけ。初期配信の対象外(保留)。LPのキャッチコピーと広告文が整合する", () => {
    const published = new Set(PUBLISHED_PRODUCTS.map((p) => p.id));
    const itemGroups = ORIGINAL_TSHIRT.adGroups.filter((g) => g.intent !== "tshirt" && g.intent !== "general");
    expect(itemGroups.length).toBeGreaterThanOrEqual(9);
    for (const g of itemGroups) {
      expect(published.has(g.intent), g.intent).toBe(true);
      expect(g.initialCandidate, g.adGroupName).toBe(false);
      expect(g.headlines.length, g.adGroupName).toBe(8);
      // LP のヒーロー(商品マスター由来)に、広告の約束語がある
      const lp = ORIGINAL_TSHIRT.intents[g.intent];
      expect(lp.h1.length).toBeGreaterThan(0);
      expect(lp.promiseWords.some((w) => g.headlines.join("").includes(w)), g.adGroupName).toBe(true);
    }
    for (const k of ORIGINAL_TSHIRT.keywords.filter((k) => itemGroups.some((g) => g.adGroupName === k.adGroupName))) {
      expect(k.decision, k.keyword).toBe("hold");
      expect(k.metrics.monthlySearchVolume).toBeNull();
    }
  });
});
