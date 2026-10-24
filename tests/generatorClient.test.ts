import { describe, expect, it } from "vitest";
import {
  buildTrackParams,
  capacityBands,
  deliveryText,
  filterBySelection,
  inRange,
  powerBands,
  type Selection,
} from "../src/lib/commerce/generatorClient";

const none: Selection = { useCase: null, type: null, capacity: null, power: null, budget: null, brand: null };
const mk = (name: string) => ({ name, deliveryDay: 1, storeName: "店" });

describe("generatorClient", () => {
  it("帯は閉区間で、境界値は両隣の帯に含まれる", () => {
    expect(inRange(500, capacityBands[0])).toBe(true);
    expect(inRange(500, capacityBands[1])).toBe(true);
    expect(inRange(2000, capacityBands[3])).toBe(true);
    expect(inRange(null, capacityBands[0])).toBe(false);
    expect(inRange(null, null)).toBe(true);
  });

  it("絞り込みなしなら全件を返す", () => {
    const items = [mk("A"), mk("B")];
    expect(filterBySelection(items, none)).toEqual({ visible: items, unknown: 0 });
  });

  it("容量で絞り込み、値を確認できない商品は分類せずunknownとして数える", () => {
    const a = mk("ポータブル電源 300Wh 定格300W");
    const b = mk("ポータブル電源 1000Wh 定格1000W");
    const c = mk("ポータブル電源 大容量");
    const r = filterBySelection([a, b, c], { ...none, capacity: capacityBands[0] });
    expect(r.visible).toEqual([a]);
    expect(r.unknown).toBe(1);
  });

  it("タイプと出力を組み合わせる", () => {
    const a = mk("ポータブル電源 1000Wh 定格1200W");
    const b = mk("ガソリン インバーター発電機 定格出力2000W");
    const r = filterBySelection([a, b], { ...none, type: "portable", power: powerBands[2] });
    expect(r.visible).toEqual([a]);
  });

  it("配送表示は判定日数とお届け先が分かる場合だけ作り、架空の日付を作らない", () => {
    expect(deliveryText(1, "13")).toBe("東京都宛て:明日お届け対象");
    expect(deliveryText(2, "27")).toBe("大阪府宛て:翌々日お届け対象");
    expect(deliveryText(null, "13")).toBeNull();
    expect(deliveryText(1, "")).toBeNull();
    expect(deliveryText(0, "13")).toBeNull();
  });

  it("GAパラメータは取得できない項目をundefinedにする", () => {
    const p = { name: "ポータブル電源 288Wh", deliveryDay: null, storeName: "" };
    const params = buildTrackParams(p, { ...none, useCase: "disaster" });
    expect(params.use_case).toBe("disaster");
    expect(params.capacity_wh).toBe(288);
    expect(params.power_w).toBeUndefined();
    expect(params.delivery_days).toBeUndefined();
    expect(params.shop_name).toBeUndefined();
  });
});

describe("用途による絞り込み", () => {
  it("商品名に用途の語が明記された商品だけを表示し、推測で分類しない", async () => {
    const { matchesUseCase } = await import("../src/lib/commerce/generatorClient");
    const a = mk("ポータブル電源 1024Wh 防災 停電対策");
    const b = mk("ポータブル電源 1024Wh");
    const r = filterBySelection([a, b], { ...none, useCase: "disaster" });
    expect(r.visible).toEqual([a]);
    expect(matchesUseCase("発電機 工事用 3000W", "work")).toBe(true);
    expect(matchesUseCase("発電機 3000W", "work")).toBe(false);
    expect(matchesUseCase("何でも", null)).toBe(true);
  });
});

describe("種類と容量の矛盾(エンジン式には容量表記がない)", () => {
  it("エンジン式を選ぶと容量を解除し、容量を後から指定すると種類を解除する", async () => {
    const { mergeSelection, capacityBands } = await import("../src/lib/commerce/generatorClient");
    const withCap = { ...none, capacity: capacityBands[0] };
    expect(mergeSelection(withCap, { type: "gasoline" }).capacity).toBeNull();
    expect(mergeSelection(withCap, { type: "portable" }).capacity).toEqual(capacityBands[0]);
    const withType = { ...none, type: "cassette" as const };
    expect(mergeSelection(withType, { capacity: capacityBands[1] }).type).toBeNull();
    expect(mergeSelection(withType, { power: null }).type).toBe("cassette");
  });
});

