import { describe, expect, it } from "vitest";
import { extractTvSpecs, detectMaker } from "../src/lib/commerce/tv/extractTvSpecs";

describe("extractTvSpecs", () => {
  it("商品名に明記された仕様を読み取る", () => {
    const s = extractTvSpecs("TCL 液晶テレビ P69K 55V型 4K対応 4Kチューナー内蔵 YouTube対応 Bluetooth対応 55P69K（標準設置無料）");
    expect(s.sizeV).toBe(55);
    expect(s.resolution).toBe("4K");
    expect(s.bs4k).toBe(true);
    expect(s.streaming).toBe(true);
    expect(s.maker).toBe("TCL");
    expect(s.model).toBe("55P69K");
    expect(s.installation).toBe("標準設置無料");
  });

  it("4Kチューナー内蔵の記載だけでは4K画面とは決めない(未確認)", () => {
    expect(extractTvSpecs("液晶テレビ 50V型 BS・CS 4Kチューナー内蔵").resolution).toBeNull();
  });

  it("記載のない仕様は非対応ではなく未確認(null)にする", () => {
    const s = extractTvSpecs("テレビ 32V型 REGZA 32V35S");
    expect(s.terrestrial).toBeNull();
    expect(s.recording).toBeNull();
    expect(s.bs4k).toBeNull();
    expect(s.streaming).toBeNull();
    expect(s.gaming).toBeNull();
  });

  it("チューナーレスは放送を受信できないと明記されているため false にする", () => {
    const s = extractTvSpecs("32型 CHiQ チューナーレス スマートテレビ Google TV");
    expect(s.tunerless).toBe(true);
    expect(s.terrestrial).toBe(false);
    expect(s.bs4k).toBe(false);
    expect(s.streaming).toBe(true);
  });

  it("サイズが複数・幅表記の商品は断定しない", () => {
    expect(extractTvSpecs("テレビスタンド 32〜65インチ対応").sizeV).toBeNull();
    expect(extractTvSpecs("液晶テレビ 55V型 55インチ").sizeV).toBe(55);
    expect(extractTvSpecs("液晶テレビ 32V型 / 43インチ").sizeV).toBeNull();
  });

  it("全角の数字・文字を半角として読む", () => {
    expect(extractTvSpecs("東芝　ＲＥＧＺＡ　ハイビジョン液晶テレビ　２４Ｖ型").sizeV).toBe(24);
  });

  it("録画は外付けHDD(別売)と内蔵を区別する", () => {
    expect(extractTvSpecs("40型 液晶テレビ 裏番組録画 外付けHDD対応").recording).toBe("external");
    expect(extractTvSpecs("液晶テレビ ブルーレイ内蔵 録画").recording).toBe("built-in");
  });

  it("中古・訳あり・配送エリア限定は注意フラグにする", () => {
    expect(extractTvSpecs("[展示品]TVS REGZA 43M550R (43インチ) 配達エリアは近畿圏のみです").flags).toEqual(
      expect.arrayContaining(["used-or-damaged", "area-limited"])
    );
    expect(extractTvSpecs("液晶テレビ 43V型").flags).toEqual([]);
  });

  it("メーカー名は商品名の中で先に出る名前を採る", () => {
    expect(detectMaker("テレビ 43型 MAXZEN J43CH06 東芝ボード内蔵")).toBe("MAXZEN(マクスゼン)");
    expect(detectMaker("液晶テレビ 55M550M REGZA", null)).toBe("REGZA(レグザ)");
  });
});
