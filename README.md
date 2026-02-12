# About

**React Native OAuth Essentials** is an essential OAuth solution for React Native apps. It provides **up-to-date Google
Sign-In, Apple Sign-In, and Password Sign-In**, delivering a **native sign-in experience** with a simple, promise-based
API. It's a must-have for every React Native app.

## How to use it

[Installation](./installation.md)

[Usage](./usage)no
## Usage

### Platform Support Details

This library provides native OAuth implementations with platform-specific behaviors and requirements:

#### Google Sign-In

**iOS:**
- **Minimum:** iOS 13+
- Uses native iOS Google Sign-In SDK
- Presents native iOS authentication UI
- No Google Play Services dependency
- Requires Google OAuth 2.0 Web Client ID from Google Cloud Console
- Supports One Tap sign-in experience
- Available: `GOOGLE_ID_SUPPORTED` constant

**Android:**
- **Minimum:** Android 8.0+ (API 26+)
- Uses Credential Manager API with Google ID provider
- Requires Google Play Services to be installed and up-to-date
- Check `GOOGLE_PLAY_SERVICES_SUPPORTED` before using
- Supports additional options: `authorizedAccounts` and `autoSelectEnabled`
- Presents native Android credential picker UI
- Requires Google OAuth 2.0 Web Client ID from Google Cloud Console
- Available: `GOOGLE_ID_SUPPORTED` constant

**Common Features:**
- Returns standardized `GoogleIdCredentialResult` with user profile data
- Includes ID token for backend verification
- User can cancel, returning `CancelledCredentialResult`

---

#### Apple Sign-In

**iOS:**
- **Minimum:** iOS 13+
- Uses native `AuthenticationServices` framework
- Presents native Apple Sign-In UI sheet
- Full integration with iOS Keychain
- Returns `AppleIdCredentialResult` with:
  - ID token and authorization code
  - User identifier (stable across app reinstalls)
  - Email and full name (only on first sign-in)
  - Real user indicator (`likelyReal`)
- Caches email and fullName for subsequent sign-ins
- No additional configuration needed
- Available: `APPLE_ID_SUPPORTED` constant

