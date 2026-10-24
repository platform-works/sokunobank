import type { AdPlatform, ListingSiteConfig } from "./types";

/** 広告グループの最終URL（基本LP + ?intent=）。general は、パラメータなしの基本URL */
export function finalUrl(cfg: Pick<ListingSiteConfig, "baseUrl" | "intentParam">, intent: string): string {
  return intent === "general" ? cfg.baseUrl : `${cfg.baseUrl}?${cfg.intentParam}=${encodeURIComponent(intent)}`;
}

/** 計測パラメータ（utm_*）。値は固定のASCIIスラッグのみ。検索語（{keyword} 等の ValueTrack）は入れない */
export function trackingParameters(
  cfg: Pick<ListingSiteConfig, "campaigns">,
  campaignName: string,
  adGroupName: string,
): string {
  const c = cfg.campaigns.find((x) => x.campaignName === campaignName);
  if (!c) throw new Error(`キャンペーンが未定義: ${campaignName}`);
  return `utm_source=${c.utmSource}&utm_medium=${c.utmMedium}&utm_campaign=${c.utmCampaign}&utm_content=${adGroupName}`;
}

/** 最終URL + 計測パラメータ（確認・入稿用の完全なURL） */
export function fullUrl(cfg: ListingSiteConfig, campaignName: string, adGroupName: string, intent: string): string {
  const base = finalUrl(cfg, intent);
  return `${base}${base.includes("?") ? "&" : "?"}${trackingParameters(cfg, campaignName, adGroupName)}`;
}

export const platformOf = (cfg: ListingSiteConfig, campaignName: string): AdPlatform | undefined =>
  cfg.campaigns.find((c) => c.campaignName === campaignName)?.platform;
