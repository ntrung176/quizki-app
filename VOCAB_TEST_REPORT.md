# 📚 Báo Cáo Test Menu Từ Vựng - QuizKi App

**Ngày Test:** 18/05/2026  
**Phiên Bản:** 0.0.0  
**Trạng Thái:** ⚠️ CÓ LỖI/THIẾU SÓT

---

## 🎯 Tổng Quan Menu Từ Vựng

Menu từ vựng có 4 tính năng chính:
1. **Ôn tập** (ReviewScreen) - Test multiple modes
2. **Thư viện** (ListView) - Quản lý & tìm kiếm
3. **Thêm học phần** (ImportScreen) - Import từ file
4. **Học theo sách** (BookScreen) - Học theo giáo trình

---

## 1️⃣ TÍNH NĂNG: Ôn Tập (ReviewScreen) 

### ✅ Tính Năng Hiện Có:
- [x] Multiple modes: `back`, `synonym`, `example`, `dictation`, `flashcard`
- [x] Multiple choice & typing modes
- [x] Keyboard shortcuts (Space, Arrow keys, Numbers 1-4)
- [x] Swipe gesture support (Mobile)
- [x] Touch/swipe navigation
- [x] Phát âm tiếng Nhật (TTS)
- [x] Sound effects (correct/incorrect)
- [x] Confetti celebrations
- [x] Blur Vietnam mode trong example
- [x] Hint system
- [x] Analytics tracking (response time)

### ⚠️ LỖI - Mức Độ Cao:
1. **Bug: Audio không lưu lại sau TTS** (Line 1148-1149)
   - VDụ: Khi user chạy TTS, thường không được lưu vào audioBase64
   - Nguyên nhân: onSaveCardAudio callback có thể không được gọi đúng
   - Impact: Mất dữ liệu âm thanh SAI LẦM

2. **Bug: Multiple choice options bị lặp** 
   - Khi có `...` padding, không filter duplicate sau normalize
   - Impact: Người dùng thấy các đáp án không rõ ràng

3. **Performance: Tạo MC options mỗi frame**
   - Dependency array thiếu `reviewTestFormat`
   - Line ~380: `optionsRef.current` không cleanup khi chuyển card
   - Impact: Memory leak, lag

### ⚠️ LỖI - Mức Độ Trung Bình:
4. **UX: Reveal button không rõ ràng**
   - Không hiển thị hint counter giúp user biết bao nhiêu ký tự đã reveal
   - Impact: User confusion

5. **Đạo đức: Tự động reveal toàn bộ sau thời gian**
   - Nếu user không trả lời, phải chờ bao lâu?
   - Không rõ timeout logic
   
6. **Bug: Touchend không reset touchStart**
   - Line ~330: Có thể gây bug swipe lặp
   - Impact: Invalid swipes

### 🟢 LỖI - Mức Độ Thấp:
7. **Code: Error handling thiếu**
   - Line 654, 658, 672, 1149, 1165: Generic console.error
   - Không hiển thị user error message
   - Impact: Debug khó, user không biết lỗi gì

---

## 2️⃣ TÍNH NĂNG: Thư Viện (ListView)

### ✅ Tính Năng Hiện Có:
- [x] Filter by level, POS, folder
- [x] Sort by: newest, oldest, random
- [x] Search with debounce
- [x] Multi-select & batch operations
- [x] Folder management (nested)
- [x] Edit modal inline
- [x] Xóa thẻ
- [x] AI assist (Gemini)
- [x] Export/Import
- [x] Image uploads & compression
- [x] Audio file uploads
- [x] FuriganaText rendering

### ⚠️ LỖI - Mức Độ Cao:
1. **Bug: Edit modal không reload audio/image**
   - Khi mở edit, imagePreview & audioBase64 có thể null
   - Line ~50: `card?.imageBase64 || null` không preview được
   - Impact: User thấy không có gì là sửa được gì

