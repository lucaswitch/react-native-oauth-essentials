import OauthEssentials from './NativeOauthEssentials';
import { type EventSubscription, Platform } from 'react-native';
import {
  type AppleIdCredentialResult,
  AppleIdCredentialState,
  type AppleSignInOptions,
  type CancelledCredentialResult,
  type CredentialFailureEvent,
  type CredentialSuccessEvent,
  CredentialError,
  CredentialsType,
  type GoogleClientId,
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
import { createCredentialError } from './errors';
import {
  resolveGoogleClientId,
  splitGoogleArgs,
  warnIgnored,
  warnOnce,
} from './platform';

export * from './types';
export { isCredentialError } from './errors';
const APPLE_ID_CACHED_RESULTS = new Map<
  string,
  AppleIdCredentialResult['data']
>();

/**
 * Shows the Google sign in UI and resolves with the signed in account.
 *
 * iOS: configures GoogleSignIn with the iOS client id (+ `serverClientId`, `hostedDomain`) and
 * presents it from the top most view controller, passing `hint`, `scopes` and `nonce`. If the app is
 * not active it waits up to 2 seconds for it to become active. The client id falls back to
 * `GIDClientID` and `serverClientId` to `webClientId`, then to `GIDServerClientID` (Info.plist).
 * Android: shows the Credential Manager bottom sheet (`mode: 'bottomSheet'`, falls back to the
 * "Sign in with Google" flow when there is no credential and `authorizedAccounts` is not set) or
 * the "Sign in with Google" flow (`mode: 'button'`). When `scopes` or `offlineAccess` are set it
 * then asks for authorization, which may show a consent screen.
 *
 * Resolves `GOOGLE_ID`, or `CANCELLED` when the user dismisses the UI (or declines the consent
 * screen on Android).
 * Rejects with `CONFIGURATION_ERROR` (no client id; iOS: the reversed client id URL scheme is not in
 * Info.plist, the message has the exact scheme), `NOT_SUPPORTED_ERROR` (Android, no Play Services),
 * `NO_ACTIVITY_ERROR`,
 * `NO_SIGN_IN_AVAILABLE` (Android), `BROWSER_UNAVAILABLE` (iOS: app not active, Guided Access or
 * Safari could not be opened), `SIMULTANEOUS_CALL_ERROR` (iOS: a Google sign in is pending) or
 * `INVALID_RESULT_ERROR`.
 * Emits `onCredentialSuccess` / `onCredentialFailure`.
 *
 * @param clientId - `{ iosClientId, webClientId }` (see {@link GoogleClientIds}), or one client id
 * string used as is (the iOS client id on iOS, the web client id on Android). Optional: without it
 * the ids are read from the app config (`googleSignIn()` or `googleSignIn(options)`), see
 * {@link GoogleClientIds}.
 * @param options - See {@link GoogleSignInOptions}.
 */
export async function googleSignIn(
  options?: GoogleSignInOptions
): Promise<GoogleIdCredentialResult | CancelledCredentialResult>;
export async function googleSignIn(
  clientId: GoogleClientId | null | undefined,
  options?: GoogleSignInOptions
): Promise<GoogleIdCredentialResult | CancelledCredentialResult>;
export async function googleSignIn(
  clientIdOrOptions?: GoogleClientId | GoogleSignInOptions | null,
  maybeOptions?: GoogleSignInOptions
): Promise<GoogleIdCredentialResult | CancelledCredentialResult> {
  const { clientId, options } = splitGoogleArgs(
    clientIdOrOptions,
    maybeOptions
  );
  warnIgnored(
    'googleSignIn',
    Platform.OS,
    options,
    Platform.OS === 'ios' ? GOOGLE_IOS_IGNORED : ['hint']
  );
  const resolved = resolveGoogleClientId(Platform.OS, clientId, {
    ...options,
  });
  return (await OauthEssentials.googleSignIn(
    resolved.clientId,
    parseGoogleIdOptions(resolved.options)
  )) as GoogleIdCredentialResult | CancelledCredentialResult;
}

const GOOGLE_IOS_IGNORED = [
  'authorizedAccounts',
  'autoSelectEnabled',
  'mode',
  'offlineAccess',
] as const;

/**
 * Restores a previous Google sign in.
 *
 * iOS: calls GoogleSignIn `restorePreviousSignIn`, which never shows UI and refreshes the tokens.
 * `hint`, `scopes`, `nonce` and `offlineAccess` are ignored and `serverAuthCode` is always null.
 * Android: shows the Credential Manager bottom sheet filtered to accounts that already signed in to
 * the app with auto select on, so it signs in without UI when there is a single one. `mode` and
 * `hint` are ignored. When `scopes`/`offlineAccess` are set, authorization is only requested without UI:
 * if consent is needed the result has `accessToken: null`.
 *
 * Resolves `GOOGLE_ID`, or `CANCELLED` when the user dismisses the Android sheet.
 * Rejects with `NO_SIGN_IN_AVAILABLE` when there is nothing to restore, plus the same errors as
 * {@link googleSignIn} (it shares the iOS simultaneous call lock with it). Takes the same
 * `clientId` as {@link googleSignIn} (also optional).
 * Emits `onCredentialSuccess` / `onCredentialFailure`.
 */
export async function googleSilentSignIn(
  options?: GoogleSignInOptions
): Promise<GoogleIdCredentialResult | CancelledCredentialResult>;
export async function googleSilentSignIn(
  clientId: GoogleClientId | null | undefined,
  options?: GoogleSignInOptions
): Promise<GoogleIdCredentialResult | CancelledCredentialResult>;
export async function googleSilentSignIn(
  clientIdOrOptions?: GoogleClientId | GoogleSignInOptions | null,
  maybeOptions?: GoogleSignInOptions
): Promise<GoogleIdCredentialResult | CancelledCredentialResult> {
  const { clientId, options } = splitGoogleArgs(
    clientIdOrOptions,
    maybeOptions
  );
  warnIgnored(
    'googleSilentSignIn',
    Platform.OS,
    options,
    Platform.OS === 'ios'
      ? [...GOOGLE_IOS_IGNORED, 'hint', 'scopes', 'nonce']
      : ['hint', 'mode']
  );
  const resolved = resolveGoogleClientId(Platform.OS, clientId, {
    ...options,
  });
  return (await OauthEssentials.googleSilentSignIn(
    resolved.clientId,
    parseGoogleIdOptions(resolved.options)
  )) as GoogleIdCredentialResult | CancelledCredentialResult;
}

/**
 * Clears the stored sign in state.
 *
 * iOS: calls GoogleSignIn `signOut` (removes the Google session from the keychain, so
 * {@link googleSilentSignIn} rejects afterwards). It does not affect Apple ID or passwords.
 * Android: calls Credential Manager `clearCredentialState`, which turns off auto select for every
 * provider until the user picks an account again.
 *
 * Resolves `true`. Rejects with `INVALID_RESULT_ERROR` (Android only) when clearing fails.
 * Does not emit events.
 */
export async function signOut(): Promise<boolean> {
  return await OauthEssentials.signOut();
}

/**
 * Shows the saved passwords of the app and resolves with the one the user picks.
 *
 * iOS: `ASAuthorizationPasswordProvider` request (iOS 16+ only offers credentials already saved on
 * the device). Resolves `PASSWORD`, or the `CANCELLED` result when the user dismisses it or there
 * is no saved password. Rejects with `INVALID_RESULT_ERROR` on other errors and
 * `SIMULTANEOUS_CALL_ERROR` while a previous call is pending.
 * Android: Credential Manager `GetPasswordOption`. Resolves `PASSWORD`, or `CANCELLED` when the user
 * dismisses it or there is no saved password. Rejects with `NOT_SUPPORTED_ERROR` without Play
 * Services, `NO_ACTIVITY_ERROR` and `INVALID_RESULT_ERROR` on other errors.
 *
 * Emits `onCredentialSuccess` / `onCredentialFailure`.
 */
export async function getPassword(): Promise<
  PasswordCredentialResult | CancelledCredentialResult
> {
  return (await OauthEssentials.getPassword()) as
    | PasswordCredentialResult
    | CancelledCredentialResult;
}

/**
 * Saves a username and password in the platform password manager. It does not authenticate the
 * user against anything.
 *
 * iOS: does nothing and resolves `false` (iOS has no API to save a password without an associated
 * domain; use the `textContentType` props of your inputs so iOS offers to save it).
 * Android: Credential Manager `createCredential(CreatePasswordRequest)`, which shows the save
 * prompt. Resolves `true` when saved, `false` on any error (including the user declining).
 * Rejects with `NOT_SUPPORTED_ERROR` without Play Services and `NO_ACTIVITY_ERROR`.
 *
 * Does not emit events, except `onCredentialFailure` for the Android rejections.
 */
export async function passwordSignIn(
  username: string,
  password: string
): Promise<boolean> {
  if (Platform.OS === 'ios') {
    warnOnce(
      'passwordSignIn',
      'ios',
      'does nothing on iOS: set textContentType on your inputs so iOS offers to save the password.'
    );
  }
  return await OauthEssentials.passwordSignIn(username, password);
}

/**
 * Signs in with Apple.
 *
 * iOS: native Sign in with Apple sheet requesting `fullName` and `email`, with `options.nonce` and
 * `options.state`. Resolves `APPLE_ID`, or `CANCELLED` when the user dismisses it. Rejects with
 * `INVALID_RESULT_ERROR` on other errors and `SIMULTANEOUS_CALL_ERROR` while a previous call is
 * pending. Apple only sends `email`/`fullName` on the first authorization: this function keeps the
 * first result of each `user` in memory (until the app is killed) and fills empty `email`/`fullName`
 * with it.
 * Android: opens `androidWebUrl` in a Custom Tab; `options` is ignored (put the nonce in your url).
 * Your backend must run the Apple web flow and redirect to `<applicationId>://oauth/callback`.
 * Resolves `WEB_APPLE_ID` with the redirect url, or `CANCELLED` when the user closes the tab or
 * another browser session (`appleSignIn`/`oauthSignIn`) starts. Rejects with `INVALID_RESULT_ERROR`
 * (invalid url), `NO_ACTIVITY_ERROR` or `BROWSER_UNAVAILABLE` (no browser installed).
 *
 * Emits `onCredentialSuccess` / `onCredentialFailure`.
 * @see [Sign in with Apple REST API](https://developer.apple.com/documentation/signinwithapplerestapi)
 *
 * @param androidWebUrl - Web url that starts the Apple flow. Required on Android, ignored on iOS.
 * @param options - See {@link AppleSignInOptions}. iOS only.
 */
export async function appleSignIn(
  androidWebUrl?: string,
  options?: AppleSignInOptions
): Promise<
  | AppleIdCredentialResult
  | WebAppleIdCredentialResult
  | CancelledCredentialResult
> {
  if (Platform.OS !== 'ios') {
    warnIgnored('appleSignIn', Platform.OS, options, ['nonce', 'state']);
  }
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
 * Asks Apple whether the user is still signed in to the app with Apple ID, without UI
 * (`ASAuthorizationAppleIDProvider.getCredentialState`).
 * Call it on app start and sign the user out when it is not `AUTHORIZED`.
 *
 * Resolves `AUTHORIZED`, `REVOKED`, `TRANSFERRED` or `NOT_FOUND`. Rejects with
 * `INVALID_RESULT_ERROR` when the check fails, and always with `NOT_SUPPORTED_ERROR` on Android.
 * Does not emit events.
 *
 * @param userId - The `user` field of the AppleIdCredentialResult.
 */
export async function getAppleIdCredentialState(
  userId: string
): Promise<AppleIdCredentialState> {
  return (await OauthEssentials.getAppleIdCredentialState(
    userId
  )) as AppleIdCredentialState;
}

/**
 * Shows a single picker with the credentials the user already has, meant for app start.
 *
 * iOS: Apple ID + saved passwords (`clientId` is ignored, Google is not included; only
 * `options.nonce` is used, for Apple ID). On iOS 16+ only credentials already on the device are
 * offered. Resolves `APPLE_ID` or `PASSWORD`, or `CANCELLED` when the user dismisses it or nothing
 * is available. Rejects with `INVALID_RESULT_ERROR` or `SIMULTANEOUS_CALL_ERROR`.
 * Android: Credential Manager with Google ID (bottom sheet option with the web client id,
 * `authorizedAccounts`, `autoSelectEnabled` and `nonce`) + saved passwords. Apple is not included
 * and `mode`, `hint`, `scopes`, `offlineAccess`, `hostedDomain` and `serverClientId` are ignored.
 * Resolves `GOOGLE_ID` or `PASSWORD`, or `CANCELLED`. Rejects with `CONFIGURATION_ERROR` (no web
 * client id), `NOT_SUPPORTED_ERROR` (no Play Services), `NO_ACTIVITY_ERROR`,
 * `NO_SIGN_IN_AVAILABLE` or `INVALID_RESULT_ERROR`.
 *
 * Ignored options produce a warning in development.
 * `clientId` is optional like in {@link googleSignIn}: without it the web client id is read from
 * the app config.
 *
 * Emits `onCredentialSuccess` / `onCredentialFailure`.
 */
export async function hybridSignIn(
  options?: HybridSignInOptions
): Promise<HybridSignInResult>;
export async function hybridSignIn(
  clientId: GoogleClientId | null | undefined,
  options?: HybridSignInOptions
): Promise<HybridSignInResult>;
export async function hybridSignIn(
  clientIdOrOptions?: GoogleClientId | HybridSignInOptions | null,
  maybeOptions?: HybridSignInOptions
): Promise<HybridSignInResult> {
  const { clientId, options } = splitGoogleArgs(
    clientIdOrOptions,
    maybeOptions
  );
  if (Platform.OS === 'ios') {
    if (clientId) {
      warnOnce(
        'hybridSignIn',
        'clientId',
        'the Google client id is ignored on iOS (Google is not offered there, only Apple ID and passwords).'
      );
    }
    warnIgnored('hybridSignIn', 'ios', options, [
      ...GOOGLE_IOS_IGNORED,
      'hint',
      'scopes',
      'hostedDomain',
      'serverClientId',
    ]);
  } else {
    warnIgnored('hybridSignIn', Platform.OS, options, [
      'hint',
      'mode',
      'scopes',
      'offlineAccess',
      'hostedDomain',
      'serverClientId',
    ]);
  }
  const resolved = resolveGoogleClientId(Platform.OS, clientId, {
    ...options,
  });
  return (await OauthEssentials.hybridSignIn(
    resolved.clientId,
    parseGoogleIdOptions(resolved.options)
  )) as HybridSignInResult;
}

type HybridSignInResult =
  | AppleIdCredentialResult
  | GoogleIdCredentialResult
  | PasswordCredentialResult
  | CancelledCredentialResult;

/**
 * Creates a passkey from a WebAuthn `PublicKeyCredentialCreationOptions` JSON (`requestJson`).
 *
 * iOS 16+: platform passkey registration. Reads `challenge`, `rp.id`, `user.id`, `user.name`,
 * `authenticatorSelection.userVerification`, `attestation` and, on iOS 17.4+,
 * `excludeCredentials`; other fields are ignored. `data` is a JSON string with `id`, `rawId`,
 * `type` and `response.clientDataJSON`/`attestationObject` (base64url). Rejects with
 * `NOT_SUPPORTED_ERROR` below iOS 16 and `SIMULTANEOUS_CALL_ERROR` while a passkey call is pending.
 * Android 9+: Credential Manager `CreatePublicKeyCredentialRequest` with the whole JSON and
 * `preferImmediatelyAvailableCredentials`. `data` is the registration response JSON returned by
 * Credential Manager. Rejects with `NOT_SUPPORTED_ERROR` below Android 9 and `NO_ACTIVITY_ERROR`.
 *
 * Resolves `PASSKEY`, or `CANCELLED` when the user dismisses it. Rejects with
 * `INVALID_RESULT_ERROR` for an invalid/missing `requestJson` and other errors.
 * Emits `onCredentialSuccess` / `onCredentialFailure`. Send `data` to your server to verify it.
 */
export async function createPassKey(
  options: PasskeyOptions
): Promise<PassKeyCredentialResult | CancelledCredentialResult> {
  warnPasskeyOptions('createPassKey', options);
  return (await OauthEssentials.createPassKey(options)) as
    | PassKeyCredentialResult
    | CancelledCredentialResult;
}

/**
 * Signs in with a passkey from a WebAuthn `PublicKeyCredentialRequestOptions` JSON (`requestJson`).
 *
 * iOS 16+: platform passkey assertion. Reads `challenge`, `rpId`, `allowCredentials` and
 * `userVerification`. With `mediation: 'autofill'` it does not show a sheet: it waits until the user
 * picks a passkey in the QuickType bar of a `textContentType="username"` field, and any other
 * passkey call (or {@link cancelPassKeyAutoFill}) resolves it as `CANCELLED`. Otherwise it shows a
 * sheet that only offers passkeys available on the device (no "other device" QR option), so it
 * resolves `CANCELLED` when there is none. `data` is a JSON string with `id`, `rawId`, `type` and
 * `response.clientDataJSON`/`authenticatorData`/`signature`/`userHandle` (base64url).
 * Rejects with `NOT_SUPPORTED_ERROR` below iOS 16 and `SIMULTANEOUS_CALL_ERROR` while a modal
 * passkey call is pending.
 * Android 9+: Credential Manager `GetPublicKeyCredentialOption` with the whole JSON and
 * `preferImmediatelyAvailableCredentials`; `mediation` is ignored. `data` is the authentication
 * response JSON returned by Credential Manager. Rejects with `NOT_SUPPORTED_ERROR` below Android 9,
 * `NO_ACTIVITY_ERROR` and `NO_SIGN_IN_AVAILABLE` (no passkey).
 *
 * Resolves `PASSKEY`, or `CANCELLED` when the user dismisses it. Rejects with
 * `INVALID_RESULT_ERROR` for an invalid/missing `requestJson` and other errors.
 * Emits `onCredentialSuccess` / `onCredentialFailure`. Send `data` to your server to verify it.
 */
export async function getPassKey(
  options: PasskeyOptions
): Promise<PassKeyCredentialResult | CancelledCredentialResult> {
  warnPasskeyOptions('getPassKey', options);
  return (await OauthEssentials.getPassKey(options)) as
    | PassKeyCredentialResult
    | CancelledCredentialResult;
}

function warnPasskeyOptions(method: string, options?: PasskeyOptions) {
  if (Platform.OS === 'ios') {
    if (options?.preferImmediatelyAvailableCredentials === false) {
      warnOnce(
        method,
        'preferImmediatelyAvailableCredentials',
        '"preferImmediatelyAvailableCredentials: false" is ignored on iOS (modal requests only offer passkeys on the device).'
      );
    }
  } else if (options?.mediation === 'autofill') {
    warnOnce(
      method,
      'mediation',
      '"mediation: \'autofill\'" is ignored on Android.'
    );
  }
}

/**
 * Cancels a pending `getPassKey({ mediation: 'autofill' })` request, for example when the sign in
 * screen unmounts. The cancelled `getPassKey` resolves `CANCELLED` (and emits it).
 *
 * Resolves `true` when a pending AutoFill request was cancelled, `false` when there was none.
 * Always resolves `false` on Android and below iOS 16.
 */
export async function cancelPassKeyAutoFill(): Promise<boolean> {
  return await OauthEssentials.cancelPassKeyAutoFill();
}

/**
 * Signs in with any OAuth 2.0 / OpenID Connect provider using the authorization code flow.
 *
 * 1. Generates a random `state` and a PKCE S256 verifier/challenge on the native side.
 * 2. Builds `authorizationEndpoint?response_type=code&client_id&redirect_uri&state[&scope]
 *    [&code_challenge&code_challenge_method=S256]` + `additionalParameters` (which override them).
 * 3. Opens it in `ASWebAuthenticationSession` (iOS, `prefersEphemeralSession`, waits up to 2 seconds
 *    for the app to be active) or a Custom Tab (Android) and waits for the redirect to `redirectUri`.
 *    On Android the redirect must reach `CustomTabsActivity`: use `OAUTH_REDIRECT_URI` or add an
 *    intent filter for your uri.
 * 4. Checks that the returned `state` matches, then reads `code` (query or fragment).
 * 5. When `tokenEndpoint` is set, POSTs `grant_type=authorization_code`, `code`, `client_id`,
 *    `redirect_uri` and `code_verifier` as a form and returns the JSON response in `tokens`
 *    (no client secret is sent, the id_token is not validated).
 *
 * Resolves `OAUTH`, or `CANCELLED` when the user closes the browser, the provider returns
 * `error=access_denied` or (Android) another browser session starts.
 * Rejects with `INVALID_RESULT_ERROR` (state mismatch, provider error, no code, token endpoint
 * returned non 2xx or non JSON), `NETWORK_ERROR` (token request failed), `CONFIGURATION_ERROR`
 * (invalid `redirectUri`), `BROWSER_UNAVAILABLE`, `NO_ACTIVITY_ERROR` (Android) or
 * `SIMULTANEOUS_CALL_ERROR` (iOS).
 * Does not emit events.
 */
export async function oauthSignIn(
  options: OAuthSignInOptions
): Promise<OAuthCredentialResult | CancelledCredentialResult> {
  if (Platform.OS !== 'ios') {
    warnIgnored('oauthSignIn', Platform.OS, options, [
      'prefersEphemeralSession',
    ]);
  }
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
    let response: Response;
    try {
      response = await fetch(options.tokenEndpoint, {
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
    } catch (e) {
      throw createCredentialError(
        CredentialError.NETWORK_ERROR,
        `Token request failed: ${e instanceof Error ? e.message : String(e)}`,
        e
      );
    }
    try {
      tokens = (await response.json()) as Record<string, unknown>;
    } catch (e) {
      throw createCredentialError(
        CredentialError.INVALID_RESULT_ERROR,
        `Token endpoint returned a non JSON response (status ${response.status})`,
        e
      );
    }
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

function oauthError(message: string) {
  return createCredentialError(CredentialError.INVALID_RESULT_ERROR, message);
}

/**
 * Called with the same `{ type, data }` the promise resolves with (including `CANCELLED`), for
 * `googleSignIn`, `googleSilentSignIn`, `getPassword`, `appleSignIn`, `hybridSignIn`,
 * `createPassKey` and `getPassKey`. Not called by `signOut`, `passwordSignIn`,
 * `getAppleIdCredentialState`, `cancelPassKeyAutoFill` and `oauthSignIn`.
 */
export function addCredentialSuccessListener(
  listener: (event: CredentialSuccessEvent) => void
): EventSubscription {
  return OauthEssentials.onCredentialSuccess(listener);
}

/**
 * Called with `{ code, message }` when one of the methods listed in
 * {@link addCredentialSuccessListener} rejects. `SIMULTANEOUS_CALL_ERROR`, the iOS
 * `NOT_SUPPORTED_ERROR` below iOS 16 and the iOS missing `requestJson` error are not emitted.
 */
export function addCredentialFailureListener(
  listener: (event: CredentialFailureEvent) => void
): EventSubscription {
  return OauthEssentials.onCredentialFailure((event) =>
    listener(event as CredentialFailureEvent)
  );
}

/**
 * Called when iOS posts `credentialRevokedNotification`, i.e. the user stopped using Apple ID with
 * the app while it is running. Sign the user out when it fires. Never called on Android.
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
 * Android: Google Play Services are installed and up to date (read once, when the module loads).
 * iOS: always false.
 */
export const GOOGLE_PLAY_SERVICES_SUPPORTED =
  CONSTANTS.GOOGLE_PLAY_SERVICES_SUPPORTED;

/**
 * iOS: always true. Android: same as `GOOGLE_PLAY_SERVICES_SUPPORTED` (`getPassword` and
 * `passwordSignIn` reject with `NOT_SUPPORTED_ERROR` without Play Services).
 */
export const PASSWORD_SUPPORTED = CONSTANTS.PASSWORD_SUPPORTED;

/**
 * iOS: always true. Android: same as `GOOGLE_PLAY_SERVICES_SUPPORTED`.
 */
export const GOOGLE_ID_SUPPORTED = CONSTANTS.GOOGLE_ID_SUPPORTED;

/**
 * Always true (native on iOS, web flow in a Custom Tab on Android).
 */
export const APPLE_ID_SUPPORTED = CONSTANTS.APPLE_ID_SUPPORTED;

/**
 * iOS: always true. Android: same as `GOOGLE_PLAY_SERVICES_SUPPORTED` (`hybridSignIn` rejects with
 * `NOT_SUPPORTED_ERROR` without Play Services).
 */
export const HYBRID_SUPPORTED = CONSTANTS.HYBRID_SUPPORTED;

/**
 * iOS 16+ / Android 9+ (API 28).
 */
export const PASSKEYS_SUPPORTED = CONSTANTS.PASSKEYS_SUPPORTED;

/**
 * Default redirect uri of `oauthSignIn`: `<bundle id, lowercased>://oauth/callback` on iOS and
 * `<applicationId>://oauth/callback` on Android (the uri the library's `CustomTabsActivity`
 * intent filter handles).
 */
export const OAUTH_REDIRECT_URI = CONSTANTS.OAUTH_REDIRECT_URI;
