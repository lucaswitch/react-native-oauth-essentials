---
sidebar_position: 6
---

# Types

This document describes the TypeScript types and enums available in `react-native-oauth-essentials`. These types provide
strong typing for authentication credentials and configuration options.

## Configuration Types

### `GoogleSignInOptions`

Configuration options for customizing the Google sign-in behavior.

**Properties:**

- `authorizedAccounts` (boolean, optional) - **Android only.** When enabled, allows users to select from previously authorized Google
  accounts on the device
- `autoSelectEnabled` (boolean, optional) - **Android only.** Automatically selects a Google account if only one authorized account is
  available, skipping the account picker UI
- `mode` (`'bottomSheet' | 'button'`, optional) - **Android only.** `bottomSheet` (default) shows the Credential Manager
  sheet and, unless `authorizedAccounts` is set, falls back to `button` when no credential is available (no account or
  the sheet is in cooldown after being dismissed). Use `button` for a "Sign in with Google" button tap
- `nonce` (string, optional) - Embedded as-is in the `idToken`, so your backend can prevent replay attacks
- `hint` (string, optional) - **iOS only.** Email or account id to preselect
- `hostedDomain` (string, optional) - Restricts sign in to a Google Workspace domain
- `scopes` (string[], optional) - Additional OAuth scopes; `accessToken` and `grantedScopes` are returned
- `offlineAccess` (boolean, optional) - Returns a `serverAuthCode` your backend can exchange for a refresh token. On iOS
  it requires `serverClientId`
- `serverClientId` (string, optional) - **iOS only.** Web (server) client id, used as the `idToken` audience and for
  `serverAuthCode`. On Android the client id passed to `googleSignIn` already is the server client id

**Example:**

```ts
const options: GoogleSignInOptions = {
  authorizedAccounts: true,   // Android only
  autoSelectEnabled: false,   // Android only
  nonce: 'random-nonce',
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
};
```

### `AppleSignInOptions`

- `nonce` (string, optional) - Passed as-is to Apple. Firebase and Supabase expect the SHA-256 of the raw nonce here
- `state` (string, optional) - **iOS only.** Returned in `AppleIdCredentialResult.data.state`

### `OAuthSignInOptions`

Options of [`oauthSignIn`](./usage/oauth).

- `authorizationEndpoint` (string, required)
- `clientId` (string, required)
- `redirectUri` (string, optional) - Defaults to `OAUTH_REDIRECT_URI`
- `scopes` (string[], optional)
- `additionalParameters` (`Record<string, string>`, optional) - Extra authorization url parameters, like `prompt`
- `tokenEndpoint` (string, optional) - When set, the code is exchanged for tokens on the device
- `usePKCE` (boolean, optional) - Defaults to `true`
- `prefersEphemeralSession` (boolean, optional) - **iOS only.** Do not share cookies with Safari

### `PasskeyOptions`

Configuration options for creating or retrieving passkeys.

**Properties:**

- `requestJson` (string, required) - JSON string containing `PublicKeyCredentialCreationOptions` (for creation) or `PublicKeyCredentialRequestOptions` (for retrieval) as defined by the WebAuthn standard
- `preferImmediatelyAvailableCredentials` (boolean, optional) - **Android only.** When `true`, only show passkeys that are immediately available without requiring additional user interaction
- `mediation` (`'modal' | 'autofill'`, optional) - **iOS 16+ only.** `autofill` shows passkeys in the QuickType bar of
  a text field with `textContentType="username"` instead of a modal sheet. See [Passkeys](./usage/passkey)

**Example:**

```ts
const options: PasskeyOptions = {
  requestJson: JSON.stringify({
    challenge: 'base64-encoded-challenge',
    rp: { name: 'Your App', id: 'yourapp.com' },
    user: {
      id: 'base64-user-id',
      name: 'user@example.com',
      displayName: 'User Name'
    },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
    timeout: 60000,
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      requireResidentKey: true,
      userVerification: 'required'
    }
  }),
  preferImmediatelyAvailableCredentials: true,  // Android only
};
```

## Credential Result Types

These types represent the authentication results returned by different sign-in methods. Each credential type includes a
`type` discriminator and method-specific `data`.

### `PasswordCredentialResult`

Represents the result of password-based authentication.

**Properties:**

- `type` - Always `CredentialsType.PASSWORD`
- `data` - Object containing:
  - `username` (string) - The authenticated user's username or email address
  - `password` (string) - The user's password

**Example:**

```ts
const credential: PasswordCredentialResult = {
  type: CredentialsType.PASSWORD,
  data: {
    username: 'user@example.com',
    password: 'securepassword123',
  },
};
```

### `GoogleIdCredentialResult`

Represents the result of Google OAuth authentication.

**Properties:**

