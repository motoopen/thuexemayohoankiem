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
