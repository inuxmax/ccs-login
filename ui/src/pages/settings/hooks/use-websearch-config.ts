/**
 * WebSearch Config Hook
 */

import { useCallback, useEffect, useState } from 'react';
import { useSettingsContext, useSettingsActions } from './context-hooks';
import type { WebSearchConfig } from '../types';

export function useWebSearchConfig() {
  const { state } = useSettingsContext();
  const actions = useSettingsActions();
  const [geminiModelInput, setGeminiModelInput] = useState('');
  const [opencodeModelInput, setOpencodeModelInput] = useState('');
  const [geminiModelSaved, setGeminiModelSaved] = useState(false);
  const [opencodeModelSaved, setOpencodeModelSaved] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      actions.setWebSearchLoading(true);
      actions.setWebSearchError(null);
      const res = await fetch('/api/websearch');
      if (!res.ok) throw new Error('Failed to load WebSearch config');
      const data = await res.json();
      actions.setWebSearchConfig(data);
    } catch (err) {
      actions.setWebSearchError((err as Error).message);
    } finally {
      actions.setWebSearchLoading(false);
    }
  }, [actions]);

  const fetchStatus = useCallback(async () => {
    try {
      actions.setWebSearchStatusLoading(true);
      const res = await fetch('/api/websearch/status');
      if (!res.ok) throw new Error('Failed to load status');
      const data = await res.json();
      actions.setWebSearchStatus(data);
    } catch {
      // Silent fail for status
    } finally {
      actions.setWebSearchStatusLoading(false);
    }
  }, [actions]);

  const saveConfig = useCallback(
    async (updates: Partial<WebSearchConfig>) => {
      const config = state.webSearchConfig;
      if (!config) return;

      const optimisticConfig = { ...config, ...updates };
      actions.setWebSearchConfig(optimisticConfig);

      try {
        actions.setWebSearchSaving(true);
        actions.setWebSearchError(null);

        const res = await fetch('/api/websearch', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(optimisticConfig),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to save');
        }

        const data = await res.json();
        actions.setWebSearchConfig(data.websearch);
        actions.setWebSearchSuccess(true);
        setTimeout(() => actions.setWebSearchSuccess(false), 1500);
      } catch (err) {
        actions.setWebSearchConfig(config);
        actions.setWebSearchError((err as Error).message);
      } finally {
        actions.setWebSearchSaving(false);
      }
    },
    [state.webSearchConfig, actions]
  );

  // Sync model inputs with config
  useEffect(() => {
    if (state.webSearchConfig) {
      setGeminiModelInput(state.webSearchConfig.providers?.gemini?.model ?? 'gemini-2.5-flash');
      setOpencodeModelInput(
        state.webSearchConfig.providers?.opencode?.model ?? 'opencode/grok-code'
      );
    }
  }, [state.webSearchConfig]);

  const saveGeminiModel = useCallback(async () => {
    const currentModel = state.webSearchConfig?.providers?.gemini?.model ?? 'gemini-2.5-flash';
    if (geminiModelInput !== currentModel) {
      const providers = state.webSearchConfig?.providers || {};
      await saveConfig({
        providers: { ...providers, gemini: { ...providers.gemini, model: geminiModelInput } },
      });
      setGeminiModelSaved(true);
      setTimeout(() => setGeminiModelSaved(false), 2000);
    }
  }, [geminiModelInput, state.webSearchConfig, saveConfig]);

  const saveOpencodeModel = useCallback(async () => {
    const currentModel = state.webSearchConfig?.providers?.opencode?.model ?? 'opencode/grok-code';
    if (opencodeModelInput !== currentModel) {
      const providers = state.webSearchConfig?.providers || {};
      await saveConfig({
        providers: { ...providers, opencode: { ...providers.opencode, model: opencodeModelInput } },
      });
      setOpencodeModelSaved(true);
      setTimeout(() => setOpencodeModelSaved(false), 2000);
    }
  }, [opencodeModelInput, state.webSearchConfig, saveConfig]);

  return {
    config: state.webSearchConfig,
    status: state.webSearchStatus,
    loading: state.webSearchLoading,
    statusLoading: state.webSearchStatusLoading,
    saving: state.webSearchSaving,
    error: state.webSearchError,
    success: state.webSearchSuccess,
    geminiModelInput,
    setGeminiModelInput,
    opencodeModelInput,
    setOpencodeModelInput,
    geminiModelSaved,
    opencodeModelSaved,
    fetchConfig,
    fetchStatus,
    saveConfig,
    saveGeminiModel,
    saveOpencodeModel,
  };
}
