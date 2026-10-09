import { useCallback, useEffect, useRef, useState } from 'react';

/** A short message that appears at the bottom of the screen and disappears on its own. */
export function useToast(duration = 2600) {
  const [toast, setToast] = useState(null);
  const timer = useRef();

  const showToast = useCallback(
    (message, kind = 'success') => {
      clearTimeout(timer.current);
      setToast({ message, kind, key: Date.now() });
      timer.current = setTimeout(() => setToast(null), duration);
    },
    [duration],
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  return { toast, showToast };
}
