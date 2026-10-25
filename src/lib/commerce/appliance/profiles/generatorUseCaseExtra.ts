// 発電機ページの、用途を選んだあとに出す「おすすめ容量」と「使いたい電子機器から必要容量を計算」(ブラウザ側)。
// 以前は StepSelector.astro のスクリプトにあった処理をそのまま移した。消費電力は出典確認済みの値
// (generatorContent.ts)。スマートフォン等、確認できないものは入力式にしている。
import { appliances, environments, estimateEnvironment, estimateItems, useCaseEnvironments, type UseCase } from "../../generatorContent";
import type { UseCaseExtraApi } from "../types";
import { capacityBands, isEngineBlocked } from "./generatorData";

type Reco = { id: string; label: string; desc: string; wh: number; w: number; type: "portable" | null; caveat: string };
type Row = { id: string; label: string; watts: number | null; note: string; hours: number };

const applianceRows: Row[] = appliances.map((a) => ({ id: a.id, label: a.label, watts: a.watts, note: a.note, hours: a.defaultHours }));

// 用途ごとの初期選択(その用途の最初のおすすめ環境の機器・時間・台数)
function presetFor(useCase: string): Record<string, { qty: number; hours: number }> {
  const ids = useCaseEnvironments[useCase as UseCase["id"]] ?? [];
  const env = environments.find((e) => e.id === ids[0]);
  return Object.fromEntries((env?.items ?? []).map((i) => [i.applianceId, { qty: i.qty, hours: i.hours }]));
}

// 用途だけを選んだ人へ提示する「おすすめ容量」(出典確認済みの消費電力から計算した目安)
function recoFor(useCase: string): Reco[] {
  return (useCaseEnvironments[useCase as UseCase["id"]] ?? [])
    .map((id) => environments.find((e) => e.id === id))
    .filter((e): e is NonNullable<typeof e> => !!e)
    .map((e) => {
      const est = estimateEnvironment(e);
      return { id: e.id, label: e.label, desc: e.description, wh: est.wh, w: est.w, type: e.type, caveat: e.caveat ?? "" };
    });
}

function numInput(value: string | number, label: string, step: string, width: string): HTMLInputElement {
  const i = document.createElement("input");
  i.type = "number";
  i.min = "0";
  i.step = step;
  i.inputMode = "decimal";
  i.value = String(value);
  i.setAttribute("aria-label", label);
  i.className = "step-calc-num";
  i.style.width = width;
  return i;
}

// 用途 → 使いたい電子機器 → 必要容量。機器にチェックを入れると、必要容量(Wh)と合計出力(W)の目安をその場で出す。
// 消費電力は出典確認済みの値(スマートフォン等、確認できないものは入力式)。「その他の機器」は自由入力
// (工事・業務用の電動工具など、公的な目安値が無い機器はここで自分の機器のW数を入れてもらう)。
function buildCalc(useCase: string, api: UseCaseExtraApi): HTMLElement {
  const preset = presetFor(useCase);
  const box = document.createElement("div");
  box.className = "step-calc";
  const h = document.createElement("p");
  h.className = "step-reco-title";
  h.textContent = "使いたい電子機器から、必要容量を計算する";
  const lead = document.createElement("p");
  lead.className = "step-reco-note";
  lead.textContent = "使う機器にチェックを入れてください。消費電力・使用時間・台数は変更できます(初期値は目安です)。";
  box.append(h, lead);

  type Line = { check: HTMLInputElement; watts: HTMLInputElement; qty: HTMLInputElement; hours: HTMLInputElement };
  const lines: Line[] = [];
  const list = document.createElement("div");
  list.className = "step-calc-rows";

  const addRow = (label: string, noteText: string, wattsInit: string, qtyInit: number, hoursInit: number, checked: boolean, custom: HTMLInputElement | null) => {
    const row = document.createElement("div");
    row.className = "step-calc-row";
    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = checked;
    check.setAttribute("aria-label", `${label}を使う`);
    const name = document.createElement("span");
    name.className = "step-calc-name";
    if (custom) name.appendChild(custom);
    else name.textContent = label;
    if (noteText) {
      const n = document.createElement("small");
      n.textContent = noteText;
      name.appendChild(n);
    }
    const watts = numInput(wattsInit, `${label}の消費電力(W)`, "1", "5rem");
    const qty = numInput(qtyInit, `${label}の台数`, "1", "3.5rem");
    const hours = numInput(hoursInit, `${label}の使用時間(h)`, "0.1", "4rem");
    const wl = document.createElement("span");
    wl.className = "step-calc-unit";
    wl.append("W ", watts);
    const ql = document.createElement("span");
    ql.className = "step-calc-unit";
    ql.append("台 ", qty);
    const hl = document.createElement("span");
    hl.className = "step-calc-unit";
    hl.append("時間 ", hours);
    row.append(check, name, wl, ql, hl);
    list.appendChild(row);
    lines.push({ check, watts, qty, hours });
  };

  for (const d of applianceRows) {
    const p = preset[d.id];
    addRow(d.label, d.note, d.watts === null ? "" : String(d.watts), p ? p.qty : 1, p ? p.hours : d.hours, !!p && d.watts !== null, null);
  }
  const customName = document.createElement("input");
  customName.type = "text";
  customName.placeholder = "その他の機器(例:電動工具)";
  customName.className = "step-calc-text";
  customName.setAttribute("aria-label", "その他の機器の名前");
  addRow("その他の機器", "消費電力は銘板・取扱説明書で確認", "", 1, 1, false, customName);
  box.appendChild(list);

  const result = document.createElement("div");
  result.className = "step-calc-result";
  result.setAttribute("aria-live", "polite");
  const out = document.createElement("p");
  out.className = "step-calc-out";
  const apply = document.createElement("button");
  apply.type = "button";
  apply.className = "btn btn-primary step-calc-apply";
  const caution = document.createElement("p");
  caution.className = "step-reco-note";
  caution.textContent = "あくまで目安です。変換ロス等のため、表示されているバッテリー容量のすべてを使えるわけではありません。余裕を持った容量・出力の機種を選んでください。";
  // エンジン式の発電機には容量(Wh)の表記がないため、出力(W)で絞り込むボタンも用意する
  const applyW = document.createElement("button");
  applyW.type = "button";
  applyW.className = "btn btn-secondary step-calc-apply-w";
  const btns = document.createElement("div");
  btns.className = "step-calc-buttons";
  btns.append(apply, applyW);
  result.append(out, btns, caution);
  box.appendChild(result);

  let whNow = 0;
  let wNow = 0;
  const update = () => {
    const items = lines
      .filter((l) => l.check.checked)
      .map((l) => ({ watts: Number(l.watts.value), qty: Number(l.qty.value), hours: Number(l.hours.value) }));
    const r = estimateItems(items);
    whNow = r.wh;
    wNow = r.w;
    if (r.wh <= 0) {
      out.textContent = "機器にチェックを入れると、必要容量の目安が表示されます。";
      apply.hidden = true;
      applyW.hidden = true;
      return;
    }
    const band = capacityBands.find((b) => r.wh >= b.min && (b.max === null || r.wh <= b.max));
    out.textContent = `必要容量の目安 約${r.wh.toLocaleString("ja-JP")}Wh${band ? `(${band.label}の帯)` : ""} / 同時に使う合計出力の目安 約${r.w.toLocaleString("ja-JP")}W`;
    apply.textContent = `約${r.wh.toLocaleString("ja-JP")}Wh以上の商品を見る`;
    apply.hidden = false;
    applyW.textContent = `出力 約${r.w.toLocaleString("ja-JP")}W以上の商品を見る`;
    applyW.hidden = false;
  };
  list.addEventListener("input", update);
  list.addEventListener("change", update);
  // その他の機器は、W数を入れたら自動でチェックを入れる
  const custom = lines[lines.length - 1];
  custom.watts.addEventListener("input", () => {
    custom.check.checked = Number(custom.watts.value) > 0;
    update();
  });
  apply.addEventListener("click", () => {
    if (whNow <= 0) return;
    api.setSelection({
      type: isEngineBlocked(useCase) ? "portable" : null,
      capacity: { min: whNow, max: null, label: `${whNow.toLocaleString("ja-JP")}Wh以上(計算結果)` },
    });
    api.trackFilterUse("usecase_calc", `${whNow}Wh`);
    api.scrollToProducts();
  });
  applyW.addEventListener("click", () => {
    if (wNow <= 0) return;
    api.setSelection({ power: { min: wNow, max: null, label: `${wNow.toLocaleString("ja-JP")}W以上(計算結果)` } });
    api.trackFilterUse("usecase_calc_power", `${wNow}W`);
    api.scrollToProducts();
  });
  update();
  return box;
}

