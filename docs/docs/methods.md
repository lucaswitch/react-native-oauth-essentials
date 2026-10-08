---
sidebar_position: 5
---

# Methods

Exact reference of every function exported by `react-native-oauth-essentials`: what it calls on each platform, what it
resolves, what it rejects with and which events it emits.

## Conventions

- **Cancellation resolves.** When the user dismisses the UI, methods resolve `{ type: 'CANCELLED', data: null }`
  instead of rejecting (exceptions are noted per method).
- **Errors reject** with an `Error` that has a `code` from [`CredentialError`](./types#credentialerror) and the native
  error text in `message`.
- **Events.** Credential methods also report their result through `addCredentialSuccessListener` /
  `addCredentialFailureListener` (see [Events](#events)).
- **Simultaneous calls (iOS).** Calling a method again while its previous call is pending rejects the new call with
  `SIMULTANEOUS_CALL_ERROR` (the pending one keeps going). The locks are: `googleSignIn` + `googleSilentSignIn`,
  `getPassword`, `hybridSignIn`, `appleSignIn`, `createPassKey` + `getPassKey`, and `oauthSignIn`. Android has no lock,
  except that `appleSignIn` and `oauthSignIn` share the browser: starting one resolves the pending one as `CANCELLED`.
- **Threading (iOS).** Every method runs on the main thread.

## Google

### `googleSignIn(webClientId, options?)`

Shows the Google sign in UI and resolves with the signed in account.

**iOS**

1. Configures GoogleSignIn with `webClientId` as the client id, plus `serverClientId` and `hostedDomain`.
2. Rejects with `BROWSER_UNAVAILABLE` if Guided Access is on.
3. If the app is not active, waits up to 2 seconds for it to become active, then rejects with `BROWSER_UNAVAILABLE`.
4. Finds the top most view controller attached to a window (rejects with `NO_ACTIVITY_ERROR` when there is none).
5. Calls `GIDSignIn.signIn(withPresenting:hint:additionalScopes:nonce:)`, which opens an `ASWebAuthenticationSession`.
   "Unable to open Safari." errors are reported as `BROWSER_UNAVAILABLE`.

**Android**

1. Rejects with `NOT_SUPPORTED_ERROR` without Google Play Services and `NO_ACTIVITY_ERROR` without an activity.
2. `mode: 'bottomSheet'` (default): Credential Manager `GetGoogleIdOption` with `authorizedAccounts`,
   `autoSelectEnabled` and `nonce`. When there is no credential (no account on the device, or the sheet is in cooldown
   after being dismissed) and `authorizedAccounts` is not set, it falls back to the button flow.
3. `mode: 'button'`: `GetSignInWithGoogleOption` with `nonce` and `hostedDomain`, the full "Sign in with Google" flow
   (lets the user add an account).
4. When `scopes` or `offlineAccess` are set, calls the Authorization API for that account with `scopes` (or `openid`,
   `email`, `profile`), `hostedDomain` and, with `offlineAccess`, `requestOfflineAccess(serverClientId ?? webClientId)`.
   It may show a consent screen; declining it resolves `CANCELLED`.

| | iOS | Android |
|---|---|---|
| Resolves | `GOOGLE_ID`, `CANCELLED` | `GOOGLE_ID`, `CANCELLED` |
| Rejects | `BROWSER_UNAVAILABLE`, `NO_ACTIVITY_ERROR`, `SIMULTANEOUS_CALL_ERROR`, `INVALID_RESULT_ERROR` | `NOT_SUPPORTED_ERROR`, `NO_ACTIVITY_ERROR`, `NO_SIGN_IN_AVAILABLE`, `INVALID_RESULT_ERROR` |
| Events | success / failure | success / failure |

**Options per platform**

| Option | iOS | Android |
|---|---|---|
| `nonce` | ✅ | ✅ |
| `hint` | ✅ | ignored |
| `hostedDomain` | ✅ | button flow and authorization only |
| `scopes` | requested during sign in | requested in the authorization step |
| `offlineAccess` | no effect (`serverAuthCode` comes when `serverClientId` is set) | returns `serverAuthCode` |
| `serverClientId` | idToken audience + `serverAuthCode` | client id of the `serverAuthCode` |
| `mode`, `authorizedAccounts`, `autoSelectEnabled` | ignored | ✅ |

**Result fields that differ:** `id` is the Google user id (`sub`) on iOS and the account email on Android.
`accessToken` and `grantedScopes` are always set on iOS, and are `null` on Android unless `scopes` or `offlineAccess` were
requested. `phoneNumber` is Android only.

```ts
import { googleSignIn, CredentialsType, CredentialError } from 'react-native-oauth-essentials';

try {
  const result = await googleSignIn('WEB_CLIENT_ID', { mode: 'button', nonce });
  if (result.type === CredentialsType.GOOGLE_ID) {
    await api.signInWithGoogle(result.data.idToken);
  }
} catch (e) {
  if (e.code === CredentialError.BROWSER_UNAVAILABLE) {
    // ask the user to try again with the app in foreground
  }
}
```

### `googleSilentSignIn(webClientId, options?)`

Restores a previous Google sign in.

- **iOS:** if there is no stored session, rejects with `NO_SIGN_IN_AVAILABLE`. Otherwise it calls
  `GIDSignIn.restorePreviousSignIn`, which never shows UI and refreshes the tokens. `hint`, `scopes`, `nonce` and
  `offlineAccess` are ignored, and `serverAuthCode` is always `null`.
- **Android:** `GetGoogleIdOption` with `filterByAuthorizedAccounts` and `autoSelectEnabled` forced on, so it signs in
  without UI when a single account already signed in to the app (it shows the sheet when there are several). `mode` is
  ignored. When `scopes`/`offlineAccess` are set, authorization is requested without UI. If consent would be needed, the
  result has `accessToken: null` instead of being cancelled.

Resolves `GOOGLE_ID` or `CANCELLED` (user dismissed the Android sheet). Rejects with `NO_SIGN_IN_AVAILABLE` when there is
nothing to restore, plus the same errors as `googleSignIn`. Emits success / failure events.

```ts
try {
  const result = await googleSilentSignIn('WEB_CLIENT_ID');
} catch (e) {
  if (e.code === CredentialError.NO_SIGN_IN_AVAILABLE) showSignInScreen();
}
```

### `signOut()`

- **iOS:** `GIDSignIn.signOut()`: removes the Google session, so `googleSilentSignIn` rejects afterwards. It does not
  touch Apple ID or passwords.
- **Android:** Credential Manager `clearCredentialState`. It turns off auto select for every provider until the user
  picks an account again.

Resolves `true`. Rejects with `INVALID_RESULT_ERROR` on Android when clearing fails. Does not emit events.

## Passwords

### `getPassword()`

Shows the app's saved passwords and resolves with the one the user picks.

- **iOS:** `ASAuthorizationPasswordProvider` request. On iOS 16+ it only offers passwords already on the device. Resolves
  `PASSWORD`, or the `CANCELLED` result (not `false`) when the user dismisses it or there is no saved password. Rejects
  with `INVALID_RESULT_ERROR` on other errors and `SIMULTANEOUS_CALL_ERROR`.
- **Android:** Credential Manager `GetPasswordOption`. Resolves `PASSWORD`, or `false` on any error (no password,
  cancelled...). Rejects with `NOT_SUPPORTED_ERROR` without Play Services and `NO_ACTIVITY_ERROR`.

Emits the success event when it resolves a result object and the failure event when it rejects.

```ts
const result = await getPassword();
if (result && result.type === CredentialsType.PASSWORD) {
  await api.signIn(result.data.username, result.data.password);
}
```

### `passwordSignIn(username, password)`

Saves a username/password in the platform password manager. It does **not** authenticate the user against anything.

- **iOS:** does nothing and resolves `false`. iOS has no API to save a password without an associated domain. Use the
  `textContentType` (`username`, `password`, `newPassword`) props of your inputs so iOS offers to save it.
- **Android:** Credential Manager `createCredential(CreatePasswordRequest)`, which shows the save prompt. Resolves `true`
  when saved and `false` on any error, including the user declining. Rejects with `NOT_SUPPORTED_ERROR` without Play
  Services and `NO_ACTIVITY_ERROR`.

Does not emit events, except the failure event for the Android rejections.

## Apple

### `appleSignIn(androidWebUrl?, options?)`

**iOS:** native Sign in with Apple sheet (`ASAuthorizationAppleIDProvider`) requesting `fullName` and `email`, with
`options.nonce` and `options.state`. `androidWebUrl` is ignored.

- Resolves `APPLE_ID` or `CANCELLED`. Rejects with `INVALID_RESULT_ERROR` and `SIMULTANEOUS_CALL_ERROR`.
- Apple only sends `email` and `fullName` on the first authorization. This function keeps the first result of each
  `user` **in memory** (lost when the app is killed) and fills empty `email`/`fullName` from it. Store them on your
  backend.
- `idToken` and `authorizationCode` are `null` when Apple does not return them. `state` is `options.state` echoed back.

**Android:** opens `androidWebUrl` in a Custom Tab. `options` is ignored, so put the nonce/state in your url. Your
backend runs the Apple web flow and must redirect to `<applicationId>://oauth/callback`, the uri the library's
`CustomTabsActivity` handles.

- Resolves `WEB_APPLE_ID` with the redirect `url`, `scheme`, `host`, `path` and `query`.
- Resolves `CANCELLED` when the user closes the tab or an `oauthSignIn` starts.
- Rejects with `INVALID_RESULT_ERROR` (missing/invalid url), `NO_ACTIVITY_ERROR` and `BROWSER_UNAVAILABLE` (no browser
  installed).

Emits success / failure events on both platforms.

```ts
const result = await appleSignIn('https://api.example.com/auth/apple', { nonce: sha256(rawNonce) });
```

### `getAppleIdCredentialState(userId)`

Asks Apple, without UI, whether `userId` (the `user` of `APPLE_ID`) is still signed in to the app
(`ASAuthorizationAppleIDProvider.getCredentialState`). Call it on app start and sign the user out when it is not
`AUTHORIZED`.

Resolves `AUTHORIZED`, `REVOKED`, `TRANSFERRED` or `NOT_FOUND`. Rejects with `INVALID_RESULT_ERROR` when the check fails.
On Android it always rejects with `NOT_SUPPORTED_ERROR`. Does not emit events.

```ts
if ((await getAppleIdCredentialState(storedUserId)) !== AppleIdCredentialState.AUTHORIZED) {
  signOutLocally();
}
```

## Hybrid

### `hybridSignIn(googleClientId, options?)`

Shows a single picker with the credentials the user already has, meant for app start. **The providers differ per
platform:**

- **iOS:** Apple ID + saved passwords. `googleClientId` is ignored, Google is **not** included, and only `options.nonce`
  is used (for Apple ID). On iOS 16+ only credentials already on the device are offered. Resolves `APPLE_ID` or
  `PASSWORD`, or `CANCELLED` when the user dismisses it or nothing is available. Rejects with `INVALID_RESULT_ERROR` and
  `SIMULTANEOUS_CALL_ERROR`.
- **Android:** Credential Manager with Google ID (`GetGoogleIdOption` with `authorizedAccounts`, `autoSelectEnabled`,
  `nonce`) + saved passwords. Apple is **not** included, and `mode`, `scopes`, `offlineAccess` and `hostedDomain` are
  ignored. Resolves `GOOGLE_ID` or `PASSWORD`, or `CANCELLED`. Rejects with `NOT_SUPPORTED_ERROR` (no Play Services),
  `NO_ACTIVITY_ERROR`, `NO_SIGN_IN_AVAILABLE` and `INVALID_RESULT_ERROR`.

Emits success / failure events.

```ts
const result = await hybridSignIn('WEB_CLIENT_ID', { authorizedAccounts: true });
```

## Passkeys

### `createPassKey({ requestJson, preferImmediatelyAvailableCredentials? })`

Registers a passkey from your server's WebAuthn `PublicKeyCredentialCreationOptions` JSON.

- **iOS 16+:** platform passkey registration. It reads `challenge`, `rp.id`, `user.id`, `user.name`,
  `authenticatorSelection.userVerification`, `attestation` and, on iOS 17.4+, `excludeCredentials`. Other fields are
  ignored. `data` is a JSON string with `id`, `rawId`, `type` and `response.clientDataJSON` / `attestationObject`
  (base64url). Rejects with `NOT_SUPPORTED_ERROR` below iOS 16 and `SIMULTANEOUS_CALL_ERROR`.
- **Android 9+:** Credential Manager `CreatePublicKeyCredentialRequest` with the whole JSON and
  `preferImmediatelyAvailableCredentials`. `data` is the registration response JSON from Credential Manager. Rejects with
  `NOT_SUPPORTED_ERROR` below Android 9 and `NO_ACTIVITY_ERROR`.

Resolves `PASSKEY` or `CANCELLED`. Rejects with `INVALID_RESULT_ERROR` for a missing/invalid `requestJson` and other
errors. Emits success / failure events. Send `data` to your server to verify it.

### `getPassKey({ requestJson, preferImmediatelyAvailableCredentials?, mediation? })`

Signs in with a passkey from your server's WebAuthn `PublicKeyCredentialRequestOptions` JSON.

- **iOS 16+:** platform passkey assertion. It reads `challenge`, `rpId`, `allowCredentials` and `userVerification`.
  - `mediation: 'modal'` (default) shows a sheet that only offers passkeys on the device, with no "other device" QR
    option, so it resolves `CANCELLED` when there is none. Rejects with `SIMULTANEOUS_CALL_ERROR` while a passkey call is
    pending.
  - `mediation: 'autofill'` shows no sheet. It waits until the user picks a passkey in the QuickType bar of a
    `textContentType="username"` field. Any later `createPassKey`/`getPassKey` call, or `cancelPassKeyAutoFill()`,
    resolves it as `CANCELLED`.
  - `data` is a JSON string with `id`, `rawId`, `type` and `response.clientDataJSON` / `authenticatorData` / `signature`
    / `userHandle` (base64url). Rejects with `NOT_SUPPORTED_ERROR` below iOS 16.
- **Android 9+:** Credential Manager `GetPublicKeyCredentialOption` with the whole JSON and
  `preferImmediatelyAvailableCredentials`. `mediation` is ignored. `data` is the authentication response JSON from
  Credential Manager. Rejects with `NOT_SUPPORTED_ERROR` below Android 9, `NO_ACTIVITY_ERROR` and `NO_SIGN_IN_AVAILABLE`
  (no passkey).

Resolves `PASSKEY` or `CANCELLED`. Rejects with `INVALID_RESULT_ERROR` for a missing/invalid `requestJson` and other
errors. Emits success / failure events.

### `cancelPassKeyAutoFill()`

Cancels a pending `getPassKey({ mediation: 'autofill' })`, which then resolves (and emits) `CANCELLED`. Call it when the
sign in screen unmounts.

Resolves `true` when a pending AutoFill request was cancelled and `false` when there was none. Always resolves `false` on
Android and below iOS 16.

## Generic OAuth / OpenID Connect

### `oauthSignIn(options)`

Signs in with any OAuth 2.0 / OpenID Connect provider using the authorization code flow:

1. Generates a random `state` and a PKCE S256 verifier/challenge on the native side (32 and 16 random bytes,
   base64url).
2. Builds `authorizationEndpoint?response_type=code&client_id=…&redirect_uri=…&state=…`, plus `scope` (space separated)
   and `code_challenge` + `code_challenge_method=S256` when `usePKCE` is not `false`. `additionalParameters` are added
   last and override these.
3. Opens it in `ASWebAuthenticationSession` on iOS, with the `redirectUri` scheme as callback and
   `prefersEphemeralSession`. On Android it opens a Custom Tab (http/https urls only), where the redirect must reach the
   library's `CustomTabsActivity`: use `OAUTH_REDIRECT_URI` or add an intent filter for your uri.
4. Reads the redirect query and fragment parameters and checks that `state` matches.
5. `error=access_denied` resolves `CANCELLED`. Any other `error`, or a missing `code`, rejects.
6. When `tokenEndpoint` is set, it POSTs `grant_type=authorization_code`, `code`, `client_id`, `redirect_uri` and
   `code_verifier` as `application/x-www-form-urlencoded` and returns the JSON response in `tokens`. No client secret is
   sent and the `id_token` is not validated.

Resolves `OAUTH` with `code`, `state`, `redirectUri`, `codeVerifier` (null without PKCE), `params` (all redirect params)
and `tokens` (null without `tokenEndpoint`). Resolves `CANCELLED` when the user closes the browser, the provider returns
`access_denied` or, on Android, an `appleSignIn` starts.

Rejects with:

- `INVALID_RESULT_ERROR`: state mismatch, provider error, no code, or the token endpoint returned non 2xx (`message` is
  its `error_description`/`error`).
- `BROWSER_UNAVAILABLE`: iOS Guided Access, app not active within 2 seconds, or the session could not start; Android
  with no browser installed.
- `NO_ACTIVITY_ERROR` (Android) and `SIMULTANEOUS_CALL_ERROR` (iOS).

Network errors and non-JSON token responses are thrown as-is, without a `code`. Does not emit events. See
[OAuth Sign-In](./usage/oauth).

## Events

See also the [Events guide](./usage/events.md).

### `addCredentialSuccessListener(listener)`

Called with the same `{ type, data }` the promise resolves with, including `CANCELLED`. It fires for `googleSignIn`,
`googleSilentSignIn`, `getPassword`, `appleSignIn`, `hybridSignIn`, `createPassKey` and `getPassKey`.

### `addCredentialFailureListener(listener)`

Called with `{ code, message }` when one of those methods rejects. These rejections are not emitted:

- `SIMULTANEOUS_CALL_ERROR`;
- iOS passkey `NOT_SUPPORTED_ERROR` below iOS 16;
- iOS missing `requestJson`.

### `addAppleIdCredentialRevokedListener(listener)`

Called when iOS posts `ASAuthorizationAppleIDProvider.credentialRevokedNotification`, meaning the user stopped using
Apple ID with the app while it is running. Never called on Android.

`signOut`, `passwordSignIn` (iOS), `getAppleIdCredentialState`, `cancelPassKeyAutoFill` and `oauthSignIn` do not emit
events.

```ts
const success = addCredentialSuccessListener((event) => analytics.track('sign_in', { type: event.type }));
const failure = addCredentialFailureListener((event) => analytics.track('sign_in_error', { code: event.code }));
const revoked = addAppleIdCredentialRevokedListener(() => signOutLocally());

// later
success.remove();
failure.remove();
revoked.remove();
```

## Constants

Read once when the module loads.

| Constant | iOS | Android |
|---|---|---|
| `GOOGLE_PLAY_SERVICES_SUPPORTED` | `false` | Play Services installed and up to date |
| `GOOGLE_ID_SUPPORTED` | `true` | same as `GOOGLE_PLAY_SERVICES_SUPPORTED` |
| `PASSWORD_SUPPORTED` | `true` | `true` (but `getPassword`/`passwordSignIn` need Play Services) |
| `APPLE_ID_SUPPORTED` | `true` | `true` (web flow) |
| `HYBRID_SUPPORTED` | `true` | `true` (but `hybridSignIn` needs Play Services) |
| `PASSKEYS_SUPPORTED` | iOS 16+ | Android 9+ (API 28) |
| `OAUTH_REDIRECT_URI` | `<bundle id, lowercased>://oauth/callback` | `<applicationId>://oauth/callback` |
