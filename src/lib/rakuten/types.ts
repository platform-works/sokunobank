// 楽天市場商品検索API(version 2026-07-01)の正規化済み商品。
// 取得できない項目は null(値を捏造しない)。Yahoo!/Amazonのデータとは型・出典を分離して持つ。

export interface RakutenProduct {
  source: "rakuten";
  /** shop:id 形式の商品コード */
  itemCode: string;
  name: string;
  /** 楽天APIの出力に型番専用項目は無いため、商品名から確実に取れた場合のみ設定する */
  modelNumber: string | null;
  /** 楽天APIのドキュメントにJANの記載は無い。レスポンスに含まれていた場合のみ設定(通常はnull) */
  janCode: string | null;
  price: number | null;
  /** 楽天の商品画像URL(先頭1件)。表示許諾が未確認の間は表示に使わない */
  imageUrl: string | null;
  /** 通常の商品URL */
  itemUrl: string | null;
  /** affiliateId指定時のみ得られる楽天アフィリエイトURL */
  affiliateUrl: string | null;
  shopName: string | null;
  /** 楽天市場の評価。表示時は必ず「楽天市場の評価」と出典を明記する */
  reviewAverage: number | null;
  reviewCount: number | null;
}

export type RakutenErrorKind =
  | "no_credentials"
  | "wrong_parameter"
  | "forbidden"
  | "not_found"
  | "rate_limited"
  | "server"
  | "timeout"
  | "network"
  | "parse";

export class RakutenApiError extends Error {
  constructor(
    public kind: RakutenErrorKind,
    message: string,
    public status?: number
  ) {
    super(message);
    this.name = "RakutenApiError";
  }
}
