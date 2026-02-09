# FlashcardScreen - Color-Coded Display

## 🎨 Thay đổi chính

### 1. Mặt trước - Phân tách Kanji và Hiragana với màu khác nhau

**Trước**:
- Hiển thị toàn bộ `front` (ví dụ: "食べる（たべる）")
- Màu trắng đồng nhất

**Sau**:
- **Kanji**: Màu **trắng** (`text-white`)
- **Hiragana**: Màu **cyan nhạt** (`text-cyan-300`)
- Hiển thị riêng biệt, dễ phân biệt

```jsx
// Parse front text
const kanji = "食べる"        // Hiển thị màu trắng
const hiragana = "たべる"     // Hiển thị màu cyan-300
```

### 2. Mặt sau - Thêm Âm Hán Việt với màu khác nhau

**Trước**:
- Chỉ hiển thị nghĩa tiếng Việt
- Không có Hán Việt

**Sau**:
- **Nghĩa tiếng Việt**: Màu **trắng** (`text-white`)
- **Label "Âm Hán Việt"**: Màu **xám nhạt** (`text-slate-400`)
- **Âm Hán Việt**: Màu **vàng** (`text-yellow-300`)

```jsx
<div>
    {/* Nghĩa - Trắng */}
    <div className="text-white">
        Ăn, dùng bữa
    </div>
    
    {/* Hán Việt - Vàng */}
    <div className="border-t border-slate-600">
        <p className="text-slate-400">Âm Hán Việt</p>
        <p className="text-yellow-300">Thực</p>
    </div>
</div>
```

## 🎨 Color Scheme

### Mặt trước:
| Element | Color | Class | Hex |
|---------|-------|-------|-----|
| Kanji | Trắng | `text-white` | #FFFFFF |
| Hiragana | Cyan nhạt | `text-cyan-300` | #67E8F9 |

### Mặt sau:
| Element | Color | Class | Hex |
|---------|-------|-------|-----|
| Nghĩa TV | Trắng | `text-white` | #FFFFFF |
| Label | Xám nhạt | `text-slate-400` | #94A3B8 |
| Hán Việt | Vàng | `text-yellow-300` | #FDE047 |

## 📋 Logic phân tách

### Front (Kanji + Hiragana):
```javascript
// Regex để tách kanji và hiragana
const kanjiMatch = front.match(/^([^（(]+)/);           // Lấy phần trước ngoặc
const hiraganaMatch = front.match(/[（(]([^）)]+)[）)]/); // Lấy phần trong ngoặc

// Ví dụ: "食べる（たべる）"
// kanji = "食べる"
// hiragana = "たべる"
```

### Back (Meaning + Sino-Vietnamese):
```javascript
// Hiển thị nghĩa
{formatMultipleMeanings(currentCard.back)}

// Hiển thị Hán Việt nếu có
{currentCard.sinoVietnamese && (
    <div>
        <p>Âm Hán Việt</p>
        <p>{currentCard.sinoVietnamese}</p>
    </div>
)}
```

## 📏 Text Sizes

### Mặt trước:
- **Kanji**: `text-3xl md:text-4xl` (30px → 36px)
- **Hiragana**: `text-xl md:text-2xl` (20px → 24px)

### Mặt sau:
- **Nghĩa TV**: `text-2xl md:text-3xl` (24px → 30px)
- **Label**: `text-sm` (14px)
- **Hán Việt**: `text-lg md:text-xl` (18px → 20px)

## 🎯 Ví dụ

### Card: "食べる（たべる）"

**Mặt trước**:
```
食べる          ← Trắng (Kanji)
たべる          ← Cyan (Hiragana)
```

**Mặt sau**:
```
Ăn, dùng bữa   ← Trắng (Nghĩa)
─────────────
Âm Hán Việt    ← Xám nhạt (Label)
Thực           ← Vàng (Hán Việt)
```

## ✅ Lợi ích

### 1. Dễ phân biệt
- Kanji và Hiragana rõ ràng
- Nghĩa và Hán Việt tách biệt
- Màu sắc giúp nhận diện nhanh

### 2. Thông tin đầy đủ
- Mặt trước: Cả Kanji lẫn cách đọc
- Mặt sau: Cả nghĩa lẫn Hán Việt
- Không cần lật nhiều lần

### 3. Visual hierarchy
- Thông tin chính (Kanji, Nghĩa) nổi bật (trắng)
- Thông tin phụ (Hiragana, Hán Việt) màu khác
- Dễ scan và đọc

## 🧪 Test

Vào `/flashcard` và kiểm tra:

### Mặt trước:
- ✅ Kanji hiển thị màu trắng
- ✅ Hiragana hiển thị màu cyan (nếu có)
- ✅ Hai phần tách biệt rõ ràng

### Mặt sau:
- ✅ Nghĩa tiếng Việt màu trắng
- ✅ Âm Hán Việt màu vàng (nếu có)
- ✅ Border ngăn cách giữa nghĩa và Hán Việt
- ✅ Label "Âm Hán Việt" màu xám nhạt

## 🎨 Design Rationale

### Tại sao cyan cho Hiragana?
- Cyan nhẹ nhàng, không chói
- Tương phản tốt với nền tối
- Khác biệt rõ với trắng (Kanji)

### Tại sao vàng cho Hán Việt?
- Vàng nổi bật, dễ nhận diện
- Tương phản tốt với nền slate
- Khác biệt rõ với trắng (Nghĩa)

### Tại sao có border?
- Phân tách rõ nghĩa và Hán Việt
- Tạo visual hierarchy
- Dễ đọc và scan