/**
 * 用途だけを選んだ人に、その用途のおすすめ容量(目安)を提示する。選ぶと容量・種類の絞り込みに反映する。
 * 工事・業務用は、使う機器で必要な出力が大きく変わるため、一律のおすすめ容量は出さず案内だけにする。
 */
export function generatorUseCaseExtra(useCase: string, api: UseCaseExtraApi): HTMLElement {
  const frag = document.createElement("div");
  const list = recoFor(useCase);
  const title = document.createElement("p");
  title.className = "step-reco-title";
  if (list.length === 0) {
    title.textContent = "この用途のおすすめ容量";
    const msg = document.createElement("p");
    msg.className = "step-reco-note";
    msg.textContent =
      "電動工具や業務機器は機器によって必要な出力が大きく変わるため、おすすめ容量を一律にはお出しできません。使う機器の銘板・取扱説明書で消費電力(W)を確認し、下の計算ツールで必要な容量・出力の目安を出してください。";
    frag.append(title, msg, buildCalc(useCase, api));
    return frag;
  }
  title.textContent = "この用途のおすすめ容量(目安)";
  frag.appendChild(title);
  const ul = document.createElement("ul");
  ul.className = "step-reco-list";
  for (const r of list) {
    const li = document.createElement("li");
    const head = document.createElement("strong");
    head.textContent = `${r.label}:約${r.wh.toLocaleString("ja-JP")}Wh以上・出力約${r.w.toLocaleString("ja-JP")}W以上`;
    const desc = document.createElement("span");
    desc.className = "step-reco-desc";
    desc.textContent = r.desc + (r.caveat ? " " + r.caveat : "");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-secondary step-reco-apply";
    btn.textContent = `約${r.wh.toLocaleString("ja-JP")}Wh以上の商品を見る`;
    btn.addEventListener("click", () => {
      api.setSelection({
        type: r.type === "portable" ? "portable" : null,
        capacity: { min: r.wh, max: null, label: `${r.wh.toLocaleString("ja-JP")}Wh以上(${r.label})` },
      });
      api.trackFilterUse("usecase_reco", r.label);
      api.scrollToProducts();
    });
    li.append(head, desc, btn);
    ul.appendChild(li);
  }
  frag.appendChild(ul);
  const note = document.createElement("p");
  note.className = "step-reco-note";
  note.textContent =
    "消費電力は電力会社・メーカー公表の目安、使用時間と台数はこのページの想定例です。実際は機器・季節・使い方で変わるため、余裕を持った容量・出力を選んでください。";
  frag.appendChild(note);
  frag.appendChild(buildCalc(useCase, api));
  return frag;
}
