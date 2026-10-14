/** CSV本文（BOMなし・CRLF）。文字コードの変換は呼び出し側で行う（Shift_JIS 等） */
export function toCsvBody(header: string[], rows: (string | number | null | undefined)[][]): string {
  const esc = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [header, ...rows].map((r) => r.map(esc).join(",")).join("\r\n") + "\r\n";
}
