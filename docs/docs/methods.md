---
sidebar_position: 5
---

# Methods

This document describes the authentication methods available in `react-native-oauth-essentials`. Each method supports
different sign-in flows and platform capabilities.

## Google Sign-In

### `googleSignIn`

Initiates the Google OAuth sign-in flow, allowing users to authenticate using their Google account.

**Parameters:**

- `webClientId` (string, required) - The web client ID obtained from Google Cloud Console for OAuth authentication
- `options` ([GoogleSignInOptions](./types#googlesigninoptions), optional) - Additional configuration options for
  customizing the sign-in behavior

**Returns:** `Promise<`[`GoogleIdCredentialResult`](./types#googleidcredentialresult)`>`

A promise that resolves with the Google ID credential containing user information and authentication tokens.

**Platform Support:** Android and iOS

**Important:** Always check the `GOOGLE_ID_SUPPORTED` constant before calling this method to verify platform
compatibility.

**Example:**

```ts
import { googleSignIn, GOOGLE_ID_SUPPORTED } from 'react-native-oauth-essentials';

if (GOOGLE_ID_SUPPORTED) {
  const credential = await googleSignIn('YOUR_WEB_CLIENT_ID', {
    // optional configuration
  });
  console.log(credential);
} else {
  console.log('Google sign-in is not supported on this platform.');
}
```

**Options:** `nonce`, `hostedDomain`, `scopes` and `offlineAccess` work on both platforms; `hint` and `serverClientId`
are iOS only; `mode`, `authorizedAccounts` and `autoSelectEnabled` are Android only. When `scopes` or `offlineAccess`
are set, the result also has `accessToken`, `grantedScopes` and `serverAuthCode`.

On iOS the sign in opens a browser session (`ASWebAuthenticationSession`). When it cannot be opened (the app is in
background for more than 2 seconds, Guided Access is on, or the system refuses to start it) the promise rejects with
`BROWSER_UNAVAILABLE`. A second call while the first one is pending rejects with `SIMULTANEOUS_CALL_ERROR`.

### `googleSilentSignIn`

Restores a previous Google sign in. On iOS it never shows UI; on Android it only lists accounts that already signed in
to the app and auto selects when there is a single one. Rejects with `NO_SIGN_IN_AVAILABLE` when there is nothing to
restore.

```ts
import { googleSilentSignIn, CredentialError } from 'react-native-oauth-essentials';

try {
  const credential = await googleSilentSignIn('YOUR_WEB_CLIENT_ID');
} catch (error) {
  if (error.code === CredentialError.NO_SIGN_IN_AVAILABLE) {
    // show the sign in screen
  }
}
```

### `signOut`

Clears the stored Google session on iOS and the Credential Manager state on Android, so auto select does not sign the
user back in. Resolves `true`.

## Password Authentication

### `getPassword`

Retrieves a previously stored password credential from the device's secure credential storage.

**Returns:** `Promise<false | `[`PasswordCredentialResult`](./types#passwordcredentialresult)`>`

Returns the stored password credential if available, or `false` if no credential is stored.

**Platform Support:** Android and iOS

**Important:** Verify `PASSWORD_SUPPORTED` is true before using this method.

**Example:**

```ts
import { getPassword, PASSWORD_SUPPORTED } from 'react-native-oauth-essentials';

if (PASSWORD_SUPPORTED) {
  const result = await getPassword();
  if (result) {
    console.log('Stored password found:', result);
  } else {
    console.log('No stored password available.');
  }
}
```

### `passwordSignIn`

Performs username and password authentication. Note that this method requires explicit credentials and cannot utilize
stored passwords.

**Parameters:**

- `username` (string, required) - The user's username or email address
- `password` (string, required) - The user's password

**Returns:** `Promise<boolean>`

Returns `true` if authentication succeeds, `false` otherwise.

**Platform Support:** Android. On iOS it always resolves `false`: saving a password requires an associated domain, use
the `textContentType` (`username`, `password`, `newPassword`) props of your inputs to let iOS offer to save it.

**Important:** Check `PASSWORD_SUPPORTED` before calling this method.

**Example:**

```ts
import { passwordSignIn, PASSWORD_SUPPORTED } from 'react-native-oauth-essentials';

if (PASSWORD_SUPPORTED) {
  const success = await passwordSignIn('user@example.com', 'mypassword');
  if (success) {
    console.log('Sign-in successful!');
  } else {
    console.log('Sign-in failed.');
  }
} else {
  console.log('Password sign-in is not supported on this platform.');
}
```

## Apple Sign-In

### `appleSignIn`

Initiates the Apple ID authentication flow, enabling users to sign in with their Apple account.

**Parameters:**

- `androidWebUrl` (string, Android only) - Your web Sign in with Apple url, opened in a Custom Tab
- `options` ([AppleSignInOptions](./types#applesigninoptions), optional) - `nonce` and `state` (iOS)

Apple only returns `email` and `fullName` on the first sign in: store them on your backend.

**Returns:** `Promise<`[`AppleIdCredentialResult`](./types#appleidcredentialresult)`>`

A promise that resolves with the Apple ID credential containing user information and authentication tokens.

**Platform Support:** Android and iOS

**Example:**

```ts
import { appleSignIn } from 'react-native-oauth-essentials';

const credential = await appleSignIn(undefined, { nonce: hashedNonce });
console.log('Apple ID credential:', credential);
```

### `getAppleIdCredentialState`

Gets the state of an Apple ID credential (`AUTHORIZED`, `REVOKED`, `NOT_FOUND` or `TRANSFERRED`). Call it on app start
with the stored `user` and sign the user out when it is not `AUTHORIZED`. iOS only, rejects with `NOT_SUPPORTED_ERROR`
on Android.

```ts
import { getAppleIdCredentialState, AppleIdCredentialState } from 'react-native-oauth-essentials';

const state = await getAppleIdCredentialState(storedAppleUserId);
if (state !== AppleIdCredentialState.AUTHORIZED) {
  signOutLocally();
}
```

## Generic OAuth / OpenID Connect

### `oauthSignIn`

Signs in with any OAuth 2.0 / OpenID Connect provider (Microsoft, GitHub, Facebook, Auth0, Keycloak...) using the
authorization code flow with PKCE. See [OAuth Sign-In](./usage/oauth).

## Events

Every method also reports its result through events, useful for analytics:

```ts
import {
  addCredentialSuccessListener,
  addCredentialFailureListener,
  addAppleIdCredentialRevokedListener,
} from 'react-native-oauth-essentials';

const success = addCredentialSuccessListener((event) => console.log(event.type));
const failure = addCredentialFailureListener((event) => console.log(event.code, event.message));
const revoked = addAppleIdCredentialRevokedListener(() => signOutLocally()); // iOS only

// later
success.remove();
failure.remove();
revoked.remove();
```

`oauthSignIn` does not emit events.

## Unified Authentication

### `hybridSignIn`

Attempts all available sign-in methods simultaneously and returns the first successful credential found. This method is
designed for use during app initialization to restore existing authentication sessions.

**Parameters:**

- `googleClientId` (string, required) - Web client ID for Google sign-in functionality
- `options` ([GoogleSignInOptions](./types#googlesigninoptions), optional) - Additional configuration options for Google
  sign-in

**Returns:** `Promise<`[`AppleIdCredentialResult`](./types#appleidcredentialresult)` | `[
`GoogleIdCredentialResult`](./types#googleidcredentialresult)` | `[
`PasswordCredentialResult`](./types#passwordcredentialresult)`>`

Resolves with the first available credential found, which could be from Apple, Google, or password authentication.

**Platform Support:** Android and iOS

**Use Case:** This method automatically checks for existing Apple, Google, and password credentials, making it ideal for
seamless authentication restoration when users launch your app.

**Example:**

```ts
import { hybridSignIn } from 'react-native-oauth-essentials';

const credential = await hybridSignIn('YOUR_GOOGLE_CLIENT_ID', {
  authorizedAccounts: true,
  autoSelectEnabled: false,
});

console.log('Existing sign-in credential:', credential);
```
