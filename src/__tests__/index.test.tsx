const mockNative = {
  getConstants: () => ({
    GOOGLE_PLAY_SERVICES_SUPPORTED: true,
    PASSWORD_SUPPORTED: true,
    GOOGLE_ID_SUPPORTED: true,
    APPLE_ID_SUPPORTED: true,
    HYBRID_SUPPORTED: true,
    PASSKEYS_SUPPORTED: true,
    OAUTH_REDIRECT_URI: 'com.example.app://oauth/callback',
  }),
  googleSignIn: jest.fn(async () => ({ type: 'CANCELLED', data: null })),
  generatePkce: jest.fn(async () => ({
    codeVerifier: 'verifier',
    codeChallenge: 'challenge',
    state: 'state',
  })),
  openAuthSession: jest.fn(async () => ({
    type: 'REDIRECT',
    data: { url: 'com.example.app://oauth/callback?code=abc&state=state' },
  })),
};

jest.mock('../NativeOauthEssentials', () => ({
  __esModule: true,
  default: mockNative,
}));

import { CredentialError } from '../types';

// Required after mockNative is initialized (imports are hoisted above it).
const library: typeof import('../index') = require('../index');

describe('Jest mock', () => {
  it('exports the same names as the library', () => {
    const mock = require('../../jest');
    const names = (value: object) =>
      Object.keys(value)
        .filter((key) => key !== '__esModule')
        .sort();
    expect(names(mock)).toEqual(names(library));
  });

  it('resolves plausible results', async () => {
    const mock = require('../../jest');
    await expect(mock.googleSignIn('id')).resolves.toMatchObject({
      type: 'GOOGLE_ID',
    });
    expect(mock.isCredentialError({ code: 'NETWORK_ERROR' })).toBe(true);
  });
});

describe('googleSignIn', () => {
  it('passes the platform client id to the native module', async () => {
    await library.googleSignIn({
      iosClientId: 'ios-id',
      webClientId: 'web-id',
    });
    // The Jest preset runs as iOS.
    expect(mockNative.googleSignIn).toHaveBeenCalledWith(
      'ios-id',
      expect.objectContaining({ serverClientId: 'web-id' })
    );
  });
});

describe('oauthSignIn', () => {
  const fetchMock = jest.fn();
  beforeAll(() => {
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('rejects NETWORK_ERROR when the token request fails', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));
    const promise = library.oauthSignIn({
      authorizationEndpoint: 'https://auth.example.com/authorize',
      tokenEndpoint: 'https://auth.example.com/token',
      clientId: 'client',
    });
    await expect(promise).rejects.toMatchObject({
      code: CredentialError.NETWORK_ERROR,
    });
  });

  it('rejects INVALID_RESULT_ERROR for a non JSON token response', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('Unexpected token <');
      },
    });
    const promise = library.oauthSignIn({
      authorizationEndpoint: 'https://auth.example.com/authorize',
      tokenEndpoint: 'https://auth.example.com/token',
      clientId: 'client',
    });
    await expect(promise).rejects.toMatchObject({
      code: CredentialError.INVALID_RESULT_ERROR,
    });
  });

  it('rejects CONFIGURATION_ERROR for an invalid redirectUri', async () => {
    await expect(
      library.oauthSignIn({
        authorizationEndpoint: 'https://auth.example.com/authorize',
        clientId: 'client',
        redirectUri: 'no-scheme',
      })
    ).rejects.toMatchObject({ code: CredentialError.CONFIGURATION_ERROR });
  });
});
