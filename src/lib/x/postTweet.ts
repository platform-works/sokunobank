import { buildOAuth1Header, type OAuth1Credentials } from "./oauth1";

// X API v2 (POST /2/tweets) のサーバー専用クライアント。
// ブラウザからは絶対に呼ばない(認証情報はCloudflare Secrets経由でサーバー側からのみ渡す)。

const TWEETS_ENDPOINT = "https://api.x.com/2/tweets";

export type XCredentials = OAuth1Credentials;

export interface PostTweetResult {
  ok: boolean;
  status: number;
  body: unknown;
}

export async function postTweet(text: string, credentials: XCredentials): Promise<PostTweetResult> {
  const authHeader = await buildOAuth1Header("POST", TWEETS_ENDPOINT, credentials);

  const response = await fetch(TWEETS_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  return { ok: response.ok, status: response.status, body };
}
