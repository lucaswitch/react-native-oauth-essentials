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
   * Ignored by `googleSilentSignIn` on iOS.
   */
  nonce?: string;
  /**
   * Email to preselect in the Google page. [iOS only]
   */
  hint?: string;
  /**
   * Restricts sign in to a Google Workspace domain. On Android it only applies to the
   * "Sign in with Google" (`button`) flow and to the authorization step, not to the bottom sheet.
   */
  hostedDomain?: string;
  /**
   * Additional OAuth scopes the user must grant.
   * iOS: requested during sign in; `accessToken` and `grantedScopes` are always returned.
   * Android: requested in a second step (Authorization API, may show a consent screen); without
   * `scopes`/`offlineAccess`, `accessToken` and `grantedScopes` are null.
   */
  scopes?: string[];
  /**
   * Android: requests a `serverAuthCode` (for `serverClientId`, or the main client id) your backend
   * can exchange for refresh tokens. iOS: no effect, `serverAuthCode` is returned whenever
   * `serverClientId` is set.
   */
  offlineAccess?: boolean;
  /**
   * iOS: web (server) client id. Makes it the idToken audience and returns a `serverAuthCode`.
   * Android: client id the `serverAuthCode` is issued for (defaults to the main client id).
   */
  serverClientId?: string;
};

/**
 * Google OAuth client ids per platform, all from the same Google Cloud project.
 */
export type GoogleClientIds = {
  /**
   * iOS client id (created with the iOS bundle id). Used on iOS only. When missing, the `GIDClientID`
   * key of Info.plist is used.
   */
  iosClientId?: string;
  /**
   * Web client id. Android: the client id passed to Credential Manager (required). iOS: the default
   * `serverClientId` (idToken audience); when missing, the `GIDServerClientID` key of Info.plist is
   * used.
   */
  webClientId?: string;
};

/**
 * A {@link GoogleClientIds} object, or a single client id string, used as is on both platforms
 * (it must be the iOS client id on iOS and the web client id on Android).
 */
export type GoogleClientId = string | GoogleClientIds;

export type AppleSignInOptions = {
  /**
   * Nonce passed as-is to Apple and embedded in the idToken. Firebase and Supabase expect the
   * SHA-256 of the raw nonce here. [iOS only, on Android put it in your `androidWebUrl`]
   */
  nonce?: string;
  /**
   * Opaque value returned in the credential. [iOS only]
   */
  state?: string;
};

export type HybridSignInOptions = GoogleSignInOptions;

export type PasskeyOptions = {
  /**
   * WebAuthn options JSON from your server: `PublicKeyCredentialCreationOptions` for
   * `createPassKey`, `PublicKeyCredentialRequestOptions` for `getPassKey`.
   */
  requestJson: string;
  /**
   * Only offer credentials already available on the device. [Android only, iOS modal requests
   * always behave this way]
   */
  preferImmediatelyAvailableCredentials?: boolean;
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
    /** iOS: Google user id (the idToken `sub`). Android: the account email. */
    id: string;
    idToken: string;
    displayName: string;
    givenName: string;
    familyName: string;
    email?: string;
    /** iOS: 200px picture url or "". */
    profilePictureUri?: string | null;
    /** Android only. */
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
  code: CredentialErrorCode;
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
  /**
   * @deprecated Never thrown: missing Play Services rejects with `NOT_SUPPORTED_ERROR`.
   */
  NO_PLAY_SERVICES_ERROR = 'NO_PLAY_SERVICES_ERROR',
  /** No Android activity, or no iOS view controller attached to a window, to present the UI. */
  NO_ACTIVITY_ERROR = 'NO_ACTIVITY_ERROR',
  /** The provider failed or returned something unexpected; `message` has the native error. */
  INVALID_RESULT_ERROR = 'INVALID_RESULT_ERROR',
  /** There is no credential to return (no account / passkey / previous sign in). */
  NO_SIGN_IN_AVAILABLE = 'NO_SIGN_IN_AVAILABLE',
  /** iOS: the same method (or method group) is still waiting for the previous call. */
  SIMULTANEOUS_CALL_ERROR = 'SIMULTANEOUS_CALL_ERROR',
  /** The OS version, missing Play Services or the platform does not support the method. */
  NOT_SUPPORTED_ERROR = 'NOT_SUPPORTED_ERROR',
  /** The browser session could not be opened (app in background, Guided Access, no browser). */
  BROWSER_UNAVAILABLE = 'BROWSER_UNAVAILABLE',
  /**
   * The app is misconfigured: missing Google client id, missing iOS URL scheme (the message has
   * the exact scheme to add) or an invalid `redirectUri`.
   */
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  /** `oauthSignIn`: the token endpoint request failed (offline, DNS, TLS...). */
  NETWORK_ERROR = 'NETWORK_ERROR',
}

/** A {@link CredentialError} value, as an enum member or its string. */
export type CredentialErrorCode = `${CredentialError}`;

/** Every promise of the library rejects with an `Error` that has one of these codes. */
export type OauthEssentialsError<
  C extends CredentialErrorCode = CredentialErrorCode
> = Error & { code: C };
