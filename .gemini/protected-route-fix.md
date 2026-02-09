# Fix: Missing ProtectedRoute and PublicOnlyRoute

## Lỗi

```
Uncaught SyntaxError: The requested module '/src/router/index.js' does not provide an export named 'ProtectedRoute' (at AppRoutes.jsx:3:18)
```

## Nguyên nhân

File `src/router/index.js` không export `ProtectedRoute` và `PublicOnlyRoute` components mà AppRoutes.jsx đang cố import.

## Giải pháp

Đã thêm hai components vào `src/router/index.js`:

### 1. ProtectedRoute Component

Component này bảo vệ các routes yêu cầu authentication và approval:

```javascript
export const ProtectedRoute = ({ children, isAuthenticated, isApproved }) => {
    if (!isAuthenticated) {
        return <Navigate to={ROUTES.LOGIN} replace />;
    }
    
    if (!isApproved) {
        return <Navigate to={ROUTES.PAYMENT} replace />;
    }
    
    return children;
};
```

**Logic**:
- Nếu chưa đăng nhập → redirect đến `/login`
- Nếu đã đăng nhập nhưng chưa được approve → redirect đến `/payment`
- Nếu đã đăng nhập VÀ đã được approve → hiển thị nội dung

### 2. PublicOnlyRoute Component

Component này dành cho các routes chỉ dành cho người chưa đăng nhập (như login page):

```javascript
export const PublicOnlyRoute = ({ children, isAuthenticated }) => {
    if (isAuthenticated) {
        return <Navigate to={ROUTES.HOME} replace />;
    }
    
    return children;
};
```

**Logic**:
- Nếu đã đăng nhập → redirect đến `/` (home)
- Nếu chưa đăng nhập → hiển thị nội dung (login form)

## File đã sửa

**`src/router/index.js`**:
- Import Navigate từ react-router-dom
- Thêm ProtectedRoute component
- Thêm PublicOnlyRoute component
- Export cả hai components

## Cách sử dụng

Trong AppRoutes.jsx, các components này được dùng như sau:

```javascript
// Protected route - yêu cầu auth + approval
<Route
    path={ROUTES.VOCABULARY}
    element={
        <ProtectedRoute isAuthenticated={isAuthenticated} isApproved={isApproved}>
            <ListView ... />
        </ProtectedRoute>
    }
/>

// Public only route - chỉ cho người chưa đăng nhập
<Route
    path={ROUTES.LOGIN}
    element={
        <PublicOnlyRoute isAuthenticated={isAuthenticated}>
            <LoginScreen />
        </PublicOnlyRoute>
    }
/>
```

## Kết quả

✅ Lỗi import đã được fix
✅ App có thể compile và chạy
✅ Routing hoạt động với authentication protection
✅ Users được redirect đúng dựa trên trạng thái đăng nhập
