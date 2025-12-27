# Danh sách Packages npm để Tối ưu hóa Quizki App

Dựa trên phân tích codebase, đây là danh sách các package npm được khuyến nghị để tối ưu hóa ứng dụng Quizki.

## 📊 Phân tích Hiện trạng

- **App.jsx**: ~6358 dòng code (rất lớn, cần refactor)
- **Firebase**: Nhiều `onSnapshot` listeners (có thể optimize với caching)
- **State Management**: Nhiều `useState` hooks (có thể dùng state management library)
- **Charts**: Đã dùng Recharts (tốt)
- **Routing**: Đã có `react-router-dom` (chưa được sử dụng)

## 🔥 Ưu tiên Cao (Highly Recommended)

### 1. Data Fetching & Caching

#### `@tanstack/react-query` (React Query) ⭐⭐⭐⭐⭐
```bash
npm install @tanstack/react-query
```
- **Mục đích**: Quản lý server state, caching, và synchronization với Firebase
- **Lợi ích**: 
  - Giảm số lượng re-renders không cần thiết
  - Caching tự động cho dữ liệu Firestore
  - Background refetching
  - Optimistic updates
  - Stale-while-revalidate pattern
- **Use case**: Thay thế nhiều `useEffect` với `onSnapshot` bằng React Query hooks
- **Docs**: https://tanstack.com/query/latest

#### `react-firebase-hooks` ⭐⭐⭐⭐
```bash
npm install react-firebase-hooks
```
- **Mục đích**: React hooks cho Firebase (Auth, Firestore, Storage)
- **Lợi ích**: 
  - Giảm boilerplate code
  - Built-in loading và error states
  - Hỗ trợ real-time listeners
- **Docs**: https://github.com/CSFrequency/react-firebase-hooks

### 2. State Management

#### `zustand` ⭐⭐⭐⭐
```bash
npm install zustand
```
- **Mục đích**: Quản lý global state nhẹ, đơn giản
- **Lợi ích**: 
  - Nhẹ hơn Redux rất nhiều (~1KB)
  - API đơn giản, dễ học
  - Hỗ trợ middleware (persist, devtools)
  - TypeScript support tốt
- **Use case**: Quản lý global state như `userId`, `profile`, `allCards` thay vì prop drilling
- **Docs**: https://zustand-demo.pmnd.rs/

#### `jotai` ⭐⭐⭐ (Alternative)
```bash
npm install jotai
```
- **Mục đích**: Atomic state management
- **Lợi ích**: 
  - Rất nhẹ
  - Atomic updates (chỉ re-render components cần thiết)
- **Docs**: https://jotai.org/

### 3. Performance Optimization

#### `react-window` hoặc `@tanstack/react-virtual` ⭐⭐⭐⭐⭐
```bash
npm install react-window
# hoặc
npm install @tanstack/react-virtual
```
- **Mục đích**: Virtual scrolling cho danh sách flashcards lớn
- **Lợi ích**: 
  - Chỉ render các items đang hiển thị
  - Giảm đáng kể memory usage
  - Smooth scrolling ngay cả với hàng ngàn items
- **Use case**: ListView khi có nhiều flashcards (>100 items)
- **Docs**: 
  - https://react-window.vercel.app/
  - https://tanstack.com/virtual/latest

#### `react-compiler` (React 19 - experimental) ⭐⭐⭐
- **Mục đích**: Auto-memoization compiler từ React team
- **Lợi ích**: Tự động tối ưu hóa components
- **Note**: Đang trong giai đoạn thử nghiệm, cần test kỹ

### 4. Code Splitting & Routing

#### `react-router-dom` ✅ (Đã cài đặt)
- **Mục đích**: Tách các view thành routes riêng biệt
- **Status**: Đã có trong dependencies nhưng chưa được sử dụng
- **Action needed**: Refactor App.jsx để sử dụng routing thay vì `view` state

### 5. Error Handling