describe("0件時の案内用の範囲", () => {
  it("用途・種類で絞った商品のうち、値を確認できたものの最小/最大を返す", async () => {
    const { availableRanges } = await import("../src/lib/commerce/generatorClient");
    const items = [mk("ポータブル電源 300Wh 定格300W"), mk("ポータブル電源 2000Wh 定格2000W"), mk("ガソリン 発電機 3.0kVA")];
    const r = availableRanges(items, { ...none, type: "portable", capacity: capacityBands[3] });
    expect(r.capacity).toEqual({ min: 300, max: 2000 });
    expect(r.power).toEqual({ min: 300, max: 2000 });
    expect(availableRanges([mk("ガソリン 発電機 3.0kVA")], { ...none, type: "gasoline" }).power).toBeNull();
  });
});

describe("予算の絞り込み", () => {
  const priced = (name: string, price?: number) => ({ name, price });
  it("価格が予算の帯に入る商品だけを残し、境界値は両隣の帯に含まれる", async () => {
    const { budgetBands } = await import("../src/lib/commerce/generatorClient");
    const items = [priced("a", 50000), priced("b", 70000), priced("c", 100000), priced("d", 250000)];
    expect(filterBySelection(items, { ...none, budget: budgetBands[0] }).visible.map((p) => p.name)).toEqual(["a", "b"]);
    expect(filterBySelection(items, { ...none, budget: budgetBands[1] }).visible.map((p) => p.name)).toEqual(["b", "c"]);
    expect(filterBySelection(items, { ...none, budget: budgetBands[3] }).visible.map((p) => p.name)).toEqual(["d"]);
  });
  it("価格が取れない商品は予算に合うと推測せず除外し、unknown扱いにはしない", async () => {
    const { budgetBands } = await import("../src/lib/commerce/generatorClient");
    const r = filterBySelection([priced("x")], { ...none, budget: budgetBands[0] });
    expect(r).toEqual({ visible: [], unknown: 0 });
  });
  it("予算だけでも絞り込み中と判定し、説明と0件時の価格範囲を返す", async () => {
    const { isFiltering, describeSelection, availableRanges, budgetBands } = await import("../src/lib/commerce/generatorClient");
    const sel = { ...none, budget: budgetBands[2] };
    expect(isFiltering(sel)).toBe(true);
    expect(describeSelection(sel)).toEqual(["予算12〜18万円"]);
    expect(availableRanges([priced("a", 30000), priced("b", 90000)], sel).price).toEqual({ min: 30000, max: 90000 });
  });
});

describe("利用環境の目安", () => {
  it("出典確認済みの消費電力×想定時間から必要容量・出力を計算する(10単位切り上げ)", async () => {
    const { environments, estimateEnvironment } = await import("../src/lib/commerce/generatorContent");
    const byId = (id: string) => environments.find((e) => e.id === id)!;
    // ルーター30W×12h + LED10W×2×6h = 360 + 120
    expect(estimateEnvironment(byId("blackout-min"))).toMatchObject({ wh: 480, w: 50 });
    // 上に冷蔵庫250W×8h = +2000Wh
    expect(estimateEnvironment(byId("blackout-fridge"))).toMatchObject({ wh: 2480, w: 300 });
    expect(estimateEnvironment(byId("vehicle-summer"))).toMatchObject({ wh: 460, w: 60 });
    expect(estimateEnvironment(byId("vehicle-winter"))).toMatchObject({ wh: 860, w: 110 });
  });
  it("消費電力が未確認(null)の機器は計算に含めない", async () => {
    const { estimateEnvironment } = await import("../src/lib/commerce/generatorContent");
    const env = { id: "x", label: "x", description: "", type: null, items: [{ applianceId: "phone", qty: 1, hours: 2 }] } as never;
    const phone = { id: "phone", label: "スマホ", watts: null, note: "", source: "", defaultHours: 2 };
    expect(estimateEnvironment(env, [phone])).toMatchObject({ wh: 0, w: 0, lines: [] });
  });
  it("車内・屋内の環境はポータブル電源のみを推奨する", async () => {
    const { environments } = await import("../src/lib/commerce/generatorContent");
    expect(environments.every((e) => e.type === "portable")).toBe(true);
  });
});

