// 원형 전자도장 SVG 생성 — 4글자 2×2 그리드, 나머지 세로 배치
export function generateSealSvg(name: string): string {
  const chars = name.split("");
  const count = chars.length;

  const use2x2 = count === 4;
  const cols = use2x2 ? 2 : 1;
  const rows = use2x2 ? 2 : count;

  const cellSize = use2x2 ? 20 : count <= 2 ? 22 : 18;
  const fontSize = use2x2 ? 16 : count <= 2 ? 19 : 16;

  const gridW = cols * cellSize;
  const gridH = rows * cellSize;
  const innerR = Math.ceil(Math.sqrt((gridW / 2) ** 2 + (gridH / 2) ** 2)) + 10;
  const radius = innerR + 2;
  const size = radius * 2 + 10;
  const cx = size / 2;
  const cy = size / 2;

  const textElements = chars
    .map((char, i) => {
      const col = cols === 1 ? 0 : i % cols;
      const row = cols === 1 ? i : Math.floor(i / cols);
      const x = cx - gridW / 2 + col * cellSize + cellSize / 2;
      const y = cy - gridH / 2 + row * cellSize + cellSize / 2 + 1;
      return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-family="'GungsuhChe','BatangChe','HY견명조','Nanum Myeongjo','Georgia',serif" font-size="${fontSize}" font-weight="900" fill="#CC0000">${char}</text>`;
    })
    .join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="#CC0000" stroke-width="3"/>
  <circle cx="${cx}" cy="${cy}" r="${radius - 5}" fill="none" stroke="#CC0000" stroke-width="1.2"/>
  ${textElements}
</svg>`;
}

// SVG를 base64 Data URL로 변환 (img src 용)
export function sealSvgToDataUrl(name: string): string {
  const svg = generateSealSvg(name);
  const base64 = Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}
