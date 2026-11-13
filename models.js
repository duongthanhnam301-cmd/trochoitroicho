// 5 công trình Chủ nghĩa xã hội khoa học (MLN131), mỗi công trình ứng với một chương.
// Mỗi phần tử trong "bricks" là một viên gạch = một khái niệm: label (tên), note (ý nghĩa, hiện khi gạch đặt xong),
// entry (kiểu xuất hiện: drop | slam | rise | swirl), parts (các khối 3D, xem makePart trong scene.js).
// Đơn vị: mét ảo. Trục y hướng lên, mặt trước công trình quay về +z.

const PI = Math.PI;
const STEEL = { color: '#aab2bc', rough: 0.32, metal: 0.85 };
const RED = { color: '#c3302a', rough: 0.38, metal: 0.55, emissive: '#5a0d08', glow: 0.35 };
const GOLD = { color: '#e8b84a', rough: 0.28, metal: 0.9, emissive: '#7a4a08', glow: 0.7 };
const BRONZE = { color: '#a5763a', rough: 0.4, metal: 0.85 };
const PATINA = { color: '#4aa58e', rough: 0.45, metal: 0.4, emissive: '#1f7a64', glow: 0.9 };
const IVORY = { color: '#e9e3d4', rough: 0.5 };

const label = (text, pos, size, billboard = false) => ({ type: 'label', text, pos, size, billboard });

// Vòng quỹ đạo nghiêng quanh tâm c, có hạt sáng chạy theo (và nhãn đi kèm nếu có)
const orbit = ({ c, R, tilt = 0, yaw = 0, speed = 0.6, color, bead = 0.12, tube = 0.03, beads = 1, text }) => ({
  type: 'group', pos: c, rot: [PI / 2 + tilt, yaw, 0], order: 'YXZ', parts: [{
    type: 'group', spin: [0, 0, speed], parts: [
      { type: 'torus', R, tube, color, emissive: color, glow: 1.1, rough: 0.3 },
      ...Array.from({ length: beads }, (_, i) => ({ type: 'sphere', r: bead, pos: [Math.cos((i / beads) * 2 * PI) * R, Math.sin((i / beads) * 2 * PI) * R, 0], color: '#ffffff', emissive: color, glow: 2.6 })),
      ...(text ? [label(text, [R, 0, -0.6], [3.4, 0.55], true)] : []),
    ],
  }],
});

// ---------- I. Cầu quá độ ----------
const DECK = 3.15, ARCH_R = 4.8, ARCH_Y = 0.62;
const span = (text, x, color) => ({ type: 'box', size: [2.38, 0.55, 2.8], pos: [x, 2.875, 0], color, rough: 0.6, text });
const hangers = (z) => [-3.6, -2.4, -1.2, 0, 1.2, 2.4, 3.6].map((x) => {
  const h = ARCH_Y * Math.sqrt(ARCH_R ** 2 - x * x);
  return { type: 'cyl', r: 0.035, h, pos: [x, DECK + h / 2, z], seg: 8, color: '#efe2c8', metal: 0.6, rough: 0.3 };
});
const tree = (x, z) => ({ type: 'cyl', r: 0, r2: 0.42, h: 1.2, pos: [x, DECK + 0.6, z], color: '#3f8f5a', rough: 0.7, seg: 12 });

// ---------- II. Tháp liên minh ----------
const sheaf = (x, z) => {
  const parts = [], t = 0.09, h = 3.9, y0 = 1.2;
  for (let i = 0; i < 9; i++) {
    const a = (i / 8) * 2 * PI, rr = i === 8 ? 0 : 0.24, c = Math.cos(a), s = Math.sin(a);
    const rot = i === 8 ? [0, 0, 0] : [t * s, 0, -t * c];
    const top = i === 8 ? 0 : Math.sin(t) * h;
    parts.push({ type: 'cyl', r: 0.05, h, pos: [x + c * rr, y0 + h / 2, z + s * rr], rot, seg: 8, color: '#c9a04a', rough: 0.6 });
    parts.push({ type: 'sphere', r: 0.13, scale: [1, 2.6, 1], rot, pos: [x + c * (rr + top), y0 + h + 0.2, z + s * (rr + top)], color: '#f3c95a', rough: 0.4, emissive: '#8a5a00', glow: 0.5 });
  }
  parts.push({ type: 'torus', R: 0.36, tube: 0.07, pos: [x, 2.6, z], rot: [PI / 2, 0, 0], ...RED });
  return parts;
};

