// 3 công trình triết học dựng bằng khối 3D. Mỗi phần tử trong "bricks" là một viên gạch,
// gồm một hoặc nhiều khối ("parts"). Gạch được đặt theo đúng thứ tự trong mảng.
// Loại khối: box (hộp), cyl (trụ), prism (lăng trụ tam giác), yy (nửa Thái cực), ico/sphere (khối phát sáng), label (chữ nổi).
// Đơn vị: mét ảo. Trục y hướng lên, mặt trước công trình quay về +z.

const MARBLE = { color: '#e9e2d2', rough: 0.48 };
const MARBLE_DK = { color: '#cfc6b2', rough: 0.55 };
const BRONZE = { color: '#c9a24a', rough: 0.32, metal: 0.85, emissive: '#7a5210', glow: 0.9 };

const column = (x, z) => [
  { type: 'box', size: [1.05, 0.2, 1.05], pos: [x, 1.8, z], ...MARBLE_DK },
  { type: 'cyl', r: 0.38, h: 4, pos: [x, 3.9, z], ...MARBLE },
  { type: 'box', size: [1.1, 0.25, 1.1], pos: [x, 6.025, z], ...MARBLE_DK },
];
const columnPair = (x) => [...column(x, 2), ...column(x, -2)];

const block = (text, x, y, w, h, d, color) => ({ type: 'box', size: [w, h, d], pos: [x, y, 0], color, rough: 0.7, text });

// Quẻ: bits từ hào trong (gần tâm) ra hào ngoài. 1 = hào dương (liền), 0 = hào âm (đứt)
const YY_Y = 5.8;
const trigram = (deg, bits, name) => {
  const a = (deg * Math.PI) / 180, r = 4.15;
  const cx = Math.sin(a) * r, cy = YY_Y + Math.cos(a) * r;
  const parts = [];
  bits.forEach((b, i) => {
    const off = (i - 1) * 0.42;
    const px = cx + Math.sin(a) * off, py = cy + Math.cos(a) * off;
    if (b) parts.push({ type: 'box', size: [1.6, 0.24, 0.5], pos: [px, py, 0], rot: [0, 0, -a], ...BRONZE });
    else [-1, 1].forEach((s) => parts.push({
      type: 'box', size: [0.66, 0.24, 0.5], rot: [0, 0, -a], ...BRONZE,
      pos: [px + Math.cos(a) * s * 0.47, py - Math.sin(a) * s * 0.47, 0],
    }));
  });
  parts.push({ type: 'label', billboard: true, text: name, size: [2, 0.4], pos: [Math.sin(a) * 5.35, YY_Y + Math.cos(a) * 5.35, 0] });
  return parts;
};

