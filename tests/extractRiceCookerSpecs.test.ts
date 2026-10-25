import { describe, expect, it } from "vitest";
import { extractRiceCookerSpecs } from "../src/lib/commerce/extractRiceCookerSpecs";
import { createApplianceClient } from "../src/lib/commerce/appliance/createApplianceClient";
import { riceCookerProfile } from "../src/lib/commerce/appliance/profiles/riceCooker";
import type { Selection } from "../src/lib/commerce/appliance/types";

describe("extractRiceCookerSpecs(実データの表記)", () => {
  it("「N合炊き」を容量として拾う", () => {
    expect(extractRiceCookerSpecs("象印 炊飯器 3合炊き IH炊飯器 極め炊き").capacityGo).toBe(3);
    expect(extractRiceCookerSpecs("炊飯器 一升 10合炊き マイコン 1升炊き").capacityGo).toBe(10);
  });
  it("5合と5.5合・3合と3.5合の併記は大きい方を容量とする", () => {
    expect(extractRiceCookerSpecs("炊飯器 5合炊き 5.5合炊き IH").capacityGo).toBe(5.5);
    expect(extractRiceCookerSpecs("圧力IH炊飯器 3合炊き 3.5合 一人暮らし").capacityGo).toBe(3.5);
  });
  it("炊き分けの列挙・範囲・景品の量は容量にしない", () => {
    expect(extractRiceCookerSpecs("炊飯器 一升10合炊き 1合 2合 3合 4合 5合").capacityGo).toBe(10);
    expect(extractRiceCookerSpecs("炊飯器 1〜3合炊き ミニ").capacityGo).toBeNull();
    expect(extractRiceCookerSpecs("炊飯器 [0.5~3合炊き]").capacityGo).toBeNull();
    expect(extractRiceCookerSpecs("マイコン炊飯ジャー 5.5合 レビューで米2合プレゼント").capacityGo).toBe(5.5);
    expect(extractRiceCookerSpecs("炊飯器 5合炊き 一升 10合 NL-DT10 NL-DT18").capacityGo).toBeNull();
  });
  it("加熱方式は商品名の語だけで判定し、矛盾する語が同居するときは分類しない", () => {
    expect(extractRiceCookerSpecs("象印 圧力IH炊飯器 極め炊き").productType).toBe("pressure-ih");
    expect(extractRiceCookerSpecs("東芝 IH炊飯器 5.5合炊き").productType).toBe("ih");
    expect(extractRiceCookerSpecs("タイガー マイコン炊飯ジャー 3合").productType).toBe("micom");
    expect(extractRiceCookerSpecs("リンナイ ガス炊飯器 こがまる プロパンガス用").productType).toBe("gas");
    expect(extractRiceCookerSpecs("IH マイコン 炊飯器").productType).toBeNull();
    expect(extractRiceCookerSpecs("ティファール 炊飯器 4合 サニーオレンジ").productType).toBeNull();
  });
});

describe("炊飯器プロファイルでの絞り込み(共通エンジン)", () => {
  const client = createApplianceClient(riceCookerProfile);
  const none: Selection = { useCase: null, type: null, capacity: null, power: null, budget: null, brand: null };
  const mk = (name: string, price = 10000) => ({ name, price });

  it("容量の帯で絞り込み、容量を確認できない商品は推測せずunknownにする", () => {
    const a = mk("炊飯器 3合炊き IH");
    const b = mk("炊飯器 5.5合炊き IH");
    const c = mk("炊飯器 IH 一人暮らし");
    const r = client.filterBySelection([a, b, c], { ...none, capacity: riceCookerProfile.capacityBands[2] });
    expect(r.visible).toEqual([b]);
    expect(r.unknown).toBe(1);
  });
  it("加熱方式・ブランド・用途の語を組み合わせる", () => {
    const a = mk("タイガー 圧力IH炊飯器 5.5合炊き 一人暮らし");
    const b = mk("象印 圧力IH炊飯器 5.5合炊き");
    const tiger = riceCookerProfile.brandOptions.find((x) => x.id === "tiger")!;
    expect(client.filterBySelection([a, b], { ...none, type: "pressure-ih", brand: tiger }).visible).toEqual([a]);
    expect(client.filterBySelection([a, b], { ...none, useCase: "single" }).visible).toEqual([a]);
  });
  it("出力では絞り込まず、URLの条件も炊飯器の帯・種類で解釈する", () => {
    expect(riceCookerProfile.powerBands).toEqual([]);
    const r = client.selectionFromParams(new URLSearchParams("brand=zojirushi&type=ih&use=newlife&cap=3&budget=1&power=0"));
    expect(r.brand?.id).toBe("zojirushi");
    expect(r.type).toBe("ih");
    expect(r.useCase).toBe("newlife");
    expect(r.capacity?.label).toBe("1升(10合)");
    expect(r.budget?.label).toBe("1〜2万円");
    expect(r.power).toBeUndefined();
    expect(client.selectionFromParams(new URLSearchParams("type=__proto__&use=family&cap=9"))).toEqual({});
  });
  it("計測パラメータは炊飯容量(合)を送る", () => {
    const p = { name: "象印 炊飯器 5.5合炊き", deliveryDay: null, storeName: "店" };
    expect(client.buildTrackParams(p, { ...none, useCase: "single" })).toMatchObject({ use_case: "single", capacity_go: 5.5, shop_name: "店" });
  });
});
