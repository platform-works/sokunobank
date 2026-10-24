// 炊飯器ページのプロファイル(共通エンジン createApplianceClient へ渡す、カテゴリー固有の値と文言)。
import { extractRiceCookerSpecs } from "../../extractRiceCookerSpecs";
import { useCases } from "../../riceCookerContent";
import type { ApplianceProfile, ProfileSpecs, UseCaseExtraApi } from "../types";
import { brandOptions, budgetBands, capacityBands, powerBands, typeLabels, useCaseKeywords } from "./riceCookerData";

const fmtGo = (n: number) => `${n}合`;

// 用途を選んだときの「炊飯容量の目安」。人数と合数の対応は出典(パナソニック公式)にある範囲だけを出す。
function riceCookerUseCaseExtra(useCaseId: string, api: UseCaseExtraApi): HTMLElement | null {
  const uc = useCases.find((u) => u.id === useCaseId);
  if (!uc || uc.guide.length === 0) return null;
  const box = document.createElement("div");
  const title = document.createElement("p");
  title.className = "step-reco-title";
  title.textContent = "炊飯容量の目安";
  box.appendChild(title);
  const ul = document.createElement("ul");
  ul.className = "step-reco-list";
  for (const g of uc.guide) {
    const li = document.createElement("li");
    const head = document.createElement("strong");
    head.textContent = g.label;
    const desc = document.createElement("span");
    desc.className = "step-reco-desc";
    desc.textContent = g.desc;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-secondary step-reco-apply";
    const band = capacityBands[g.capacityBand];
    btn.textContent = `${band.label}の商品を見る`;
    btn.addEventListener("click", () => {
      api.setSelection({ capacity: band });
      api.trackFilterUse("usecase_reco", g.label);
      api.scrollToProducts();
    });
    li.append(head, desc, btn);
    ul.appendChild(li);
  }
  box.appendChild(ul);
  return box;
}

export const riceCookerProfile: ApplianceProfile = {
  slug: "rice-cooker",
  extract: (name): ProfileSpecs => {
    const s = extractRiceCookerSpecs(name);
    return { capacity: s.capacityGo, power: null, productType: s.productType };
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
    stepType: "加熱方式を選ぶ",
    stepSpec: "炊飯容量(合)を選ぶ",
    stepBudget: "予算を選ぶ",
    stepBrand: "ブランドを選ぶ(任意)",
    capacityGroupLabel: "容量",
    capacityGroupAria: "炊飯容量",
    specRowNote: "用途は商品名の表記(一人暮らし・新生活など)、加熱方式と炊飯容量は商品名に明記された値だけで絞り込みます。",
    useCaseFilterNote: "用途は、商品名に「一人暮らし」「新生活」などの表記がある商品で絞り込んでいます。",
    detailNote: "炊飯容量・加熱方式は商品名の表記から読み取った値です。在庫・配送・仕様の詳細は商品ページで確認してください。",
    landingSubheadline: (label) => `${label}の炊飯器を、レビュー・炊飯容量・価格で比べて選べます。`,
    emptyCapacity: (r) =>
      r ? `この条件で炊飯容量を確認できた商品は${fmtGo(r.min)}〜${fmtGo(r.max)}です。` : "この条件では、商品名から炊飯容量を確認できた商品がありません。",
    emptyPower: () => "",
  },
  notes: [],
  specFacts: (s) => (s.capacity !== null ? [["炊飯容量", fmtGo(s.capacity)]] : []),
  trackSpecParams: (s) => ({ capacity_go: s.capacity ?? undefined }),
  // Yahoo!のブランド欄には「炊きたて」「極め炊き」などシリーズ名が入ることが多く、ブランド名での検索語にできないため、JANがある商品のみAmazonへのリンクを出す
  amazonTypeWord: () => "",
  useCaseExtra: riceCookerUseCaseExtra,
};
