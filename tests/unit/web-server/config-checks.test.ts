import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { checkSettingsFiles } from '../../../src/web-server/health/config-checks';

describe('web-server config-checks settings compatibility', () => {
  let tempHome: string;
  let ccsDir: string;
  let originalCcsHome: string | undefined;

  beforeEach(() => {
    tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ccs-config-checks-test-'));
    originalCcsHome = process.env.CCS_HOME;
    process.env.CCS_HOME = tempHome;
    ccsDir = path.join(tempHome, '.ccs');
    fs.mkdirSync(ccsDir, { recursive: true });
  });

  afterEach(() => {
    if (originalCcsHome !== undefined) {
      process.env.CCS_HOME = originalCcsHome;
    } else {
      delete process.env.CCS_HOME;
    }

    if (fs.existsSync(tempHome)) {
      fs.rmSync(tempHome, { recursive: true, force: true });
    }
  });

  it('reports km as configured when only legacy kimi.settings.json exists', () => {
    fs.writeFileSync(
      path.join(ccsDir, 'kimi.settings.json'),
      JSON.stringify({
        env: {
          ANTHROPIC_AUTH_TOKEN: 'sk-live-kimi-compat',
        },
      })
    );

    const checks = checkSettingsFiles(ccsDir);
    const kmCheck = checks.find((check) => check.id === 'settings-km');

    expect(kmCheck).toBeDefined();
    expect(kmCheck?.status).toBe('ok');
    expect(kmCheck?.name).toBe('kimi.settings.json');
  });
});
