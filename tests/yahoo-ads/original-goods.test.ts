import { describe, expect, it } from "vitest";
import { buildGoods } from "../../scripts/yahoo-ads/build-original-goods";
import { GOODS_CAMPAIGN_NAME, ORIGINAL_GOODS } from "../../scripts/yahoo-ads/original-goods/master";
import { ORIGINAL_TSHIRT } from "../../scripts/yahoo-ads/original-tshirt/master";
import { getProduct } from "../../src/data/lp/original-print-products";
import { weight } from "../../scripts/yahoo-ads/engine/width";

const built = buildGoods();

// 禁止キーワード(A8.net 案件情報): キーワード・広告文・URL・名称に含めない
const NG = ["up-t", "upt", "アップティー", "あっぷてぃー", "アップt"];

describe("オリジナルグッズ(アイテム別・法人) Yahoo!検索広告", () => {
  it("検証でエラーがない(文字数・禁止語・広告とLPの整合・実機の形式)。実機は未検証", () => {
    expect(built.issues.filter((i) => i.level === "error")).toEqual([]);
    expect(built.issues.some((i) => i.code === "not_imported")).toBe(true);
  });

  it("新規キャンペーンで、既存キャンペーン(オリジナルTシャツ)と名称・広告グループが重ならない", () => {
    const tshirtCampaign = ORIGINAL_TSHIRT.adGroups[0].campaignName;
    expect(GOODS_CAMPAIGN_NAME).not.toBe(tshirtCampaign);
    const existing = new Set(ORIGINAL_TSHIRT.adGroups.map((g) => g.adGroupName));
    for (const g of ORIGINAL_GOODS.adGroups) expect(existing.has(g.adGroupName)).toBe(false);
  });

  it("すべての広告グループは保留(初期配信の候補なし)で、キーワードは保留または除外", () => {
    expect(ORIGINAL_GOODS.adGroups.every((g) => !g.initialCandidate)).toBe(true);
    expect(ORIGINAL_GOODS.keywords.every((k) => k.decision !== "initial")).toBe(true);
  });

  it("広告グループの最終リンク先は、?item=<存在する商品ID> である", () => {
    for (const g of ORIGINAL_GOODS.adGroups) {
      expect(getProduct(g.intent), `商品マスターにない: ${g.intent}`).toBeTruthy();
      expect(g.adGroupName).toBe(`ag_${g.intent}`);
    }
  });

  it("見出しは全角15文字(30単位)以内、説明文は全角45文字(90単位)以内", () => {
    for (const g of ORIGINAL_GOODS.adGroups) {
      for (const h of g.headlines) expect(weight(h), `${g.adGroupName}: ${h}`).toBeLessThanOrEqual(30);
      for (const d of g.descriptions) expect(weight(d), `${g.adGroupName}: ${d}`).toBeLessThanOrEqual(90);
      expect(g.headlines.length).toBeGreaterThanOrEqual(5);
    }
  });

  it("広告主の禁止語・商標が、キーワード・広告文・名称に含まれない", () => {
    const texts = [
      ...ORIGINAL_GOODS.keywords.map((k) => k.keyword),
      ...ORIGINAL_GOODS.adGroups.flatMap((g) => [g.adGroupName, ...g.headlines, ...g.descriptions]),
    ].map((t) => t.toLowerCase().normalize("NFKC"));
    for (const t of texts) for (const ng of NG) expect(t.includes(ng), `${ng} in ${t}`).toBe(false);
  });

  it("広告文に、価格・割引・最短・即日・無料・公式・保証などの語を使わない", () => {
    const avoid = ["必ず", "絶対", "保証", "最安", "格安", "激安", "最短", "即日", "当日", "無料", "割引", "No.1", "公式", "おすすめ"];
    for (const g of ORIGINAL_GOODS.adGroups) {
      for (const t of [...g.headlines, ...g.descriptions]) for (const w of avoid) expect(t.includes(w), `${g.adGroupName}: ${t}`).toBe(false);
    }
  });

  it("入稿用CSVは、運営者の指示どおり配信設定がオン(対象外キーワードは空欄)で、入札価格が5〜10円", () => {
    const text = new TextDecoder("shift_jis").decode(built.files.find((f) => f.name === "yahoo-search-import.csv")!.content as Uint8Array);
    const rows = text.split("\r\n").filter(Boolean);
    expect(rows.length).toBeGreaterThan(100);
    expect(text.includes(",オフ,")).toBe(false);
    for (const g of ORIGINAL_GOODS.adGroups) {
      expect(g.bidYen === 5 || g.bidYen === 10, `${g.adGroupName}: ${g.bidYen}`).toBe(true);
    }
    // 予算・開始日は未承認の仮値として、レポートに明記される
    const report = built.files.find((f) => f.name === "import-validation-report.md")!.content as string;
    expect(report).toContain("仮値");
  });
});
