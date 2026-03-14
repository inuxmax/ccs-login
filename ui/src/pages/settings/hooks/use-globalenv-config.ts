/**
 * GlobalEnv Config Hook
 */

import { useCallback, useState } from 'react';
import { useSettingsContext, useSettingsActions } from './context-hooks';
import type { GlobalEnvConfig } from '../types';

export function useGlobalEnvConfig() {
  const { state } = useSettingsContext();
  const actions = useSettingsActions();
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvValue, setNewEnvValue] = useState('');

  const fetchConfig = useCallback(async () => {
    try {
      actions.setGlobalEnvLoading(true);
      actions.setGlobalEnvError(null);
      const res = await fetch('/api/global-env');
      if (!res.ok) throw new Error('Failed to load Global Env config');
      const data = await res.json();
      actions.setGlobalEnvConfig(data);
    } catch (err) {
      actions.setGlobalEnvError((err as Error).message);
    } finally {
      actions.setGlobalEnvLoading(false);
    }
  }, [actions]);

  const saveConfig = useCallback(
    async (updates: Partial<GlobalEnvConfig>) => {
      const config = state.globalEnvConfig;
      if (!config) return;

      const optimisticConfig = { ...config, ...updates };
      actions.setGlobalEnvConfig(optimisticConfig);

      try {
        actions.setGlobalEnvSaving(true);
        actions.setGlobalEnvError(null);

        const res = await fetch('/api/global-env', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(optimisticConfig),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to save');
        }

        const data = await res.json();
        actions.setGlobalEnvConfig(data.config);
        actions.setGlobalEnvSuccess(true);
        setTimeout(() => actions.setGlobalEnvSuccess(false), 1500);
      } catch (err) {
        actions.setGlobalEnvConfig(config);
        actions.setGlobalEnvError((err as Error).message);
      } finally {
        actions.setGlobalEnvSaving(false);
      }
    },
    [state.globalEnvConfig, actions]
  );

  const addEnvVar = useCallback(() => {
    if (!newEnvKey.trim() || !state.globalEnvConfig) return;
    const newEnv = { ...state.globalEnvConfig.env, [newEnvKey.trim()]: newEnvValue };
    saveConfig({ env: newEnv });
    setNewEnvKey('');
    setNewEnvValue('');
  }, [newEnvKey, newEnvValue, state.globalEnvConfig, saveConfig]);

  const removeEnvVar = useCallback(
    (key: string) => {
      if (!state.globalEnvConfig) return;
      const newEnv = { ...state.globalEnvConfig.env };
      delete newEnv[key];
      saveConfig({ env: newEnv });
    },
    [state.globalEnvConfig, saveConfig]
  );

  return {
    config: state.globalEnvConfig,
    loading: state.globalEnvLoading,
    saving: state.globalEnvSaving,
    error: state.globalEnvError,
    success: state.globalEnvSuccess,
    newEnvKey,
    setNewEnvKey,
    newEnvValue,
    setNewEnvValue,
    fetchConfig,
    saveConfig,
    addEnvVar,
    removeEnvVar,
  };
}