**Android:**
- **Minimum:** Android 8.0+ (API 26+)
- Uses browser-based OAuth flow via Chrome Custom Tabs (no native Apple Sign-In on Android)
- Opens device's default browser with your provided `androidWebUrl`
- Returns `WebAppleIdCredentialResult` with redirect URL components
- **Requires backend implementation** to handle OAuth flow
- You must implement Apple Sign-In REST API on your server
- See [Apple Sign-In REST API Documentation](https://developer.apple.com/documentation/signinwithapplerestapi)
- Available: `APPLE_ID_SUPPORTED` constant

**Implementation Note:** iOS provides a complete native experience, while Android uses Chrome Custom Tabs to open your OAuth endpoint in the browser, then captures the redirect URL.

---

#### Password Sign-In

**iOS:**
- **Minimum:** iOS 12+
- Uses iOS Keychain Services
- Integrates with iCloud Keychain for sync across devices
- Presents native password autofill UI
- Supports AutoFill in WebViews
- Available: `PASSWORD_SUPPORTED` constant

**Android:**
- **Minimum:** Android 7.0+ (API 24+)
- Uses Credential Manager API
- Integrates with Google Smart Lock for Passwords
- Can sync credentials across devices via Google account
- Presents native credential picker UI
- Supports autofill in WebViews and native forms
- Available: `PASSWORD_SUPPORTED` constant

**Common Features:**
- `passwordSignIn()` - Saves credentials securely
- `getPassword()` - Retrieves stored credentials
- Returns `PasswordCredentialResult` with username and password
- Can be used alongside biometric authentication
- Returns `false` if no credentials stored

---

#### Hybrid Sign-In

**Purpose:** Attempts all available sign-in methods simultaneously to find existing credentials.

**iOS:**
- Checks for: Apple ID, Google ID, and saved passwords
- Presents unified credential picker if multiple options available
- Returns first available credential
- Ideal for app launch to restore previous session
- Available: `HYBRID_SUPPORTED` constant

**Android:**
- Checks for: Google ID and saved passwords (Apple requires web flow)
- Uses Credential Manager to aggregate all options
- Presents native Android credential picker
- Returns first selected credential
- Available: `HYBRID_SUPPORTED` constant

**Use Case:** Perfect for "Continue with..." screens or automatic sign-in on app start.

**Returns:**
- `GoogleIdCredentialResult`
- `AppleIdCredentialResult` (iOS only)
- `PasswordCredentialResult`
- `CancelledCredentialResult`

---

#### Passkeys

**iOS:**
- Uses `AuthenticationServices` framework (iOS 16+)
- Supports WebAuthn/FIDO2 standard
- Syncs via iCloud Keychain
- Presents native passkey creation/selection UI
- Available: `PASSKEYS_SUPPORTED` constant (iOS 16+)

**Android:**
- Uses Credential Manager API with passkey support (Android 9+ / API 28+)
- Supports WebAuthn/FIDO2 standard
- Syncs via Google Password Manager
- Additional options: `preferImmediatelyAvailableCredentials`, `isConditional`
- Available: `PASSKEYS_SUPPORTED` constant

**Common Features:**
- Standards-based implementation (WebAuthn)
- Requires `requestJson` string with `PublicKeyCredentialCreationOptions`
- Returns `PassKeyCredentialResult` with platform public key credential
- More secure than passwords (phishing-resistant)
- Biometric authentication integration

---

### Import

```typescript
import {
  googleSignIn,
  appleSignIn,
  passwordSignIn,
  getPassword,
  hybridSignIn,
  createPassKey,
  // Constants
  GOOGLE_PLAY_SERVICES_SUPPORTED,
  PASSWORD_SUPPORTED,
  GOOGLE_ID_SUPPORTED,
  APPLE_ID_SUPPORTED,
  HYBRID_SUPPORTED,
  PASSKEYS_SUPPORTED,
  // Types
  type GoogleSignInOptions,
  type PasskeyOptions,
  type GoogleIdCredentialResult,
  type AppleIdCredentialResult,
  type WebAppleIdCredentialResult,
  type PasswordCredentialResult,
  type PassKeyCredentialResult,
  type CancelledCredentialResult,
  CredentialsType,
  CredentialError,
} from 'react-native-oauth-essentials';
```

### Constants

Check platform support before using OAuth methods:

| Constant | Type | Description |
|----------|------|-------------|
| `GOOGLE_PLAY_SERVICES_SUPPORTED` | `boolean` | Google Play Services are available. Always `false` on iOS. |
| `PASSWORD_SUPPORTED` | `boolean` | Password credential manager is supported on this device. |
| `GOOGLE_ID_SUPPORTED` | `boolean` | Google Sign-In is supported. **Use this to check if you can use `googleSignIn()`**. |
| `APPLE_ID_SUPPORTED` | `boolean` | Apple Sign-In is supported on this device. |
| `HYBRID_SUPPORTED` | `boolean` | Hybrid sign-in is supported (multiple methods at once). |
| `PASSKEYS_SUPPORTED` | `boolean` | Passkeys are supported on this device. |

**Example:**

```typescript
if (GOOGLE_ID_SUPPORTED) {
  await googleSignIn('YOUR_WEB_CLIENT_ID');
}
```

### Methods

#### `googleSignIn(webClientId, options?)`

Performs Google Sign-In with native UI.

**Parameters:**
- `webClientId` (string): Your Google OAuth 2.0 web client ID
- `options` (GoogleSignInOptions, optional): Sign-in configuration

**Returns:** `Promise<GoogleIdCredentialResult | CancelledCredentialResult>`

**Platform:** Android, iOS (check `GOOGLE_ID_SUPPORTED`)

**Example:**

```typescript
const result = await googleSignIn('YOUR_WEB_CLIENT_ID', {
  authorizedAccounts: true, // Android only
  autoSelectEnabled: false, // Android only
});

if (result.type === CredentialsType.GOOGLE_ID) {
  console.log('User ID:', result.data.id);
  console.log('ID Token:', result.data.idToken);
  console.log('Name:', result.data.displayName);
}
```

---

#### `appleSignIn(androidWebUrl?)`

Initiates Apple Sign-In process.

**Parameters:**
- `androidWebUrl` (string, optional): Web URL for Android OAuth flow. **Required on Android.**

**Returns:** `Promise<AppleIdCredentialResult | WebAppleIdCredentialResult>`

**Platform:**
- iOS: Native Apple Sign-In UI
- Android: Opens browser with your web URL for OAuth flow

**Platform:** Check `APPLE_ID_SUPPORTED`

**Example:**

```typescript
const result = await appleSignIn('https://yourserver.com/apple-signin');

if (result.type === CredentialsType.APPLE_ID) {
  // iOS result
  console.log('User:', result.data.user);
  console.log('ID Token:', result.data.idToken);
  console.log('Email:', result.data.email);
} else if (result.type === CredentialsType.WEB_APPLE_ID) {
  // Android result
  console.log('Redirect URL:', result.data.url);
}
```

---

#### `passwordSignIn(username, password)`

Saves username/password credentials to the platform's credential manager.

**Parameters:**
- `username` (string): Username to save
- `password` (string): Password to save

**Returns:** `Promise<boolean>`

**Platform:** Android, iOS (check `PASSWORD_SUPPORTED`)

**Example:**

```typescript
const saved = await passwordSignIn('user@example.com', 'password123');
console.log('Credentials saved:', saved);
```

---

#### `getPassword()`

Retrieves stored password credentials.

**Returns:** `Promise<false | PasswordCredentialResult>`

**Platform:** Android, iOS (check `PASSWORD_SUPPORTED`)

**Example:**

```typescript
const result = await getPassword();

if (result && result.type === CredentialsType.PASSWORD) {
  console.log('Username:', result.data.username);
  console.log('Password:', result.data.password);
} else {
  console.log('No stored password found');
}
```

---

#### `hybridSignIn(googleClientId, options?)`

Attempts all available sign-in methods at once. Useful on app start to check for existing credentials.

**Parameters:**
- `googleClientId` (string): Your Google OAuth 2.0 web client ID
- `options` (GoogleSignInOptions, optional): Google sign-in configuration

**Returns:** `Promise<AppleIdCredentialResult | GoogleIdCredentialResult | PasswordCredentialResult | CancelledCredentialResult>`

**Platform:** Android, iOS (check `HYBRID_SUPPORTED`)

**Example:**

```typescript
const result = await hybridSignIn('YOUR_WEB_CLIENT_ID');

switch (result.type) {
  case CredentialsType.GOOGLE_ID:
    console.log('Google user:', result.data.displayName);
    break;
  case CredentialsType.APPLE_ID:
    console.log('Apple user:', result.data.user);
    break;
  case CredentialsType.PASSWORD:
    console.log('Username:', result.data.username);
    break;
  case CredentialsType.CANCELLED:
    console.log('User cancelled');
    break;
}
```

---

#### `createPassKey(options)`

Creates a new passkey credential.

**Parameters:**
- `options` (PasskeyOptions): Passkey creation configuration

**Returns:** `Promise<PassKeyCredentialResult>`

**Platform:** Check `PASSKEYS_SUPPORTED`

**Example:**

```typescript
const result = await createPassKey({
  requestJson: JSON.stringify({ /* PublicKeyCredentialCreationOptions */ }),
  preferImmediatelyAvailableCredentials: true, // Android only
  isConditional: false, // Android only
});

if (result.type === CredentialsType.PASSKEY) {
  console.log('Passkey created:', result.data);
}
```

---

### Type Definitions

#### `GoogleSignInOptions`

```typescript
type GoogleSignInOptions = {
  authorizedAccounts?: boolean;  // Android only: Filter to authorized accounts
  autoSelectEnabled?: boolean;   // Android only: Enable auto-selection
};
```

#### `PasskeyOptions`

```typescript
type PasskeyOptions = {
  requestJson: string;                             // JSON string of PublicKeyCredentialCreationOptions
  preferImmediatelyAvailableCredentials?: boolean; // Android only
  isConditional?: boolean;                         // Android only
};
```

---

### Result Types

#### `GoogleIdCredentialResult`

```typescript
type GoogleIdCredentialResult = {
  type: CredentialsType.GOOGLE_ID;
  data: {
    id: string;                      // User's Google ID
    idToken: string;                 // JWT ID token
    displayName: string;             // Full name
    givenName: string;               // First name
    familyName: string;              // Last name
    profilePictureUri?: string | null;  // Profile picture URL
    phoneNumber?: string | null;     // Phone number (if available)
  };
};
```

#### `AppleIdCredentialResult`

```typescript
type AppleIdCredentialResult = {
  type: CredentialsType.APPLE_ID;
  data: {
    idToken: string;                 // JWT ID token
    authorizationCode: string;       // Authorization code
    user: string;                    // Unique user identifier
    email: string;                   // User's email
    fullName: string;                // Full name
    likelyReal: boolean;             // Indicates if user is likely real
  };
};
```

#### `WebAppleIdCredentialResult`

Android-specific result when using web-based Apple Sign-In:

```typescript
type WebAppleIdCredentialResult = {
  type: CredentialsType.WEB_APPLE_ID;
  data: {
    url: string;                     // Full redirect URL
    scheme: string | null;           // URL scheme
    host: string | null;             // URL host
    path: string | null;             // URL path
    query: string | null;            // URL query parameters
  };
};
```

#### `PasswordCredentialResult`

```typescript
type PasswordCredentialResult = {
  type: CredentialsType.PASSWORD;
  data: {
    username: string;                // Stored username
    password: string;                // Stored password
  };
};
```

#### `PassKeyCredentialResult`

```typescript
type PassKeyCredentialResult = {
  type: CredentialsType.PASSKEY;
  data: string;                      // JSON string of platform public key credential
};
```

#### `CancelledCredentialResult`

```typescript
type CancelledCredentialResult = {
  type: CredentialsType.CANCELLED;
  data: null;                        // User cancelled the operation
};
```

---

### Credential Types Enum

```typescript
enum CredentialsType {
  GOOGLE_ID = 'GOOGLE_ID',           // Google Sign-In credential
  PASSWORD = 'PASSWORD',              // Username/password credential
  APPLE_ID = 'APPLE_ID',             // iOS native Apple Sign-In credential
  WEB_APPLE_ID = 'WEB_APPLE_ID',     // Android web-based Apple Sign-In credential
  CANCELLED = 'CANCELLED',            // User cancelled the sign-in flow
  PASSKEY = 'PASSKEY',               // Passkey credential
}
```

---

### Error Codes

```typescript
enum CredentialError {
  NO_PLAY_SERVICES_ERROR = 'NO_PLAY_SERVICES_ERROR',    // Google Play Services unavailable
  NO_ACTIVITY_ERROR = 'NO_ACTIVITY_ERROR',              // No Android activity available
  INVALID_RESULT_ERROR = 'INVALID_RESULT_ERROR',        // Invalid result from native module
}
```

**Error Handling:**

```typescript
try {
  const result = await googleSignIn('YOUR_WEB_CLIENT_ID');
} catch (error) {
  if (error.code === CredentialError.NO_PLAY_SERVICES_ERROR) {
    console.error('Google Play Services not available');
  }
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
