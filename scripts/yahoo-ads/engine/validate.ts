import { containsTerm } from "./normalize";
import { GOOGLE_RSA, YAHOO_RSA, type RsaLimits } from "./limits";
import type { Issue, ListingSiteConfig } from "./types";
import { finalUrl, platformOf } from "./urls";
import { weight } from "./width";

const LIMITS = { google: GOOGLE_RSA, yahoo: YAHOO_RSA } as const;

const err = (code: string, where: string, message: string): Issue => ({ level: "error", code, where, message });
const warn = (code: string, where: string, message: string): Issue => ({ level: "warn", code, where, message });

/** 広告原稿・キーワード・除外キーワード・LPの整合性を検査する（サイト設定を受け取る汎用処理） */
export function validateListing<I extends string>(cfg: ListingSiteConfig<I>): Issue[] {
  const out: Issue[] = [];
  const intents = Object.keys(cfg.intents) as I[];
  const ngTerms = cfg.advertisers.flatMap((a) => a.ngWords.map((w) => ({ ...w, advertiser: a.name })));

  const checkBrand = (text: string, where: string) => {
    for (const w of ngTerms)
      if (containsTerm(text, w.word)) out.push(err("brand_ng", where, `リスティングNGワード「${w.word}」（${w.advertiser}）を含む: ${text}`));
  };
  const checkPhrases = (text: string, where: string) => {
    for (const p of cfg.avoidPhrases) if (text.includes(p)) out.push(err("avoid_phrase", where, `避ける表現「${p}」を含む: ${text}`));
    for (const p of cfg.inferencePhrases) {
      const hit = typeof p === "string" ? text.includes(p) : p.test(text);
      if (hit) out.push(err("attribute_inference", where, `利用者の属性・意思・状況を推測させる表現（${String(p)}）: ${text}`));
    }
  };

  // 1. 広告グループ（文字数・ブランド語・表現・LPとの整合）
  const names = new Set<string>();
  for (const g of cfg.adGroups) {
    const where = `${g.campaignName}/${g.adGroupName}`;
    if (names.has(where)) out.push(err("dup_ad_group", where, "広告グループ名が重複"));
    names.add(where);
    const platform = platformOf(cfg, g.campaignName);
    if (!platform) {
      out.push(err("unknown_campaign", where, `キャンペーン未定義: ${g.campaignName}`));
      continue;
    }
    const lim: RsaLimits = LIMITS[platform];
    g.headlines.forEach((h, i) => {
      const w = weight(h);
      if (!h.trim()) out.push(err("empty_headline", `${where}#H${i + 1}`, "見出しが空"));
      if (w > lim.headlineMax) out.push(err("headline_len", `${where}#H${i + 1}`, `見出しが${w}（上限${lim.headlineMax}。全角=2）: ${h}`));
    });
    if (g.headlines.length < lim.headlineCount.min) out.push(err("headline_count", where, `見出しが${lim.headlineCount.min}件未満`));
    g.descriptions.forEach((d, i) => {
      const w = weight(d);
      if (!d.trim()) out.push(err("empty_description", `${where}#D${i + 1}`, "説明文が空"));
      if (w > lim.descriptionMax) out.push(err("description_len", `${where}#D${i + 1}`, `説明文が${w}（上限${lim.descriptionMax}。全角=2）: ${d}`));
    });
    if (g.descriptions.length < lim.descriptionCount.min) out.push(err("description_count", where, `説明文が${lim.descriptionCount.min}件未満`));
    for (const [k, p] of [
      ["path1", g.path1],
      ["path2", g.path2],
    ] as const) {
      if (!p) continue;
      if (lim.pathMax === null) out.push(err("path_unverified", `${where}#${k}`, "この媒体の表示URLパスの上限が未確認のため、使わない"));
      else if (weight(p) > lim.pathMax) out.push(err("path_len", `${where}#${k}`, `パスが${weight(p)}（上限${lim.pathMax}）: ${p}`));
      if (/[^\p{L}\p{N}_-]/u.test(p)) out.push(err("path_chars", `${where}#${k}`, `パスに使えない文字: ${p}`));
    }
    const texts = [...g.headlines, ...g.descriptions, g.path1, g.path2].filter(Boolean);
    for (const t of texts) {
      checkBrand(t, where);
      checkPhrases(t, where);
    }
    checkBrand(g.adGroupName, `${where}#name`);
    checkBrand(finalUrl(cfg, g.intent), `${where}#url`);

    // 広告とLPの整合: 広告の約束（intent の語）がLPのファーストビューに存在し、他 intent の約束を含まない
    const lp = cfg.intents[g.intent];
    if (!lp) {
      out.push(err("unknown_intent", where, `intent 未定義: ${g.intent}`));
      continue;
    }
    const adText = texts.join("\n");
    const lpText = [lp.h1, lp.subcopy, lp.description, ...lp.tags].join("\n");
    const own = lp.promiseWords.filter((w) => adText.includes(w));
    if (own.length === 0)
      out.push(err("promise_missing", where, `広告文が intent「${g.intent}」の約束（${lp.promiseWords.join("・")}）を示していない`));
    for (const w of own)
      if (!lpText.includes(w)) out.push(err("promise_not_on_lp", where, `広告文の「${w}」が、LP（${g.intent}）のファーストビューにない`));
    if (g.intent !== "general") {
      const mine = new Set(lp.promiseWords);
      for (const other of intents) {
        if (other === g.intent || other === "general") continue;
        for (const w of cfg.intents[other].promiseWords)
          if (!mine.has(w) && adText.includes(w))
            out.push(err("promise_mismatch", where, `広告文の「${w}」は intent「${other}」の訴求。LP（${g.intent}）の訴求と一致しない`));
      }
    }
  }

  // 2. キーワード
  const seenKw = new Set<string>();
  for (const k of cfg.keywords) {
    const where = `${k.keywordId}（${k.keyword}）`;
    const key = `${k.adGroupName}|${k.keyword}|${k.matchType}`;
    if (seenKw.has(key)) out.push(err("dup_keyword", where, "同じ広告グループに同一キーワード・マッチタイプが重複"));
    seenKw.add(key);
    checkBrand(k.keyword, where);
    const g = cfg.adGroups.find((x) => x.adGroupName === k.adGroupName);
    if (!g) {
      out.push(err("keyword_no_group", where, `広告グループ未定義: ${k.adGroupName}`));
      continue;
    }
    if (g.intent !== k.intent) out.push(err("keyword_intent", where, `キーワードの intent（${k.intent}）が広告グループ（${g.intent}）と異なる`));
    const lp = cfg.intents[k.intent];
    if (lp && k.intent !== "general") {
      if (!lp.keywordWords.some((w) => k.keyword.includes(w)))
        out.push(err("keyword_no_signal", where, `intent「${k.intent}」を示す語（${lp.keywordWords.join("・")}）を含まない`));
    }
    for (const other of intents) {
      if (other === k.intent || other === "general") continue;
      const mine = new Set(cfg.intents[k.intent]?.keywordWords ?? []);
      for (const w of cfg.intents[other].promiseWords)
        if (!mine.has(w) && k.keyword.includes(w)) out.push(err("keyword_mixed", where, `intent「${other}」の語「${w}」を含む`));
    }
    // 初期候補の条件: 広告グループが候補で、意図の強さが low でなく、薬剤師・調剤薬局の語を含む。除外・保留に、理由がある
    if (!k.decisionReason.trim()) out.push(err("decision_reason", where, "採用判断の理由がない"));
    if (k.decision === "initial") {
      if (!g.initialCandidate) out.push(err("initial_group", where, "初期候補のキーワードが、初期配信の候補でない広告グループにある"));
      if (k.intentStrength === "low") out.push(err("initial_low_intent", where, "検索意図が弱い（low）キーワードを、初期候補にしている"));
      if (cfg.initialKeywordSignal && !new RegExp(cfg.initialKeywordSignal.pattern).test(k.keyword))
        out.push(err("initial_no_signal", where, `初期候補のキーワードに、必要な語がない（${cfg.initialKeywordSignal.reason}）`));
    }
    // 無駄なクリックを抑える対象外キーワードと、キーワードが衝突しない
    for (const n of cfg.wasteNegatives) if (containsTerm(k.keyword, n.word)) out.push(err("keyword_vs_negative", where, `対象外キーワード「${n.word}」を含む`));
    const m = k.metrics;
    if (m.monthlySearchVolume !== null || m.cpcLowYen !== null || m.cpcHighYen !== null) {
      if (!m.dataSource || !m.fetchedAt)
        out.push(err("metrics_no_source", where, "検索ボリューム・CPC に、取得元と取得日がない（推測値を実績として扱わない）"));
    }
  }

  // 3. 広告主の規約: 確認前に ready にしない
  // ready にできるのは、広告主の許可（listingApproved）と範囲の確認（scopeConfirmed）がそろったとき。CSV の生成・検証は、ready でなくても行う
  const unconfirmed = cfg.advertisers.filter((a) => a.listingApproved !== true || !a.scopeConfirmed);
  const readyItems = [
    ...cfg.adGroups.filter((g) => g.status === "ready").map((g) => g.adGroupName),
    ...cfg.keywords.filter((k) => k.status === "ready").map((k) => k.keywordId),
  ];
  if (readyItems.length && unconfirmed.length)
    out.push(
      err(
        "advertiser_unconfirmed",
        "advertisers",
        `ASP のリスティング許可、または許可範囲の確認が済んでいない広告主（${unconfirmed.map((a) => a.name).join("・")}）があるため、ready にできない: ${readyItems.slice(0, 5).join(", ")}…`,
      ),
    );
  for (const a of cfg.advertisers) {
    if (a.listingApproved !== true) out.push(warn("advertiser_pending", a.advertiserId, `${a.name}: リスティング可否が未確認、または不可`));
    else if (!a.scopeConfirmed) out.push(warn("scope_unconfirmed", a.advertiserId, `${a.name}: 条件つきで可（一部OK）。許可範囲（禁止キーワードの完全な一覧・広告主固有の制限）は未確認。配信は開始しない`));
  }
  for (const a of cfg.advertisers) {
    // 追加の除外（表記揺れ・ローマ字など。編集部の点検）は、安全側の追加で、照合の対象にしない
    const unverified = a.ngWords.filter((w) => !w.verified && !w.source.startsWith("編集部の点検"));
    if (unverified.length)
      out.push(warn("ng_word_unverified", a.advertiserId, `${a.name}: NGワード ${unverified.length}語が、広告主の規約と未照合（${unverified.map((w) => w.word).join("・")}）`));
  }

  return out;
}
