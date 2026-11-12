// 3 mô hình triết học. Mỗi phần tử trong "bricks" là một viên gạch (SVG, viewBox -20 -20 360 360).
// Gạch được đặt theo đúng thứ tự trong mảng.
const INK = '#5b4636';

const face = (cx, cy, gap = 14) => `
  <circle cx="${cx - gap}" cy="${cy}" r="3.6" fill="${INK}"/>
  <circle cx="${cx + gap}" cy="${cy}" r="3.6" fill="${INK}"/>
  <circle cx="${cx - gap + 1.2}" cy="${cy - 1.2}" r="1.1" fill="#fff"/>
  <circle cx="${cx + gap + 1.2}" cy="${cy - 1.2}" r="1.1" fill="#fff"/>
  <path d="M${cx - 6},${cy + 6} Q${cx},${cy + 12} ${cx + 6},${cy + 6}" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>
  <ellipse cx="${cx - gap - 9}" cy="${cy + 7}" rx="5.5" ry="3.2" fill="#f79a9a" opacity=".75"/>
  <ellipse cx="${cx + gap + 9}" cy="${cy + 7}" rx="5.5" ry="3.2" fill="#f79a9a" opacity=".75"/>`;

const labelBrick = (x, y, w, h, fill, text, size = 13) => `
  <rect class="o" x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="${fill}"/>
  <text x="${x + w / 2}" y="${y + h / 2 + 1}" font-size="${size}">${text}</text>`;

const column = (x) => `
  <rect class="o" x="${x}" y="116" width="22" height="120" rx="5" fill="#fffaf0"/>
  <line x1="${x + 7.5}" y1="126" x2="${x + 7.5}" y2="226" stroke="#e3cfb3" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="${x + 14.5}" y1="126" x2="${x + 14.5}" y2="226" stroke="#e3cfb3" stroke-width="2.5" stroke-linecap="round"/>
  <rect class="o" x="${x - 5}" y="110" width="32" height="9" rx="4" fill="#f9e2bd"/>
  <rect class="o" x="${x - 5}" y="231" width="32" height="8" rx="4" fill="#f9e2bd"/>`;

// Bát quái: bits từ hào dưới (gần tâm) lên hào trên (xa tâm). 1 = hào dương (liền), 0 = hào âm (đứt)
const trigram = (angle, bits, name, meaning, tile) => {
  const lines = bits.map((b, i) => {
    const y = 58 - i * 11;
    return b
      ? `<rect x="138" y="${y - 3.5}" width="44" height="7" rx="3.5" fill="${INK}"/>`
      : `<rect x="138" y="${y - 3.5}" width="19" height="7" rx="3.5" fill="${INK}"/><rect x="163" y="${y - 3.5}" width="19" height="7" rx="3.5" fill="${INK}"/>`;
  }).join('');
  const rad = angle * Math.PI / 180;
  const tx = 160 + 152 * Math.sin(rad), ty = 160 - 152 * Math.cos(rad);
  return `
    <g transform="rotate(${angle} 160 160)">
      <rect class="o" x="130" y="26" width="60" height="42" rx="12" fill="${tile}"/>
      ${lines}
    </g>
    <text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" font-size="12">${name}</text>
    <text x="${tx.toFixed(1)}" y="${(ty + 13).toFixed(1)}" font-size="9.5" class="sub">${meaning}</text>`;
};