describe("車中泊ではエンジン式を選べない", () => {
  it("車中泊を選ぶと、選択済みのエンジン式は解除され、エンジン式は選択できない", async () => {
    const { mergeSelection, isEngineBlocked } = await import("../src/lib/commerce/generatorClient");
    expect(isEngineBlocked("vehicle")).toBe(true);
    expect(isEngineBlocked("camp")).toBe(false);
    const withGas = { ...none, type: "gasoline" as const };
    expect(mergeSelection(withGas, { useCase: "vehicle" }).type).toBeNull();
    const veh = { ...none, useCase: "vehicle" };
    expect(mergeSelection(veh, { type: "cassette" }).type).toBeNull();
    expect(mergeSelection(veh, { type: "portable" }).type).toBe("portable");
    // キャンプではエンジン式も選べる
    expect(mergeSelection({ ...none, useCase: "camp" }, { type: "gasoline" }).type).toBe("gasoline");
  });
  it("車中泊の絞り込みでは、エンジン式を除外し、種類が確認できない商品は表示しない", () => {
    const sel = { ...none, useCase: "vehicle" };
    const portable = { name: "車中泊 ポータブル電源 1000Wh" };
    const gas = { name: "車中泊 ガソリン インバーター発電機 2000W" };
    const unknown = { name: "車中泊 電源" };
    const r = filterBySelection([portable, gas, unknown], sel);
    expect(r.visible).toEqual([portable]);
    expect(r.unknown).toBe(1);
  });
});

describe("機器の一覧からの必要容量", () => {
  it("消費電力×台数×時間を合計し、10単位に切り上げる", async () => {
    const { estimateItems } = await import("../src/lib/commerce/generatorContent");
    // 30W×1×12h + 10W×2×6h = 360 + 120
    expect(estimateItems([{ watts: 30, qty: 1, hours: 12 }, { watts: 10, qty: 2, hours: 6 }])).toEqual({ wh: 480, w: 50 });
    expect(estimateItems([{ watts: 33, qty: 1, hours: 1 }])).toEqual({ wh: 40, w: 40 });
  });
  it("0以下・不正な値は0として扱う", async () => {
    const { estimateItems } = await import("../src/lib/commerce/generatorContent");
    expect(estimateItems([])).toEqual({ wh: 0, w: 0 });
    expect(estimateItems([{ watts: Number.NaN, qty: 1, hours: 1 }, { watts: -5, qty: 1, hours: 1 }, { watts: 100, qty: 0, hours: 5 }])).toEqual({ wh: 0, w: 0 });
  });
});

describe("ブランドの絞り込みとURLからの初期選択", () => {
  it("商品名またはブランド名に該当語があるものだけを残す(大文字小文字・カタカナ表記を区別しない)", async () => {
    const { brandOptions } = await import("../src/lib/commerce/generatorClient");
    const jackery = brandOptions.find((b) => b.id === "jackery")!;
    const items = [
      { name: "Jackery ポータブル電源 1000", brand: "Jackery" },
      { name: "ポータブル電源 ジャクリ 240", brand: null },
      { name: "EENOUR 発電機 3000W", brand: "EENOUR" },
      { name: "ポータブル電源 ホンダ互換", brand: "ホンダ" },
    ];
    const r = filterBySelection(items, { ...none, brand: jackery });
    expect(r.visible.map((p) => p.name)).toEqual(["Jackery ポータブル電源 1000", "ポータブル電源 ジャクリ 240"]);
    expect(r.unknown).toBe(0);
    const honda = brandOptions.find((b) => b.id === "honda")!;
    expect(filterBySelection(items, { ...none, brand: honda }).visible).toHaveLength(1);
  });
  it("ブランドだけの選択でも絞り込み中と判定し、説明に出る", async () => {
    const { isFiltering, describeSelection, brandOptions } = await import("../src/lib/commerce/generatorClient");
    const sel = { ...none, brand: brandOptions[0] };
    expect(isFiltering(sel)).toBe(true);
    expect(describeSelection(sel)).toEqual(["Jackery"]);
  });
  it("URLのクエリから初期の絞り込みを作り、不正な値は無視する", async () => {
    const { selectionFromParams, capacityBands, budgetBands } = await import("../src/lib/commerce/generatorClient");
    const r = selectionFromParams(new URLSearchParams("brand=bluetti&type=portable&use=camp&cap=1&budget=2"));
    expect(r.brand?.id).toBe("bluetti");
    expect(r.type).toBe("portable");
    expect(r.useCase).toBe("camp");
    expect(r.capacity).toEqual(capacityBands[1]);
    expect(r.budget).toEqual(budgetBands[2]);
    expect(selectionFromParams(new URLSearchParams("brand=unknown&type=__proto__&use=x&cap=9&power=-1&budget=abc"))).toEqual({});
    expect(selectionFromParams(new URLSearchParams(""))).toEqual({});
  });
});
