import { describe, expect, it } from 'vitest';
import { MODEL_CATALOGS } from '@/lib/model-catalogs';

describe('iflow model catalog compatibility', () => {
  it('does not advertise stale iflow model aliases that fail provider routing', () => {
    const iflowCatalog = MODEL_CATALOGS.iflow;
    expect(iflowCatalog).toBeDefined();

    const ids = iflowCatalog.models.map((model) => model.id);
    expect(ids).not.toContain('kimi-k2.5');
    expect(ids).not.toContain('deepseek-v3.2-chat');
    expect(ids).not.toContain('glm-4.7');
    expect(ids).not.toContain('minimax-m2.5');
  });

  it('keeps supported iflow model IDs for Kimi and DeepSeek entries', () => {
    const iflowCatalog = MODEL_CATALOGS.iflow;
    const ids = iflowCatalog.models.map((model) => model.id);

    expect(ids).toContain('kimi-k2');
    expect(ids).toContain('deepseek-v3.2');
    expect(ids).toContain('glm-4.6');
  });
});
