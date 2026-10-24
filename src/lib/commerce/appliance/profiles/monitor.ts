// PCモニターページのプロファイル(共通エンジン createApplianceClient へ渡す、カテゴリー固有の値と文言)。
import { extractMonitorSpecs } from "../../extractMonitorSpecs";
import { useCases } from "../../monitorContent";
import type { ApplianceProfile, ProfileSpecs } from "../types";
import { brandOptions, budgetBands, capacityBands, powerBands, typeLabels, useCaseKeywords } from "./monitorData";

const fmtInch = (n: number) => `${n}インチ`;

export const monitorProfile: ApplianceProfile = {
  slug: "monitor",
  extract: (name): ProfileSpecs => {
    const s = extractMonitorSpecs(name);
    return { capacity: s.sizeInch, power: null, productType: s.resolution };
  },
  capacityBands,
  powerBands,
  budgetBands,
  brandOptions,
  typeLabels,
  useCases,
  useCaseKeywords,
  text: {
    stepUseCase: "用途を選ぶ",
    stepType: "解像度を選ぶ",
    stepSpec: "画面サイズ(インチ)を選ぶ",
    stepBudget: "予算を選ぶ",
    stepBrand: "ブランドを選ぶ(任意)",
    capacityGroupLabel: "サイズ",
    capacityGroupAria: "画面サイズ",
    specRowNote: "用途は商品名の表記(ゲーミング・モバイルなど)、解像度と画面サイズは商品名に明記された値だけで絞り込みます。",
    useCaseFilterNote: "用途は、商品名に「ゲーミング」「モバイル」などの表記がある商品で絞り込んでいます。",
    detailNote: "画面サイズ・解像度は商品名の表記から読み取った値です。接続端子・リフレッシュレート・在庫・配送の詳細は商品ページで確認してください。",
    landingSubheadline: (label) => `${label}のPCモニターを、レビュー・画面サイズ・価格で比べて選べます。`,
    emptyCapacity: (r) =>
      r ? `この条件で画面サイズを確認できた商品は${fmtInch(r.min)}〜${fmtInch(r.max)}です。` : "この条件では、商品名から画面サイズを確認できた商品がありません。",
    emptyPower: () => "",
  },
  notes: [],
  specFacts: (s) => (s.capacity !== null ? [["画面サイズ", fmtInch(s.capacity)]] : []),
  trackSpecParams: (s) => ({ size_inch: s.capacity ?? undefined }),
  // Yahoo!のブランド欄が空の商品も多いため、JANがある商品のみAmazonへのリンクを出す
  amazonTypeWord: () => "",
};
