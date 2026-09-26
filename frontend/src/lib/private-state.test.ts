import { describe, expect, it } from 'vitest';
import { createPrivateStateProvider } from './private-state';

describe('memory-only private state', () => {
  it('scopes state and clears secrets on dispose', async () => {
    const provider = createPrivateStateProvider<'screening', { secret: Uint8Array }>();
    provider.setContractAddress('aa'.repeat(32));
    const secret = new Uint8Array(32).fill(7);
    await provider.set('screening', { secret });
    expect((await provider.get('screening'))?.secret).toBe(secret);
    provider.dispose();
    expect(secret.every((value) => value === 0)).toBe(true);
    await expect(provider.get('screening')).rejects.toThrow(/cleared/);
  });

  it('does not permit private-state export', async () => {
    const provider = createPrivateStateProvider();
    await expect(provider.exportPrivateStates()).rejects.toThrow(/memory-only/);
    await expect(provider.importPrivateStates({} as never)).rejects.toThrow(/memory-only/);
  });
});
