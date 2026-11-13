# 🧱 Xây Gạch Triết Học

Game trả lời câu hỏi triết học. Mỗi câu trả lời đúng đặt thêm một viên gạch vào mô hình đang xây:

1. 🏛️ **Đền Triết Học Hy Lạp** (10 viên): bậc nền, 4 cột Thales, Socrates, Plato, Aristotle, mái đền và cú Minerva
2. 🏠 **Ngôi Nhà Duy Vật Lịch Sử** (11 viên): Cơ sở hạ tầng – Kiến trúc thượng tầng
3. ☯️ **Thái Cực Âm Dương Bát Quái** (12 viên): Âm, Dương và 8 quẻ

Web tĩnh thuần HTML/CSS/JS, không cần build.

## Cấu trúc

| File | Nội dung |
|---|---|
| `index.html` | Giao diện |
| `style.css` | Kiểu dáng |
| `app.js` | Logic game, kho câu hỏi, lưu tiến độ |
| `scene.js` | Cảnh 3D (three.js tải từ CDN jsDelivr): ánh sáng, camera, gạch rơi |
| `sfx.js` | Hiệu ứng âm thanh tạo bằng Web Audio, không cần file nhạc |
| `questions.js` | 30 câu hỏi môn MLN131 (Chủ nghĩa xã hội khoa học) |
| `models.js` | Khối 3D của 3 công trình, mỗi phần tử là 1 viên gạch |

## Thêm câu hỏi

- **Trong game:** nút **📚 Kho câu hỏi** bị ẩn với người chơi. Muốn thấy nút, mở trang kèm `?admin` ở cuối link (ví dụ `https://ten-web.vercel.app/?admin`). Trong đó có thể thêm, xóa, xuất hoặc nhập JSON. Câu hỏi này được lưu trong trình duyệt (localStorage), nên chỉ máy đó thấy.
- **Cho mọi người chơi:** thêm vào mảng `DEFAULT_QUESTIONS` trong `questions.js` rồi deploy lại:

```js
{ q: "Câu hỏi?", a: ["Đáp án đúng", "Sai 1", "Sai 2", "Sai 3"], c: 0, e: "Giải thích (không bắt buộc)" },
```

`c` là vị trí đáp án đúng, bắt đầu từ 0. Thứ tự đáp án được xáo trộn khi chơi.

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
