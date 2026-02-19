# Kế hoạch: Cải tiến hệ thống học từ vựng

## Tổng quan
Thay đổi cách học từ vựng để giống với hệ thống học Kanji (KanjiLessonScreen + KanjiReviewScreen).

## Phase 1: FlashcardScreen - Cải tiến flashcard cho từ mới
### Thay đổi:
1. **Thay nút "Trước/Tiếp" bằng "Chưa thuộc/Đã thuộc"**
   - Nút "Chưa thuộc" (đỏ/cam) → đưa thẻ vào stack chưa thuộc
   - Nút "Đã thuộc" (xanh) → đánh dấu thẻ đã thuộc, tiếp
   - Chỉ hiện nút SAU KHI lật thẻ (phải xem mặt sau trước)
2. **Nút Hoàn tác (Undo)** ở bên phải → quay lại thẻ trước khi chọn nhầm
3. **Giao diện hoàn thành**:
   - Khi hết thẻ → hiện màn hình hoàn thành
   - Nếu còn thẻ chưa thuộc → thêm nút "Tiếp tục học N thẻ chưa thuộc"
   - Lặp lại đến khi KHÔNG còn thẻ chưa thuộc

### Files cần sửa:
- `FlashcardScreen.jsx` - Viết lại logic chính

## Phase 2: StudyScreen - Chế độ học kiểu Quizlet
### Thay đổi:
1. Giữ flow hiện tại (MC 5 từ → tự luận 5 từ)
2. Từ sai → lặp lại batch đó
3. Tiếp tục đến khi không còn từ

### Files cần sửa:
- `StudyScreen.jsx` - Đã tương đối OK, chỉ cần polish

## Phase 3: SRS cho từ vựng - Giống hệ thống Kanji + Anki
### Thay đổi:
1. **Ôn tập SRS**: Dùng card 4 nút giống KanjiReviewScreen:
   - Quên rồi (1 phút)
   - Khó (6 phút / x1.2)
   - Tốt (10 phút / xEase)
   - Dễ (4 ngày / xEase*1.3)
2. **Tính interval**: Dùng thuật toán SM-2 giống Kanji
3. **Đồng nghĩa & Ngữ cảnh**: Ôn cùng lúc với chu kì SRS (optional)

### Files cần sửa:
- `ReviewScreen.jsx` - Thêm mode SRS card
- `SRSVocabScreen.jsx` - Cập nhật để gọi đúng mode

## Thứ tự thực hiện:
1. FlashcardScreen (Phase 1) - FIRST PRIORITY
2. ReviewScreen + SRS (Phase 3)
3. StudyScreen polish (Phase 2)
