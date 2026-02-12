---
sidebar_position: 1
---

# Hybrid Sign-In

## Introduction

**Hybrid sign-in** is a user-friendly approach that combines the best of native and app-level authentication. It relies
entirely on the platform's built-in sign-in methods, giving users a seamless and familiar experience and making the app
feel like a **world-class app**.

A good UX is to **dispatch hybrid sign-in immediately** on app start. If any error occurs or user cancels, fall back to a **custom UI** with your
desired authentication flow.

> ⚠️ **Important:**
> - Users **cannot choose** the platform methods - the OS presents available credentials
> - **Google ID must be configured** for hybrid sign-in to work properly
> - Always handle the `CANCELLED` case - users may dismiss the credential picker

We **highly recommend** using hybrid sign-in as the **default** for unauthenticated users, while still providing
alternative sign-in options to cover all cases.

## Platform Support

### iOS
- **Minimum:** iOS 13+
- Checks for: Apple ID, Google ID, and saved passwords
- Presents unified credential picker if multiple options available
- Returns first selected credential
- Ideal for app launch to restore previous session
- Check `HYBRID_SUPPORTED` constant before using

### Android
- **Minimum:** Android 8.0+ (API 26+)
- Checks for: Google ID and saved passwords (Apple requires Chrome Custom Tabs flow)
- Uses Credential Manager to aggregate all options
- Presents native Android credential picker
- Returns first selected credential
- Check `HYBRID_SUPPORTED` constant before using

## Methods

### `hybridSignIn(googleClientId: string, options?: GoogleSignInOptions)`

Performs all available sign-in methods on the platform at once.
This is typically used on app startup to retrieve any existing sign-in credentials.

#### Parameters

