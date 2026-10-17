// トップのヒーロー画像・カテゴリカードのサムネイルを、マスター画像(assets/lp-master/top-hero/mock.webp)から切り出して生成する。
// マスターはデザインモック(1448x1086)。左側のUI(CTA・検索欄)が右ビジュアルの左端に重なるため、
// その範囲は隣接する背景の帯を引き伸ばしてぼかした素材で覆う。
import sharp from "sharp";
const src = "assets/lp-master/top-hero/mock.webp";
const out = "public/images/top";

// --- ヒーロービジュアル ---
const X0 = 660, X1 = 1448, Y0 = 76, Y1 = 655;
const W = X1 - X0, H = Y1 - Y0;
let base = await sharp(src).extract({ left: X0, top: Y0, width: W, height: H }).toBuffer();
// 左端のUI跡(x 660-782, y 455-655)を、x 758-780 の背景帯で覆う
const patchX = 0, patchY = 455 - Y0, patchW = 782 - X0, patchH = H - patchY;
const strip = await sharp(src).extract({ left: 758, top: 455, width: 22, height: Y1 - 455 }).resize(patchW, patchH, { fit: "fill" }).blur(8).toBuffer();
base = await sharp(base).composite([{ input: strip, left: patchX, top: patchY }]).toBuffer();
// 左端と下端をフェードさせる透過マスク
const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>
<linearGradient id="a" x1="0" x2="1"><stop offset="0" stop-color="#000"/><stop offset="0.16" stop-color="#fff"/></linearGradient>
<linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0.82" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>
<mask id="m"><rect width="${W}" height="${H}" fill="url(#a)"/></mask><mask id="n"><rect width="${W}" height="${H}" fill="url(#b)"/></mask></defs>
<rect width="${W}" height="${H}" fill="#fff" mask="url(#m)"/></svg>`);
const m1 = await sharp(mask).resize(W, H).greyscale().raw().toBuffer();
const maskB = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0.8" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#b)"/></svg>`);
const m2 = await sharp(maskB).resize(W, H).greyscale().raw().toBuffer();
const alpha = Buffer.alloc(W * H);
for (let i = 0; i < alpha.length; i++) alpha[i] = Math.round((m1[i] * m2[i]) / 255);
const rgb = await sharp(base).removeAlpha().raw().toBuffer();
await sharp(rgb, { raw: { width: W, height: H, channels: 3 } }).joinChannel(alpha, { raw: { width: W, height: H, channels: 1 } }).webp({ quality: 82 }).toFile(`${out}/hero-visual.webp`);

// --- カテゴリカードのサムネイル ---
const thumbs = [["money", 48], ["work", 281], ["life", 513], ["beauty", 746], ["marriage", 979], ["urgent", 1212]];
for (const [id, x] of thumbs) {
  await sharp(src).extract({ left: x + 1, top: 742, width: 188, height: 93 }).webp({ quality: 85 }).toFile(`${out}/concern-${id}.webp`);
}
console.log("done");