const MODELS = [
  {
    id: 'greek',
    emoji: '🏛️',
    name: 'Đền Triết Học Hy Lạp',
    short: 'Hy Lạp',
    desc: 'Ngôi đền của lý trí: nơi Thales, Socrates, Plato và Aristotle đặt nền móng cho triết học phương Tây.',
    fact: 'Con cú là biểu tượng của nữ thần trí tuệ Athena. Hegel từng viết: “Con cú của thần Minerva chỉ cất cánh khi hoàng hôn buông xuống”, ý nói triết học hiểu được một thời đại khi thời đại ấy đã chín muồi.',
    bricks: [
      { label: 'Bậc nền: Sự ngạc nhiên', svg: `<rect class="o" x="36" y="278" width="248" height="22" rx="7" fill="#f6d2a0"/>` },
      { label: 'Bậc hai: Sự hoài nghi', svg: `<rect class="o" x="52" y="256" width="216" height="22" rx="7" fill="#f9e0b8"/>` },
      { label: 'Sàn đền: Lý trí', svg: `<rect class="o" x="66" y="238" width="188" height="18" rx="6" fill="#fcebd0"/>` },
      { label: 'Cột Thales', svg: column(89) },
      { label: 'Cột Socrates', svg: column(129) },
      { label: 'Cột Plato', svg: column(169) },
      { label: 'Cột Aristotle', svg: column(209) },
      { label: 'Xà ngang: Logic học', svg: `<rect class="o" x="60" y="94" width="200" height="20" rx="6" fill="#f9e0b8"/>
        <circle cx="90" cy="104" r="3" fill="#e3c08f"/><circle cx="130" cy="104" r="3" fill="#e3c08f"/><circle cx="190" cy="104" r="3" fill="#e3c08f"/><circle cx="230" cy="104" r="3" fill="#e3c08f"/>` },
      { label: 'Mái đền: Siêu hình học', svg: `<polygon class="o" points="52,96 160,44 268,96" fill="#fde2cc"/>${face(160, 76, 12)}` },
      { label: 'Cú Minerva: biểu tượng trí tuệ', svg: `
        <polygon class="o" points="144,24 148,10 155,20" fill="#c9a27e"/>
        <polygon class="o" points="176,24 172,10 165,20" fill="#c9a27e"/>
        <ellipse class="o" cx="160" cy="32" rx="18" ry="19" fill="#d6b08a"/>
        <ellipse cx="160" cy="39" rx="10" ry="10" fill="#f3dcc0"/>
        <circle class="o" cx="153" cy="28" r="6.5" fill="#fff"/><circle class="o" cx="167" cy="28" r="6.5" fill="#fff"/>
        <circle cx="154" cy="28" r="3" fill="${INK}"/><circle cx="166" cy="28" r="3" fill="${INK}"/>
        <polygon points="157,34 163,34 160,40" fill="#f2a541"/>` },
    ],
  },
  {
    id: 'marx',
    emoji: '🏠',
    name: 'Ngôi Nhà Duy Vật Lịch Sử',
    short: 'Duy vật lịch sử',
    desc: 'Mô hình Cơ sở hạ tầng – Kiến trúc thượng tầng của Mác: kinh tế là móng nhà, chính trị và tư tưởng là phần nhà phía trên.',
    fact: 'Cơ sở hạ tầng quyết định kiến trúc thượng tầng, còn kiến trúc thượng tầng tác động trở lại cơ sở hạ tầng. Móng vững thì nhà mới vững, và mái nhà cũng che chở cho móng.',
    bricks: [
      { label: 'Lực lượng sản xuất', svg: labelBrick(26, 268, 268, 32, '#d8b48c', 'Lực lượng sản xuất') },
      { label: 'Quan hệ sản xuất (Cơ sở hạ tầng)', svg: labelBrick(38, 234, 244, 32, '#ecd0a8', 'Cơ sở hạ tầng · QHSX', 12.5) },
      { label: 'Chính trị', svg: labelBrick(40, 198, 76, 34, '#ffc9d6', 'Chính trị') },
      { label: 'Pháp luật', svg: labelBrick(122, 198, 76, 34, '#c8e2ff', 'Pháp luật') },
      { label: 'Nhà nước', svg: labelBrick(204, 198, 76, 34, '#cfeec9', 'Nhà nước') },
      { label: 'Đạo đức', svg: labelBrick(40, 160, 76, 34, '#ffe0b3', 'Đạo đức') },
      { label: 'Tôn giáo', svg: labelBrick(122, 160, 76, 34, '#e4d4ff', 'Tôn giáo') },
      { label: 'Nghệ thuật', svg: labelBrick(204, 160, 76, 34, '#ffd0c2', 'Nghệ thuật') },
      { label: 'Triết học · Khoa học', svg: labelBrick(40, 122, 240, 34, '#fff1b8', 'Triết học · Khoa học') },
      { label: 'Mái nhà: Kiến trúc thượng tầng', svg: `<polygon class="o" points="22,124 160,38 298,124" fill="#f7a8a8"/>
        ${face(160, 78, 13)}
        <text x="160" y="110" font-size="12">Kiến trúc thượng tầng</text>` },
      { label: 'Mặt trời Thực tiễn', svg: `
        <g stroke="#f2a541" stroke-width="4" stroke-linecap="round">
          <line x1="40" y1="2" x2="40" y2="-8"/><line x1="40" y1="78" x2="40" y2="88"/>
          <line x1="2" y1="40" x2="-8" y2="40"/><line x1="78" y1="40" x2="88" y2="40"/>
          <line x1="13" y1="13" x2="6" y2="6"/><line x1="67" y1="13" x2="74" y2="6"/>
          <line x1="13" y1="67" x2="6" y2="74"/><line x1="67" y1="67" x2="74" y2="74"/>
        </g>
        <circle class="o" cx="40" cy="40" r="26" fill="#ffd96a"/>${face(40, 38, 9)}` },
    ],
  },
  {
    id: 'yinyang',
    emoji: '☯️',
    name: 'Thái Cực Âm Dương Bát Quái',
    short: 'Âm Dương',
    desc: 'Mô hình triết học phương Đông: Âm và Dương đối lập mà thống nhất, bao quanh là tám quẻ tượng trưng cho vạn vật.',
    fact: '“Trong Âm có Dương, trong Dương có Âm.” Hai chấm nhỏ trên Thái Cực Đồ cho thấy không có gì thuần túy tuyệt đối. Mọi sự vật đều chứa mầm mống của mặt đối lập và có thể chuyển hóa sang nó.',
    bricks: [
      { label: 'Dương ☀️', svg: `<path class="o" d="M160,80 A80,80 0 0,0 160,240 A40,40 0 0,1 160,160 A40,40 0 0,0 160,80 Z" fill="#fff4dc"/>` },
      { label: 'Âm 🌙', svg: `<path class="o" d="M160,80 A80,80 0 0,1 160,240 A40,40 0 0,1 160,160 A40,40 0 0,0 160,80 Z" fill="#6b70b5"/>` },
      { label: 'Trong Dương có Âm', svg: `<circle class="o" cx="160" cy="120" r="11" fill="#6b70b5"/><circle cx="163" cy="116" r="3.5" fill="#fff"/>
        <ellipse cx="138" cy="128" rx="6" ry="3.5" fill="#f79a9a" opacity=".8"/>
        <path d="M128,104 Q134,100 140,104" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>` },
      { label: 'Trong Âm có Dương', svg: `<circle class="o" cx="160" cy="200" r="11" fill="#fff4dc"/><circle cx="157" cy="204" r="3.5" fill="#6b70b5"/>
        <ellipse cx="182" cy="192" rx="6" ry="3.5" fill="#f79a9a" opacity=".85"/>
        <path d="M180,216 Q186,220 192,216" fill="none" stroke="#fff4dc" stroke-width="2.5" stroke-linecap="round"/>` },
      { label: 'Quẻ Càn ☰ (Trời)', svg: trigram(0, [1, 1, 1], 'Càn', 'Trời', '#fff1b8') },
      { label: 'Quẻ Khôn ☷ (Đất)', svg: trigram(180, [0, 0, 0], 'Khôn', 'Đất', '#ecd0a8') },
      { label: 'Quẻ Ly ☲ (Lửa)', svg: trigram(270, [1, 0, 1], 'Ly', 'Lửa', '#ffc9c2') },
      { label: 'Quẻ Khảm ☵ (Nước)', svg: trigram(90, [0, 1, 0], 'Khảm', 'Nước', '#c8e2ff') },
      { label: 'Quẻ Chấn ☳ (Sấm)', svg: trigram(225, [1, 0, 0], 'Chấn', 'Sấm', '#e4d4ff') },
      { label: 'Quẻ Tốn ☴ (Gió)', svg: trigram(45, [0, 1, 1], 'Tốn', 'Gió', '#d4f2ee') },
      { label: 'Quẻ Cấn ☶ (Núi)', svg: trigram(135, [0, 0, 1], 'Cấn', 'Núi', '#cfeec9') },
      { label: 'Quẻ Đoài ☱ (Đầm)', svg: trigram(315, [1, 1, 0], 'Đoài', 'Đầm', '#ffe0b3') },
    ],
  },
];
