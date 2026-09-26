import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { extractPageSnapshot, type PageSnapshot } from "./support/extractPageSnapshot";

// 「見た目・文言・URL・meta・挙動を一切変えない」ことを保証する巻き戻り防止テスト。
// このテストを実行する前に `npm run build` を実行して dist/ を最新化しておくこと。
// スナップショット(tests/__snapshots__/projector.snapshot.json)はリファクタ前に一度だけ
// 手動で採取したもので、このテストからは絶対に上書きしない
// (差分が出た場合は「なぜ変わったか」を報告する対象であり、テストを合わせにいく対象ではない)。

const DIST_HTML_PATH = path.resolve(__dirname, "../dist/categories/projector/index.html");
const SNAPSHOT_PATH = path.resolve(__dirname, "__snapshots__/projector.snapshot.json");

describe("projectorページ: リファクタ前後で出力が変わっていないこと", () => {
  let expected: PageSnapshot;
  let actual: PageSnapshot;

  beforeAll(() => {
    if (!existsSync(DIST_HTML_PATH)) {
      throw new Error(
        `${DIST_HTML_PATH} が見つかりません。先に \`npm run build\` を実行してから \`npm run test\` を実行してください。`
      );
    }
    if (!existsSync(SNAPSHOT_PATH)) {
      throw new Error(`${SNAPSHOT_PATH} が見つかりません。先に tests/support/captureSnapshot.mjs で採取してください。`);
    }
    expected = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf-8"));
    actual = extractPageSnapshot(readFileSync(DIST_HTML_PATH, "utf-8"));
  });

  it("title / meta description / canonical が変わっていない", () => {
    expect(actual.title).toBe(expected.title);
    expect(actual.metaDescription).toBe(expected.metaDescription);
    expect(actual.canonical).toBe(expected.canonical);
  });

  it("OGP / Twitter Card タグが変わっていない", () => {
    expect(actual.ogTags).toEqual(expected.ogTags);
    expect(actual.twitterTags).toEqual(expected.twitterTags);
  });

  it("構造化データ(JSON-LD)が変わっていない", () => {
    expect(actual.jsonLd).toEqual(expected.jsonLd);
  });

  it("見出し(h1/h2)の文言が変わっていない", () => {
    expect(actual.h1).toEqual(expected.h1);
    expect(actual.h2).toEqual(expected.h2);
  });

  it("本文の可視テキストが変わっていない", () => {
    expect(actual.bodyText).toBe(expected.bodyText);
  });

  it("フィルター・並び順の項目/選択肢が変わっていない(「当日」オプションが含まれないことも含む)", () => {
    expect(actual.selectOptions).toEqual(expected.selectOptions);
    const allOptionText = Object.values(actual.selectOptions).flat().join(" ");
    expect(allOptionText).not.toContain("今日");
    expect(allOptionText).not.toContain("当日");
  });

  it("広告タグ(ValueCommerce)が無改変のまま存在する", () => {
    expect(actual.adTags).toEqual(expected.adTags);
  });
});
