import { create } from 'zustand';
import { WindowState } from '../shared/types';

interface WindowStoreState {
  isMaximized: boolean;
  width: number;
  height: number;
  setIsMaximized: (isMaximized: boolean) => void;
  fetchWindowState: () => Promise<void>;
  minimize: () => Promise<void>;
  toggleMaximize: () => Promise<void>;
  close: () => Promise<void>;
}

export const useWindowStore = create<WindowStoreState>((set) => ({
  isMaximized: false,
  width: 1280,
  height: 800,

  setIsMaximized: (isMaximized: boolean) => set({ isMaximized }),

  fetchWindowState: async () => {
    if (typeof window !== 'undefined' && window.craftedAPI) {
      try {
        const state: WindowState = await window.craftedAPI.getWindowState();
        set({
          isMaximized: state.isMaximized,
          width: state.width,
          height: state.height,
        });
      } catch (err) {
        console.error('[windowStore] Error fetching window state:', err);
      }
    }
  },

  minimize: async () => {
    if (typeof window !== 'undefined' && window.craftedAPI) {
      await window.craftedAPI.minimizeWindow();
    }
  },

  toggleMaximize: async () => {
    if (typeof window !== 'undefined' && window.craftedAPI) {
      await window.craftedAPI.maximizeWindow();
    }
  },

  close: async () => {
    if (typeof window !== 'undefined' && window.craftedAPI) {
      await window.craftedAPI.closeWindow();
    }
  },
}));