- `type` - Always `CredentialsType.GOOGLE_ID`
- `data` - Object containing:
  - `id` (string) - Unique Google user identifier
  - `idToken` (string) - JWT token for verifying the user's identity with your backend
  - `displayName` (string) - User's full display name
  - `givenName` (string) - User's first name
  - `familyName` (string) - User's last name
  - `profilePictureUri` (string | null, optional) - URL to the user's profile picture, if available
  - `phoneNumber` (string | null, optional) - User's phone number, if shared and available
  - `email` (string, optional) - User's email
  - `accessToken` (string | null, optional) - Only when `scopes` or `offlineAccess` were requested (always on iOS)
  - `grantedScopes` (string[] | null, optional) - Scopes granted to the `accessToken`
  - `serverAuthCode` (string | null, optional) - Only with `offlineAccess` (Android) or `serverClientId` (iOS)

**Example:**

```ts
const credential: GoogleIdCredentialResult = {
  type: CredentialsType.GOOGLE_ID,
  data: {
    id: '1234567890',
    idToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
    displayName: 'John Doe',
    givenName: 'John',
    familyName: 'Doe',
    profilePictureUri: 'https://lh3.googleusercontent.com/...',
    phoneNumber: '+1234567890',
  },
};
```

### `AppleIdCredentialResult`

Represents the result of Apple ID authentication on iOS.

**Properties:**

- `type` - Always `CredentialsType.APPLE_ID`
- `data` - Object containing:
  - `idToken` (string) - JWT ID token
  - `authorizationCode` (string) - Authorization code for backend verification
  - `user` (string) - Unique user identifier (stable across app reinstalls)
  - `email` (string) - User's email address (only provided on first sign-in)
  - `fullName` (string) - User's full name (only provided on first sign-in)
  - `likelyReal` (boolean) - Indicates if the user is likely a real person

**Platform:** iOS only

**Important:** `email` and `fullName` are only provided on the first sign-in. The library caches these values, but you should store them in your backend on first authentication.

**Example:**

```ts
const credential: AppleIdCredentialResult = {
  type: CredentialsType.APPLE_ID,
  data: {
    idToken: 'eyJraWQiOiJlWGF1bm1MIiwiYWxnIjoiUlMyNTYifQ...',
    authorizationCode: 'c1234567890abcdef...',
    user: '000123.abc456def789.0123',
    email: 'user@privaterelay.appleid.com',
    fullName: 'John Appleseed',
    likelyReal: true,
  },
};
```

### `WebAppleIdCredentialResult`

Represents the result of Apple ID authentication on Android (browser-based flow).

**Properties:**

- `type` - Always `CredentialsType.WEB_APPLE_ID`
- `data` - Object containing:
  - `url` (string) - Full redirect URL from the browser
  - `scheme` (string | null) - URL scheme (e.g., "myapp")
  - `host` (string | null) - URL host
  - `path` (string | null) - URL path
  - `query` (string | null) - URL query parameters containing authorization code

**Platform:** Android only

**Note:** You need to parse the `query` string to extract the authorization code, then send it to your backend for token exchange.

**Example:**

```ts
const credential: WebAppleIdCredentialResult = {
  type: CredentialsType.WEB_APPLE_ID,
  data: {
    url: 'myapp://auth/callback?code=c1234567890abcdef&state=xyz',
    scheme: 'myapp',
    host: 'auth',
    path: '/callback',
    query: 'code=c1234567890abcdef&state=xyz',
  },
};

// Extract authorization code from query
const params = new URLSearchParams(credential.data.query || '');
const authCode = params.get('code');
```

### `PassKeyCredentialResult`

Represents the result of passkey creation or retrieval.

**Properties:**

- `type` - Always `CredentialsType.PASSKEY`
- `data` (string) - JSON string containing the platform public key credential response as defined by the WebAuthn standard

**Example:**

```ts
const credential: PassKeyCredentialResult = {
  type: CredentialsType.PASSKEY,
  data: '{"id":"base64-credential-id","rawId":"...","response":{...},"type":"public-key"}',
};

// Parse the credential data
const passkeyData = JSON.parse(credential.data);
console.log('Passkey ID:', passkeyData.id);
```

### `CancelledCredentialResult`

Represents the result when the user cancels the authentication flow.

**Properties:**

- `type` - Always `CredentialsType.CANCELLED`
- `data` - Always `null`

**Note:** This is not an error - it simply indicates the user dismissed the authentication UI. Your app should handle this gracefully, typically by showing alternative sign-in options.

**Example:**

```ts
const credential: CancelledCredentialResult = {
  type: CredentialsType.CANCELLED,
  data: null,
};

// Handle cancellation
if (credential.type === CredentialsType.CANCELLED) {
  console.log('User cancelled sign-in');
  showAlternativeSignInOptions();
}
```

### `OAuthCredentialResult`

