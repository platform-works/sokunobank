// slugごとの共通クライアント(createApplianceClient)を、初めて使うときに作って返す。
// 1ページにはカテゴリーが1つだけなので、ページを開いたときに使う1つだけが作られ、URLの条件(?brand=...等)もそのときに反映される。
import { createApplianceClient, type ApplianceClient } from "./createApplianceClient";
import { generatorProfile } from "./profiles/generator";
import { riceCookerProfile } from "./profiles/riceCooker";
import type { ApplianceProfile } from "./types";

const profiles: Record<string, ApplianceProfile> = {
  generator: generatorProfile,
  "rice-cooker": riceCookerProfile,
};

const clients = new Map<string, ApplianceClient>();

export function getApplianceClient(slug: string): ApplianceClient {
  let c = clients.get(slug);
  if (!c) {
    const profile = profiles[slug];
    if (!profile) throw new Error(`未登録のプロファイル: ${slug}`);
    c = createApplianceClient(profile);
    c.initFromLocation();
    clients.set(slug, c);
  }
  return c;
}

export function getApplianceProfile(slug: string): ApplianceProfile {
  const profile = profiles[slug];
  if (!profile) throw new Error(`未登録のプロファイル: ${slug}`);
  return profile;
}
