import React, { useEffect, useState } from 'react';
import { ShellLayout } from '../components/layout/ShellLayout';
import { CreateProjectModal } from '../components/projects/CreateProjectModal';
import { ImportProjectModal } from '../components/projects/ImportProjectModal';
import { SettingsModal } from '../components/settings/SettingsModal';
import { AppBootstrap } from '../components/bootstrap/AppBootstrap';
import { useAppBootstrapStore } from '../stores/appBootstrapStore';
import { useChatStore } from '../stores/chatStore';
import { useWorkbenchStore } from '../stores/workbenchStore';

export const App: React.FC = () => {
  const { isBootstrapComplete, runBootstrap } = useAppBootstrapStore();
  const [showBootstrap, setShowBootstrap] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isSafeMode, setIsSafeMode] = useState(false);

  useEffect(() => {
    // Startup Crash Protection & Safe Mode
    try {
      const rawCount = localStorage.getItem('crafted_startup_crash_count');
      const crashCount = parseInt(rawCount || '0', 10);

      localStorage.setItem('crafted_startup_crash_count', (crashCount + 1).toString());

      if (crashCount >= 2) {
        console.warn('[SAFE MODE ACTIVATED] 2+ Consecutive Startup Crashes Detected.');
        setIsSafeMode(true);
        useWorkbenchStore.getState().closeAllTabs();
      }

      const stabilityTimer = setTimeout(() => {
        localStorage.setItem('crafted_startup_crash_count', '0');
      }, 3000);

      return () => clearTimeout(stabilityTimer);
    } catch (err) {
      console.error('[App] Error evaluating startup crash counter:', err);
    }
  }, []);

  useEffect(() => {
    runBootstrap();
    const unsubStream = useChatStore.getState().subscribeStreamEvents();

    // Absolute Safety Fail-Safe: Force unmount bootstrap overlay after 1s max
    const failSafeTimer = setTimeout(() => {
      setIsFadingOut(true);
      setTimeout(() => setShowBootstrap(false), 200);
    }, 1000);

    return () => {
      unsubStream();
      clearTimeout(failSafeTimer);
    };
  }, [runBootstrap]);

  useEffect(() => {
    if (isBootstrapComplete) {
      setIsFadingOut(true);
      const timer = setTimeout(() => {
        setShowBootstrap(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isBootstrapComplete]);

  const handleDismissSafeMode = () => {
    localStorage.setItem('crafted_startup_crash_count', '0');
    setIsSafeMode(false);
  };

  return (
    <>
      {showBootstrap && (
        <AppBootstrap
          isFadingOut={isFadingOut}
          onDismiss={() => {
            setIsFadingOut(true);
            setTimeout(() => setShowBootstrap(false), 200);
          }}
        />
      )}
      <ShellLayout isSafeMode={isSafeMode} onDismissSafeMode={handleDismissSafeMode} />
      <CreateProjectModal />
      <ImportProjectModal />
      <SettingsModal />
    </>
  );
};

export default App;
