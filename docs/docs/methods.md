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

**Platform Support:** Android and iOS

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

**Returns:** `Promise<`[`AppleIdCredentialResult`](./types#appleidcredentialresult)`>`

A promise that resolves with the Apple ID credential containing user information and authentication tokens.

**Platform Support:** Android and iOS

**Example:**

```ts
import { appleSignIn } from 'react-native-oauth-essentials';

const credential = await appleSignIn();
console.log('Apple ID credential:', credential);
```

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