// ---------- III. Nhà nước pháp quyền ----------
const COL_X = [-3.15, -1.05, 1.05, 3.15];
const column = (x, z) => [
  { type: 'box', size: [0.95, 0.18, 0.95], pos: [x, 1.19, z], color: '#cfc6b2', rough: 0.55 },
  { type: 'cyl', r: 0.36, h: 3.6, pos: [x, 3.08, z], ...IVORY },
  { type: 'box', size: [1.05, 0.22, 1.05], pos: [x, 4.99, z], color: '#cfc6b2', rough: 0.55 },
];
const pillar = (i, text) => [...column(COL_X[i], 2.2), ...column(COL_X[i], -2.2), label(text, [COL_X[i], 1.62, 2.64], [1.7, 0.34])];

// ---------- IV. Trống đồng ----------
const handle = (deg) => {
  const a = (deg * PI) / 180;
  return { type: 'torus', R: 0.5, tube: 0.09, arc: PI, pos: [Math.sin(a) * 3.0, 2.3, Math.cos(a) * 3.0], rot: [0, a - PI / 2, -PI / 2], ...BRONZE };
};
const drumRing = (R) => ({ type: 'torus', R, tube: 0.07, pos: [0, 4.6, 0], rot: [PI / 2, 0, 0], ...PATINA });

// ---------- V. Gia đình ----------
const tier = (text, r, y, color) => [
  { type: 'cyl', r, r2: r + 0.15, h: 0.55, pos: [0, y, 0], color, rough: 0.7, seg: 64 },
  label(text, [0, y, r + 0.1], [Math.min(4.6, r * 0.95), 0.36]),
];

