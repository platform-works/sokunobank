import { describe, expect, it } from "vitest";
import { extractMonitorSpecs } from "../src/lib/commerce/extractMonitorSpecs";

describe("extractMonitorSpecs", () => {
  it("インチ・型の表記から画面サイズを取る", () => {
    expect(extractMonitorSpecs("LG PCモニター 24MS500-B 23.8インチ フルHD IPS").sizeInch).toBe(23.8);
    expect(extractMonitorSpecs("ASUS PCモニター ［21.45型 /フルHD(1920×1080) /ワイド］").sizeInch).toBe(21.45);
  });
  it("0.5インチ以内の併記は大きい方、範囲や別サイズの併記は採用しない", () => {
    expect(extractMonitorSpecs("HP モニター 21.5インチ (21.45) 21.45型 21.45インチFHD").sizeInch).toBe(21.5);
    expect(extractMonitorSpecs("中古 21〜23インチ FHD HDMI").sizeInch).toBeNull();
    expect(extractMonitorSpecs("モニター 27インチ 32インチ から選べる").sizeInch).toBeNull();
  });
  it("解像度を区分し、相反する語は分類しない", () => {
    expect(extractMonitorSpecs("JAPANNEXT 43インチ 4K(3840×2160)解像度").resolution).toBe("4k");
    expect(extractMonitorSpecs("JAPANNEXT 34インチ UWQHD(3440×1440)").resolution).toBe("qhd");
    expect(extractMonitorSpecs("アイリスオーヤマ 27インチ フルhd 100Hz").resolution).toBe("fhd");
    expect(extractMonitorSpecs("27インチ 4K フルHD 両対応").resolution).toBeNull();
    expect(extractMonitorSpecs("PCモニター 27インチ HDMI").resolution).toBeNull();
  });
});
