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

**Example:**

```ts
const options: GoogleSignInOptions = {
  authorizedAccounts: true,   // Android only
  autoSelectEnabled: false,   // Android only
};
```

### `PasskeyOptions`

Configuration options for creating or retrieving passkeys.

**Properties:**

- `requestJson` (string, required) - JSON string containing `PublicKeyCredentialCreationOptions` (for creation) or `PublicKeyCredentialRequestOptions` (for retrieval) as defined by the WebAuthn standard
- `preferImmediatelyAvailableCredentials` (boolean, optional) - **Android only.** When `true`, only show passkeys that are immediately available without requiring additional user interaction
- `isConditional` (boolean, optional) - **Android only.** When `true`, allows conditional UI for passkey selection

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
  isConditional: false,  // Android only
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

### `CredentialError`

Enum defining possible error codes that may be thrown during authentication operations.

**Values:**

- `NO_PLAY_SERVICES_ERROR` - Google Play Services is not available or not installed on the device (Android only)
- `NO_ACTIVITY_ERROR` - No Android activity context is available to perform the authentication flow (Android only)
- `INVALID_RESULT_ERROR` - The authentication result received from the provider is invalid or malformed (Both platforms)

**Usage:**

```ts
import { googleSignIn, CredentialError } from 'react-native-oauth-essentials';

try {
  const credential = await googleSignIn('YOUR_WEB_CLIENT_ID');
} catch (error) {
  if (error.code === CredentialError.NO_PLAY_SERVICES_ERROR) {
    console.error('Please install Google Play Services');
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