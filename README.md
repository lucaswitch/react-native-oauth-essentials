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

Requires the **New Architecture**. Not supported in Expo Go (use a development build).

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
  // Enums
  CredentialsType,
  CredentialError,
  AppleIdCredentialState,
} from 'react-native-oauth-essentials';
```

### Conventions

- Dismissing the UI **resolves** `{ type: CredentialsType.CANCELLED, data: null }` instead of rejecting.
- Errors reject with `error.code` from `CredentialError`.
- iOS rejects a second call of the same flow while the first is pending with `SIMULTANEOUS_CALL_ERROR`.

### Constants

| Constant | iOS | Android |
|---|---|---|
| `GOOGLE_PLAY_SERVICES_SUPPORTED` | `false` | Play Services installed and up to date |
| `GOOGLE_ID_SUPPORTED` | `true` | Same as `GOOGLE_PLAY_SERVICES_SUPPORTED` |
| `PASSWORD_SUPPORTED` | `true` | `true` (the methods still need Play Services) |
| `APPLE_ID_SUPPORTED` | `true` | `true` (web flow) |
| `HYBRID_SUPPORTED` | `true` | `true` (the method still needs Play Services) |
| `PASSKEYS_SUPPORTED` | iOS 16+ | Android 9+ |
| `OAUTH_REDIRECT_URI` | `<bundle id, lowercased>://oauth/callback` | `<applicationId>://oauth/callback` |

### Google

#### `googleSignIn(clientId, options?)`

Shows the Google sign in UI. Pass the **iOS client id on iOS** and the **web client id on Android**. iOS also needs the
reversed iOS client id as a URL scheme in `Info.plist`.

```typescript
const result = await googleSignIn(Platform.select({ ios: IOS_CLIENT_ID, default: WEB_CLIENT_ID })!, {
  mode: 'button',                // Android: full "Sign in with Google" flow (use it for button taps)
  serverClientId: WEB_CLIENT_ID, // iOS: idToken audience and serverAuthCode
  nonce,                         // embedded in the idToken
  scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
});

if (result.type === CredentialsType.GOOGLE_ID) {
  await api.signInWithGoogle(result.data.idToken);
}
```

**Returns:** `Promise<GoogleIdCredentialResult | CancelledCredentialResult>`

#### `googleSilentSignIn(clientId, options?)`

Restores a previous Google sign in, without UI on iOS (and on Android when a single account signed in before). Rejects
with `NO_SIGN_IN_AVAILABLE` when there is nothing to restore.

```typescript
try {
  const result = await googleSilentSignIn(GOOGLE_CLIENT_ID);
} catch (e) {
  if (e.code === CredentialError.NO_SIGN_IN_AVAILABLE) showSignInScreen();
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

Shows the passwords saved for the app. **Returns:** `Promise<false | PasswordCredentialResult>`. When there is no
password or the user dismisses it, iOS resolves the `CANCELLED` result and Android resolves `false`.

```typescript
const result = await getPassword();
if (result && result.type === CredentialsType.PASSWORD) {
  await api.signIn(result.data.username, result.data.password);
}
```

#### `passwordSignIn(username, password)`

Saves a password in the password manager (it does not authenticate). Android shows the save prompt and resolves `true`
when saved. iOS resolves `false` without doing anything: use `textContentType` on your inputs instead.

### Hybrid

#### `hybridSignIn(googleClientId, options?)`

One picker with the credentials the user already has, meant for app start. iOS offers Apple ID + saved passwords (the
Google client id is ignored); Android offers Google + saved passwords.

```typescript
const result = await hybridSignIn(WEB_CLIENT_ID, { authorizedAccounts: true });
if (result.type === CredentialsType.CANCELLED) showSignInScreen();
```

**Returns:** `Promise<AppleIdCredentialResult | GoogleIdCredentialResult | PasswordCredentialResult | CancelledCredentialResult>`

### Passkeys

Your server generates the WebAuthn options and verifies the responses. Needs `webcredentials:` Associated Domains on iOS
and `assetlinks.json` on Android.

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
type GoogleSignInOptions = {
  mode?: 'bottomSheet' | 'button'; // Android
  authorizedAccounts?: boolean;    // Android: only accounts that signed in before
  autoSelectEnabled?: boolean;     // Android
  nonce?: string;
  hint?: string;                   // iOS: email to preselect
  hostedDomain?: string;           // Google Workspace domain
  scopes?: string[];
  offlineAccess?: boolean;         // Android: returns serverAuthCode
  serverClientId?: string;         // iOS: idToken audience + serverAuthCode. Android: serverAuthCode client id
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
| `NOT_SUPPORTED_ERROR` | No Play Services (Android), passkeys on old OS, `getAppleIdCredentialState` on Android |
| `NO_ACTIVITY_ERROR` | No activity / view controller to present the UI |
| `NO_SIGN_IN_AVAILABLE` | Nothing to return: no previous sign in, account or passkey |
| `BROWSER_UNAVAILABLE` | Browser session could not open (iOS: app not active, Guided Access; Android: no browser) |
| `SIMULTANEOUS_CALL_ERROR` | iOS: the same flow is still pending |
| `INVALID_RESULT_ERROR` | The provider failed or returned an unexpected result (`message` has the details) |
| `NO_PLAY_SERVICES_ERROR` | Deprecated, never thrown |

```typescript
try {
  await googleSignIn(GOOGLE_CLIENT_ID);
} catch (e) {
  if (e.code === CredentialError.BROWSER_UNAVAILABLE) showRetryMessage();
  else if (e.code === CredentialError.NOT_SUPPORTED_ERROR) showUpdatePlayServicesMessage();
}
```

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