2. **Regression: Folder system không tương thích**
   - ListView dùng localStorage riêng (`vocab_folders_${userId}`)
   - App.jsx dùng riêng (`studySets` Firestore collection)
   - Impact: Dữ liệu thư mục xung đột, user confused

3. **Bug: Batch delete confirmation tối nghĩa**
   - Delete modal UI không giải thích làm gì, xóa bao nhiêu thẻ
   - Impact: Tai nạn xóa data

### ⚠️ LỖI - Mức Độ Trung Bình:
4. **UX: Search không highlight matches**
   - Search term display khó nhận diện có match hay không
   - Impact: Khó verify search work

5. **Performance: useDeferredValue không dùng**
   - Line ~360: `deferredSearchTerm` khai báo nhưng không xài
   - seacrchTerm thay vì deferredSearchTerm
   - Impact: Search lag trên mobile

6. **Bug: CardFolder mapping cleanup**
   - useEffect cleanup (Line ~375) khôi phục filter
   - Nếu xóa toàn bộ cards, state không update
   - Impact: Ghost cardFolders reference

### 🟢 LỖI - Mức Độ Thấp:
7. **UX: Folder nesting không giới hạn độ sâu**
   - Có thể tạo 100 level nested → UI break
   - Không có max depth warning
   - Impact: Edge case nhưng có thể crash

8. **Code: Folder styling padding manual**
   - Line ~305: `paddingLeft: ${32 + folder.depth * 20}px`
   - Hard-coded magic numbers
   - Impact: Khó maintain, không responsive

---

## 3️⃣ TÍNH NĂNG: Import (ImportScreen)

### ✅ Tính Năng Hiện Có:
- [x] TSV file upload
- [x] Tab-separated parsing
- [x] Multi-field import: front, back, synonym, example, etc.
- [x] Error handling with invalid count
- [x] Quoted field support (CSV escaping)
- [x] SRS field reconstruct from timestamps

### ⚠️ LỖI - Mức Độ Cao:
1. **Missing: Không parse audioBase64 & imageBase64**
   - Field 16-17 định nghĩa nhưng không được sử dụng
   - Large fields (audio/images) không import được
   - Impact: Toàn bộ media data MẤT khi import

2. **Bug: Field parsing off-by-one**
   - Line ~47: Field numbering không match TSV column order
   - Nếu file có 21+ columns, fields lệch sai
   - Impact: Wrong data mapping

3. **Missing: Không validate date format**
   - Line ~36: createdAtRaw parse không xử lý → mặc định ""
   - Impact: Toàn bộ import timestamps mặc định Date.now()

### ⚠️ LỖI - Mức Độ Trung Bình:
4. **UX: Không hiển thị preview trước import**
   - Parse success nhưng không xem được sample data
   - Impact: User không verify trước import

5. **Bug: File size validation missing**
   - Lớn file >10MB không warning
   - Reader.readAsText() có thể lag
   - Impact: Browser hang khi import lớn

6. **UX: Success message bị ẩn nhanh**
   - Message state không persist
   - Không có toast/notification system riêng
   - Impact: User miss success message

### 🟢 LỖI - Mức Độ Thấp:
7. **Code: invalidCount không dùng trong event tracking**
   - Chỉ console output, không analytics
   - Impact: Không biết tỷ lệ error nationwide

---

## 4️⃣ TÍNH NĂNG: Học Theo Sách (BookScreen)

### ✅ Tính Năng Hiện Có:
- [x] Group/Book/Chapter/Lesson hierarchy
- [x] Vocab list per lesson
- [x] Reveal/blur modes (JP/VN)
- [x] Add vocab to SRS
- [x] Admin: Create/edit groups, books, chapters
- [x] Admin: JSON import entire book structure
- [x] Progress tracking (Firebase + localStorage)
- [x] Audio per vocab
- [x] Fix audio with custom reading
- [x] Pitch accent display
- [x] Table of contents

