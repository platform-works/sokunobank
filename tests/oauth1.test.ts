import { describe, it, expect } from "vitest";
import { buildOAuth1Header, percentEncode } from "../src/lib/x/oauth1";

// OAuth 1.0aの署名ロジック自体を検証する(実際のX APIには一切アクセスしない)。

describe("percentEncode", () => {
  it("RFC3986のunreserved文字はそのまま、それ以外は%XX(大文字hex)にする", () => {
    expect(percentEncode("abcABC123-._~")).toBe("abcABC123-._~");
    expect(percentEncode("Hello Ladies + Gentlemen, a signed OAuth request!")).toBe(
      "Hello%20Ladies%20%2B%20Gentlemen%2C%20a%20signed%20OAuth%20request%21"
    );
    // encodeURIComponentが素通しする ! * ' ( ) も追加でエンコードする
    expect(percentEncode("!*'()")).toBe("%21%2A%27%28%29");
  });
});

describe("buildOAuth1Header", () => {
  it("必須のoauth_*フィールドを含むAuthorizationヘッダーを生成する", async () => {
    const header = await buildOAuth1Header("POST", "https://api.x.com/2/tweets", {
      consumerKey: "consumer-key",
      consumerSecret: "consumer-secret",
      accessToken: "access-token",
      accessTokenSecret: "access-token-secret",
    });

    expect(header.startsWith("OAuth ")).toBe(true);
    for (const field of [
      "oauth_consumer_key",
      "oauth_nonce",
      "oauth_signature",
      "oauth_signature_method",
      "oauth_timestamp",
      "oauth_token",
      "oauth_version",
    ]) {
      expect(header).toContain(`${field}=`);
    }
    expect(header).toContain('oauth_consumer_key="consumer-key"');
    expect(header).toContain('oauth_token="access-token"');
    expect(header).toContain('oauth_signature_method="HMAC-SHA1"');
  });

  it("呼び出しごとにnonceが変わり、署名も変わる", async () => {
    const credentials = {
      consumerKey: "consumer-key",
      consumerSecret: "consumer-secret",
      accessToken: "access-token",
      accessTokenSecret: "access-token-secret",
    };
    const first = await buildOAuth1Header("POST", "https://api.x.com/2/tweets", credentials);
    const second = await buildOAuth1Header("POST", "https://api.x.com/2/tweets", credentials);
    expect(first).not.toBe(second);
  });
});
