// OAuth 1.0a (RFC 5849) の Authorization ヘッダー生成。
// X API v2 (User Context) 用の最小実装。リクエストボディはJSONのため、
// 署名対象はoauth_*パラメータのみ(フォームパラメータは含めない。X公式の仕様通り)。

export interface OAuth1Credentials {
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

// RFC 3986のunreserved文字(A-Z a-z 0-9 - . _ ~)以外はすべて%XX(大文字hex)にする。
// encodeURIComponentは ! * ' ( ) を素通しするため、追加で置換する。
export function percentEncode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!*'()]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function randomNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacSha1Base64(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

/**
 * 指定したHTTPメソッド・URLに対するOAuth 1.0a Authorizationヘッダーの値を返す
 * (例: "OAuth oauth_consumer_key=\"...\", ..."）。
 * クエリ文字列を含まない・JSON本文のリクエスト専用(bodyパラメータは署名対象に含めない)。
 */
export async function buildOAuth1Header(
  method: string,
  url: string,
  credentials: OAuth1Credentials
): Promise<string> {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: credentials.consumerKey,
    oauth_nonce: randomNonce(),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: credentials.accessToken,
    oauth_version: "1.0",
  };

  const parameterString = Object.keys(oauthParams)
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(oauthParams[key])}`)
    .join("&");

  const baseString = [method.toUpperCase(), percentEncode(url), percentEncode(parameterString)].join(
    "&"
  );

  const signingKey = `${percentEncode(credentials.consumerSecret)}&${percentEncode(
    credentials.accessTokenSecret
  )}`;
  const signature = await hmacSha1Base64(signingKey, baseString);

  const headerParams: Record<string, string> = { ...oauthParams, oauth_signature: signature };
  const header = Object.keys(headerParams)
    .sort()
    .map((key) => `${percentEncode(key)}="${percentEncode(headerParams[key])}"`)
    .join(", ");

  return `OAuth ${header}`;
}
