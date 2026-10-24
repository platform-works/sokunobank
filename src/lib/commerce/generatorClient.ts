// 発電機・ポータブル電源ページのクライアント側ロジック(2026-09-30導入)。
// 2026-10-24に処理本体を共通エンジン(appliance/createApplianceClient.ts)へ移し、発電機固有の値は
// appliance/profiles/generator.ts に持たせた。このファイルは従来のimport先を保つための薄いラッパーで、
// 発電機の絞り込み・計測の挙動は変えていない。
import { getApplianceClient } from "./appliance/clients";
import { DELIVERY_NOTICE, deliveryText, inRange, matchesBrand, prefectureName } from "./appliance/createApplianceClient";
import { generatorProfile } from "./appliance/profiles/generator";
import { brandOptions, budgetBands, capacityBands, isEngineBlocked, isEngineType, powerBands, typeLabels, useCaseKeywords } from "./appliance/profiles/generatorData";

export type { BrandOption, Range, Selection } from "./appliance/types";
export type { Landing } from "./appliance/createApplianceClient";
export type { ProductType } from "./appliance/profiles/generatorData";
export { DELIVERY_NOTICE, deliveryText, inRange, matchesBrand, prefectureName };
export { brandOptions, budgetBands, capacityBands, isEngineBlocked, isEngineType, powerBands, typeLabels, useCaseKeywords };

export const SLUG = generatorProfile.slug;
export const AREA_STORAGE_KEY = `sokunobank:commerce:${SLUG}:area`;

// ページ内の共通部品(StepSelector等)と同じ1つのクライアントを共有する
const client = getApplianceClient(SLUG);

export const {
  matchesUseCase,
  specsOf,
  isFiltering,
  filterBySelection,
  availableRanges,
  buildTrackParams,
  describeSelection,
  selectionFromParams,
  mergeSelection,
  getSelection,
  landingFromParams,
  getLanding,
  setLanding,
  landingTrackParams,
  setSelection,
  brandFetchParam,
  clearSelection,
  trackFilterUse,
} = client;

export const registerGeneratorExtension = client.registerExtension;
