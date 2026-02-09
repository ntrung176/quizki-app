# FlashcardScreen - Minimal Design như Quizlet

## 🎨 Thay đổi chính

### 1. Bỏ Gradient, dùng màu tối đơn giản

**Trước**:
```css
bg-gradient-to-br from-indigo-500 to-purple-600
```

**Sau**:
```css
bg-slate-700 dark:bg-slate-800
border-2 border-slate-600 dark:border-slate-700
```

### 2. Mặt trước - CHỈ tiếng Nhật

**Đã loại bỏ**:
- ❌ Label "Từ vựng"
- ❌ Level badge (N1, N2, N3...)
- ❌ POS badge (Danh từ, Động từ...)
- ❌ Icon RotateCw
- ❌ Audio button

**Chỉ còn**:
- ✅ Tiếng Nhật (front)
- ✅ Text size lớn: `text-4xl md:text-5xl lg:text-6xl`

```jsx
<h3 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight break-words font-japanese">
    {currentCard.front}
</h3>
```

### 3. Mặt sau - CHỈ tiếng Việt

**Đã loại bỏ**:
- ❌ Label "Ý nghĩa"
- ❌ Icon RotateCw
- ❌ Audio button

**Chỉ còn**:
- ✅ Tiếng Việt (back)
- ✅ Text size lớn: `text-3xl md:text-4xl lg:text-5xl`

```jsx
<div className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-relaxed break-words px-2 whitespace-pre-line">
    {formatMultipleMeanings(currentCard.back)}
</div>
```

### 4. Tốc độ lật nhanh như Quizlet

**Trước**:
```javascript
transition: 'transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1)'
// hoặc
transition-transform duration-500  // 500ms
```

**Sau**:
```javascript
transition: 'transform 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)'
```

**Tốc độ**: 0.6s → **0.4s** (nhanh hơn 33%)

## 📋 So sánh

| Feature | Trước | Sau |
|---------|-------|-----|
| Màu nền | Gradient indigo-purple | Solid slate-700/800 |
| Mặt trước | Nhật + badges + icons | CHỈ Nhật |
| Mặt sau | Việt + label + icon | CHỈ Việt |
| Flip speed | 0.5-0.6s | 0.4s |
| Text size front | 2xl-4xl | 4xl-6xl (lớn hơn) |
| Text size back | 3xl-4xl | 3xl-5xl (lớn hơn) |

## 🎯 Design Philosophy

### Minimal & Clean
- Không có gì phân tán sự chú ý
- Chỉ tập trung vào từ vựng
- Giống Quizlet: Simple is better

### Dark & Solid
- Màu tối dễ nhìn
- Không có gradient rực rỡ
- Professional look

### Fast & Smooth
- Flip nhanh như Quizlet (0.4s)
- Smooth cubic-bezier easing
- Responsive và snappy

## 🎨 Color Scheme

```css
/* Card background */
bg-slate-700 dark:bg-slate-800

/* Border */
border-2 border-slate-600 dark:border-slate-700

/* Text */
text-white

/* Shadow */
shadow-2xl hover:shadow-3xl
```

## 📏 Dimensions

```javascript
// Card
width: '100%'
height: '340px'
max-w-[220px] md:max-w-[260px]

// Text Front
text-4xl md:text-5xl lg:text-6xl

// Text Back
text-3xl md:text-4xl lg:text-5xl
```

## ⚡ Performance

### Flip Animation
```javascript
// Quizlet-like speed
transition: 'transform 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)'

// Smooth easing curve
cubic-bezier(0.4, 0.0, 0.2, 1)
```

## ✅ Kết quả

### Trước:
- 🌈 Gradient rực rỡ
- 🏷️ Nhiều badges và labels
- 🎨 Nhiều màu sắc
- ⏱️ Flip chậm (0.5-0.6s)

### Sau:
- ⚫ Màu tối đơn giản
- 📝 Chỉ text từ vựng
- 🎯 Minimal design
- ⚡ Flip nhanh (0.4s) như Quizlet

## 🧪 Test

Vào `/flashcard` và kiểm tra:
- ✅ Mặt trước chỉ có tiếng Nhật (không có gì khác)
- ✅ Mặt sau chỉ có tiếng Việt (không có gì khác)
- ✅ Màu slate-700/800 (tối, không gradient)
- ✅ Flip nhanh và mượt (0.4s)
- ✅ Text size lớn, dễ đọc
- ✅ Clean và minimal như Quizlet
