/**
 * Shift_JIS（Windows-31J 相当）のエンコード。キャンペーンエディターは、任意作成のCSVで Shift_JIS を自動選択する（ヘルプ）。
 * Node 標準の TextDecoder("shift_jis") の変換表を逆引きして作る（外部ライブラリなし）。
 */
let map: Map<string, number[]> | null = null;

function table(): Map<string, number[]> {
  if (map) return map;
  const dec = new TextDecoder("shift_jis");
  const m = new Map<string, number[]>();
  const put = (ch: string, bytes: number[]) => {
    if (ch && ch !== "�" && !m.has(ch)) m.set(ch, bytes);
  };
  for (let b = 0x00; b <= 0x7f; b++) put(dec.decode(Uint8Array.of(b)), [b]);
  for (let b = 0xa1; b <= 0xdf; b++) put(dec.decode(Uint8Array.of(b)), [b]); // 半角カナ
  for (let lead = 0x81; lead <= 0xfc; lead++) {
    if (lead > 0x9f && lead < 0xe0) continue;
    for (let trail = 0x40; trail <= 0xfc; trail++) {
      if (trail === 0x7f) continue;
      const s = dec.decode(Uint8Array.of(lead, trail));
      if ([...s].length === 1) put(s, [lead, trail]);
    }
  }
  map = m;
  return m;
}

export interface SjisResult {
  bytes: Uint8Array;
  /** Shift_JIS に変換できない文字（あれば入稿できない） */
  unmappable: string[];
}

export function encodeShiftJis(text: string): SjisResult {
  const t = table();
  const out: number[] = [];
  const bad = new Set<string>();
  for (const ch of text) {
    const b = t.get(ch);
    if (b) out.push(...b);
    else {
      bad.add(ch);
      out.push(0x3f); // ?
    }
  }
  return { bytes: Uint8Array.from(out), unmappable: [...bad] };
}

export function decodeShiftJis(bytes: Uint8Array): string {
  return new TextDecoder("shift_jis").decode(bytes);
}

/** URL 等の「バイト数」: 半角=1・全角=3（ヘルプの数え方。UTF-8 の長さと同じ） */
export function urlBytes(s: string): number {
  return new TextEncoder().encode(s).length;
}
