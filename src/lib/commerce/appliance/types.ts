// 「条件で絞り込むYahoo!商品ページ」(発電機で確立、炊飯器へ展開)の共通エンジンが使う型。
// カテゴリー固有の値(用途・容量の帯・ブランド・商品名からの仕様抽出・文言)は ApplianceProfile に持たせ、
// 絞り込み・URL条件・計測・商品カード拡張の処理は createApplianceClient.ts に共通化している。

export interface Range {
  min: number;
  /** nullは上限なし */
  max: number | null;
  label: string;
}

export interface BrandOption {
  id: string;
  label: string;
  /** 商品名またはブランド名(Yahoo!のbrand.name)に含まれる語(大文字小文字を区別しない) */
  words: string[];
}

export interface Selection {
  useCase: string | null;
  /** 種類(カテゴリーごとのid。例: 発電機 portable/gasoline/cassette、炊飯器 ih/micom/...) */
  type: string | null;
  capacity: Range | null;
  /** 出力の帯。出力で絞り込まないカテゴリーでは常にnull */
  power: Range | null;
  /** 予算(円)。価格は全商品で取得できるため、判定不能による除外は起きない */
  budget: Range | null;
  /** ブランド。商品名・ブランド名に該当語が含まれる商品だけを残す */
  brand: BrandOption | null;
}

/** 商品名から抽出した仕様。値は商品名に明記された場合だけ入り、曖昧なときはnull(推測しない) */
export interface ProfileSpecs {
  capacity: number | null;
  power: number | null;
  productType: string | null;
}

export interface ProfileUseCase {
  id: string;
  label: string;
  /** 用途を選んだときに出す注意(あれば) */
  note?: string;
}

export interface ProfileNote {
  id: string;
  /** どの行の下に出すか: 種類の行 / 容量・出力の行 */
  row: "type" | "spec";
  variant: "note" | "hint";
  text: string;
  when: (sel: Selection) => boolean;
}

/** 用途ごとの追加表示(おすすめ容量・計算ツールなど)をつくるときにクライアントから渡す操作 */
export interface UseCaseExtraApi {
  setSelection: (patch: Partial<Selection>) => void;
  trackFilterUse: (filterName: string, filterValue?: string) => void;
  scrollToProducts: () => void;
}

export interface ApplianceProfile {
  slug: string;
  /** 商品名から仕様を抽出する(カテゴリー固有) */
  extract: (name: string) => ProfileSpecs;
  capacityBands: Range[];
  /** 出力で絞り込まないカテゴリーは空配列 */
  powerBands: Range[];
  budgetBands: Range[];
  brandOptions: BrandOption[];
  /** 種類のid → 表示名(STEPのボタン・絞り込みの説明に使う)。種類を使わないカテゴリーは空 */
  typeLabels: Record<string, string>;
  /** 商品の詳細欄に出す種類の説明(typeLabelsより詳しい表記)。未指定ならtypeLabelsを使う */
  typeFactLabels?: Record<string, string>;
  useCases: ProfileUseCase[];
  /** 用途は商品の属性ではないため、商品名に用途を示す語が明記されている商品だけを対象にする */
  useCaseKeywords: Record<string, string[]>;
  /** その用途で選べる種類。nullは制限なし。制限がある用途では、種類が確認できない商品も表示しない */
  allowedTypes?: (useCase: string | null) => string[] | null;
  /** 容量を商品名から確認できない種類(この種類と容量は同時に指定できない) */
  noCapacityTypes?: string[];
  /** 画面の文言 */
  text: {
    /** STEPの見出し(用途を選ぶ 等) */
    stepUseCase: string;
    stepType: string;
    stepSpec: string;
    stepBudget: string;
    stepBrand: string;
    capacityGroupLabel: string;
    capacityGroupAria: string;
    powerGroupLabel?: string;
    powerGroupAria?: string;
    /** 容量・出力の行の補足(常時表示) */
    specRowNote: string;
    /** 絞り込みの説明に出す用途の注記 */
    useCaseFilterNote: string;
    /** おすすめ商品の詳細欄の注記 */
    detailNote: string;
    /** 誘導元の条件付きURLで開いたときの、サブ見出し(条件を「・」でつないだ文字列を渡す) */
    landingSubheadline: (label: string) => string;
    /** 0件時の案内(容量・出力で絞っているときに追記する) */
    emptyCapacity: (range: { min: number; max: number } | null) => string;
    emptyPower: (range: { min: number; max: number } | null) => string;
  };
  notes: ProfileNote[];
  /** カードや詳細欄に出す仕様の一覧(ラベル, 値)。確認できたものだけ返す */
  specFacts: (specs: ProfileSpecs & Record<string, unknown>) => [string, string][];
  /** outbound_product_click等へ追加する仕様のパラメータ(取得できないものはundefined) */
  trackSpecParams: (specs: ProfileSpecs & Record<string, unknown>) => Record<string, number | undefined>;
  /** Amazonのキーワード検索(JANが無いとき)に添える種類の語。空なら検索リンクを出さない */
  amazonTypeWord: (type: string | null) => string;
  /** 用途ごとの追加表示(おすすめ容量・計算ツール)。無ければnull */
  useCaseExtra?: (useCase: string, api: UseCaseExtraApi) => HTMLElement | null;
}
