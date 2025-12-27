# React Query Migration Example

## Ví dụ Migrate Firebase Query sang React Query

### Hiện tại (cũ):

```jsx
// App.jsx
const [allCards, setAllCards] = useState([]);

useEffect(() => {
  if (!authReady || !vocabCollectionPath) return;
  
  const q = query(collection(db, vocabCollectionPath));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const cards = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    snapshot.forEach((doc) => {
      const data = doc.data();
      cards.push({
        id: doc.id,
        front: data.front || '',
        back: data.back || '',
        // ... other fields
        createdAt: data.createdAt ? data.createdAt.toDate() : today,
        // ... SRS fields
      });
    });
    cards.sort((a, b) => b.createdAt - a.createdAt);
    setAllCards(cards);
  }, (error) => {
    console.error("Lỗi khi lắng nghe Firestore:", error);
    setNotification("Lỗi kết nối dữ liệu.");
  });
  
  return () => unsubscribe();
}, [authReady, vocabCollectionPath]);
```

### Sau khi migrate (mới):

```jsx
// Import hook
import { useFirestoreQuery } from './hooks/useFirestoreQuery';

// Trong component
const { data: allCards = [], isLoading, error } = useFirestoreQuery(
  ['vocab-cards', userId], // queryKey
  vocabCollectionPath,      // collectionPath
  db,                       // Firestore instance
  {
    enabled: authReady && !!vocabCollectionPath,
    transform: (docs) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const cards = docs.map((doc) => ({
        id: doc.id,
        front: doc.front || '',
        back: doc.back || '',
        // ... other fields
        createdAt: doc.createdAt?.toDate?.() || today,
        intervalIndex_back: typeof doc.intervalIndex_back === 'number' ? doc.intervalIndex_back : -1,
        correctStreak_back: typeof doc.correctStreak_back === 'number' ? doc.correctStreak_back : 0,
        nextReview_back: doc.nextReview_back?.toDate?.() || today,
        // ... other SRS fields
      }));
      
      // Sort by createdAt desc
      cards.sort((a, b) => b.createdAt - a.createdAt);
      return cards;
    },
  }
);

// Handle loading/error states
if (isLoading) {
  return <LoadingSpinner />;
}

if (error) {
  console.error("Lỗi khi lắng nghe Firestore:", error);
  setNotification("Lỗi kết nối dữ liệu.");
}
```

## Lợi ích

1. **Caching**: React Query tự động cache data
2. **Less re-renders**: Chỉ re-render khi data thực sự thay đổi
3. **Loading/Error states**: Built-in handling
4. **Background sync**: Có thể setup background refetching
5. **Devtools**: React Query DevTools để debug

## Lưu ý khi Migration

1. **Migrate từng phần**: Không cần migrate tất cả cùng lúc
2. **Test kỹ**: Test từng query sau khi migrate
3. **Giữ state cũ**: Có thể giữ cả hai cách (cũ và mới) để so sánh
4. **Update dependencies**: Đảm bảo update tất cả components sử dụng data

## Step-by-step Migration

1. **Step 1**: Import `useFirestoreQuery` hook
2. **Step 2**: Thay thế `useEffect` với `onSnapshot` bằng hook
3. **Step 3**: Remove `useState` cho data đó
4. **Step 4**: Update components sử dụng data
5. **Step 5**: Test và verify
6. **Step 6**: Remove code cũ nếu mọi thứ hoạt động tốt

## Ví dụ cho Daily Activity Logs

```jsx
// Cũ
const [dailyActivityLogs, setDailyActivityLogs] = useState([]);

useEffect(() => {
  if (!authReady || !activityCollectionPath) return;
  
  const q = query(collection(db, activityCollectionPath));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    logs.sort((a, b) => a.id.localeCompare(b.id));
    setDailyActivityLogs(logs);
  }, (error) => {
    console.error("Lỗi khi tải hoạt động hàng ngày:", error);
  });
  
  return () => unsubscribe();
}, [authReady, activityCollectionPath]);

// Mới
const { data: dailyActivityLogs = [] } = useFirestoreQuery(
  ['daily-activity-logs', userId],
  activityCollectionPath,
  db,
  {
    enabled: authReady && !!activityCollectionPath,
    transform: (docs) => {
      const logs = docs.map(doc => ({
        id: doc.id,
        ...doc,
      }));
      logs.sort((a, b) => a.id.localeCompare(b.id));
      return logs;
    },
  }
);
```