Result of [`oauthSignIn`](./methods#oauthsigninoptions).

**Properties:**

- `type` - Always `CredentialsType.OAUTH`
- `data.code` (string) - Authorization code
- `data.state` (string) - The `state` generated by the library and checked against the redirect
- `data.redirectUri` (string) - Redirect URI used in the request (send it with the code to your backend)
- `data.codeVerifier` (string | null) - PKCE verifier, `null` when `usePKCE` is `false`
- `data.params` (`Record<string, string>`) - Every query and fragment parameter of the redirect
- `data.tokens` (`Record<string, unknown>` | null) - Token endpoint JSON response, only when `tokenEndpoint` is set

```ts
const result = await oauthSignIn({ authorizationEndpoint, clientId, scopes: ['openid', 'email'] });
if (result.type === CredentialsType.OAUTH) {
  await api.exchangeCode(result.data.code, result.data.codeVerifier, result.data.redirectUri);
}
```

## Event Types

### `CredentialSuccessEvent`

Received by [`addCredentialSuccessListener`](./usage/events.md). Same shape as the resolved result.

- `type` (string) - A `CredentialsType` value, including `CANCELLED`
- `data` (object | null) - The result `data`

### `CredentialFailureEvent`

Received by [`addCredentialFailureListener`](./usage/events.md).

- `code` (string) - A `CredentialError` value
- `message` (string) - Native error message

## Enumerations

### `CredentialsType`

Enum defining the available credential types for discriminating between different authentication results.

**Values:**

- `GOOGLE_ID` - Google OAuth credential
- `PASSWORD` - Username and password credential
- `APPLE_ID` - Apple ID credential (iOS native)
- `WEB_APPLE_ID` - Apple ID credential (Android browser-based)
- `CANCELLED` - User cancelled the authentication flow
- `PASSKEY` - Passkey (WebAuthn/FIDO2) credential
- `OAUTH` - Authorization code from a generic OAuth 2.0 / OpenID Connect provider

**Usage:**

```ts
import { CredentialsType } from 'react-native-oauth-essentials';

// Type narrowing example
function handleCredential(
  credential: GoogleIdCredentialResult | PasswordCredentialResult | AppleIdCredentialResult | CancelledCredentialResult
) {
  switch (credential.type) {
    case CredentialsType.GOOGLE_ID:
      console.log('Google user:', credential.data.displayName);
      break;
    case CredentialsType.PASSWORD:
      console.log('Password login:', credential.data.username);
      break;
    case CredentialsType.APPLE_ID:
      console.log('Apple ID login:', credential.data.user);
      break;
    case CredentialsType.WEB_APPLE_ID:
      console.log('Android Apple ID redirect:', credential.data.url);
      break;
    case CredentialsType.CANCELLED:
      console.log('User cancelled');
      break;
    case CredentialsType.PASSKEY:
      console.log('Passkey:', JSON.parse(credential.data).id);
      break;
  }
}
```

### `AppleIdCredentialState`

Resolved by [`getAppleIdCredentialState`](./methods#getappleidcredentialstateuserid) (iOS).

- `AUTHORIZED` - The user is still signed in to the app with Apple ID
- `REVOKED` - The user stopped using Apple ID with the app: sign them out
- `NOT_FOUND` - No credential for this user id: sign them out
- `TRANSFERRED` - The app was transferred to another team and the user id must be migrated

### `CredentialError`

Enum defining possible error codes that may be thrown during authentication operations.

**Values:**

- `NO_PLAY_SERVICES_ERROR` - Not thrown by the native modules (kept for compatibility). Missing Google Play Services
  rejects with `NOT_SUPPORTED_ERROR`
- `NO_ACTIVITY_ERROR` - No activity (Android) or view controller (iOS) is available to present the authentication flow
- `INVALID_RESULT_ERROR` - The authentication result received from the provider is invalid or malformed (Both platforms)
- `NO_SIGN_IN_AVAILABLE` - There is no credential to use: no previous sign in for `googleSilentSignIn`, no account or
  passkey on the device (Both platforms)
- `SIMULTANEOUS_CALL_ERROR` - The same method was called again while the previous call is still pending; the first call
  keeps running (iOS)
- `NOT_SUPPORTED_ERROR` - The method is not supported on this device or platform: Google Play Services missing or
  outdated (Android), passkeys below iOS 16 / Android 9, `getAppleIdCredentialState` on Android
- `BROWSER_UNAVAILABLE` - The browser session could not be opened: the app is not active, Guided Access is on, the
  system refused to start `ASWebAuthenticationSession` ("Unable to open Safari."), or there is no browser on Android

**Usage:**

```ts
import { googleSignIn, CredentialError } from 'react-native-oauth-essentials';

try {
  const credential = await googleSignIn('YOUR_WEB_CLIENT_ID');
} catch (error) {
  if (error.code === CredentialError.NOT_SUPPORTED_ERROR) {
    console.error('Please install or update Google Play Services');
  } else if (error.code === CredentialError.NO_ACTIVITY_ERROR) {
    console.error('Activity context not available');
  } else if (error.code === CredentialError.INVALID_RESULT_ERROR) {
    console.error('Invalid authentication result');
  } else {
    console.error('Unknown error:', error);
  }
}
```

## Type Guards

You can use TypeScript type guards for better type safety:

```ts
import { CredentialsType, type GoogleIdCredentialResult } from 'react-native-oauth-essentials';

function isGoogleCredential(credential: any): credential is GoogleIdCredentialResult {
  return credential.type === CredentialsType.GOOGLE_ID;
}

// Usage
const credential = await googleSignIn('...');
if (isGoogleCredential(credential)) {
  // TypeScript knows credential is GoogleIdCredentialResult
  console.log(credential.data.idToken);
}
```