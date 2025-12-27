import { useQuery } from '@tanstack/react-query';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';

/**
 * Custom hook để sử dụng Firestore real-time listeners với React Query
 * Kết hợp real-time updates với caching của React Query
 */
export function useFirestoreQuery(queryKey, collectionPath, db, options = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const {
    enabled = true,
    transform = null, // Function để transform data nếu cần
    ...queryOptions
  } = options;

  useEffect(() => {
    let isMounted = true;
    
    if (!enabled || !collectionPath || !db) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const q = query(collection(db, collectionPath));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        try {
          const result = [];
          snapshot.forEach((doc) => {
            result.push({
              id: doc.id,
              ...doc.data(),
            });
          });

          // Apply transform function if provided
          const transformedData = transform ? transform(result) : result;
          if (isMounted) {
            setData(transformedData);
            setError(null);
            setIsLoading(false);
          }
        } catch (err) {
          if (isMounted) {
            setError(err);
            setIsLoading(false);
          }
          console.error('Error processing snapshot:', err);
        }
      },
      (err) => {
        if (isMounted) {
          setError(err);
          setIsLoading(false);
        }
        console.error('Error in onSnapshot:', err);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [collectionPath, db, enabled, transform]);

  // Use React Query để cache và manage state
  const queryResult = useQuery({
    queryKey,
    queryFn: async () => data,
    enabled: enabled && data !== null,
    staleTime: Infinity, // Real-time updates, nên không coi là stale
    ...queryOptions,
  });

  return {
    ...queryResult,
    data: data ?? queryResult.data,
    isLoading,
    error: error ?? queryResult.error,
  };
}

