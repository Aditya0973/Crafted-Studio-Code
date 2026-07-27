import { useEffect } from 'react';
import { useWindowStore } from '../stores/windowStore';

export function useWindowControls() {
  const { isMaximized, setIsMaximized, fetchWindowState, minimize, toggleMaximize, close } = useWindowStore();

  useEffect(() => {
    fetchWindowState();

    if (typeof window !== 'undefined' && window.craftedAPI) {
      const unsubscribe = window.craftedAPI.onWindowMaximizedChange((maximized) => {
        setIsMaximized(maximized);
      });
      return () => unsubscribe();
    }
  }, [fetchWindowState, setIsMaximized]);

  return {
    isMaximized,
    minimize,
    toggleMaximize,
    close,
  };
}
