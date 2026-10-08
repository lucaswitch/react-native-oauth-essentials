/* global jest */
/**
 * Jest mock of react-native-oauth-essentials. Every method is a `jest.fn()` resolving a plausible
 * result; override it per test with `mockResolvedValueOnce` / `mockRejectedValueOnce`.
 *
 *   jest.mock('react-native-oauth-essentials', () =>
 *     require('react-native-oauth-essentials/jest')
 *   );
 *
 * Plain CommonJS on purpose: the React Native Jest preset does not transform this package.
 */

const CredentialsType = {
  GOOGLE_ID: 'GOOGLE_ID',
  PASSWORD: 'PASSWORD',
  APPLE_ID: 'APPLE_ID',
  WEB_APPLE_ID: 'WEB_APPLE_ID',
  CANCELLED: 'CANCELLED',
  PASSKEY: 'PASSKEY',
  OAUTH: 'OAUTH',
};

const AppleIdCredentialState = {
  AUTHORIZED: 'AUTHORIZED',
  REVOKED: 'REVOKED',
  NOT_FOUND: 'NOT_FOUND',
  TRANSFERRED: 'TRANSFERRED',
};

const CredentialError = {
  NO_PLAY_SERVICES_ERROR: 'NO_PLAY_SERVICES_ERROR',
  NO_ACTIVITY_ERROR: 'NO_ACTIVITY_ERROR',
  INVALID_RESULT_ERROR: 'INVALID_RESULT_ERROR',
  NO_SIGN_IN_AVAILABLE: 'NO_SIGN_IN_AVAILABLE',
  SIMULTANEOUS_CALL_ERROR: 'SIMULTANEOUS_CALL_ERROR',
  NOT_SUPPORTED_ERROR: 'NOT_SUPPORTED_ERROR',
  BROWSER_UNAVAILABLE: 'BROWSER_UNAVAILABLE',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
};

const CODES = new Set(Object.values(CredentialError));

function isCredentialError(error, code) {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const value = error.code;
  if (typeof value !== 'string' || !CODES.has(value)) {
    return false;
  }
  return code === undefined || value === code;
}

const OAUTH_REDIRECT_URI = 'com.example.app://oauth/callback';

const googleResult = () => ({
  type: CredentialsType.GOOGLE_ID,
  data: {
    id: 'mock-google-id',
    idToken: 'mock-google-id-token',
    displayName: 'Mock User',
    givenName: 'Mock',
    familyName: 'User',
    email: 'mock.user@example.com',
    profilePictureUri: null,
    phoneNumber: null,
    accessToken: null,
    serverAuthCode: null,
    grantedScopes: null,
  },
});

const appleResult = () => ({
  type: CredentialsType.APPLE_ID,
  data: {
    idToken: 'mock-apple-id-token',
    authorizationCode: 'mock-apple-authorization-code',
    user: 'mock-apple-user',
    email: 'mock.user@example.com',
    fullName: 'Mock User',
    likelyReal: true,
    state: null,
  },
});

const passwordResult = () => ({
  type: CredentialsType.PASSWORD,
  data: { username: 'mock.user@example.com', password: 'mock-password' },
});

const passkeyResult = () => ({
  type: CredentialsType.PASSKEY,
  data: JSON.stringify({ id: 'mock-passkey', type: 'public-key' }),
});

const subscription = () => ({ remove: jest.fn() });

module.exports = {
  __esModule: true,

  // Methods
  googleSignIn: jest.fn(async () => googleResult()),
  googleSilentSignIn: jest.fn(async () => googleResult()),
  signOut: jest.fn(async () => true),
  getPassword: jest.fn(async () => passwordResult()),
  passwordSignIn: jest.fn(async () => true),
  appleSignIn: jest.fn(async () => appleResult()),
  getAppleIdCredentialState: jest.fn(
    async () => AppleIdCredentialState.AUTHORIZED
  ),
  hybridSignIn: jest.fn(async () => googleResult()),
  createPassKey: jest.fn(async () => passkeyResult()),
  getPassKey: jest.fn(async () => passkeyResult()),
  cancelPassKeyAutoFill: jest.fn(async () => false),
  oauthSignIn: jest.fn(async (options) => ({
    type: CredentialsType.OAUTH,
    data: {
      code: 'mock-authorization-code',
      state: 'mock-state',
      redirectUri: (options && options.redirectUri) || OAUTH_REDIRECT_URI,
      codeVerifier: 'mock-code-verifier',
      params: { code: 'mock-authorization-code', state: 'mock-state' },
      tokens: null,
    },
  })),

  // Events
  addCredentialSuccessListener: jest.fn(subscription),
  addCredentialFailureListener: jest.fn(subscription),
  addAppleIdCredentialRevokedListener: jest.fn(subscription),

  // Errors
  isCredentialError,

  // Enums
  CredentialsType,
  AppleIdCredentialState,
  CredentialError,

  // Constants
  GOOGLE_PLAY_SERVICES_SUPPORTED: true,
  PASSWORD_SUPPORTED: true,
  GOOGLE_ID_SUPPORTED: true,
  APPLE_ID_SUPPORTED: true,
  HYBRID_SUPPORTED: true,
  PASSKEYS_SUPPORTED: true,
  OAUTH_REDIRECT_URI,
};
