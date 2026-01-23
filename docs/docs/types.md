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

- `authorizedAccounts` (boolean, optional) - When enabled, allows users to select from previously authorized Google
  accounts on the device
- `autoSelectEnabled` (boolean, optional) - Automatically selects a Google account if only one authorized account is
  available, skipping the account picker UI

**Example:**

```ts
const options: GoogleSignInOptions = {
  authorizedAccounts: true,
  autoSelectEnabled: false,
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
  - `idToken` (string) - JWT token for verifying the user's identity with your backend
  - `id` (string) - Unique Google user identifier
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
    idToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
    id: '1234567890',
    displayName: 'John Doe',
    givenName: 'John',
    familyName: 'Doe',
    profilePictureUri: 'https://lh3.googleusercontent.com/...',
    phoneNumber: '+1234567890',
  },
};
```

### `AppleIdCredentialResult`

Represents the result of Apple ID authentication.

**Properties:**

- `type` - Always `CredentialsType.APPLE_ID`
- `data` - Empty object (Apple credential details are handled internally)

**Example:**

```ts
const credential: AppleIdCredentialResult = {
  type: CredentialsType.APPLE_ID,
  data: {},
};
```

## Enumerations

### `CredentialsType`

Enum defining the available credential types for discriminating between different authentication results.

**Values:**

- `GOOGLE_ID` - Google OAuth credential
- `PASSWORD` - Username and password credential
- `APPLE_ID` - Apple ID credential

**Usage:**

```ts
import { CredentialsType } from 'react-native-oauth-essentials';

// Type narrowing example
function handleCredential(
  credential: GoogleIdCredentialResult | PasswordCredentialResult | AppleIdCredentialResult
) {
  switch (credential.type) {
    case CredentialsType.GOOGLE_ID:
      console.log('Google user:', credential.data.displayName);
      break;
    case CredentialsType.PASSWORD:
      console.log('Password login:', credential.data.username);
      break;
    case CredentialsType.APPLE_ID:
      console.log('Apple ID login successful');
      break;
  }
}
```

### `CredentialError`

Enum defining possible error codes that may be thrown during authentication operations.

**Values:**

- `NO_PLAY_SERVICES_ERROR` - Google Play Services is not available or not installed on the device (Android only)
- `NO_ACTIVITY_ERROR` - No Android activity context is available to perform the authentication flow (Android only)
- `INVALID_RESULT_ERROR` - The authentication result received from the provider is invalid or malformed

**Usage:**

```ts
import { googleSignIn, CredentialError } from 'react-native-oauth-essentials';

try {
  const credential = await googleSignIn('YOUR_WEB_CLIENT_ID');
} catch (error) {
  if (error === CredentialError.NO_PLAY_SERVICES_ERROR) {
    console.error('Please install Google Play Services');
  } else if (error === CredentialError.NO_ACTIVITY_ERROR) {
    console.error('Activity context not available');
  } else if (error === CredentialError.INVALID_RESULT_ERROR) {
    console.error('Invalid authentication result');
  }
}
```
