import { describe, expect, it } from 'vitest';
import { assertWalletNetwork, transactionIdentifier } from './midnight';

describe('Midnight session guards', () => {
  it('rejects wallet/network mismatches before transaction work', () => {
    expect(() => assertWalletNetwork('preprod', 'preview')).toThrow(/mismatch/);
    expect(() => assertWalletNetwork('preview', 'preview')).not.toThrow();
  });

  it('does not invent an identifier for a transaction without one', () => {
    expect(() => transactionIdentifier({ identifiers: () => [] } as never)).toThrow(/no identifier/);
    expect(transactionIdentifier({ identifiers: () => ['tx-1'] } as never)).toBe('tx-1');
  });
});
