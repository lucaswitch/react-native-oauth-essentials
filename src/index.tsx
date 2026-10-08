import OauthEssentials from './NativeOauthEssentials';
import { type EventSubscription, Platform } from 'react-native';
import {
  type AppleIdCredentialResult,
  AppleIdCredentialState,
  type AppleSignInOptions,
  type CancelledCredentialResult,
  type CredentialFailureEvent,
  type CredentialSuccessEvent,
  CredentialsType,
  type GoogleIdCredentialResult,
  type GoogleSignInOptions,
  type HybridSignInOptions,
  type OAuthCredentialResult,
  type OAuthSignInOptions,
  type PassKeyCredentialResult,
  type PasskeyOptions,
  type PasswordCredentialResult,
  type WebAppleIdCredentialResult,
} from './types';
import {
  buildAuthorizationUrl,
  buildTokenRequestBody,
  getUrlScheme,
  parseRedirectParams,
  type PkcePair,
} from './oauth';

export * from './types';
const APPLE_ID_CACHED_RESULTS = new Map<
  string,
  AppleIdCredentialResult['data']
>();

/**
 * Performs the google sign in.
 * @param webClientId
 * @param options
 *
 * You should rely on GOOGLE_ID_SUPPORTED constant to check if you can use this method.
 * [Available on Android and IOS].
 */
export async function googleSignIn(
  webClientId: string,
  options?: GoogleSignInOptions
): Promise<GoogleIdCredentialResult | CancelledCredentialResult> {
  return (await OauthEssentials.googleSignIn(
    webClientId,
    parseGoogleIdOptions(options)
  )) as GoogleIdCredentialResult | CancelledCredentialResult;
}

/**
 * Restores a previous google sign in.
 * On iOS it never shows UI. On Android it only lists accounts that already signed in to the app
 * and auto selects when there is a single one.
 * Rejects with NO_SIGN_IN_AVAILABLE when there is nothing to restore.
 * @param webClientId
 * @param options
 *
 * [Available on Android and IOS].
 */
export async function googleSilentSignIn(
  webClientId: string,
  options?: GoogleSignInOptions
): Promise<GoogleIdCredentialResult | CancelledCredentialResult> {
  return (await OauthEssentials.googleSilentSignIn(
    webClientId,
    parseGoogleIdOptions(options)
  )) as GoogleIdCredentialResult | CancelledCredentialResult;
}

/**
 * Signs the user out.
 * On iOS it clears the stored Google session. On Android it clears the Credential Manager state,
 * so auto select does not sign the user back in.
 *
 * [Available on Android and IOS].
 */
export async function signOut(): Promise<boolean> {
  return await OauthEssentials.signOut();
}

/**
 * Gets the stored password.
 * If does not have an stored password, returns false.
 *
 * You should rely on PASSWORD_SUPPORTED constant to check if you can use this method.
 * [Available on Android and IOS].
 */
export async function getPassword(): Promise<false | PasswordCredentialResult> {
  const result = await OauthEssentials.getPassword();
  return (result as PasswordCredentialResult) || false;
}

/**
 * Saves a username and password in the platform password manager.
 * @param {string} username
 * @param {string} password
 *
 * Returns false when the credential was not saved.
 * On iOS it always resolves false: saving requires an associated domain, use the
 * `textContentType` props of your inputs to let iOS offer to save it instead.
 * [Saves on Android only].
 */
export async function passwordSignIn(
  username: string,
  password: string
): Promise<boolean> {
  return await OauthEssentials.passwordSignIn(username, password);
}

/**
 * Initiates the Apple Sign-In process.
 * On IOS devices it handles it smoothly using the latest UI workflow.
 * On Android it dispatches the androidWebUrl to device default browser for handling it.
 * you need to implement on your backend the redirect logic and validation accordingly to the link below
 * @see [Apple Sign In REST API Documentation](https://developer.apple.com/documentation/signinwithapplerestapi)
 *
 * @param {string} androidWebUrl - The web URL on Android where the user will complete the OAuth flow. **[Android only]**
 * @param {AppleSignInOptions} options
 *
 * @returns {AppleIdCredentialResult|WebAppleIdCredentialResult} Returns AppleIdCredentialResult on IOS devices and WebAppleIdCredentialResult on android.
 */
export async function appleSignIn(
  androidWebUrl?: string,
  options?: AppleSignInOptions
): Promise<
  | AppleIdCredentialResult
  | WebAppleIdCredentialResult
  | CancelledCredentialResult
