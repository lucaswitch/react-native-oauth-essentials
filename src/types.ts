export type GoogleSignInOptions = {
  /**
   * Only show accounts that already signed in to the app. [Android only]
   */
  authorizedAccounts?: boolean;
  /**
   * Automatically sign in when a single authorized account is available. [Android only]
   */
  autoSelectEnabled?: boolean;
  /**
   * Android UI flow. `bottomSheet` (default) shows the Credential Manager sheet and, unless
   * `authorizedAccounts` is set, falls back to `button` when no credential is available
   * (no account on the device or the sheet is in cooldown after being dismissed).
   * `button` always shows the "Sign in with Google" flow, which is what a sign-in button tap
   * should use. [Android only]
   */
  mode?: 'bottomSheet' | 'button';
  /**
   * Nonce embedded as-is in the returned idToken, so your backend can prevent replay attacks.
   */
  nonce?: string;
  /**
   * Email or account id to preselect. [iOS only]
   */
  hint?: string;
  /**
   * Restricts sign in to a Google Workspace domain.
   */
  hostedDomain?: string;
  /**
   * Additional OAuth scopes. When set, `accessToken` and `grantedScopes` are returned.
   */
  scopes?: string[];
  /**
   * Requests a `serverAuthCode` your backend can exchange for refresh tokens.
   */
  offlineAccess?: boolean;
  /**
   * Web (server) client id. Required on iOS for `offlineAccess` and to make the idToken
   * audience your backend client. On Android the main client id is already the server client id.
   */
  serverClientId?: string;
};

export type AppleSignInOptions = {
  /**
   * Nonce passed as-is to Apple. Firebase and Supabase expect the SHA-256 of the raw nonce here.
   */
  nonce?: string;
  /**
   * Opaque value returned in the credential. [iOS only]
   */
  state?: string;
};

export type HybridSignInOptions = GoogleSignInOptions;

export type PasskeyOptions = {
  requestJson: string;
  preferImmediatelyAvailableCredentials?: boolean; // [Android only]
  /**
   * `autofill` shows passkeys in the QuickType bar of a text field with
   * `textContentType="username"` instead of a modal sheet. [iOS 16+ only]
   */
  mediation?: 'modal' | 'autofill';
};

export type OAuthSignInOptions = {
  authorizationEndpoint: string;
  clientId: string;
  /**
   * Defaults to `OAUTH_REDIRECT_URI` (`<bundle or application id>://oauth/callback`).
   */
  redirectUri?: string;
  scopes?: string[];
  additionalParameters?: Record<string, string>;
  /**
   * When set, the authorization code is exchanged for tokens on the device.
   * Leave it out to exchange the code on your backend (recommended for confidential clients).
   */
  tokenEndpoint?: string;
  /**
   * Defaults to true.
   */
  usePKCE?: boolean;
  /**
   * Do not share cookies with the browser. [iOS only]
   */
  prefersEphemeralSession?: boolean;
};

export type PassKeyCredentialResult = {
  type: CredentialsType.PASSKEY;
  data: string; // JSON platform public key
};

export type PasswordCredentialResult = {
  type: CredentialsType.PASSWORD;
  data: {
    username: string;
    password: string;
  };
};

export type GoogleIdCredentialResult = {
  type: CredentialsType.GOOGLE_ID;
  data: {
    id: string;
    idToken: string;
    displayName: string;
    givenName: string;
    familyName: string;
    email?: string;
    profilePictureUri?: string | null;
    phoneNumber?: string | null;
    accessToken?: string | null;
    serverAuthCode?: string | null;
    grantedScopes?: string[] | null;
  };
};

export type CancelledCredentialResult = {
  type: CredentialsType.CANCELLED;
  data: null;
};

export type AppleIdCredentialResult = {
  type: CredentialsType.APPLE_ID;
  data: {
    idToken: string;
    authorizationCode: string;
    user: string;
    email: string;
    fullName: string;
    likelyReal: boolean;
    state?: string | null;
  };
};

export type WebAppleIdCredentialResult = {
  type: CredentialsType.WEB_APPLE_ID;
  data: {
    url: string;
    scheme: string | null;
    host: string | null;
    path: string | null;
    query: string | null;
  };
};

export type OAuthCredentialResult = {
  type: CredentialsType.OAUTH;
  data: {
    code: string;
    state: string;
    redirectUri: string;
    codeVerifier: string | null;
    /** All parameters received in the redirect url. */
    params: Record<string, string>;
    /** Token endpoint response, only when `tokenEndpoint` is set. */
    tokens: Record<string, unknown> | null;
  };
};

export type CredentialSuccessEvent = {
  type: string;
  data: Object;
};

export type CredentialFailureEvent = {
  code: string;
  message: string;
};

export enum CredentialsType {
  GOOGLE_ID = 'GOOGLE_ID', // GoogleId credentials type
  PASSWORD = 'PASSWORD', // Password credentials type
  APPLE_ID = 'APPLE_ID', // IOS AppleId credentials type
  WEB_APPLE_ID = 'WEB_APPLE_ID', // Android AppleId credentials type
  CANCELLED = 'CANCELLED', // type when the user cancels it
  PASSKEY = 'PASSKEY', // Passkey credential type
  OAUTH = 'OAUTH', // Generic OAuth2/OIDC authorization code
}

export enum AppleIdCredentialState {
  AUTHORIZED = 'AUTHORIZED',
  REVOKED = 'REVOKED',
  NOT_FOUND = 'NOT_FOUND',
  TRANSFERRED = 'TRANSFERRED',
}

export enum CredentialError {
  NO_PLAY_SERVICES_ERROR = 'NO_PLAY_SERVICES_ERROR',
  NO_ACTIVITY_ERROR = 'NO_ACTIVITY_ERROR',
  INVALID_RESULT_ERROR = 'INVALID_RESULT_ERROR',
  NO_SIGN_IN_AVAILABLE = 'NO_SIGN_IN_AVAILABLE',
  SIMULTANEOUS_CALL_ERROR = 'SIMULTANEOUS_CALL_ERROR',
  NOT_SUPPORTED_ERROR = 'NOT_SUPPORTED_ERROR',
  BROWSER_UNAVAILABLE = 'BROWSER_UNAVAILABLE',
}
