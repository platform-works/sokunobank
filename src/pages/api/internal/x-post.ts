import type { APIRoute } from "astro";
import { postTweet } from "../../../lib/x/postTweet";

// 固定文を1件だけ @SOKUNOBANK へ投稿する最小実装。
// Cron・GPTによる文章生成・Yahoo商品データ連携はまだ実装しない(将来の拡張ポイント)。
// GET等の他メソッドは未定義のためAstroが自動的に404を返す(公開実行エンドポイントにしない)。
export const prerender = false;

const TEST_TWEET_TEXT = "即納バンクのX API連携テストです。";

// 誤操作・ネットワーク再送による二重投稿を防ぐためのクールダウン(秒)。
// Cache APIはエッジのPoPごとに独立しており厳密なグローバルロックではないため、
// あくまで「うっかり二重送信」を防ぐベストエフォートの措置(将来Cron化する際はKV/D1等での
// 厳密な重複防止に置き換える想定)。X API側も同一内容の連続投稿を拒否する。
const DEDUPE_LOCK_SECONDS = 60 * 60;
const DEDUPE_LOCK_URL = "https://internal.sokunobank.invalid/x-post-lock/test-tweet";

function jsonResponse(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export const POST: APIRoute = async (context) => {
  const runtimeEnv = (context.locals as { runtime?: { env?: Record<string, string> } }).runtime?.env ?? {};

  const triggerSecret = runtimeEnv.X_POST_TRIGGER_SECRET;
  if (!triggerSecret) {
    return jsonResponse(500, { error: "X_POST_TRIGGER_SECRETが設定されていません" });
  }
  if (context.request.headers.get("Authorization") !== `Bearer ${triggerSecret}`) {
    return jsonResponse(401, { error: "認証に失敗しました" });
  }

  const apiKey = runtimeEnv.X_API_KEY;
  const apiSecret = runtimeEnv.X_API_SECRET;
  const accessToken = runtimeEnv.X_ACCESS_TOKEN;
  const accessTokenSecret = runtimeEnv.X_ACCESS_TOKEN_SECRET;
  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
    return jsonResponse(500, { error: "X APIの認証情報が設定されていません" });
  }

  const cache = typeof caches !== "undefined" ? (caches as unknown as { default: Cache }).default : undefined;
  const lockRequest = new Request(DEDUPE_LOCK_URL);

  if (cache && (await cache.match(lockRequest))) {
    return jsonResponse(409, { error: "直近で投稿済みのため、二重投稿を防ぐためスキップしました" });
  }

  const result = await postTweet(TEST_TWEET_TEXT, {
    consumerKey: apiKey,
    consumerSecret: apiSecret,
    accessToken,
    accessTokenSecret,
  });

  if (cache && result.ok) {
    await cache.put(
      lockRequest,
      new Response("locked", { headers: { "Cache-Control": `max-age=${DEDUPE_LOCK_SECONDS}` } })
    );
  }

  if (!result.ok) {
    return jsonResponse(result.status || 502, { error: "投稿に失敗しました", detail: result.body });
  }

  return jsonResponse(200, { posted: true, detail: result.body });
};
