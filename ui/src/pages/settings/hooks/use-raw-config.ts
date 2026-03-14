/**
 * Raw Config Hook
 */

import { useCallback, useState } from 'react';
import { useSettingsContext, useSettingsActions } from './context-hooks';

export function useRawConfig() {
  const { state } = useSettingsContext();
  const actions = useSettingsActions();
  const [copied, setCopied] = useState(false);

  const fetchRawConfig = useCallback(async () => {
    try {
      actions.setRawConfigLoading(true);
      const res = await fetch('/api/config/raw');
      if (!res.ok) {
        actions.setRawConfig(null);
        return;
      }
      const text = await res.text();
      actions.setRawConfig(text);
    } catch {
      actions.setRawConfig(null);
    } finally {
      actions.setRawConfigLoading(false);
    }
  }, [actions]);

  const copyToClipboard = useCallback(async () => {
    if (!state.rawConfig) return;
    try {
      await navigator.clipboard.writeText(state.rawConfig);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silent fail
    }
  }, [state.rawConfig]);

  return {
    rawConfig: state.rawConfig,
    loading: state.rawConfigLoading,
    copied,
    fetchRawConfig,
    copyToClipboard,
  };
}
