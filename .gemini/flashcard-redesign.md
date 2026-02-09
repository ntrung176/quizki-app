# FlashcardScreen - Copy từ ReviewScreen và chỉnh sửa

## 🎯 Những gì đã làm

### 1. Copy giao diện flashcard từ ReviewScreen
Đã copy toàn bộ phần flashcard từ ReviewScreen (dòng 673-766) bao gồm:
- ✅ Cấu trúc HTML/JSX y hệt
- ✅ CSS classes giống hệt
- ✅ Animation và transition
- ✅ Touch/swipe handlers
- ✅ Flip animation với 3D transform

### 2. Thay đổi màu sắc
**Mặt sau (Back side)**:
```javascript
// TRƯỚC (ReviewScreen):
from-emerald-500 to-teal-600
text-emerald-200

// SAU (FlashcardScreen):
from-indigo-500 to-purple-600  // GIỐNG MẶT TRƯỚC
text-indigo-200                 // GIỐNG MẶT TRƯỚC
```

### 3. Loại bỏ thông tin phụ
**Đã xóa khỏi mặt sau**:
- ❌ Hán Việt (sinoVietnamese)
- ❌ Đồng nghĩa (synonym)
- ❌ Ví dụ (example)
- ❌ Nghĩa ví dụ (exampleMeaning)

**Chỉ giữ lại**:
- ✅ Tiếng Việt (back/meaning)
- ✅ Icon RotateCw ở góc

### 4. Thêm container và layout giống ReviewScreen
```javascript
// Container chính
<div className="w-[600px] max-w-[95vw] mx-auto my-auto flex flex-col justify-center items-center space-y-3 p-4 border-2 border-indigo-400/30 rounded-2xl">
```

### 5. Progress bar giống ReviewScreen
```javascript
// Progress bar với style giống hệt
<div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
    <div className="h-full bg-indigo-500 progress-bar rounded-full" style={{ width: `${progress}%` }}></div>
</div>
```

### 6. Navigation buttons style giống ReviewScreen
```javascript
// Previous button
bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200
shadow-md hover:shadow-lg

// Next button  
bg-indigo-500 hover:bg-indigo-600 text-white
shadow-md hover:shadow-lg
```

## 📋 Chi tiết kỹ thuật

### Card dimensions (giống ReviewScreen):
```javascript
width: '100%'
height: '340px'
max-w-[220px] md:max-w-[260px]
```

### Flip animation (giống ReviewScreen):
```javascript
className="flip-card-container transform-style-3d cursor-pointer relative card-slide"
transition: 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1), opacity 0.3s ease'
```

### Swipe handling (giống ReviewScreen):
```javascript
maxOffset = 200
touchAction: 'pan-y'
```

### Text sizes (giống ReviewScreen):
```javascript
// Front
text-2xl md:text-3xl lg:text-4xl

// Back
text-3xl md:text-4xl
```

## 🎨 Kết quả

### Trước:
- Mặt trước: Indigo/Purple
- Mặt sau: Emerald/Teal (khác màu)
- Có thông tin phụ
- Layout khác ReviewScreen

### Sau:
- Mặt trước: Indigo/Purple
- Mặt sau: Indigo/Purple (CÙNG MÀU)
- Không có thông tin phụ
- Layout GIỐNG HỆT ReviewScreen
- Container, progress bar, buttons GIỐNG HỆT ReviewScreen

## ✅ Checklist đồng bộ

- ✅ Container: `w-[600px] max-w-[95vw]` + border indigo
- ✅ Progress bar: Indigo color, same style
- ✅ Card dimensions: 260px × 340px
- ✅ Card colors: Both sides indigo-purple
- ✅ Flip animation: Same cubic-bezier timing
- ✅ Swipe gestures: Same maxOffset and touchAction
- ✅ Navigation buttons: Same colors and shadows
- ✅ Text sizes: Same responsive sizes
- ✅ Icons: Same RotateCw placement
- ✅ Instructions: Same text and style

## 🧪 Test

Vào `/flashcard` và kiểm tra:
- ✅ Layout giống hệt ReviewScreen flashcard mode
- ✅ Cả hai mặt đều màu indigo-purple
- ✅ Chỉ hiển thị Nhật ↔ Việt
- ✅ Flip animation mượt mà
- ✅ Swipe gestures hoạt động
- ✅ Progress bar và buttons đồng bộ