> {
  const result = (await OauthEssentials.appleSignIn(
    Platform.select({
      ios: null,
      default: androidWebUrl ?? null,
    }),
    options ?? {}
  )) as
    | AppleIdCredentialResult
    | WebAppleIdCredentialResult
    | CancelledCredentialResult;
  if (result.type === CredentialsType.APPLE_ID) {
    if (APPLE_ID_CACHED_RESULTS.has(result.data.user)) {
      // Reuse the fullName and email provided
      const cached = APPLE_ID_CACHED_RESULTS.get(
        result.data.user
      ) as AppleIdCredentialResult['data'];

      const data = result.data;
      if (!data.fullName) {
        data.fullName = cached.fullName;
      }
      if (!data.email) {
        data.email = cached.email;
      }
    } else {
      APPLE_ID_CACHED_RESULTS.set(result.data.user, result.data);
    }
  }
  return result;
}

/**
 * Gets the Apple ID credential state of a user.
 * Call it on app start: when it is REVOKED or NOT_FOUND the user must be signed out.
 * @param userId - The `user` field of the AppleIdCredentialResult.
 *
 * [Available on IOS only, rejects with NOT_SUPPORTED_ERROR on Android].
 */
export async function getAppleIdCredentialState(
  userId: string
): Promise<AppleIdCredentialState> {
  return (await OauthEssentials.getAppleIdCredentialState(
    userId
  )) as AppleIdCredentialState;
}

/**
 * Performs all sign in methods available on the platform at once.
 * This is supposed to be used on app start to get any existing sign in.
 */
export async function hybridSignIn(
  googleClientId: string,
  options?: HybridSignInOptions
): Promise<
  | AppleIdCredentialResult
  | GoogleIdCredentialResult
  | PasswordCredentialResult
  | CancelledCredentialResult
> {
  return (await OauthEssentials.hybridSignIn(
    googleClientId,
    parseGoogleIdOptions(options)
  )) as
    | AppleIdCredentialResult
    | GoogleIdCredentialResult
    | PasswordCredentialResult
    | CancelledCredentialResult;
}

/**
 * Creates a passkey.
 * @param options
 */
export async function createPassKey(
  options: PasskeyOptions
): Promise<PassKeyCredentialResult | CancelledCredentialResult> {
  return (await OauthEssentials.createPassKey(options)) as
    | PassKeyCredentialResult
    | CancelledCredentialResult;
}

/**
 * Signs in with a passkey.
 * @param options
 */
export async function getPassKey(
  options: PasskeyOptions
): Promise<PassKeyCredentialResult | CancelledCredentialResult> {
  return (await OauthEssentials.getPassKey(options)) as
    | PassKeyCredentialResult
    | CancelledCredentialResult;
}

/**
 * Cancels a pending `getPassKey({ mediation: 'autofill' })` request,
 * for example when the sign in screen unmounts.
 *
 * [Available on IOS only, resolves false on Android].
 */
export async function cancelPassKeyAutoFill(): Promise<boolean> {
  return await OauthEssentials.cancelPassKeyAutoFill();
}

/**
 * Signs in with any OAuth 2.0 / OpenID Connect provider using the authorization code flow
 * with PKCE, in a secure browser session (ASWebAuthenticationSession / Custom Tabs).
 *
 * On Android the redirect uri must be OAUTH_REDIRECT_URI, or you must route your own uri to
 * `com.oauthessentials.CustomTabsActivity` with an intent filter.
 * @param options
 */
export async function oauthSignIn(
  options: OAuthSignInOptions
): Promise<OAuthCredentialResult | CancelledCredentialResult> {
  const redirectUri = options.redirectUri ?? OAUTH_REDIRECT_URI;
  const usePKCE = options.usePKCE !== false;
  const pkce = (await OauthEssentials.generatePkce()) as PkcePair;

  const url = buildAuthorizationUrl({
    authorizationEndpoint: options.authorizationEndpoint,
    clientId: options.clientId,
    redirectUri,
    scopes: options.scopes,
    additionalParameters: options.additionalParameters,
    state: pkce.state,
    codeChallenge: usePKCE ? pkce.codeChallenge : undefined,
  });

  const session = (await OauthEssentials.openAuthSession(url, {
    callbackScheme: getUrlScheme(redirectUri),
    prefersEphemeralSession: options.prefersEphemeralSession === true,
  })) as { type: string; data: { url: string } | null };

  if (session.type === CredentialsType.CANCELLED || !session.data) {
    return { type: CredentialsType.CANCELLED, data: null };
  }

  const params = parseRedirectParams(session.data.url);
  if (params.state !== pkce.state) {
    throw oauthError('State mismatch in authorization response');
  }
  if (params.error) {
    if (params.error === 'access_denied') {
      return { type: CredentialsType.CANCELLED, data: null };
    }
    throw oauthError(params.error_description ?? params.error);
  }
  if (!params.code) {
    throw oauthError('Authorization response has no code');
  }

  const codeVerifier = usePKCE ? pkce.codeVerifier : null;
  let tokens: Record<string, unknown> | null = null;
  if (options.tokenEndpoint) {
    const response = await fetch(options.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: buildTokenRequestBody({
        code: params.code,
        clientId: options.clientId,
        redirectUri,
        codeVerifier,
      }),
    });
    tokens = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      throw oauthError(
        String(tokens.error_description ?? tokens.error ?? response.status)
      );
    }
  }

  return {
    type: CredentialsType.OAUTH,
    data: {
      code: params.code,
      state: params.state,
      redirectUri,
      codeVerifier,
      params,
      tokens,
    },
  };
}