| Name             | Type                             | Description                                                                                             |
|------------------|----------------------------------|---------------------------------------------------------------------------------------------------------|
| `googleClientId` | `string`                         | The web client ID for Google Sign-In. Required for Google ID authentication.                            |
| `options`        | `GoogleSignInOptions` (optional) | Optional configuration for Google Sign-In. See [GoogleSignInOptions](#googlesigninoptions) for details. |

#### GoogleSignInOptions

```typescript
type GoogleSignInOptions = {
  authorizedAccounts?: boolean;  // Android only: Filter to authorized accounts
  autoSelectEnabled?: boolean;   // Android only: Enable auto-selection
};
```

**Note:** Both options are **Android-only** and will be ignored on iOS.

#### Returns

`Promise<AppleIdCredentialResult | GoogleIdCredentialResult | PasswordCredentialResult | CancelledCredentialResult>`

The promise resolves to whichever credential is available on the platform:

**GoogleIdCredentialResult:**
```typescript
{
  type: CredentialsType.GOOGLE_ID;
  data: {
    id: string;
    idToken: string;
    displayName: string;
    givenName: string;
    familyName: string;
    profilePictureUri?: string | null;
    phoneNumber?: string | null;
  };
}
```

**AppleIdCredentialResult (iOS only):**
```typescript
{
  type: CredentialsType.APPLE_ID;
  data: {
    idToken: string;
    authorizationCode: string;
    user: string;
    email: string;
    fullName: string;
    likelyReal: boolean;
  };
}
```

**PasswordCredentialResult:**
```typescript
{
  type: CredentialsType.PASSWORD;
  data: {
    username: string;
    password: string;
  };
}
```

**CancelledCredentialResult:**
```typescript
{
  type: CredentialsType.CANCELLED;
  data: null;  // User dismissed the credential picker
}
```

#### Error Codes

| Error Code | Description | Platform |
|------------|-------------|----------|
| `NO_PLAY_SERVICES_ERROR` | Google Play Services not available | Android only |
| `NOT_SUPPORTED_ERROR` | Credential Manager not supported | Android only |
| `NO_ACTIVITY_ERROR` | No Android activity context available | Android only |
| `INVALID_RESULT_ERROR` | Invalid result from authentication provider | Both |

#### Important Notes

- Always check the platform support constants before using hybrid sign-in:
  - `HYBRID_SUPPORTED` - Overall support
  - `GOOGLE_ID_SUPPORTED` - Google support
  - `APPLE_ID_SUPPORTED` - Apple support (iOS only)
  - `PASSWORD_SUPPORTED` - Password support
- On iOS, Apple ID and stored passwords may be returned
- On Android, Google ID and stored passwords may be returned (Apple requires separate Chrome Custom Tabs flow)
- Useful for automatically signing in users if credentials are already available
- User can cancel, resulting in `CancelledCredentialResult`
- Options `authorizedAccounts` and `autoSelectEnabled` only work on Android

#### Example Usage (TypeScript)

```ts
import {
  hybridSignIn,
  HYBRID_SUPPORTED,
  CredentialsType,
} from 'react-native-oauth-essentials';

async function initAuth(): Promise<void> {
  if (!HYBRID_SUPPORTED) {
    console.log('Hybrid sign-in is not supported on this platform.');
    // Show manual sign-in UI
    return;
  }

  try {
    const credential = await hybridSignIn('YOUR_GOOGLE_WEB_CLIENT_ID', {
      authorizedAccounts: true,  // Android only
      autoSelectEnabled: false,  // Android only
    });

    switch (credential.type) {
      case CredentialsType.GOOGLE_ID:
        console.log('Signed in with Google:', credential.data.displayName);
        await authenticateWithBackend('google', credential.data.idToken);
        break;

      case CredentialsType.APPLE_ID:
        console.log('Signed in with Apple ID:', credential.data.user);
        await authenticateWithBackend('apple', credential.data.idToken);
        break;

      case CredentialsType.PASSWORD:
        console.log('Signed in with stored password:', credential.data.username);
        await authenticateWithBackend('password', credential.data.username, credential.data.password);
        break;

      case CredentialsType.CANCELLED:
        console.log('User cancelled credential picker');
        // Show manual sign-in UI
        break;
    }
  } catch (error) {
    console.error('Hybrid sign-in failed:', error);
    // Show manual sign-in UI
  }
}
```

## Use Cases

### 1. App Launch Auto Sign-In

Perfect for restoring user session when app starts:

```typescript
async function handleAppLaunch() {
  try {
    const credential = await hybridSignIn('YOUR_GOOGLE_WEB_CLIENT_ID');

    if (credential.type !== CredentialsType.CANCELLED) {
      // User has existing credentials, auto sign-in
      await processCredential(credential);
      navigateToHomeScreen();
    } else {
      // No credentials or user cancelled, show sign-in screen
      navigateToSignInScreen();
    }
  } catch (error) {
    console.error(error);
    // Error occurred, show sign-in screen
    navigateToSignInScreen();
  }
}
```

### 2. "Continue with..." Screen

Show a single button that tries all methods:

```typescript
async function handleContinueButton() {
  try {
    const credential = await hybridSignIn('YOUR_GOOGLE_WEB_CLIENT_ID');

    if (credential.type === CredentialsType.CANCELLED) {
      // User dismissed, show other sign-in options
      showAlternativeSignInOptions();
      return;
    }

    // Process the credential
    await processCredential(credential);
  } catch (error) {
    console.error(error);
    showAlternativeSignInOptions();
  }
}
```

## Best Practices

1. **Call on app start** - Try hybrid sign-in immediately when app launches for authenticated users
2. **Handle cancellation** - Users may dismiss the credential picker, show alternative options
3. **Fallback to manual UI** - Always provide manual sign-in options if hybrid fails
4. **Check support constants** - Verify `HYBRID_SUPPORTED` before calling
5. **Don't repeat** - If user cancels, don't immediately call hybrid again
6. **Fast UX** - Hybrid sign-in is instant, perfect for app startup
7. **Platform differences** - iOS includes Apple ID, Android doesn't (requires separate flow)

## Recommended Flow

```typescript
async function initializeApp() {
  // Show splash screen
  showSplashScreen();

  if (!HYBRID_SUPPORTED) {
    navigateToSignInScreen();
    return;
  }

  try {
    // Try hybrid sign-in silently in background
    const credential = await hybridSignIn('YOUR_GOOGLE_WEB_CLIENT_ID', {
      autoSelectEnabled: true,  // Auto-select if only one credential (Android)
    });

    if (credential.type === CredentialsType.CANCELLED) {
      // User cancelled or no credentials available
      navigateToSignInScreen();
      return;
    }

    // Authenticate with backend
    const session = await authenticateWithBackend(credential);

    if (session.valid) {
      // Success! Go to home screen
      navigateToHomeScreen();
    } else {
      // Backend rejected, show sign-in screen
      navigateToSignInScreen();
    }
  } catch (error) {
    console.error('Hybrid sign-in error:', error);
    navigateToSignInScreen();
  }
}
```

## Platform-Specific Details

### iOS (13+)
- Presents native iOS credential picker sheet
- Includes Apple ID if user is signed in to device
- Includes Google ID if previously authorized
- Includes saved passwords from Keychain
- User can select from available options or cancel

### Android (8.0+ / API 26+)
- Uses Credential Manager API
- Presents native Android bottom sheet
- Includes Google ID if Google Play Services available
- Includes saved passwords from Google Password Manager
- Apple ID requires separate `appleSignIn()` call with Chrome Custom Tabs
- Options `authorizedAccounts` and `autoSelectEnabled` only work on Android