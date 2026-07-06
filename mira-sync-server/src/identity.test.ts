import { describe, it, expect } from 'vitest';
import { accountLookup } from './identity.js';

describe('accountLookup', () => {
  it('matches regardless of usuario casing', () => {
    const a = accountLookup('http://demo.tv:8080', 'Kevin');
    const b = accountLookup('http://demo.tv:8080', 'kevin');
    expect(a).toBe(b);
  });

  it('matches regardless of servidor casing and trailing slash', () => {
    const a = accountLookup('HTTP://DEMO.TV:8080/', 'kevin');
    const b = accountLookup('http://demo.tv:8080', 'kevin');
    expect(a).toBe(b);
  });

  it('differs for different usuario', () => {
    const a = accountLookup('http://demo.tv:8080', 'kevin');
    const b = accountLookup('http://demo.tv:8080', 'otro');
    expect(a).not.toBe(b);
  });
});