#### `react-error-boundary` ✅ (Đã cài đặt)
- **Status**: Đã có trong dependencies
- **Action needed**: Implement Error Boundary trong app

## 🟡 Ưu tiên Trung bình (Medium Priority)

### 6. Form Management

#### `react-hook-form` ⭐⭐⭐⭐
```bash
npm install react-hook-form
```
- **Mục đích**: Quản lý form hiệu quả
- **Lợi ích**: 
  - Ít re-renders hơn uncontrolled forms
  - Validation tốt
  - Nhẹ (~10KB)
- **Use case**: Forms trong AddCard, EditCard, Account settings
- **Docs**: https://react-hook-form.com/

### 7. Image Optimization

#### `react-lazy-load-image-component` ⭐⭐⭐
```bash
npm install react-lazy-load-image-component
```
- **Mục đích**: Lazy load ảnh (imageBase64 trong flashcards)
- **Lợi ích**: Cải thiện performance khi có nhiều ảnh
- **Docs**: https://github.com/Aljullu/react-lazy-load-image-component

#### `vite-imagetools` ⭐⭐⭐
```bash
npm install -D vite-imagetools
```
- **Mục đích**: Image optimization trong build time
- **Lợi ích**: Resize, convert format tự động

### 8. Animation & Transitions

#### `framer-motion` ⭐⭐⭐
```bash
npm install framer-motion
```
- **Mục đích**: Smooth animations
- **Lợi ích**: Better UX với animations mượt mà
- **Note**: Bundle size khá lớn (~50KB), chỉ dùng nếu cần animations phức tạp

#### `react-spring` ⭐⭐⭐ (Alternative)
```bash
npm install react-spring
```
- **Mục đích**: Physics-based animations (nhẹ hơn framer-motion)
- **Docs**: https://www.react-spring.dev/

### 9. Date/Time Utilities

#### `date-fns` hoặc `dayjs` ⭐⭐⭐
```bash
npm install date-fns
# hoặc
npm install dayjs
```
- **Mục đích**: Date manipulation (thay vì native Date)
- **Lợi ích**: 
  - Nhẹ hơn moment.js
  - Immutable
  - Tree-shakeable
- **Docs**: 
  - https://date-fns.org/
  - https://day.js.org/

### 10. Utilities

#### `lodash-es` hoặc `radash` ⭐⭐⭐
```bash
npm install lodash-es
# hoặc (modern alternative)
npm install radash
```
- **Mục đích**: Utility functions
- **Lợi ích**: Tree-shakeable, chỉ import những gì dùng
- **Docs**: 
  - https://lodash.com/
  - https://www.radashjs.com/

## 🟢 Ưu tiên Thấp (Nice to Have)

### 11. PWA & Offline Support

#### `vite-plugin-pwa` ⭐⭐⭐
```bash
npm install -D vite-plugin-pwa
```
- **Mục đích**: Service Worker, PWA support, offline caching
- **Lợi ích**: 
  - App hoạt động offline
  - Cache assets
  - Install như native app
- **Docs**: https://vite-pwa-org.netlify.app/

### 12. Performance Monitoring

#### `@sentry/react` ⭐⭐⭐
```bash
npm install @sentry/react
```
- **Mục đích**: Error tracking và performance monitoring
- **Lợi ích**: 
  - Theo dõi lỗi production
  - Performance insights
  - User session replay
- **Note**: Có free tier
- **Docs**: https://docs.sentry.io/platforms/javascript/guides/react/

#### `web-vitals` ✅ (Đã cài đặt)
- **Status**: Đã có trong dependencies
- **Action needed**: Implement trong app để track Core Web Vitals

### 13. Development Tools

#### `rollup-plugin-visualizer` ✅ (Đã cài đặt)
- **Status**: Đã có trong devDependencies
- **Action needed**: Setup trong vite.config.js

#### `depcheck` ✅ (Đã cài đặt)
- **Status**: Đã có trong devDependencies
- **Action needed**: Chạy định kỳ để check unused deps

