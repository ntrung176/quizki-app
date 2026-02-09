# Fix Routing Issues - Chuyển sang React Router

## Vấn đề chính

App đang sử dụng hai hệ thống routing khác nhau:
1. **AppRoutes component** (React Router) - đã được tạo nhưng không được sử dụng
2. **renderContent() function** (cách cũ) - đang được sử dụng trong App.jsx

Điều này gây ra nhiều vấn đề:
- Edit form không hiển thị khi click Edit
- Routing không hoạt động đúng
- URL thay đổi nhưng nội dung không cập nhật

## Giải pháp đã áp dụng

### 1. Import AppRoutes component vào App.jsx

```javascript
// Import routing component
import AppRoutes from './components/AppRoutes';
```

### 2. Thay thế renderContent() bằng AppRoutes

Thay vì:
```javascript
{renderContent()}
```

Bây giờ sử dụng:
```javascript
<AppRoutes
    isAuthenticated={!!userId}
    isApproved={profile?.isApproved === true}
    isLoading={isLoading}
    // ... tất cả props cần thiết
/>
```

### 3. Giữ lại useEffect load editingCard

useEffect ở dòng 1599-1622 trong App.jsx vẫn cần thiết để load editingCard từ URL khi navigate đến edit route.

## Các thay đổi chi tiết

### File: `src/App.jsx`

1. **Dòng 71-72**: Thêm import AppRoutes
   ```javascript
   // Import routing component
   import AppRoutes from './components/AppRoutes';
   ```

2. **Dòng 2355-2418**: Thay thế `{renderContent()}` bằng `<AppRoutes ... />`
   - Truyền tất cả props cần thiết
   - Bao gồm handlers, state, và refs

3. **Giữ nguyên**:
   - useEffect load editingCard từ URL (dòng 1599-1622)
   - Function renderContent() (dòng 2081-2315) - có thể xóa sau nhưng giữ lại để an toàn
   - getCurrentView() function - vẫn cần cho styling và notification

## Lợi ích

1. **Routing hoạt động đúng**: React Router xử lý tất cả navigation
2. **URL sync với UI**: Mỗi route có URL riêng
3. **Browser back/forward hoạt động**: Người dùng có thể dùng nút back/forward
4. **Deep linking**: Có thể bookmark và share URLs cụ thể
5. **Edit form hoạt động**: Không cần F5 nữa

## Lưu ý

- `view` state vẫn được sử dụng cho styling và notification
- `renderContent()` function vẫn tồn tại nhưng không được gọi
- Có thể cần điều chỉnh notification logic để hoạt động với React Router

## Testing

Sau khi áp dụng thay đổi, test các chức năng:

1. **Navigation**: Click vào các menu item, kiểm tra URL và nội dung
2. **Edit**: Click Edit trên vocabulary item, kiểm tra EditCardForm hiển thị
3. **Add**: Click Add button, kiểm tra AddCardForm hiển thị
4. **Review**: Start review, kiểm tra ReviewScreen hiển thị
5. **Browser back/forward**: Kiểm tra navigation hoạt động đúng
6. **Direct URL**: Copy URL và paste vào tab mới, kiểm tra trang load đúng
