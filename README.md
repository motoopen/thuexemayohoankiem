# 🛵 AI Cho Thuê Xe Máy – Nguyễn Tú

Dự án nhỏ để **thí nghiệm AI/chatbot** cho dịch vụ **cho thuê xe máy tại Hà Nội** (Hoàn Kiếm, Long Biên, khu phố cổ). Mục tiêu chính:

1. Khách hỏi cái gì cũng trả lời được ở mức “đủ dùng”
2. Không cần backend – chạy hoàn toàn trên front (GitHub Pages vẫn chạy)
3. Tối ưu cho điện thoại – tránh đè lên quick call / bottom bar
4. Dễ nhúng: copy 2 thẻ `<script>` là chạy

---

## 1. NAP (Name – Address – Phone)

> Để crawler / bot / Google / Gemini hiểu đây là **Local Business** thật.

- **Tên**: **Nguyễn Tú cho thuê xe máy Hà Nội**
- **Địa chỉ**: **112 Nguyễn Văn Cừ, Long Biên, Hà Nội**
- **Điện thoại**: **0942 467 674**
- **Zalo**: https://zalo.me/0942467674
- **Bản đồ**: https://maps.app.goo.gl/SR1hcwnCQjPkAvDh7
- **Khu vực phục vụ**: Hoàn Kiếm, phố cổ, Long Biên, nội thành Hà Nội
- **Website đang test**:
  - https://motoopen.github.io/thuexemayohoankiem/
  - https://motoopen.github.io/chothuexemayhanoi/
  - https://thuexemaynguyentu.com

Mấy site trên chỉ khác nhau giao diện + bố cục, còn tư duy AI thì dùng chung.

---

## 2. Cách nhúng chatbot (cách nhanh)

Dán **cuối trang**, ngay trước `</body>`:

