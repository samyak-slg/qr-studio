import { useCallback, useEffect, useState } from 'react';
import { addRecent, loadRecent, saveRecent } from '../lib/recentStorage.js';

export function useRecent() {
  const [items, setItems] = useState(loadRecent);

  useEffect(() => {
    saveRecent(items);
  }, [items]);

  const add = useCallback((entry) => setItems((list) => addRecent(list, entry)), []);
  const remove = useCallback((id) => setItems((list) => list.filter((item) => item.id !== id)), []);
  const clear = useCallback(() => setItems([]), []);

  return { items, add, remove, clear };
}
