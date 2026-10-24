// 発電機・ポータブル電源ページのプロファイル(共通エンジン createApplianceClient へ渡す、カテゴリー固有の値と文言)。
import { extractSpecs } from "../../extractSpecs";
import { useCases } from "../../generatorContent";
import type { ApplianceProfile, ProfileSpecs } from "../types";
import { brandOptions, budgetBands, capacityBands, isEngineBlocked, isEngineType, powerBands, typeLabels, useCaseKeywords } from "./generatorData";
import { generatorUseCaseExtra } from "./generatorUseCaseExtra";

type GeneratorSpecs = ProfileSpecs & { outputLabel: string | null };

export const generatorProfile: ApplianceProfile = {
  slug: "generator",
  extract: (name): GeneratorSpecs => {
    const s = extractSpecs(name);
    return { capacity: s.capacityWh, power: s.ratedPowerW, outputLabel: s.outputLabel, productType: s.productType };
  },
  capacityBands,
  powerBands,
  budgetBands,
  brandOptions,
  typeLabels,
  typeFactLabels: { portable: "ポータブル電源(バッテリー式)", gasoline: "ガソリン発電機", cassette: "カセットガス発電機" },
  useCases,
  useCaseKeywords,
  // 車内(車中泊)ではエンジン式を使えない(NITE・消費者庁)ため、バッテリー式に限定する
  allowedTypes: (useCase) => (isEngineBlocked(useCase) ? ["portable"] : null),
  // エンジン式には容量(Wh)の表記が無い
  noCapacityTypes: ["gasoline", "cassette"],
  text: {
    stepUseCase: "用途を選ぶ",
    stepType: "種類を選ぶ",
    stepSpec: "容量(Wh)・出力(W)を選ぶ",
    stepBudget: "予算を選ぶ",
    stepBrand: "ブランドを選ぶ(任意)",
    capacityGroupLabel: "容量",
    capacityGroupAria: "バッテリー容量",
    powerGroupLabel: "出力",
    powerGroupAria: "定格出力",
    specRowNote: "用途は商品名の表記(防災・車中泊など)、容量・出力は商品名に明記された値だけで絞り込みます。「何Wh必要?」は<a href='#capacity'>下の計算ツール</a>で目安を出せます。",
    useCaseFilterNote: "用途は、商品名に「防災」「車中泊」などの表記がある商品で絞り込んでいます。",
    detailNote: "容量・出力は商品名の表記から読み取った値です。在庫・配送・仕様の詳細は商品ページで確認してください。",
    landingSubheadline: (label) => `${label}の発電機・ポータブル電源を、レビュー・容量・価格で比べて選べます。`,
    emptyCapacity: (r) =>
      r ? `この条件で容量を確認できた商品は${r.min.toLocaleString("en-US")}〜${r.max.toLocaleString("en-US")}Whです。` : "この条件では、商品名から容量を確認できた商品がありません。",
    emptyPower: (r) =>
      r
        ? `この条件で出力(W)を確認できた商品は${r.min.toLocaleString("en-US")}〜${r.max.toLocaleString("en-US")}Wです。`
        : "この条件では、商品名から出力(W)を確認できた商品がありません(kVA表記のみの商品はW換算しません)。",
  },
  notes: [
    {
      id: "engine-note",
      row: "type",
      variant: "note",
      text: "エンジン式(ガソリン・カセットガス)の発電機は、屋外の風通しの良い場所で使ってください。屋内・自動車内・テント内で使うと、一酸化炭素(CO)中毒など屋内と同等以上の危険があります(NITE・消費者庁)。",
      when: (sel) => isEngineType(sel.type),
    },
    {
      id: "vehicle-note",
      row: "type",
      variant: "hint",
      text: "車中泊では、車内でエンジン式発電機を使えないため、ガソリン・カセットガス式は選べません。バッテリー式のポータブル電源だけを表示します(NITE・消費者庁)。",
      when: (sel) => isEngineBlocked(sel.useCase),
    },
    {
      id: "capacity-note",
      row: "spec",
      variant: "note",
      text: "発電機(エンジン式)には容量(Wh)の表記がないため、出力(W)で選びます。出力がkVA表記の商品は、W換算せず絞り込みの対象外です。",
      when: (sel) => isEngineType(sel.type),
    },
  ],
  specFacts: (s) => {
    const out: [string, string][] = [];
    if (s.capacity !== null) out.push(["容量", `${s.capacity.toLocaleString("en-US")}Wh`]);
    const label = (s as GeneratorSpecs).outputLabel;
    if (label) out.push(["定格出力", label]);
    return out;
  },
  trackSpecParams: (s) => ({ capacity_wh: s.capacity ?? undefined, power_w: s.power ?? undefined }),
  amazonTypeWord: (type) => (type === "portable" ? typeLabels.portable : type ? "発電機" : ""),
  useCaseExtra: generatorUseCaseExtra,
};
