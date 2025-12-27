# Hướng dẫn Sử dụng Các Packages Đã Implement

## ✅ Đã Triển khai

### 1. Error Boundary ✅
- **Location**: `src/components/ErrorBoundary.jsx`
- **Status**: Đã được wrap trong `main.jsx`
- **Usage**: Tự động catch errors, không cần thêm code

### 2. Web Vitals Monitoring ✅
- **Location**: `src/main.jsx`
- **Status**: Đã setup, log ra console trong development
- **Usage**: Tự động track, có thể thêm analytics service sau

### 3. use-debounce ✅
- **Location**: `src/App.jsx` - ListView component
- **Status**: Đã implement cho search input
- **Delay**: 300ms
- **Usage**: Search input đã được debounce tự động

### 4. React Query ✅
- **Location**: 
  - `src/providers/QueryProvider.jsx` - Provider setup
  - `src/hooks/useFirestoreQuery.js` - Custom hook
- **Status**: Đã setup, có thể sử dụng
- **Usage**: Xem ví dụ bên dưới

### 5. VirtualizedGrid Component ✅
- **Location**: `src/components/VirtualizedGrid.jsx`
- **Status**: Component đã được tạo, chưa integrate vào ListView
- **Usage**: Xem ví dụ bên dưới

## 📝 Hướng dẫn Sử dụng

### Sử dụng React Query với Firebase

Thay vì dùng `useEffect` với `onSnapshot`, bạn có thể sử dụng custom hook:

```jsx
import { useFirestoreQuery } from './hooks/useFirestoreQuery';

function MyComponent() {
  const { data: cards, isLoading, error } = useFirestoreQuery(
    ['vocab-cards', userId], // queryKey
    vocabCollectionPath,      // collectionPath
    db,                       // Firestore instance
    {
      enabled: !!userId && !!vocabCollectionPath,
      transform: (docs) => {
        // Transform data nếu cần
        return docs.map(doc => ({
          id: doc.id,
          ...doc,
          createdAt: doc.createdAt?.toDate?.() || new Date(),
        }));
      },
    }
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{/* Render cards */}</div>;
}
```

**Lưu ý**: Hiện tại App.jsx vẫn đang dùng `useEffect` với `onSnapshot`. Để migrate sang React Query, cần refactor từng phần một.

### Sử dụng VirtualizedGrid cho ListView

Trong `ListView` component, thay vì render grid như sau:

```jsx
// OLD - Render tất cả items
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
  {filteredCards.map((card) => (
    <CardComponent key={card.id} card={card} />
  ))}
</div>
```

Bạn có thể sử dụng:

```jsx
// NEW - Virtual scrolling (chỉ render items đang hiển thị)
import { VirtualizedGrid } from './components/VirtualizedGrid';

<VirtualizedGrid
  items={filteredCards}
  columnCount={4}
  rowHeight={250}
  gap={16}
  renderItem={({ item: card, index }) => (
    <CardComponent key={card.id} card={card} />
  )}
/>
```

**Lưu ý**: 
- Virtual scrolling chỉ có lợi khi có nhiều items (>100)
- Table view (list mode) chưa được virtualized, cần implement riêng

## 🔄 Migration Path

### Migrate Firebase Queries sang React Query

1. **Bước 1**: Identify các `useEffect` với `onSnapshot`
2. **Bước 2**: Thay thế bằng `useFirestoreQuery` hook
3. **Bước 3**: Remove state setters (`setAllCards`, etc.)
4. **Bước 4**: Update components sử dụng data từ React Query

Ví dụ migration:

```jsx
// BEFORE
const [allCards, setAllCards] = useState([]);

useEffect(() => {
  if (!vocabCollectionPath) return;
  const q = query(collection(db, vocabCollectionPath));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const cards = [];
    snapshot.forEach((doc) => {
      cards.push({ id: doc.id, ...doc.data() });
    });
    setAllCards(cards);
  });
  return () => unsubscribe();
}, [vocabCollectionPath]);

// AFTER
const { data: allCards = [] } = useFirestoreQuery(
  ['vocab-cards', userId],
  vocabCollectionPath,
  db,
  { enabled: !!vocabCollectionPath }
);
```

## 🚀 Next Steps

1. **Integrate VirtualizedGrid** vào ListView grid mode (khi có >100 cards)
2. **Migrate Firebase queries** sang React Query (từng phần một)
3. **Implement react-hook-form** cho forms (AddCard, EditCard)
4. **Setup Zustand** nếu cần global state management

## ⚠️ Lưu ý

- Tất cả packages đã được cài đặt
- Error Boundary và Web Vitals đã hoạt động tự động
- use-debounce đã được apply cho search
- React Query và VirtualizedGrid cần integrate vào code hiện tại
- Test kỹ sau mỗi migration

