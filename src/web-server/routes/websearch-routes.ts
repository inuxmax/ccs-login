/**
 * WebSearch Routes - WebSearch configuration and status
 */

import { Router, Request, Response } from 'express';
import {
  loadUnifiedConfig,
  saveUnifiedConfig,
  getWebSearchConfig,
} from '../../config/unified-config-loader';
import type { WebSearchConfig } from '../../config/unified-config-types';
import {
  getWebSearchReadiness,
  getGeminiCliStatus,
  getGrokCliStatus,
  getOpenCodeCliStatus,
} from '../../utils/websearch-manager';

const router = Router();

/**
 * GET /api/websearch - Get WebSearch configuration
 * Returns: WebSearchConfig with enabled, provider, fallback
 */
router.get('/', (_req: Request, res: Response): void => {
  try {
    const config = getWebSearchConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * PUT /api/websearch - Update WebSearch configuration
 * Body: WebSearchConfig fields (enabled, providers)
 * Dashboard is the source of truth for provider selection.
 */
router.put('/', (req: Request, res: Response): void => {
  const { enabled, providers } = req.body as Partial<WebSearchConfig>;

  // Validate enabled
  if (enabled !== undefined && typeof enabled !== 'boolean') {
    res.status(400).json({ error: 'Invalid value for enabled. Must be a boolean.' });
    return;
  }

  // Validate providers if specified
  if (providers !== undefined && typeof providers !== 'object') {
    res.status(400).json({ error: 'Invalid value for providers. Must be an object.' });
    return;
  }

  try {
    // Load existing config and update websearch section
    const existingConfig = loadUnifiedConfig();
    if (!existingConfig) {
      res.status(500).json({ error: 'Failed to load config' });
      return;
    }

    // Merge updates - supports Gemini CLI and Grok CLI
    existingConfig.websearch = {
      enabled: enabled ?? existingConfig.websearch?.enabled ?? true,
      providers: providers
        ? {
            gemini: {
              enabled:
                providers.gemini?.enabled ??
                existingConfig.websearch?.providers?.gemini?.enabled ??
                true,
              model:
                providers.gemini?.model ??
                existingConfig.websearch?.providers?.gemini?.model ??
                'gemini-2.5-flash',
              timeout:
                providers.gemini?.timeout ??
                existingConfig.websearch?.providers?.gemini?.timeout ??
                55,
            },
            grok: {
              enabled:
                providers.grok?.enabled ??
                existingConfig.websearch?.providers?.grok?.enabled ??
                false,
              timeout:
                providers.grok?.timeout ?? existingConfig.websearch?.providers?.grok?.timeout ?? 55,
            },
            opencode: {
              enabled:
                providers.opencode?.enabled ??
                existingConfig.websearch?.providers?.opencode?.enabled ??
                false,
              model:
                providers.opencode?.model ??
                existingConfig.websearch?.providers?.opencode?.model ??
                'opencode/grok-code',
              timeout:
                providers.opencode?.timeout ??
                existingConfig.websearch?.providers?.opencode?.timeout ??
                60,
            },
          }
        : existingConfig.websearch?.providers,
    };

    saveUnifiedConfig(existingConfig);

    res.json({
      success: true,
      websearch: existingConfig.websearch,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/websearch/status - Get WebSearch status
 * Returns: { geminiCli, grokCli, opencodeCli, readiness }
 */
router.get('/status', (_req: Request, res: Response): void => {
  try {
    const geminiCli = getGeminiCliStatus();
    const grokCli = getGrokCliStatus();
    const opencodeCli = getOpenCodeCliStatus();
    const readiness = getWebSearchReadiness();

    res.json({
      geminiCli: {
        installed: geminiCli.installed,
        path: geminiCli.path,
        version: geminiCli.version,
      },
      grokCli: {
        installed: grokCli.installed,
        path: grokCli.path,
        version: grokCli.version,
      },
      opencodeCli: {
        installed: opencodeCli.installed,
        path: opencodeCli.path,
        version: opencodeCli.version,
      },
      readiness: {
        status: readiness.readiness,
        message: readiness.message,
      },
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