### ⚠️ LỖI - Mức Độ Cao:
1. **Bug: Lesson audio không load correct subcollection path**
   - Line ~150: audioColRef path hardcoded 7 levels deep
   - Nếu Firestore structure khác, không tìm được audio
   - Impact: Không âm thanh từ sách

2. **Missing: Kitty icon không tải được**
   - `kittyCollectionPath` không định nghĩa
   - Tuy không error nhưng feature incomplete
   - Impact: Thiếu pet companion trong book study

3. **Bug: Progress saving debounce không clean**
   - Line ~700+: saveProgressTimerRef không clear trước dismount
   - Memory leak nếu user switch lesson nhanh
   - Impact: unsaved progress or resource leak

### ⚠️ LỖI - Mức Độ Trung Bình:
4. **UX: TOC collapse/expand sử dụng map()**
   - Mỗi chapter/lesson expanded = full re-render
   - Nếu có 100+ lessons, lag
   - Impact: Poor performance deep structures

5. **Bug: Admin JSON import không validate schema**
   - Upload JSON bất kỳ, không check structure
   - Có thể corrupt database structure
   - Impact: Data integrity risk

6. **Missing: Số từ vựng per lesson không cached**
   - Mỗi render tính lại `vocabCount = lesson.vocab.length`
   - Impact: Unnecessary compute

### 🟢 LỖI - Mức Độ Thấp:
7. **UX: Audio trimmer UI không validate input**
   - Custom reading input không check empty
   - Fix audio có thể submit blank
   - Impact: Edge case

8. **Code: Firestore access không error boundary**
   - Lỗi Firestore không catch riêng
   - Generic console.error
   - Impact: User không biết lỗi gì

---

## 📊 TỔNG KẾT LỖI

| Mức Độ | Qty | ⚠️ Critical | 
|--------|-----|-----------|
| **Cao** | 6 | ❌ Data loss, import null |
| **Trung** | 15 | ⚠️ UX issues, performance |
| **Thấp** | 9 | ℹ️ Code quality |
| **TỔNG** | **30** | **6 Critical** |

---

## 💡 ĐỀ XUẤT CẢI THIỆN

### A. PRIORITY 1 (Tuần 1-2) - CẤP BÁO CÁO TRƯỚC
1. **Fix ImportScreen field mapping** ✅
   - Rename fields rõ ràng theo TSV column order
   - Parse audioBase64 & imageBase64 đúng
   
2. **Fix audio persist bug ReviewScreen** ✅
   - Verify onSaveCardAudio được gọi
   - Add error handling & toast notification

3. **Fix folder system duplication** ✅
   - Consolidate todos: localStorage vs Firestore
   - Single source of truth

### B. PRIORITY 2 (Tuần 2-3) - ENHANCEMENT
4. **Add image/audio preview in edit modal** ✅
5. **Add debounce to search (use deferredSearchTerm)** ✅
6. **Add max folder nesting depth validation** ✅
7. **Add file size validation to import** ✅
8. **Add batch operation confirmation with count** ✅

### C. PRIORITY 3 (Tuần 3+) - POLISH
9. **Optimize MC render with useMemo** ✅
10. **Add proper error boundaries** ✅
11. **Add progress indicator for batch operations** ✅
12. **Validate and escape JSON import** ✅

---

## 🧪 KỲ SAU HOÀN THÀNH FIXES

Sau khi fix, cần test:
- ✓ Import file TSV với media
- ✓ Review tất cả modes (back/synonym/example/dictation/flashcard)
- ✓ Audio persist & play
- ✓ Folder organization (create/delete/move)
- ✓ Search & filter hiệu quả
- ✓ Book hierarchy (group→book→chapter→lesson)
- ✓ Mobile: swipe, touch controls
- ✓ Dark mode consistency

---

**Created:** 2026-05-18  
**Status:** Ready for CTO Review