#### `@vitejs/plugin-react-swc` ⭐⭐⭐
```bash
npm install -D @vitejs/plugin-react-swc
```
- **Mục đích**: Sử dụng SWC thay vì Babel (nhanh hơn 20x)
- **Lợi ích**: Build và dev server nhanh hơn đáng kể
- **Docs**: https://github.com/vitejs/vite-plugin-react-swc

## 📋 Packages Đã Cài Đặt

✅ **react-error-boundary** - Chưa được sử dụng
✅ **react-router-dom** - Chưa được sử dụng  
✅ **use-debounce** - Chưa được sử dụng
✅ **web-vitals** - Chưa được sử dụng
✅ **depcheck** - Dev tool, cần chạy định kỳ
✅ **rollup-plugin-visualizer** - Dev tool, cần setup

## 🚀 Kế hoạch Triển khai Khuyến nghị

### Phase 1: Quick Wins (1-2 ngày)
1. Implement `react-error-boundary` 
2. Setup `web-vitals` monitoring
3. Sử dụng `use-debounce` cho search inputs
4. Chạy `depcheck` để clean up unused deps

### Phase 2: Data Management (3-5 ngày)
1. Implement `@tanstack/react-query` cho Firebase queries
2. Migrate `onSnapshot` listeners sang React Query
3. Setup caching và background sync

### Phase 3: Code Organization (5-7 ngày)
1. Refactor App.jsx - tách thành smaller components
2. Setup `react-router-dom` với lazy loading
3. Tách các views thành separate files

### Phase 4: Performance (3-5 ngày)
1. Implement `react-window` cho ListView
2. Thêm `react-hook-form` cho forms
3. Setup `vite-plugin-pwa` cho offline support

### Phase 5: State Management (2-3 ngày)
1. Migrate global state sang `zustand` (optional)
2. Optimize re-renders

## 📊 Impact Ước tính

| Package | Bundle Size | Performance Gain | Implementation Time | Priority |
|---------|-------------|------------------|---------------------|----------|
| @tanstack/react-query | +50KB | ⭐⭐⭐⭐⭐ | 3-5 ngày | 🔥 High |
| react-router-dom | -30-50% initial | ⭐⭐⭐⭐⭐ | 2-3 ngày | 🔥 High |
| react-window | +10KB | ⭐⭐⭐⭐⭐ | 1 ngày | 🔥 High |
| zustand | +1KB | ⭐⭐⭐⭐ | 2-3 ngày | 🔥 High |
| react-hook-form | +10KB | ⭐⭐⭐⭐ | 1-2 ngày | 🟡 Medium |
| react-firebase-hooks | +5KB | ⭐⭐⭐⭐ | 1-2 ngày | 🔥 High |

## 📚 Resources

- [React Query Docs](https://tanstack.com/query/latest)
- [Zustand Docs](https://zustand-demo.pmnd.rs/)
- [React Window Docs](https://react-window.vercel.app/)
- [React Hook Form Docs](https://react-hook-form.com/)
- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)
- [React Firebase Hooks](https://github.com/CSFrequency/react-firebase-hooks)

## 🔍 Lưu ý Quan trọng

1. **App.jsx quá lớn (6358 dòng)** - Ưu tiên số 1 là refactor/tách file này
2. **Nhiều Firebase onSnapshot** - React Query sẽ giúp cache và reduce re-renders
3. **State management phức tạp** - Cân nhắc dùng Zustand hoặc React Context
4. **Chưa sử dụng packages đã cài** - Nên implement các packages đã có trước khi cài thêm

## ⚡ Quick Install Commands

```bash
# High priority packages
npm install @tanstack/react-query zustand react-window react-hook-form react-firebase-hooks

# Medium priority
npm install react-lazy-load-image-component date-fns

# Dev tools
npm install -D vite-plugin-pwa @vitejs/plugin-react-swc vite-imagetools

# Optional
npm install framer-motion @sentry/react
```

