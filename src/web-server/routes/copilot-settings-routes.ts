/**
 * Copilot Settings Routes - Settings editor and raw settings for GitHub Copilot
 */

import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { getCcsDir } from '../../utils/config-manager';
import { DEFAULT_COPILOT_CONFIG } from '../../config/unified-config-types';
import { loadOrCreateUnifiedConfig, saveUnifiedConfig } from '../../config/unified-config-loader';

const router = Router();

/**
 * GET /api/copilot/settings/raw - Get raw copilot.settings.json
 * Returns the raw JSON content for editing in the code editor
 */
router.get('/raw', (_req: Request, res: Response): void => {
  try {
    const settingsPath = path.join(getCcsDir(), 'copilot.settings.json');
    const config = loadOrCreateUnifiedConfig();
    const copilotConfig = config.copilot ?? DEFAULT_COPILOT_CONFIG;

    // Default model for all tiers
    const defaultModel = copilotConfig.model;

    // If file doesn't exist, return default structure with all model mappings
    if (!fs.existsSync(settingsPath)) {
      // Create settings structure matching CLIProxy pattern
      // Use 127.0.0.1 instead of localhost for more reliable local connections
      const defaultSettings = {
        env: {
          ANTHROPIC_BASE_URL: `http://127.0.0.1:${copilotConfig.port}`,
          ANTHROPIC_AUTH_TOKEN: 'copilot-managed',
          ANTHROPIC_MODEL: defaultModel,
          ANTHROPIC_DEFAULT_OPUS_MODEL: copilotConfig.opus_model || defaultModel,
          ANTHROPIC_DEFAULT_SONNET_MODEL: copilotConfig.sonnet_model || defaultModel,
          ANTHROPIC_DEFAULT_HAIKU_MODEL: copilotConfig.haiku_model || defaultModel,
        },
      };

      res.json({
        settings: defaultSettings,
        mtime: Date.now(),
        path: `~/.ccs/copilot.settings.json`,
        exists: false,
      });
      return;
    }

    const content = fs.readFileSync(settingsPath, 'utf-8');
    const settings = JSON.parse(content);
    const stat = fs.statSync(settingsPath);

    res.json({
      settings,
      mtime: stat.mtimeMs,
      path: `~/.ccs/copilot.settings.json`,
      exists: true,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * PUT /api/copilot/settings/raw - Save raw copilot.settings.json
 * Saves the raw JSON content from the code editor
 */
router.put('/raw', (req: Request, res: Response): void => {
  try {
    const { settings, expectedMtime } = req.body;
    const settingsPath = path.join(getCcsDir(), 'copilot.settings.json');

    // Check for conflict if file exists and expectedMtime provided
    if (fs.existsSync(settingsPath) && expectedMtime) {
      const stat = fs.statSync(settingsPath);
      if (Math.abs(stat.mtimeMs - expectedMtime) > 1000) {
        res.status(409).json({ error: 'File modified externally', mtime: stat.mtimeMs });
        return;
      }
    }

    // Write settings file atomically
    const tempPath = settingsPath + '.tmp';
    fs.writeFileSync(tempPath, JSON.stringify(settings, null, 2) + '\n');
    fs.renameSync(tempPath, settingsPath);

    // Also sync model mappings back to unified config
    const config = loadOrCreateUnifiedConfig();
    const env = settings.env || {};

    config.copilot = {
      ...(config.copilot ?? DEFAULT_COPILOT_CONFIG),
      model: env.ANTHROPIC_MODEL || config.copilot?.model || DEFAULT_COPILOT_CONFIG.model,
      opus_model: env.ANTHROPIC_DEFAULT_OPUS_MODEL || undefined,
      sonnet_model: env.ANTHROPIC_DEFAULT_SONNET_MODEL || undefined,
      haiku_model: env.ANTHROPIC_DEFAULT_HAIKU_MODEL || undefined,
    };
    saveUnifiedConfig(config);

    const stat = fs.statSync(settingsPath);
    res.json({ success: true, mtime: stat.mtimeMs });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
