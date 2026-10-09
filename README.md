# About

**React Native OAuth Essentials** is an essential OAuth solution for React Native apps. It provides **up-to-date Google
Sign-In, Apple Sign-In, saved passwords, passkeys and generic OAuth 2.0 / OpenID Connect**, delivering a **native sign-in experience** with a simple, promise-based
API. It's a must-have for every React Native app.

## Installation

Install the library via npm:

```bash
npm install react-native-oauth-essentials
```

```bash
yarn add react-native-oauth-essentials
```

## How to use it

Please jump to our docs website

[Docs](https://lucaswitch.github.io/react-native-oauth-essentials/docs/intro)
[Installation](https://lucaswitch.github.io/react-native-oauth-essentials/docs/installation)

Using a coding agent? Paste the [setup prompt for AI agents](https://lucaswitch.github.io/react-native-oauth-essentials/docs/ai-setup) to install and configure everything.

Requires the **New Architecture**. Not supported in Expo Go: use a development build and the [Expo config plugin](#expo).

## Features

| Feature | iOS | Android |
|---|---|---|
| Google | GoogleSignIn SDK | Credential Manager (bottom sheet / "Sign in with Google" button flow) + Authorization API |
| Apple | Native `AuthenticationServices` | Your web flow in a Custom Tab (needs a backend) |
| Saved passwords | `ASAuthorizationPasswordProvider` | Credential Manager |
| Passkeys | iOS 16+, including AutoFill | Android 9+ |
| Hybrid (one picker at app start) | Apple ID + passwords | Google + passwords |
| Any OAuth 2.0 / OpenID Connect provider | `ASWebAuthenticationSession` + PKCE | Custom Tab + PKCE |

Android features based on Credential Manager need Google Play Services. Exact per-platform behavior of every function:
[Methods reference](https://lucaswitch.github.io/react-native-oauth-essentials/docs/methods).

## API

### Import

```typescript
import {
  // Google
  googleSignIn,
  googleSilentSignIn,
  signOut,
  // Apple
  appleSignIn,
  getAppleIdCredentialState,
  // Passwords
  getPassword,
  passwordSignIn,
  // Hybrid
  hybridSignIn,
  // Passkeys
  createPassKey,
  getPassKey,
  cancelPassKeyAutoFill,
  // Generic OAuth / OpenID Connect
  oauthSignIn,
  // Events
  addCredentialSuccessListener,
  addCredentialFailureListener,
  addAppleIdCredentialRevokedListener,
  // Constants
  GOOGLE_PLAY_SERVICES_SUPPORTED,
  PASSWORD_SUPPORTED,
  GOOGLE_ID_SUPPORTED,
  APPLE_ID_SUPPORTED,
  HYBRID_SUPPORTED,
  PASSKEYS_SUPPORTED,
  OAUTH_REDIRECT_URI,
  // Errors
  isCredentialError,
  // Enums
  CredentialsType,
  CredentialError,
  AppleIdCredentialState,
} from 'react-native-oauth-essentials';
```

### Conventions

- Dismissing the UI **resolves** `{ type: CredentialsType.CANCELLED, data: null }` instead of rejecting.
- Errors reject with `error.code` from `CredentialError` (every rejection has a `code`). Narrow them with
  `isCredentialError`.
- iOS rejects a second call of the same flow while the first is pending with `SIMULTANEOUS_CALL_ERROR`.
- In development, options that have no effect on the current platform log a `console.warn` once
  (`[react-native-oauth-essentials] googleSignIn: "hint" is ignored on Android.`).

### Constants

| Constant | iOS | Android |
|---|---|---|
| `GOOGLE_PLAY_SERVICES_SUPPORTED` | `false` | Play Services installed and up to date |
| `GOOGLE_ID_SUPPORTED` | `true` | Same as `GOOGLE_PLAY_SERVICES_SUPPORTED` |
| `PASSWORD_SUPPORTED` | `true` | Same as `GOOGLE_PLAY_SERVICES_SUPPORTED` |
| `APPLE_ID_SUPPORTED` | `true` | `true` (web flow) |
| `HYBRID_SUPPORTED` | `true` | Same as `GOOGLE_PLAY_SERVICES_SUPPORTED` |
| `PASSKEYS_SUPPORTED` | iOS 16+ | Android 9+ |
| `OAUTH_REDIRECT_URI` | `<bundle id, lowercased>://oauth/callback` | `<applicationId>://oauth/callback` |

### Google

#### `googleSignIn(clientId?, options?)`

Shows the Google sign in UI. Also `googleSignIn()` / `googleSignIn(options)`: the client id is optional and, when it is
omitted, read from the app config:

- iOS: `GIDClientID` in Info.plist, then `CLIENT_ID` of the Firebase `GoogleService-Info.plist`. The `serverClientId`
  (idToken audience and `serverAuthCode`) falls back to `webClientId`, then `GIDServerClientID`. iOS also needs the
  reversed iOS client id as a URL scheme in `Info.plist` (`1234-abcd.apps.googleusercontent.com` becomes
  `com.googleusercontent.apps.1234-abcd`): without it the call rejects with `CONFIGURATION_ERROR`, whose message has the
  exact scheme to add.
- Android: the web client id from the `com.oauthessentials.GOOGLE_WEB_CLIENT_ID` `<meta-data>` of AndroidManifest.xml,
  then the Firebase `default_web_client_id` string (from `google-services.json`). The Android client id is never passed.
- None found: rejects with `CONFIGURATION_ERROR`. The [Expo config plugin](#expo) writes all of it.

`clientId` can also be passed as `{ iosClientId?, webClientId? }` (all from the same Google Cloud project; a passed id
wins over the config), or as a string used as is (the iOS client id on iOS, the web client id on Android).

```typescript
const result = await googleSignIn({ // or googleSignIn({ iosClientId, webClientId }, { ... })
  mode: 'button', // Android: full "Sign in with Google" flow (use it for button taps)
  nonce,          // embedded in the idToken
  scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
});

if (result.type === CredentialsType.GOOGLE_ID) {
  await api.signInWithGoogle(result.data.idToken);
}
```

**Returns:** `Promise<GoogleIdCredentialResult | CancelledCredentialResult>`

#### `googleSilentSignIn(clientId?, options?)`

Restores a previous Google sign in, without UI on iOS (and on Android when a single account signed in before). Rejects
with `NO_SIGN_IN_AVAILABLE` when there is nothing to restore.

```typescript
try {
  const result = await googleSilentSignIn();
} catch (e) {
  if (isCredentialError(e, CredentialError.NO_SIGN_IN_AVAILABLE)) showSignInScreen();
}
```

#### `signOut()`

Clears the Google session on iOS and the Credential Manager state on Android (no auto select until the user picks an
account again). **Returns:** `Promise<true>`

### Apple

#### `appleSignIn(androidWebUrl?, options?)`

- iOS: native sheet. `options`: `{ nonce?, state? }`. Apple only sends `email`/`fullName` on the first authorization;
  the library caches them in memory, so store them on your backend.
- Android: opens `androidWebUrl` in a Custom Tab. Your backend runs the Apple web flow and redirects to
  `<applicationId>://oauth/callback`. `options` are ignored.

```typescript
const result = await appleSignIn('https://api.example.com/auth/apple', { nonce: sha256(rawNonce) });

if (result.type === CredentialsType.APPLE_ID) {
  await api.signInWithApple(result.data.idToken, result.data.fullName); // iOS
} else if (result.type === CredentialsType.WEB_APPLE_ID) {
  await api.finishAppleWebFlow(result.data.url); // Android
}
```

**Returns:** `Promise<AppleIdCredentialResult | WebAppleIdCredentialResult | CancelledCredentialResult>`

#### `getAppleIdCredentialState(userId)` (iOS)

Checks without UI whether the Apple ID `user` is still signed in to the app. Call it on app start.

```typescript
const state = await getAppleIdCredentialState(storedAppleUserId);
if (state !== AppleIdCredentialState.AUTHORIZED) signOutLocally(); // REVOKED, NOT_FOUND, TRANSFERRED
```

Rejects with `NOT_SUPPORTED_ERROR` on Android.

### Passwords

#### `getPassword()`

Shows the passwords saved for the app. **Returns:** `Promise<PasswordCredentialResult | CancelledCredentialResult>`.
When there is no password or the user dismisses it, both platforms resolve the `CANCELLED` result. Other Android errors
reject with `INVALID_RESULT_ERROR`.

```typescript
const result = await getPassword();
if (result.type === CredentialsType.PASSWORD) {
  await api.signIn(result.data.username, result.data.password);
}
```

> **Migrating to 1.1:** `getPassword()` no longer resolves `false` on Android. Replace `if (!result)` /
> `result === false` checks with `result.type === CredentialsType.CANCELLED`.

#### `passwordSignIn(username, password)`

Saves a password in the password manager (it does not authenticate). Android shows the save prompt and resolves `true`
when saved. iOS resolves `false` without doing anything: use `textContentType` on your inputs instead.

### Hybrid

#### `hybridSignIn(clientId?, options?)`

One picker with the credentials the user already has, meant for app start. iOS offers Apple ID + saved passwords (the
Google client id is ignored); Android offers Google + saved passwords (uses `webClientId`, or the one in the app config).

```typescript
const result = await hybridSignIn({ authorizedAccounts: true });
if (result.type === CredentialsType.CANCELLED) showSignInScreen();
```

**Returns:** `Promise<AppleIdCredentialResult | GoogleIdCredentialResult | PasswordCredentialResult | CancelledCredentialResult>`

### Passkeys

Your server generates the WebAuthn options and verifies the responses. Needs `webcredentials:` Associated Domains on iOS
(Expo plugin `webCredentialsDomains`) and `assetlinks.json` with the `get_login_creds` relation on Android.

#### `createPassKey({ requestJson })`

Registers a passkey from a `PublicKeyCredentialCreationOptions` JSON string. `result.data` is the registration response
JSON to send to the server.

#### `getPassKey({ requestJson, mediation? })`

Signs in with a passkey from a `PublicKeyCredentialRequestOptions` JSON string. On iOS, `mediation: 'autofill'` shows the
passkeys in the keyboard of a `textContentType="username"` input instead of a sheet.

```typescript
const result = await getPassKey({ requestJson: JSON.stringify(await api.passkeyOptions()) });
if (result.type === CredentialsType.PASSKEY) await api.verifyPasskey(result.data);
```

#### `cancelPassKeyAutoFill()`

Cancels a pending `getPassKey({ mediation: 'autofill' })` (call it when the screen unmounts). Resolves `true` when there
was one to cancel.

### Generic OAuth / OpenID Connect

#### `oauthSignIn(options)`

Authorization code flow with PKCE for any provider (GitHub, Microsoft, Auth0, Keycloak…). Register `OAUTH_REDIRECT_URI`
(or your own `redirectUri`) in the provider.

```typescript
const result = await oauthSignIn({
  authorizationEndpoint: 'https://github.com/login/oauth/authorize',
  clientId: GITHUB_CLIENT_ID,
  scopes: ['read:user', 'user:email'],
  // tokenEndpoint: exchanges the code on the device (public clients only, never with a client secret)
});

if (result.type === CredentialsType.OAUTH) {
  await api.exchangeCode(result.data.code, result.data.codeVerifier, result.data.redirectUri);
}
```

**Returns:** `Promise<OAuthCredentialResult | CancelledCredentialResult>`

### Events

```typescript
const success = addCredentialSuccessListener(({ type }) => analytics.track('sign_in', { type }));
const failure = addCredentialFailureListener(({ code }) => analytics.track('sign_in_error', { code }));
const revoked = addAppleIdCredentialRevokedListener(() => signOutLocally()); // iOS

success.remove();
```

Success and failure fire for `googleSignIn`, `googleSilentSignIn`, `getPassword`, `appleSignIn`, `hybridSignIn`,
`createPassKey` and `getPassKey`.

### Options

```typescript
type GoogleClientId = string | { iosClientId?: string; webClientId?: string };

type GoogleSignInOptions = {
  mode?: 'bottomSheet' | 'button'; // Android
  authorizedAccounts?: boolean;    // Android: only accounts that signed in before
  autoSelectEnabled?: boolean;     // Android
  nonce?: string;
  hint?: string;                   // iOS: email to preselect
  hostedDomain?: string;           // Google Workspace domain
  scopes?: string[];
  offlineAccess?: boolean;         // Android: returns serverAuthCode
  serverClientId?: string;         // iOS: idToken audience + serverAuthCode (default webClientId). Android: serverAuthCode client id
};

type AppleSignInOptions = { nonce?: string; state?: string }; // iOS

type PasskeyOptions = {
  requestJson: string;
  preferImmediatelyAvailableCredentials?: boolean; // Android
  mediation?: 'modal' | 'autofill';                // iOS 16+
};

type OAuthSignInOptions = {
  authorizationEndpoint: string;
  clientId: string;
  redirectUri?: string;                         // default OAUTH_REDIRECT_URI
  scopes?: string[];
  additionalParameters?: Record<string, string>;
  tokenEndpoint?: string;
  usePKCE?: boolean;                            // default true
  prefersEphemeralSession?: boolean;            // iOS
};
```

### Results

```typescript
type GoogleIdCredentialResult = {
  type: CredentialsType.GOOGLE_ID;
  data: {
    id: string;                        // iOS: Google user id (sub). Android: email
    idToken: string;
    displayName: string;
    givenName: string;
    familyName: string;
    email?: string;
    profilePictureUri?: string | null;
    phoneNumber?: string | null;       // Android
    accessToken?: string | null;
    serverAuthCode?: string | null;
    grantedScopes?: string[] | null;
  };
};

type AppleIdCredentialResult = {
  type: CredentialsType.APPLE_ID;
  data: {
    idToken: string;
    authorizationCode: string;
    user: string;                      // stable Apple user id
    email: string;
    fullName: string;
    likelyReal: boolean;
    state?: string | null;
  };
};

type WebAppleIdCredentialResult = {
  type: CredentialsType.WEB_APPLE_ID;  // Android
  data: { url: string; scheme: string | null; host: string | null; path: string | null; query: string | null };
};

type PasswordCredentialResult = {
  type: CredentialsType.PASSWORD;
  data: { username: string; password: string };
};

type PassKeyCredentialResult = {
  type: CredentialsType.PASSKEY;
  data: string;                        // WebAuthn response JSON
};

type OAuthCredentialResult = {
  type: CredentialsType.OAUTH;
  data: {
    code: string;
    state: string;
    redirectUri: string;
    codeVerifier: string | null;
    params: Record<string, string>;    // all redirect parameters
    tokens: Record<string, unknown> | null; // token endpoint response
  };
};

type CancelledCredentialResult = { type: CredentialsType.CANCELLED; data: null };
```

### Error codes

| `CredentialError` | When |
|---|---|
| `CONFIGURATION_ERROR` | Setup bug: no Google client id (passed or in the app config), iOS URL scheme missing from Info.plist (`message` has the exact scheme), invalid `redirectUri` |
| `NOT_SUPPORTED_ERROR` | No Play Services (Android), passkeys on old OS, `getAppleIdCredentialState` on Android |
| `NO_ACTIVITY_ERROR` | No activity / view controller to present the UI |
| `NO_SIGN_IN_AVAILABLE` | Nothing to return: no previous sign in, account or passkey |
| `BROWSER_UNAVAILABLE` | Browser session could not open (iOS: app not active, Guided Access; Android: no browser) |
| `SIMULTANEOUS_CALL_ERROR` | iOS: the same flow is still pending |
| `NETWORK_ERROR` | `oauthSignIn`: the token request failed |
| `INVALID_RESULT_ERROR` | The provider failed or returned an unexpected result (`message` has the details) |
| `NO_PLAY_SERVICES_ERROR` | Deprecated, never thrown |

`isCredentialError(error, code?)` narrows an unknown error to `OauthEssentialsError` (`Error & { code }`):

```typescript
try {
  await googleSignIn();
} catch (e) {
  if (isCredentialError(e, CredentialError.CONFIGURATION_ERROR)) console.error(e.message);
  else if (isCredentialError(e, CredentialError.BROWSER_UNAVAILABLE)) showRetryMessage();
  else if (isCredentialError(e)) report(e.code);
  else throw e;
}
```

## Expo

Not supported in Expo Go (it only contains the Expo SDK native code; importing the library there throws an error saying
so): use a development build (`npx expo run:ios` / `npx expo run:android` or `eas build --profile development`). The
config plugin writes the native config:

```json
{
  "expo": {
    "plugins": [
      ["react-native-oauth-essentials", {
        "google": { "iosClientId": "1234-abcd.apps.googleusercontent.com", "webClientId": "5678-efgh.apps.googleusercontent.com" },
        "appleSignIn": true,
        "webCredentialsDomains": ["example.com"]
      }]
    ]
  }
}
```

- `google`: `{ iosClientId?, webClientId? }` or `true`. Missing ids are read from the Firebase files set in
  `ios.googleServicesFile` / `android.googleServicesFile`. iOS: the reversed iOS client id URL scheme and `GIDClientID` /
  `GIDServerClientID` in Info.plist. Android: the `com.oauthessentials.GOOGLE_WEB_CLIENT_ID` meta-data. Then call
  `googleSignIn()` without client ids.
- `appleSignIn`: adds the Sign in with Apple entitlement.
- `webCredentialsDomains`: adds `webcredentials:` associated domains (passkeys and saved passwords).

If the native module is missing outside Expo Go, rebuild the app after installing (`pod install` + native build;
reloading Metro is not enough) with the New Architecture enabled.

[Expo docs](https://lucaswitch.github.io/react-native-oauth-essentials/docs/expo)

## Testing (Jest)

Importing the library in Jest fails with a `native module "OauthEssentials" was not found` error unless you use the
bundled mock:

```js
// jest.setup.js (referenced by "setupFiles" in the Jest config)
jest.mock('react-native-oauth-essentials', () => require('react-native-oauth-essentials/jest'));
```

Every method is a `jest.fn()` resolving a plausible result; override it per test with `mockResolvedValueOnce` /
`mockRejectedValueOnce`. [Testing docs](https://lucaswitch.github.io/react-native-oauth-essentials/docs/testing)

## Short history

I’ve always felt that React Native lacked a single library that handles OAuth end-to-end. Most React Native apps end up
downloading multiple libraries just to implement OAuth features. Each library feels different—they follow different
philosophies, have different implementations, and some are outdated.

Coming from native development, I wanted a library that provides all the OAuth features an app actually needs. That’s
why I created and launched it as “Essentials.” One big reason is that if you include Google OAuth in your app, Apple’s
App Store policies require you to provide Apple OAuth as well, or your app won’t be approved.

I was frustrated going through this process myself, and seeing how much time React Native developers spent trying to
deliver a “good enough” sign-in experience. So I thought—why not create one library that actually behaves and doesn’t
make me want to throw my laptop out the window?

## Philosophy

Free forever, up-to-date features, and focused only on the essentials your mobile app really needs.
