import { Resvg } from "@resvg/resvg-js";
import { fileURLToPath } from "node:url";
const font = fileURLToPath(new URL("./fonts/NotoSans.ttf", import.meta.url));
const cache = new Map();
export function renderSearchPreview({ query, count }) {
  const key = String(count);
  if (cache.has(key)) return cache.get(key);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#f3f6f4"/>
<rect width="600" height="630" fill="#e4eeeb"/>
<path d="M600 70V560" stroke="#b9ceca"/>
<g transform="translate(176 88) scale(3.875)" fill="#00777e">
<path d="M32 3 Q28 9 26 17 Q16 14 8 18 Q28 25 29 43 Q30 52 25 62 Q32 65 39 62 Q34 52 35 43 Q36 25 56 18 Q46 14 38 17 Q36 9 32 3Z"/>
<path d="M17 24 C5 35 4 51 12 60 Q16 64 21 65 C29 50 28 36 17 24Z"/>
<path d="M47 24 C59 35 60 51 52 60 Q48 64 43 65 C35 50 36 36 47 24Z"/>
</g>
<g font-family="Noto Sans" fill="#173d40">
<text x="300" y="445" text-anchor="middle" font-size="35">Hazlitt Creek</text>
<text x="300" y="486" text-anchor="middle" font-size="27" fill="#173d40" font-weight="400">Evidence Atlas</text>
<text x="668" y="120" font-size="17" letter-spacing="2.5" fill="#47716e">SHARED COLLECTION</text>
<text x="660" y="295" font-size="${count > 999 ? 104 : 144}" fill="#00777e">${count}</text>
<text x="668" y="349" font-size="34">${count === 1 ? "project profile" : "project profiles"}</text>
<path d="M668 411H1118" stroke="#c4d5d0"/>
<text x="668" y="384" font-size="18" fill="#47716e">Explore the outcomes</text>
</g></svg>`;
  const png = new Resvg(svg, {
    font: {
      fontFiles: [font],
      loadSystemFonts: false,
      defaultFontFamily: "Noto Sans",
    },
  })
    .render()
    .asPng();
  if (cache.size >= 64) cache.delete(cache.keys().next().value);
  cache.set(key, png);
  return png;
}