const MODELS = [
  {
    id: 'greek',
    name: 'Đền Triết Học Hy Lạp',
    short: 'Hy Lạp',
    accent: '#d9ad55',
    entry: 'drop',
    target: [0, 4.3, 0],
    desc: 'Ngôi đền của lý trí. Thales, Socrates, Plato và Aristotle đặt nền móng cho triết học phương Tây.',
    fact: 'Plato và Aristotle đều cho rằng triết học bắt đầu từ sự ngạc nhiên. Ngọn lửa trên đỉnh đền tượng trưng cho ánh sáng lý trí soi đường cho con người.',
    bricks: [
      { label: 'Bậc nền: Sự ngạc nhiên', parts: [{ type: 'box', size: [10.4, 0.6, 7.4], pos: [0, 0.3, 0], ...MARBLE_DK }] },
      { label: 'Bậc hai: Sự hoài nghi', parts: [{ type: 'box', size: [9.4, 0.6, 6.4], pos: [0, 0.9, 0], ...MARBLE }] },
      { label: 'Sàn đền: Lý trí', parts: [{ type: 'box', size: [8.4, 0.5, 5.4], pos: [0, 1.45, 0], ...MARBLE_DK }] },
      { label: 'Hàng cột Thales', parts: columnPair(-3) },
      { label: 'Hàng cột Socrates', parts: columnPair(-1) },
      { label: 'Hàng cột Plato', parts: columnPair(1) },
      { label: 'Hàng cột Aristotle', parts: columnPair(3) },
      { label: 'Xà ngang: Logic học', parts: [{ type: 'box', size: [8.2, 0.7, 5.2], pos: [0, 6.5, 0], ...MARBLE }] },
      { label: 'Mái đền: Siêu hình học', parts: [{ type: 'prism', w: 8.8, h: 1.8, d: 5.4, pos: [0, 6.85, 0], ...MARBLE_DK }] },
      { label: 'Ngọn lửa Trí tuệ', parts: [{ type: 'ico', r: 0.55, pos: [0, 9.6, 0], color: '#ffd27a', emissive: '#ffb347', glow: 2.6, float: true }] },
    ],
  },
  {
    id: 'marx',
    name: 'Ngôi Nhà Duy Vật Lịch Sử',
    short: 'Duy vật lịch sử',
    accent: '#e0483a',
    entry: 'drop',
    target: [0, 4.3, 0],
    desc: 'Mô hình Cơ sở hạ tầng – Kiến trúc thượng tầng của Mác. Kinh tế là móng, chính trị và tư tưởng là phần nhà phía trên.',
    fact: 'Cơ sở hạ tầng quyết định kiến trúc thượng tầng, còn kiến trúc thượng tầng tác động trở lại cơ sở hạ tầng. Móng vững thì nhà mới vững.',
    bricks: [
      { label: 'Lực lượng sản xuất', parts: [{ type: 'box', size: [10.4, 1, 6], pos: [0, 0.5, 0], color: '#3d3833', rough: 0.8, text: 'Lực lượng sản xuất' }] },
      { label: 'Cơ sở hạ tầng (Quan hệ sản xuất)', parts: [{ type: 'box', size: [9.4, 1, 5.4], pos: [0, 1.5, 0], color: '#5c4636', rough: 0.75, text: 'Cơ sở hạ tầng · QHSX' }] },
      { label: 'Chính trị', parts: [block('Chính trị', -2.95, 2.6, 2.8, 1.2, 4.6, '#8a3a2c')] },
      { label: 'Pháp luật', parts: [block('Pháp luật', 0, 2.6, 2.8, 1.2, 4.6, '#74301f')] },
      { label: 'Nhà nước', parts: [block('Nhà nước', 2.95, 2.6, 2.8, 1.2, 4.6, '#8a3a2c')] },
      { label: 'Đạo đức', parts: [block('Đạo đức', -2.95, 3.85, 2.8, 1.2, 4.6, '#74301f')] },
      { label: 'Tôn giáo', parts: [block('Tôn giáo', 0, 3.85, 2.8, 1.2, 4.6, '#8a3a2c')] },
      { label: 'Nghệ thuật', parts: [block('Nghệ thuật', 2.95, 3.85, 2.8, 1.2, 4.6, '#74301f')] },
      { label: 'Triết học · Khoa học', parts: [block('Triết học · Khoa học', 0, 5.05, 8.7, 1.1, 4.6, '#9c4a30')] },
      {
        label: 'Mái nhà: Kiến trúc thượng tầng', parts: [
          { type: 'prism', w: 10.4, h: 2.4, d: 5.4, pos: [0, 5.6, 0], color: '#262a33', rough: 0.45, metal: 0.35 },
          { type: 'label', text: 'Kiến trúc thượng tầng', size: [5.4, 0.62], pos: [0, 6.18, 2.72] },
          { type: 'label', text: 'Kiến trúc thượng tầng', size: [5.4, 0.62], pos: [0, 6.18, -2.72], rot: [0, Math.PI, 0] },
        ],
      },
      { label: 'Mặt trời Thực tiễn', parts: [{ type: 'sphere', r: 0.6, pos: [0, 9.4, 0], color: '#ffb36b', emissive: '#ff6a2b', glow: 2.8, float: true }] },
    ],
  },
  {
    id: 'yinyang',
    name: 'Thái Cực Âm Dương Bát Quái',
    short: 'Âm Dương',
    accent: '#4fd1c5',
    entry: 'slam',
    target: [0, YY_Y, 0],
    radius: 22,
    sway: 0.22,
    angle: 0.1,
    desc: 'Mô hình triết học phương Đông. Âm và Dương đối lập mà thống nhất, bao quanh là tám quẻ tượng trưng cho vạn vật.',
    fact: '“Trong Âm có Dương, trong Dương có Âm.” Không có gì thuần túy tuyệt đối. Mọi sự vật đều chứa mầm mống của mặt đối lập và có thể chuyển hóa sang nó.',
    bricks: [
      { label: 'Dương', parts: [{ type: 'yy', kind: 'yang', R: 2.6, depth: 0.6, pos: [0, YY_Y, 0], color: '#ece7dc', rough: 0.4 }] },
      { label: 'Âm', parts: [{ type: 'yy', kind: 'yin', R: 2.6, depth: 0.6, pos: [0, YY_Y, 0], color: '#14161c', rough: 0.25, metal: 0.6 }] },
      { label: 'Trong Dương có Âm', parts: [{ type: 'cyl', r: 0.4, h: 0.85, pos: [0, YY_Y - 1.3, 0], rot: [Math.PI / 2, 0, 0], color: '#14161c', rough: 0.25, metal: 0.6 }] },
      { label: 'Trong Âm có Dương', parts: [{ type: 'cyl', r: 0.4, h: 0.85, pos: [0, YY_Y + 1.3, 0], rot: [Math.PI / 2, 0, 0], color: '#f4efe4', emissive: '#ffffff', glow: 0.9 }] },
      { label: 'Quẻ Càn (Trời)', parts: trigram(0, [1, 1, 1], 'Càn · Trời') },
      { label: 'Quẻ Khôn (Đất)', parts: trigram(180, [0, 0, 0], 'Khôn · Đất') },
      { label: 'Quẻ Ly (Lửa)', parts: trigram(270, [1, 0, 1], 'Ly · Lửa') },
      { label: 'Quẻ Khảm (Nước)', parts: trigram(90, [0, 1, 0], 'Khảm · Nước') },
      { label: 'Quẻ Chấn (Sấm)', parts: trigram(225, [1, 0, 0], 'Chấn · Sấm') },
      { label: 'Quẻ Tốn (Gió)', parts: trigram(45, [0, 1, 1], 'Tốn · Gió') },
      { label: 'Quẻ Cấn (Núi)', parts: trigram(135, [0, 0, 1], 'Cấn · Núi') },
      { label: 'Quẻ Đoài (Đầm)', parts: trigram(315, [1, 1, 0], 'Đoài · Đầm') },
    ],
  },
];
