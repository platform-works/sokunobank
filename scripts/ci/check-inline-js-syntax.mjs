// 生成された全HTMLのインラインJavaScriptの構文を検査する(広告タグ以外のコードも含む)。
// 背景: 2026-10-15、正規表現リテラルがコメント扱いになる構文エラーが本番に出た(広告タグが全ページで動かなかった)。
// 使い方: npm run build && npm run check:syntax
import { inlineScripts, listHtml, readHtml } from "./lib.mjs";

const errors = [];
let count = 0;
const files = listHtml();
for (const f of files) {
  for (const s of inlineScripts(readHtml(f))) {
    count++;
    try {
      if (s.isModule) new Function(`return async()=>{${s.body.replace(/^\s*(import|export)\b[^;\n]*;?/gm, "")}}`);
      else new Function(s.body);
    } catch (e) {
      errors.push(`${f}: ${e.message} (先頭: ${JSON.stringify(s.body.trim().slice(0, 60))})`);
    }
  }
}
if (errors.length) {
  console.error(`NG: インラインJSの構文エラー ${errors.length} 件`);
  for (const e of errors) console.error(" - " + e);
  process.exit(1);
}
console.log(`OK: ${files.length} ページ / インラインJS ${count} 本の構文エラーなし`);
