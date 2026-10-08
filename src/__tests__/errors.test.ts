import { createCredentialError, isCredentialError } from '../errors';
import { CredentialError } from '../types';

describe('isCredentialError', () => {
  it('accepts errors with a library code', () => {
    const error = createCredentialError(
      CredentialError.CONFIGURATION_ERROR,
      'missing scheme'
    );
    expect(isCredentialError(error)).toBe(true);
    expect(isCredentialError(error, CredentialError.CONFIGURATION_ERROR)).toBe(
      true
    );
    expect(isCredentialError(error, 'NETWORK_ERROR')).toBe(false);
  });

  it('accepts native rejections (plain objects with code)', () => {
    expect(
      isCredentialError({ code: 'BROWSER_UNAVAILABLE', message: '' })
    ).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isCredentialError(new Error('x'))).toBe(false);
    expect(isCredentialError({ code: 'E_UNKNOWN' })).toBe(false);
    expect(isCredentialError(null)).toBe(false);
    expect(isCredentialError('NETWORK_ERROR')).toBe(false);
  });

  it('keeps the cause', () => {
    const cause = new TypeError('Network request failed');
    const error = createCredentialError('NETWORK_ERROR', 'failed', cause);
    expect((error as Error & { cause?: unknown }).cause).toBe(cause);
  });
});
