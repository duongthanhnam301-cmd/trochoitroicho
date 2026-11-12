# ⭐ Thắp Sáng Việt Nam

Bản đồ Việt Nam ban đầu chìm trong bóng tối. Mỗi câu trả lời đúng thắp sáng một trong 34 tỉnh thành và hiện thông tin về địa phương đó. Thắp sáng đủ 34/34 sẽ nhận huy hiệu **Người Việt Nam chất**, có thể in tên và tải về dạng ảnh PNG.

Web tĩnh thuần HTML/CSS/JS, không cần build.

## Cấu trúc

| File | Nội dung |
|---|---|
| `index.html`, `style.css` | Giao diện |
| `app.js` | Logic game, huy hiệu, kho câu hỏi |
| `provinces.js` | Thông tin 34 tỉnh thành và 2 câu hỏi cho mỗi tỉnh |
| `map-data.js` | Ranh giới tỉnh (SVG đã rút gọn), có Hoàng Sa và Trường Sa trong ô phụ |

## Thêm câu hỏi

- **Trong game:** mở **📚 Kho câu hỏi**, viết câu hỏi và chọn tỉnh thành là đáp án đúng. 3 đáp án nhiễu được tạo tự động. Câu hỏi được lưu trên trình duyệt của người thêm.
- **Cho mọi người chơi:** thêm câu vào mảng `qs` của tỉnh tương ứng trong `provinces.js` rồi deploy lại.

## Deploy lên Vercel

Chạy trong thư mục `ban-do-viet-nam`:

```bash
vercel --prod
```

Chọn framework **Other** và để trống build command.

## Nguồn dữ liệu

- Ranh giới: [nguyenduy1133/Free-GIS-Data](https://github.com/nguyenduy1133/Free-GIS-Data), đã rút gọn.
- Diện tích, dân số: số liệu khi sắp xếp đơn vị hành chính năm 2025 (Nghị quyết 202/2025/QH15). Bắc Ninh, Quảng Ninh, Đồng Nai lên thành phố trực thuộc Trung ương năm 2026.

Bản đồ chỉ để minh họa, không dùng làm căn cứ pháp lý.
