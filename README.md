# ⭐ Xây Dựng Xã Hội Mới

Game ôn tập môn **MLN131 – Chủ nghĩa xã hội khoa học**. Mỗi câu trả lời đúng đặt một viên gạch vào công trình 3D. Mỗi viên gạch là một khái niệm của môn học: khi gạch đặt xong, góc màn hình hiện ý nghĩa của khái niệm đó. Câu hỏi được lấy theo đúng chương của công trình đang xây.

| | Công trình | Chương | Ý tưởng |
|---|---|---|---|
| I | 🏭 **Tháp Sứ Mệnh Liên Minh** (9 viên) | 2 & 5 | Ba trụ Công nhân (bánh răng quay) – Nông dân (bó lúa) – Trí thức (nguyên tử); ba nội dung liên minh kinh tế, chính trị, văn hóa – xã hội; bánh răng Sứ mệnh lịch sử và ngôi sao Đảng Cộng sản |
| II | 🌉 **Cây Cầu Quá Độ** (10 viên) | 3 | Cây cầu từ “Xã hội cũ” sang “Xã hội mới”: trụ cầu là hai tiền đề, bốn nhịp cầu là bốn lĩnh vực của thời kỳ quá độ, vòm cầu là Đảng lãnh đạo, hải đăng là mục tiêu “Dân giàu, nước mạnh…”. Xây xong, dòng người sáng đèn đi qua cầu |
| III | 🏛️ **Nhà Nước Pháp Quyền** (12 viên) | 4 | Nền Hiến pháp, bốn cột Dân biết – Dân bàn – Dân làm – Dân kiểm tra, ba khối Lập pháp – Hành pháp – Tư pháp, mái vòm “quyền lực thuộc về nhân dân”, ngọn cờ bay |
| IV | 🥁 **Trống Đồng Đại Đoàn Kết** (10 viên) | 6 | Chân, thân, tang, mặt trống là các đặc trưng của dân tộc; ba vành là Cương lĩnh dân tộc của Lênin; bốn quai là nguyên tắc về tôn giáo; đàn chim Lạc bay vòng và ngôi sao 14 cánh |
| V | 🏠 **Tế Bào Xã Hội** (10 viên) | 7 | Ba tầng cơ sở xây dựng gia đình, mái ấm, nhẫn cưới hôn nhân tiến bộ, bốn quỹ đạo là bốn chức năng của gia đình, trái tim “no ấm, bình đẳng, tiến bộ, hạnh phúc” |

Web tĩnh thuần HTML/CSS/JS, không cần build.

## Cấu trúc

| File | Nội dung |
|---|---|
| `index.html` | Giao diện |
| `style.css` | Kiểu dáng |
| `app.js` | Logic game, kho câu hỏi, lưu tiến độ |
| `scene.js` | Cảnh 3D (three.js tải từ CDN jsDelivr): ánh sáng, camera, gạch rơi/trồi/xoáy, bánh răng, quỹ đạo, cờ bay, chim Lạc |
| `sfx.js` | Hiệu ứng âm thanh tạo bằng Web Audio, không cần file nhạc |
| `questions.js` | 72 câu hỏi MLN131, gắn theo chương (`m`) |
| `models.js` | 5 công trình, mỗi viên gạch có tên (`label`) và ý nghĩa (`note`) |

## Thêm câu hỏi

- **Trong game:** nút **📚 Kho câu hỏi** bị ẩn với người chơi. Muốn thấy nút, mở trang kèm `?admin` ở cuối link (ví dụ `https://ten-web.vercel.app/?admin`). Trong đó có thể thêm, xóa, xuất hoặc nhập JSON. Câu hỏi này được lưu trong trình duyệt (localStorage), nên chỉ máy đó thấy, và được hỏi ở mọi công trình.
- **Cho mọi người chơi:** thêm vào mảng `DEFAULT_QUESTIONS` trong `questions.js` rồi deploy lại:

```js
{ m: 'bridge', q: "Câu hỏi?", a: ["Đáp án đúng", "Sai 1", "Sai 2", "Sai 3"], c: 0, e: "Giải thích (không bắt buộc)" },
```

`m` là công trình (`alliance`, `bridge`, `state`, `drum`, `family`); bỏ `m` thì câu được hỏi ở mọi công trình. `c` là vị trí đáp án đúng, bắt đầu từ 0. Thứ tự đáp án được xáo trộn khi chơi.

Mẹo: thêm câu trong game → **Xuất JSON** → dán nội dung vào `questions.js`.

## Chạy thử trên máy

```bash
python -m http.server 5178
```

Sau đó mở http://localhost:5178

## Deploy lên Vercel

**Cách 1: Vercel CLI**

```bash
npm i -g vercel
```

```bash
vercel --prod
```

Chạy trong thư mục dự án. Khi được hỏi framework, chọn **Other** và để trống build command.

**Cách 2: qua GitHub**

1. Đẩy thư mục này lên một repo GitHub.
2. Vào vercel.com → **Add New… → Project** → chọn repo.
3. Framework Preset: **Other**, không cần Build Command, Output Directory để mặc định.
4. Bấm **Deploy**.