const MODELS = [
  {
    id: 'alliance',
    name: 'Tháp Sứ Mệnh Liên Minh',
    short: 'Liên minh',
    chapter: 'Chương 2 & 5',
    accent: '#f2b33d',
    entry: 'drop',
    target: [0, 5.2, 0],
    radius: 24,
    desc: 'Giai cấp công nhân thực hiện sứ mệnh lịch sử thông qua Đảng Cộng sản và liên minh với nông dân, trí thức. Ba trụ cột, ba nội dung liên minh: kinh tế, chính trị, văn hóa – xã hội.',
    fact: 'Lênin chỉ rõ: giai cấp công nhân không liên minh với nông dân thì không thể giành và giữ chính quyền. Ở Việt Nam, liên minh công – nông – trí thức do Đảng lãnh đạo là nền tảng của khối đại đoàn kết toàn dân tộc, trong đó nội dung kinh tế là quyết định nhất.',
    bricks: [
      { label: 'Nền: Lợi ích cơ bản thống nhất', note: 'Liên minh công – nông – trí thức hình thành vì các bên có những lợi ích cơ bản thống nhất với nhau.', entry: 'rise', parts: [
        { type: 'cyl', r: 5.4, r2: 5.6, h: 0.6, pos: [0, 0.3, 0], color: '#2c2a2e', rough: 0.7, seg: 72 },
        label('Lợi ích cơ bản thống nhất', [0, 0.3, 5.55], [4.4, 0.4]),
      ] },
      { label: 'Bệ: Liên minh về kinh tế', note: 'Nội dung kinh tế là nội dung cơ bản, quyết định nhất, tạo cơ sở vật chất – kỹ thuật cho chủ nghĩa xã hội.', entry: 'rise', parts: [
        { type: 'cyl', r: 4.7, r2: 4.9, h: 0.6, pos: [0, 0.9, 0], color: '#3a3135', rough: 0.6, seg: 72 },
        { type: 'torus', R: 4.72, tube: 0.05, pos: [0, 1.2, 0], rot: [PI / 2, 0, 0], ...GOLD },
        label('Kinh tế · nội dung quyết định nhất', [0, 0.9, 4.85], [4.6, 0.4]),
      ] },
      { label: 'Trụ cột: Giai cấp công nhân', note: 'Lực lượng nòng cốt, tiên phong, đại biểu cho lực lượng sản xuất tiên tiến và phương thức sản xuất hiện đại.', parts: [
        { type: 'cyl', r: 0.45, h: 4.4, pos: [0, 3.4, -0.8], ...STEEL },
        { type: 'gear', R: 1.0, teeth: 14, th: 0.22, hole: 0.47, depth: 0.26, pos: [0, 2.3, -0.8], rot: [PI / 2, 0, 0], spin: [0, 0, 0.9], ...STEEL },
        { type: 'gear', R: 0.85, teeth: 12, th: 0.2, hole: 0.47, depth: 0.26, pos: [0, 3.5, -0.8], rot: [PI / 2, 0, 0], spin: [0, 0, -1.1], ...RED },
        { type: 'gear', R: 1.0, teeth: 14, th: 0.22, hole: 0.47, depth: 0.26, pos: [0, 4.7, -0.8], rot: [PI / 2, 0, 0], spin: [0, 0, 0.9], ...STEEL },
        label('Công nhân', [0, 1.7, 0.6], [2, 0.4], true),
      ] },
      { label: 'Trụ cột: Giai cấp nông dân', note: 'Người bạn đồng minh tự nhiên của giai cấp công nhân; thiếu liên minh này cách mạng không thể thắng lợi.', parts: [
        ...sheaf(-3.1, 0.5),
        label('Nông dân', [-3.1, 1.7, 1.5], [2, 0.4], true),
      ] },
      { label: 'Trụ cột: Tầng lớp trí thức', note: 'Lực lượng sáng tạo đặc biệt quan trọng trong công nghiệp hóa, hiện đại hóa và xây dựng kinh tế tri thức.', parts: [
        { type: 'cyl', r: 0.32, r2: 0.42, h: 2.7, pos: [3.1, 2.55, 0.5], color: '#cfe8ff', rough: 0.15, metal: 0.2, emissive: '#2f74d0', glow: 0.35 },
        { type: 'sphere', r: 0.3, pos: [3.1, 4.6, 0.5], color: '#dbeeff', emissive: '#5aa9ff', glow: 1.8 },
        orbit({ c: [3.1, 4.6, 0.5], R: 0.85, tilt: 0.2, yaw: 0, speed: 2.2, color: '#5aa9ff', bead: 0.07, tube: 0.022 }),
        orbit({ c: [3.1, 4.6, 0.5], R: 0.85, tilt: 1.15, yaw: 1.0, speed: -1.8, color: '#5aa9ff', bead: 0.07, tube: 0.022 }),
        orbit({ c: [3.1, 4.6, 0.5], R: 0.85, tilt: 1.15, yaw: -1.0, speed: 2.0, color: '#5aa9ff', bead: 0.07, tube: 0.022 }),
        label('Trí thức', [3.1, 1.7, 1.5], [2, 0.4], true),
      ] },
      { label: 'Vành đai: Liên minh văn hóa – xã hội', note: 'Gắn tăng trưởng kinh tế với phát triển văn hóa, con người, thực hiện tiến bộ và công bằng xã hội.', entry: 'swirl', parts: [
        orbit({ c: [0, 3.5, 0], R: 4.45, speed: 0.35, color: '#f2b33d', bead: 0.16, tube: 0.07, beads: 3 }),
        label('Văn hóa – xã hội', [0, 3.95, 4.45], [2.8, 0.42], true),
      ] },
      { label: 'Sàn: Liên minh về chính trị', note: 'Giữ vững lập trường chính trị của giai cấp công nhân, vai trò lãnh đạo của Đảng, độc lập dân tộc và định hướng xã hội chủ nghĩa.', parts: [
        { type: 'box', size: [8.6, 0.5, 3.2], pos: [0, 5.85, -0.15], color: '#7e1f1a', rough: 0.55, text: 'Liên minh chính trị' },
      ] },
      { label: 'Bánh răng: Sứ mệnh lịch sử', note: 'Xóa bỏ chế độ người bóc lột người, xây dựng thành công chủ nghĩa xã hội và chủ nghĩa cộng sản.', parts: [
        { type: 'cyl', r: 0.22, h: 2.65, pos: [0, 7.42, -0.8], ...STEEL },
        { type: 'gear', R: 2.3, teeth: 20, th: 0.32, hole: 1.45, depth: 0.45, pos: [0, 8.75, -0.35], spin: [0, 0, 0.35], ...RED },
      ] },
      { label: 'Ngôi sao: Đảng Cộng sản – đội tiên phong', note: 'Đảng Cộng sản là nhân tố chủ quan quyết định để giai cấp công nhân hoàn thành sứ mệnh lịch sử.', parts: [
        { type: 'star', R: 1.2, r: 0.5, depth: 0.35, pos: [0, 8.75, -0.35], spin: [0, 0.7, 0], color: '#ffd36b', rough: 0.25, metal: 0.6, emissive: '#ffb020', glow: 1.6 },
      ] },
    ],
  },
  {
    id: 'bridge',
    name: 'Cây Cầu Quá Độ',
    short: 'Quá độ',
    chapter: 'Chương 3',
    accent: '#e5484d',
    entry: 'drop',
    target: [0, 3.6, 0],
    radius: 25,
    halfW: 8.6,
    desc: 'Thời kỳ quá độ là cây cầu cải biến cách mạng từ xã hội cũ sang xã hội xã hội chủ nghĩa, diễn ra trên mọi lĩnh vực: kinh tế, chính trị, tư tưởng – văn hóa và xã hội.',
    fact: 'Lênin gọi thời kỳ quá độ là “những cơn đau đẻ kéo dài” và dặn phải “bắc những nhịp cầu nhỏ”. Việt Nam quá độ gián tiếp, bỏ qua chế độ tư bản chủ nghĩa nhưng tiếp thu, kế thừa những thành tựu nhân loại đạt được dưới chủ nghĩa tư bản.',
    bricks: [
      { label: 'Bờ xuất phát: Xã hội cũ', note: 'Việt Nam đi lên từ một nước thuộc địa, nửa phong kiến, lực lượng sản xuất rất thấp, chiến tranh kéo dài.', entry: 'rise', parts: [
        { type: 'box', size: [3.2, DECK, 4.6], pos: [-6.4, DECK / 2, 0], color: '#3b3733', rough: 0.85, text: 'Xã hội cũ' },
        { type: 'box', size: [9.6, 0.1, 4.4], pos: [0, 0.05, 0], color: '#0d2a3a', metal: 0.8, rough: 0.15 },
        { type: 'cyl', r: 0.3, r2: 0.4, h: 2.4, pos: [-7.2, DECK + 1.2, -1.3], color: '#2a2724', rough: 0.9 },
        { type: 'cyl', r: 0.24, r2: 0.34, h: 1.8, pos: [-6.4, DECK + 0.9, -1.6], color: '#2a2724', rough: 0.9 },
        { type: 'prism', w: 1.8, h: 0.8, d: 1.4, pos: [-6.1, DECK, 1.1], color: '#4a433d', rough: 0.9 },
      ] },
      { label: 'Trụ cầu: Lực lượng sản xuất', note: 'Tiền đề kinh tế: lực lượng sản xuất phát triển, mâu thuẫn gay gắt với quan hệ sản xuất tư bản chủ nghĩa.', entry: 'rise', parts: [
        { type: 'box', size: [1.4, 2.6, 2.6], pos: [-2.4, 1.3, 0], color: '#6f6255', rough: 0.8, text: 'Lực lượng\nsản xuất' },
      ] },
      { label: 'Trụ cầu: Giai cấp công nhân', note: 'Tiền đề chính trị – xã hội: giai cấp công nhân trưởng thành, có Đảng Cộng sản lãnh đạo cách mạng.', entry: 'rise', parts: [
        { type: 'box', size: [1.4, 2.6, 2.6], pos: [2.4, 1.3, 0], color: '#6f6255', rough: 0.8, text: 'Giai cấp\ncông nhân' },
      ] },
      { label: 'Nhịp cầu: Kinh tế', note: 'Tồn tại nền kinh tế nhiều thành phần, trong đó có thành phần đối lập; Việt Nam phát triển kinh tế thị trường định hướng XHCN.', parts: [span('Kinh tế', -3.6, '#8f2a22')] },
      { label: 'Nhịp cầu: Chính trị', note: 'Giai cấp công nhân và nhân dân lao động nắm chính quyền, xây dựng nhà nước kiểu mới.', parts: [span('Chính trị', -1.2, '#a3332a')] },
      { label: 'Nhịp cầu: Tư tưởng – Văn hóa', note: 'Tư tưởng vô sản và tư tưởng tư sản còn đan xen, đấu tranh; từng bước xây dựng văn hóa mới.', parts: [span('Tư tưởng\nVăn hóa', 1.2, '#8f2a22')] },
      { label: 'Nhịp cầu: Xã hội', note: 'Nhiều giai cấp, tầng lớp vừa hợp tác vừa đấu tranh, ngày càng xích lại gần nhau.', parts: [span('Xã hội', 3.6, '#a3332a')] },
      { label: 'Vòm cầu: Đảng Cộng sản lãnh đạo', note: 'Sự lãnh đạo của Đảng là nhân tố quyết định đưa sự nghiệp quá độ đến thắng lợi.', parts: [
        ...[1.25, -1.25].map((z) => ({ type: 'torus', R: ARCH_R, tube: 0.16, arc: PI, pos: [0, DECK, z], scale: [1, ARCH_Y, 1], color: '#d0362c', rough: 0.35, metal: 0.5, emissive: '#7a120c', glow: 0.6 })),
        ...hangers(1.25), ...hangers(-1.25),
        label('Đảng lãnh đạo', [0, 6.75, 0], [3.2, 0.5], true),
      ] },
      { label: 'Bờ đích: Xã hội xã hội chủ nghĩa', note: 'Xã hội do nhân dân lao động làm chủ, kinh tế phát triển cao, con người được giải phóng.', entry: 'rise', parts: [
        { type: 'box', size: [3.2, DECK, 4.6], pos: [6.4, DECK / 2, 0], color: '#b98f4c', rough: 0.7, text: 'Xã hội mới' },
        tree(5.4, -1.5), tree(7.4, 1.5), tree(7.4, -1.4),
      ] },
      { label: 'Hải đăng: Dân giàu, nước mạnh, dân chủ, công bằng, văn minh', note: 'Mục tiêu tổng quát trên con đường đi lên chủ nghĩa xã hội ở Việt Nam. Dòng người bắt đầu qua cầu.', parts: [
        { type: 'cyl', r: 0.32, r2: 0.48, h: 3.2, pos: [6.6, DECK + 1.6, 0], ...IVORY },
        { type: 'star', R: 0.75, r: 0.32, depth: 0.25, pos: [6.6, DECK + 3.9, 0], spin: [0, 1.2, 0], color: '#ffd36b', metal: 0.6, rough: 0.25, emissive: '#ffb020', glow: 2 },
        label('Dân giàu · Nước mạnh · Dân chủ · Công bằng · Văn minh', [4.6, DECK + 5.1, 0], [7, 0.45], true),
        { type: 'flow', from: [-7.4, DECK + 0.18, 0.5], to: [5.6, DECK + 0.18, 0.5], count: 14, r: 0.1, speed: 0.06, color: '#ffe6a8', emissive: '#ffb347', glow: 2.2 },
        { type: 'flow', from: [-7.4, DECK + 0.18, -0.5], to: [5.6, DECK + 0.18, -0.5], count: 14, r: 0.1, speed: 0.05, color: '#ffe6a8', emissive: '#ff8a5c', glow: 2.2 },
      ] },
    ],
  },
  {
    id: 'state',
    name: 'Nhà Nước Pháp Quyền',
    short: 'Dân chủ',
    chapter: 'Chương 4',
    accent: '#5aa9ff',
    entry: 'drop',
    target: [0, 5.2, 0],
    desc: 'Dân chủ xã hội chủ nghĩa và Nhà nước pháp quyền XHCN Việt Nam: của nhân dân, do nhân dân, vì nhân dân. Quyền lực nhà nước thống nhất, có phân công, phối hợp, kiểm soát.',
    fact: 'Dân chủ xã hội chủ nghĩa là nền dân chủ cao hơn về chất, mang bản chất giai cấp công nhân: phôi thai từ Công xã Pari (1871), chính thức xác lập từ Cách mạng Tháng Mười Nga (1917). Ở nước ta, chế độ dân chủ nhân dân được xác lập từ Cách mạng Tháng Tám 1945.',
    bricks: [
      { label: 'Nền móng: Hiến pháp và pháp luật', note: 'Nhà nước pháp quyền thượng tôn Hiến pháp và pháp luật; mọi cơ quan, công dân đều phải tuân theo.', entry: 'rise', parts: [
        { type: 'box', size: [10.4, 0.6, 7], pos: [0, 0.3, 0], color: '#2b3447', rough: 0.6, text: 'Hiến pháp · Pháp luật' },
      ] },
      { label: 'Bậc thềm: Nhân dân làm chủ', note: 'Bản chất của nhà nước: quyền lực thuộc về nhân dân, nhân dân là chủ nhân của nhà nước.', entry: 'rise', parts: [
        { type: 'box', size: [9.2, 0.5, 6], pos: [0, 0.85, 0], color: '#3a4660', rough: 0.55, text: 'Nhân dân làm chủ' },
      ] },
      { label: 'Cột: Dân biết', note: 'Nhân dân được biết chủ trương của Đảng, chính sách, pháp luật của Nhà nước.', parts: pillar(0, 'Dân biết') },
      { label: 'Cột: Dân bàn', note: 'Nhân dân được bàn bạc, góp ý những việc liên quan đến đời sống và quyền lợi của mình.', parts: pillar(1, 'Dân bàn') },
      { label: 'Cột: Dân làm', note: 'Nhân dân trực tiếp thực hiện, tham gia quản lý nhà nước và xã hội.', parts: pillar(2, 'Dân làm') },
      { label: 'Cột: Dân kiểm tra', note: 'Nhân dân giám sát, kiểm tra hoạt động của cơ quan nhà nước và cán bộ, công chức.', parts: pillar(3, 'Dân kiểm tra') },
      { label: 'Xà ngang: Quyền lực nhà nước thống nhất', note: 'Quyền lực nhà nước là thống nhất, có sự phân công, phối hợp, kiểm soát giữa các cơ quan.', parts: [
        { type: 'box', size: [8.6, 0.7, 5.4], pos: [0, 5.45, 0], color: '#2b3447', rough: 0.55, text: 'Quyền lực nhà nước thống nhất' },
      ] },
      { label: 'Lập pháp: Quốc hội', note: 'Quốc hội là cơ quan quyền lực nhà nước cao nhất, thực hiện quyền lập hiến, lập pháp.', entry: 'slam', parts: [
        { type: 'box', size: [2.7, 1.1, 3.4], pos: [-2.9, 6.35, 0], color: '#33507a', rough: 0.5, text: 'Lập pháp\nQuốc hội' },
      ] },
      { label: 'Hành pháp: Chính phủ', note: 'Chính phủ là cơ quan hành chính nhà nước cao nhất, thực hiện quyền hành pháp.', entry: 'slam', parts: [
        { type: 'box', size: [2.7, 1.1, 3.4], pos: [0, 6.35, 0], color: '#2c4569', rough: 0.5, text: 'Hành pháp\nChính phủ' },
      ] },
      { label: 'Tư pháp: Tòa án', note: 'Tòa án nhân dân thực hiện quyền tư pháp; tổ chức theo nguyên tắc tập trung dân chủ.', entry: 'slam', parts: [
        { type: 'box', size: [2.7, 1.1, 3.4], pos: [2.9, 6.35, 0], color: '#33507a', rough: 0.5, text: 'Tư pháp\nTòa án' },
      ] },
      { label: 'Mái vòm: Quyền lực thuộc về nhân dân', note: 'Dân chủ xã hội chủ nghĩa là nền dân chủ cao hơn về chất, mang bản chất giai cấp công nhân.', parts: [
        { type: 'cyl', r: 1.75, h: 0.45, pos: [0, 7.125, 0], ...IVORY },
        { type: 'dome', r: 1.75, pos: [0, 7.35, 0], ...GOLD },
      ] },
      { label: 'Ngọn cờ: Đảng lãnh đạo', note: 'Sự lãnh đạo của Đảng Cộng sản là yếu tố quan trọng bảo đảm quyền lực thực sự thuộc về nhân dân.', parts: [
        { type: 'cyl', r: 0.05, h: 2.3, pos: [0, 10.25, 0], ...GOLD },
        { type: 'flag', w: 1.7, h: 1.1, pos: [0.05, 10.8, 0] },
      ] },
    ],
  },
  {
    id: 'drum',
    name: 'Trống Đồng Đại Đoàn Kết',
    short: 'Dân tộc',
    chapter: 'Chương 6',
    accent: '#3fc1a5',
    entry: 'drop',
    target: [0, 3.4, 0],
    radius: 15.5,
    height: 10,
    desc: 'Trống đồng Đông Sơn, biểu tượng nghìn năm của dân tộc Việt Nam, dựng từ các đặc trưng của dân tộc, Cương lĩnh dân tộc của Lênin và nguyên tắc giải quyết vấn đề tôn giáo.',
    fact: 'Hồ Chí Minh: “Đoàn kết, đoàn kết, đại đoàn kết. Thành công, thành công, đại thành công.” Quan hệ dân tộc và tôn giáo ở Việt Nam được giải quyết trong cộng đồng quốc gia – dân tộc thống nhất; vấn đề tôn giáo được giải quyết trên cơ sở vấn đề dân tộc.',
    bricks: [
      { label: 'Chân trống: Chung lãnh thổ', note: 'Mỗi dân tộc có lãnh thổ chung ổn định, là không gian sinh tồn của cộng đồng.', entry: 'rise', parts: [
        { type: 'lathe', points: [[3.55, 0], [3.5, 0.15], [3.2, 0.8], [2.95, 1.4]], ...BRONZE },
      ] },
      { label: 'Thân trống: Chung phương thức sinh hoạt kinh tế', note: 'Đặc trưng quan trọng nhất, là cơ sở gắn kết các thành viên, tạo nên tính thống nhất, bền vững của dân tộc.', entry: 'rise', parts: [
        { type: 'lathe', points: [[2.95, 1.4], [2.88, 2.05], [2.95, 2.7]], ...BRONZE },
        { type: 'torus', R: 2.96, tube: 0.05, pos: [0, 1.42, 0], rot: [PI / 2, 0, 0], ...PATINA },
      ] },
      { label: 'Tang trống: Chung ngôn ngữ', note: 'Ngôn ngữ chung là công cụ giao tiếp, là tiêu chí cơ bản để phân biệt các dân tộc.', parts: [
        { type: 'lathe', points: [[2.95, 2.7], [3.4, 3.1], [3.95, 3.6], [4.2, 4.1], [4.25, 4.45]], ...BRONZE },
        { type: 'torus', R: 2.96, tube: 0.05, pos: [0, 2.7, 0], rot: [PI / 2, 0, 0], ...PATINA },
      ] },
      { label: 'Mặt trống: Chung văn hóa và tâm lý', note: 'Văn hóa là yếu tố đặc biệt quan trọng, giữ gìn bản sắc riêng của mỗi dân tộc.', parts: [
        { type: 'cyl', r: 4.3, h: 0.12, pos: [0, 4.51, 0], faceTex: true, seg: 96, ...BRONZE },
      ] },
      { label: 'Vành 1: Các dân tộc hoàn toàn bình đẳng', note: 'Cương lĩnh dân tộc của Lênin: không phân biệt dân tộc lớn hay nhỏ, trình độ phát triển cao hay thấp.', parts: [drumRing(3.75)] },
      { label: 'Vành 2: Các dân tộc được quyền tự quyết', note: 'Tự quyết về chính trị là cơ bản nhất: tự lựa chọn chế độ chính trị và con đường phát triển.', parts: [drumRing(2.75)] },
      { label: 'Vành 3: Liên hiệp công nhân các dân tộc', note: 'Nội dung chủ yếu, thống nhất giữa giải phóng dân tộc và giải phóng giai cấp.', parts: [drumRing(1.8)] },
      { label: 'Bốn quai: Nguyên tắc về tôn giáo', note: 'Tôn trọng tự do tín ngưỡng và không tín ngưỡng; gắn với cải tạo xã hội; phân biệt hai mặt chính trị – tư tưởng; quan điểm lịch sử cụ thể.', entry: 'slam', parts: [45, 135, 225, 315].map(handle) },
      { label: 'Đàn chim Lạc: Các dân tộc anh em', note: 'Các dân tộc Việt Nam cư trú xen kẽ, cố kết, hòa hợp trong một cộng đồng thống nhất.', entry: 'swirl', parts: [
        { type: 'birds', count: 6, R: 3.1, size: 0.75, pos: [0, 6.3, 0], spin: [0, 0.35, 0], color: '#d9a441', metal: 0.7, rough: 0.35, emissive: '#6b3d0a', glow: 0.5 },
      ] },
      { label: 'Ngôi sao 14 cánh: Đại đoàn kết toàn dân tộc', note: 'Đoàn kết là truyền thống quý báu, góp phần quyết định mọi thắng lợi của dân tộc Việt Nam.', parts: [
        { type: 'star', n: 14, R: 1.25, r: 0.55, depth: 0.1, pos: [0, 4.63, 0], rot: [-PI / 2, 0, 0], spin: [0, 0, 0.4], color: '#ffd36b', metal: 0.6, rough: 0.25, emissive: '#ffb020', glow: 1.8 },
      ] },
    ],
  },
  {
    id: 'family',
    name: 'Tế Bào Xã Hội',
    short: 'Gia đình',
    chapter: 'Chương 7',
    accent: '#ff7a59',
    entry: 'drop',
    target: [0, 4, 0],
    radius: 19,
    height: 8,
    desc: 'Gia đình là tế bào của xã hội: đứng trên ba cơ sở kinh tế – xã hội, chính trị – xã hội, văn hóa và vận hành bằng bốn chức năng cơ bản.',
    fact: 'Hồ Chí Minh: “Hạt nhân của xã hội là gia đình.” Xây dựng gia đình Việt Nam hiện nay là xây dựng gia đình no ấm, bình đẳng, tiến bộ, hạnh phúc, kế thừa những giá trị truyền thống tốt đẹp.',
    bricks: [
      { label: 'Cơ sở kinh tế – xã hội', note: 'Sự phát triển của lực lượng sản xuất và quan hệ sản xuất mới, xã hội chủ nghĩa.', entry: 'rise', parts: tier('Cơ sở kinh tế – xã hội', 5.0, 0.275, '#3a2b2a') },
      { label: 'Cơ sở chính trị – xã hội', note: 'Nhà nước của nhân dân lao động thể chế hóa luật hôn nhân và gia đình, bảo vệ gia đình.', entry: 'rise', parts: tier('Cơ sở chính trị – xã hội', 4.3, 0.825, '#4a3230') },
      { label: 'Cơ sở văn hóa', note: 'Thiếu cơ sở văn hóa, hoặc văn hóa không đi liền kinh tế, chính trị, việc xây dựng gia đình sẽ lệch lạc.', entry: 'rise', parts: tier('Cơ sở văn hóa', 3.6, 1.375, '#5b3a33') },
      { label: 'Mái ấm: Gia đình – tế bào của xã hội', note: '“Nhiều gia đình cộng lại mới thành xã hội” – Hồ Chí Minh. Gia đình là cộng đồng xã hội đầu tiên của mỗi người.', parts: [
        { type: 'box', size: [2.4, 1.5, 2.0], pos: [0, 2.4, 0], color: '#f0e2c8', rough: 0.7 },
        { type: 'prism', w: 3.0, h: 1.2, d: 2.3, pos: [0, 3.15, 0], color: '#b8442f', rough: 0.6 },
        { type: 'box', size: [0.5, 0.8, 0.06], pos: [0, 2.05, 1.01], color: '#5a3a22', rough: 0.8 },
        ...[-0.75, 0.75].map((x) => ({ type: 'box', size: [0.45, 0.4, 0.06], pos: [x, 2.6, 1.01], color: '#ffd27a', emissive: '#ffb347', glow: 2 })),
        { type: 'box', size: [0.3, 0.6, 0.3], pos: [0.8, 3.9, -0.4], color: '#8a3a2c', rough: 0.8 },
      ] },
      { label: 'Hôn nhân tiến bộ', note: 'Hôn nhân tự nguyện, một vợ một chồng, vợ chồng bình đẳng, được bảo đảm về pháp lý.', entry: 'swirl', parts: [
        { type: 'group', pos: [0, 5.3, 0], spin: [0, 0.9, 0], float: true, parts: [
          { type: 'torus', R: 0.5, tube: 0.085, pos: [-0.26, 0, 0], ...GOLD },
          { type: 'torus', R: 0.5, tube: 0.085, pos: [0.26, 0, 0], rot: [PI / 2, 0, 0], ...GOLD },
        ] },
      ] },
      { label: 'Chức năng tái sản xuất ra con người', note: 'Chức năng đặc thù của gia đình, quyết định mật độ dân cư và nguồn lao động của xã hội.', entry: 'swirl', parts: [
        orbit({ c: [0, 3.3, 0], R: 3.0, tilt: 0.38, yaw: 0.3, speed: 0.7, color: '#ff7a59', text: 'Tái sản xuất' }),
      ] },
      { label: 'Chức năng nuôi dưỡng, giáo dục', note: 'Ảnh hưởng lâu dài và toàn diện đến cuộc đời của mỗi thành viên.', entry: 'swirl', parts: [
        orbit({ c: [0, 3.3, 0], R: 3.35, tilt: -0.3, yaw: 1.2, speed: -0.55, color: '#ffb347', text: 'Nuôi dưỡng · Giáo dục' }),
      ] },
      { label: 'Chức năng kinh tế và tổ chức tiêu dùng', note: 'Kinh tế gia đình chuyển từ tự cấp, tự túc sang kinh tế hàng hóa, đáp ứng nhu cầu thị trường.', entry: 'swirl', parts: [
        orbit({ c: [0, 3.3, 0], R: 3.7, tilt: 0.25, yaw: 2.3, speed: 0.45, color: '#ffd36b', text: 'Kinh tế · Tiêu dùng' }),
      ] },
      { label: 'Chức năng thỏa mãn nhu cầu tâm sinh lý', note: 'Duy trì tình cảm gia đình, nơi nương tựa tinh thần của mỗi con người.', entry: 'swirl', parts: [
        orbit({ c: [0, 3.3, 0], R: 4.05, tilt: -0.22, yaw: -0.8, speed: -0.4, color: '#ff8fb1', text: 'Tâm sinh lý · Tình cảm' }),
      ] },
      { label: 'Trái tim: No ấm, bình đẳng, tiến bộ, hạnh phúc', note: 'Nội dung cơ bản, trực tiếp của xây dựng gia đình Việt Nam hiện nay.', parts: [
        { type: 'heart', size: 1.1, depth: 0.4, pos: [0, 7.5, 0], spin: [0, 1, 0], float: true, color: '#ff5a6e', rough: 0.3, metal: 0.3, emissive: '#ff2a4a', glow: 1.4 },
      ] },
    ],
  },
];
