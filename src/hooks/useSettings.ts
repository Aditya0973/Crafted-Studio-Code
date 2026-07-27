import { useEffect } from 'react';
import { useSettingsStore } from '../stores/settingsStore';

export function useSettings() {
  const { settings, isLoading, fetchSettings, updateSetting } = useSettingsStore();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    isLoading,
    updateSetting,
  };
}