function oauthError(message: string): Error & { code: string } {
  const error = new Error(message) as Error & { code: string };
  error.code = 'INVALID_RESULT_ERROR';
  return error;
}

/**
 * Listens to every successful (or cancelled) credential result.
 */
export function addCredentialSuccessListener(
  listener: (event: CredentialSuccessEvent) => void
): EventSubscription {
  return OauthEssentials.onCredentialSuccess(listener);
}

/**
 * Listens to every credential failure.
 */
export function addCredentialFailureListener(
  listener: (event: CredentialFailureEvent) => void
): EventSubscription {
  return OauthEssentials.onCredentialFailure(listener);
}

/**
 * Listens to Apple ID revocation while the app is running.
 * Sign the user out when it fires. [iOS only]
 */
export function addAppleIdCredentialRevokedListener(
  listener: () => void
): EventSubscription {
  return OauthEssentials.onAppleIdCredentialRevoked(() => listener());
}

function parseGoogleIdOptions(options?: GoogleSignInOptions) {
  const bridgeOptions: GoogleSignInOptions = {
    authorizedAccounts: false,
    autoSelectEnabled: false,
    mode: 'bottomSheet',
  };

  if (options && typeof options === 'object') {
    if (options.authorizedAccounts !== undefined) {
      bridgeOptions.authorizedAccounts = options.authorizedAccounts === true;
    }
    if (options.autoSelectEnabled !== undefined) {
      bridgeOptions.autoSelectEnabled = options.autoSelectEnabled === true;
    }
    if (options.mode === 'button') {
      bridgeOptions.mode = 'button';
    }
    if (options.offlineAccess !== undefined) {
      bridgeOptions.offlineAccess = options.offlineAccess === true;
    }
    if (typeof options.nonce === 'string') {
      bridgeOptions.nonce = options.nonce;
    }
    if (typeof options.hint === 'string') {
      bridgeOptions.hint = options.hint;
    }
    if (typeof options.hostedDomain === 'string') {
      bridgeOptions.hostedDomain = options.hostedDomain;
    }
    if (typeof options.serverClientId === 'string') {
      bridgeOptions.serverClientId = options.serverClientId;
    }
    if (Array.isArray(options.scopes)) {
      bridgeOptions.scopes = options.scopes.filter(
        (s) => typeof s === 'string'
      );
    }
  }
  return bridgeOptions;
}

const CONSTANTS = OauthEssentials.getConstants();

/**
 * Google Play are supported.
 * It always false on IOS, cause IOS does not use Google Play Services.
 */
export const GOOGLE_PLAY_SERVICES_SUPPORTED =
  CONSTANTS.GOOGLE_PLAY_SERVICES_SUPPORTED;

/**
 * The password method is supported.
 */
export const PASSWORD_SUPPORTED = CONSTANTS.PASSWORD_SUPPORTED;

/**
 * Google Play id sign in is supported.
 * You should mainly rely on this constant to check if you can use google sign in.
 */
export const GOOGLE_ID_SUPPORTED = CONSTANTS.GOOGLE_ID_SUPPORTED;

/**
 * Gets if Apple id sign in is supported.
 */
export const APPLE_ID_SUPPORTED = CONSTANTS.APPLE_ID_SUPPORTED;

/**
 * Gets if "hybrid" is supported in this platform.
 */
export const HYBRID_SUPPORTED = CONSTANTS.HYBRID_SUPPORTED;

/**
 * Gets if passkeys are supported.
 */
export const PASSKEYS_SUPPORTED = CONSTANTS.PASSKEYS_SUPPORTED;

/**
 * Default redirect uri for `oauthSignIn`: `<bundle or application id>://oauth/callback`.
 */
export const OAUTH_REDIRECT_URI = CONSTANTS.OAUTH_REDIRECT_URI;