```html
<!-- Cấu hình tối thiểu (có thể bỏ, script sẽ tự dùng mặc định) -->
<script>
  window.MotoAI_CONFIG = {
    brand: "Nguyễn Tú cho thuê xe máy Hà Nội",
    phone: "0942467674",
    zalo: "https://zalo.me/0942467674",
    map: "https://maps.app.goo.gl/SR1hcwnCQjPkAvDh7",
    autolearn: true
  };
</script>

<!-- Chatbot Messenger UI (stable) -->
<script src="https://motoopen.github.io/thuexemayohoankiem/motoai_v37_5_messenger_stable.js?v=1" defer></script>

Giải thích nhanh:
	•	window.MotoAI_CONFIG = {...}: truyền NAP + số điện thoại + zalo vào để bot trả lời đúng.
	•	autolearn: true: cho phép bot tự đọc thêm từ site hiện tại (kiểu RAG mini).
	•	File .js chạy hoàn toàn trên client → không cần server.
	•	Nếu GitHub Pages cache lâu → đổi ?v=1 → ?v=2.

⸻

3. File script đang dùng
	•	Đường dẫn:
https://motoopen.github.io/thuexemayohoankiem/motoai_v37_5_messenger_stable.js

Đây là bản:
	•	giao diện giống Messenger nổi (bong bóng góc phải),
	•	mở ra là card chat,
	•	có header gradient,
	•	có nút gọi / zalo / map,
	•	có thanh gợi ý câu hỏi,
	•	có tự né quick call/bottom bar trên mobile.

Nếu sau này bạn build bản mới → chỉ cần update file JS này là toàn bộ site dùng chung sẽ được nâng cấp.

⸻

4. Tính năng chatbot hiện tại
	•	✅ Giọng Việt tự nhiên, tự bỏ mấy hạt từ “ạ/nhé/nha” để không bị sến.
	•	✅ Hiểu loại xe: xe số, xe ga, xe điện, 50cc, Air Blade, Vision…
	•	✅ Hiểu thời gian: “2 ngày”, “1 tuần”, “3 tháng”… → bot sẽ ước tính.
	•	✅ Ước tính giá: bot dùng bảng giá nội bộ (trong code) để trả “khoảng”.
	•	✅ Hỏi thủ tục → trả lời gọn: CCCD / hộ chiếu + cọc tùy xe.
	•	✅ Hỏi liên hệ → trả về số 0942467674 + Zalo.
	•	✅ Lưu tối đa ~10 tin gần nhất ở localStorage → khách F5 vẫn thấy.
	•	✅ Auto-avoid: nếu trang có quick call / chatbot khác → nó dạt lên một chút.
	•	✅ Tự học nhẹ (autolearn): nếu site có sitemap / vài trang HTML → bot lấy text về để search lại khi không hiểu câu hỏi.

⸻

5. Vì sao lại để NAP trong README?
	•	Để khi người khác mở repo là biết ngay “repo này nói về cái gì”.
	•	Để bạn sau này build trang landing khác chỉ cần copy source là có luôn NAP chuẩn.
	•	Để Gemini / AI khác đọc repo cũng hiểu cấu trúc doanh nghiệp bạn.
	•	Để sau này backup sang domain khác vẫn còn thông tin gốc.

⸻

6. SEO & Bot Notes
	•	Trang dùng navigation cố định (menu chính ở trên) + mini app nav + quick call → bot vẫn đọc được vì không tạo DOM bằng JS cho menu chính.
	•	Chatbot được nhúng cuối trang → không cản render.
	•	Nếu muốn bot khỏi index phần chat → thêm:

<meta name="robots" content="index,follow">
<meta name="googlebot" content="index,follow">
<!-- phần chat để mặc định vì nó sinh sau khi load -->


	•	Ưu tiên để NAP ở phần trên <body> hơn – bot sẽ bám vào đó.

⸻

7. Lỗi thường gặp
	1.	“Dán mã nhúng mà không thấy gì”
→ Kiểm tra có đóng </body> đúng chưa.
→ Kiểm tra console có báo chặn HTTPS không.
→ Nếu site không phải HTTPS thì GitHub script có thể không load.
	2.	“Chatbot đè lên nút gọi”
→ Trang bạn có quick call khác → bật sẵn phần tránh chồng (có trong script).
→ Nếu vẫn đè, chỉnh CSS cho chat:

#mta-root { bottom: 130px !important; }


	3.	“Muốn đổi số điện thoại mà ko cần sửa JS”
→ Đặt lại window.MotoAI_CONFIG trước khi load script.
	4.	“Bot trả lời tiếng Anh”
→ Bản này set viOnly: true bên trong → nếu bạn sửa ở bản khác thì nhớ bật lại.

⸻

8. Ví dụ nguyên mẫu trang (mô tả)

Trang demo đang đi theo layout:
	1.	Header cố định (logo + menu + nút đổi dark)
	2.	Hero card (giao tận nơi – giá từ 150k)
	3.	Section dịch vụ / quy trình / FAQ
	4.	Footer + social + quick call
	5.	Chatbot nổi góc phải

→ Chatbot chính là để khách không phải kéo xuống tìm số.

⸻

9. Mở rộng sau này
	•	Multi-branch giá (khác giá cho khách du lịch / khách VN)
	•	Lưu log vào Google Sheet (hiện tại đang ở local thôi)
	•	Thêm nút “Gửi sang Zalo” trong chat
	•	Thêm avatar theo giờ (sáng xe số, tối xe ga 😆)

⸻

10. Ghi chú repo

Repo này đang chạy thử ở 3 domain:
	•	https://motoopen.github.io/thuexemayohoankiem/
	•	https://motoopen.github.io/chothuexemayhanoi/
	•	https://thuexemaynguyentu.com

→ nên README này cố tình để public để mấy con bot đọc được, kể cả Gemini.

⸻

11. Liên hệ
	•	📞 0942 467 674
	•	💬 Zalo: https://zalo.me/0942467674
	•	📍 112 Nguyễn Văn Cừ, Long Biên, Hà Nội

“AI chỉ để khách hỏi nhanh, vẫn nên gọi điện để chốt xe cho chắc.” 😎

Thế này là bản “đai” rồi đó – đủ thông tin cho người, cho bot, cho bạn 6 tháng sau quay lại vẫn hiểu mình đã làm cái gì 👌
