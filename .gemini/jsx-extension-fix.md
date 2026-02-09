# Fix: JSX Syntax Error - Đổi file extension

## Vấn đề

Lỗi liên tục:
```
Uncaught SyntaxError: Unexpected token '<' (at index.js:34:16)
```

## Nguyên nhân

File `src/router/index.js` chứa JSX code nhưng có extension `.js` thay vì `.jsx`. 

Mặc dù đã có:
- ✅ Import React
- ✅ Import Navigate đúng cách
- ✅ Không duplicate import/export

Nhưng Vite/Browser vẫn không parse JSX đúng cách do file extension.

## Giải pháp

Đổi file extension từ `.js` sang `.jsx`:

```powershell
Move-Item -Path "src\router\index.js" -Destination "src\router\index.jsx"
```

## Tại sao cần .jsx extension?

1. **Vite configuration**: Vite có thể được config để chỉ parse JSX trong files `.jsx`
2. **Build tools**: Một số build tools yêu cầu `.jsx` extension cho files chứa JSX
3. **Best practice**: Rõ ràng hơn khi file nào chứa JSX
4. **IDE support**: Better syntax highlighting và IntelliSense

## Files ảnh hưởng

- `src/router/index.js` → `src/router/index.jsx`

Các imports vẫn hoạt động vì Vite tự động resolve:
- `from './router'` → tự động tìm `./router/index.jsx`
- `from '../router'` → tự động tìm `../router/index.jsx`

## Kết quả

✅ Không còn syntax error
✅ JSX được parse đúng
✅ App chạy mượt mà
✅ Dev server khởi động thành công

## Bài học

Khi làm việc với React/JSX:
- Luôn dùng `.jsx` extension cho files chứa JSX
- Ngay cả khi có React import, extension vẫn quan trọng
- Restart dev server sau khi đổi file extension để clear cache
