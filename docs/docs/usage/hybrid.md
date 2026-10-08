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
> - **Android:** Google ID must be configured (`googleClientId`). **iOS:** `googleClientId` is ignored, Google is not offered
> - Always handle the `CANCELLED` case - users may dismiss the credential picker

We **highly recommend** using hybrid sign-in as the **default** for unauthenticated users, while still providing
alternative sign-in options to cover all cases.

## Platform Support

### iOS
- Offers: Apple ID and saved passwords (`ASAuthorizationController`). **Google ID is not included**
- On iOS 16+ only credentials already on the device are offered
- Resolves `CANCELLED` when the user dismisses it or nothing is available
- Only `options.nonce` is used (for Apple ID)
- Ideal for app launch to restore previous session

### Android
- Offers: Google ID (`GetGoogleIdOption`) and saved passwords. **Apple ID is not included** (use `appleSignIn()`)
- Uses Credential Manager to aggregate the options in one bottom sheet
- Requires Google Play Services: rejects with `NOT_SUPPORTED_ERROR` without them, even though `HYBRID_SUPPORTED` is
  `true`
- `authorizedAccounts`, `autoSelectEnabled` and `nonce` are used; `mode`, `scopes`, `offlineAccess` and `hostedDomain`
  are ignored

## Methods

### `hybridSignIn(googleClientId: string, options?: GoogleSignInOptions)`

Performs all available sign-in methods on the platform at once.
This is typically used on app startup to retrieve any existing sign-in credentials.

#### Parameters

| Name             | Type                             | Description                                                                                             |
|------------------|----------------------------------|---------------------------------------------------------------------------------------------------------|
| `googleClientId` | `string`                         | The web client ID for Google Sign-In. Used on Android only.                                             |
| `options`        | `GoogleSignInOptions` (optional) | Optional configuration for Google Sign-In. See [GoogleSignInOptions](#googlesigninoptions) for details. |

#### GoogleSignInOptions

```typescript
type GoogleSignInOptions = {
  authorizedAccounts?: boolean;  // Android only: Filter to authorized accounts
  autoSelectEnabled?: boolean;   // Android only: Enable auto-selection
  nonce?: string;                // Android: Google idToken nonce. iOS: Apple ID nonce
};
```

Other `GoogleSignInOptions` fields are ignored by `hybridSignIn`.

#### Returns

`Promise<AppleIdCredentialResult | GoogleIdCredentialResult | PasswordCredentialResult | CancelledCredentialResult>`

The promise resolves to whichever credential is available on the platform:

**GoogleIdCredentialResult (Android only):**
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
| `NOT_SUPPORTED_ERROR` | Google Play Services not available or outdated | Android only |
| `NO_ACTIVITY_ERROR` | No Android activity context available | Android only |
| `NO_SIGN_IN_AVAILABLE` | No Google account or saved password for the request | Android only |
| `SIMULTANEOUS_CALL_ERROR` | A previous `hybridSignIn` is still pending | iOS only |
| `INVALID_RESULT_ERROR` | The provider failed or returned an unexpected result | Both |

#### Important Notes

- Always check the platform support constants before using hybrid sign-in:
  - `HYBRID_SUPPORTED` - Always `true`
  - `GOOGLE_PLAY_SERVICES_SUPPORTED` - Required on Android
- On iOS, Apple ID and stored passwords may be returned
- On Android, Google ID and stored passwords may be returned (Apple requires separate Chrome Custom Tabs flow)
- Useful for automatically signing in users if credentials are already available
- User can cancel, resulting in `CancelledCredentialResult`
- Options `authorizedAccounts` and `autoSelectEnabled` only work on Android
- Emits `onCredentialSuccess` / `onCredentialFailure`

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

### iOS
- Presents native iOS credential picker sheet
- Includes Apple ID if user is signed in to device
- Does **not** include Google ID (use `googleSilentSignIn()` to restore a Google session)
- Includes saved passwords from Keychain
- User can select from available options or cancel

### Android (API 24+)
- Uses Credential Manager API
- Presents native Android bottom sheet
- Includes Google ID if Google Play Services available
- Includes saved passwords from Google Password Manager
- Apple ID requires separate `appleSignIn()` call with Chrome Custom Tabs
- Options `authorizedAccounts` and `autoSelectEnabled` only work on Android