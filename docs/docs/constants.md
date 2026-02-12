---
sidebar_position: 4
---

# Constants

This module exposes **constants** that indicate which authentication methods are available on the current platform.

**Platform Support:** iOS and Android only. This library does not support React Native Web or other platforms.

## Usage

```ts
// TypeScript / ES Module
import {
  GOOGLE_PLAY_SERVICES_SUPPORTED,
  PASSWORD_SUPPORTED,
  GOOGLE_ID_SUPPORTED,
  APPLE_ID_SUPPORTED,
  HYBRID_SUPPORTED,
  PASSKEYS_SUPPORTED,
} from 'react-native-oauth-essentials';
```

## Available Constants

| Constant | Type | Description | iOS | Android |
|----------|------|-------------|-----|---------|
| `GOOGLE_PLAY_SERVICES_SUPPORTED` | `boolean` | Google Play Services are available and up-to-date. Always `false` on iOS. | Always `false` | `true` if Play Services installed |
| `PASSWORD_SUPPORTED` | `boolean` | Password credential manager is supported. | iOS 12+ | Android 7.0+ (API 24+) |
| `GOOGLE_ID_SUPPORTED` | `boolean` | Google Sign-In is supported. Check this before calling `googleSignIn()`. | iOS 13+ | Android 8.0+ (API 26+) with Play Services |
| `APPLE_ID_SUPPORTED` | `boolean` | Apple Sign-In is supported. | iOS 13+ | Android 8.0+ (API 26+) |
| `HYBRID_SUPPORTED` | `boolean` | Hybrid sign-in is supported (multiple methods at once). | iOS 13+ | Android 8.0+ (API 26+) |
| `PASSKEYS_SUPPORTED` | `boolean` | Passkeys (WebAuthn/FIDO2) are supported. | iOS 16+ | Android 9.0+ (API 28+) |

> **Note:** The values are determined at runtime by the module based on OS version, device capabilities, and installed services.

## Platform Support Details

### Google Play Services (Android Only)

```ts
if (GOOGLE_PLAY_SERVICES_SUPPORTED) {
  // Google Play Services available on Android
  // Can proceed with Google Sign-In
} else {
  // On iOS: always false (doesn't use Play Services)
  // On Android: Play Services not installed or outdated
}
```

- **iOS:** Always `false` (iOS doesn't use Google Play Services)
- **Android:** `true` if Google Play Services are installed and up-to-date
- **Required for:** Google Sign-In on Android

### Password Support

```ts
if (PASSWORD_SUPPORTED) {
  // Can use passwordSignIn() and getPassword()
  await passwordSignIn(username, password);
}
```

- **iOS:** Supported on iOS 12+
- **Android:** Supported on Android 7.0+ (API 24+)
- **Enables:** `passwordSignIn()` and `getPassword()` methods

### Google ID Support

```ts
if (GOOGLE_ID_SUPPORTED) {
  // Can use googleSignIn()
  await googleSignIn('YOUR_WEB_CLIENT_ID');
}
```

- **iOS:** Supported on iOS 13+
- **Android:** Supported on Android 8.0+ (API 26+) with Google Play Services
- **Enables:** `googleSignIn()` method
- **Note:** On Android, also check `GOOGLE_PLAY_SERVICES_SUPPORTED`

### Apple ID Support

```ts
if (APPLE_ID_SUPPORTED) {
  // Can use appleSignIn()
  await appleSignIn(Platform.OS === 'android' ? 'https://yourserver.com/auth/apple' : undefined);
}
```

- **iOS:** Supported on iOS 13+
  - Uses native `AuthenticationServices` framework
  - Returns `AppleIdCredentialResult` with full user data
- **Android:** Supported on Android 8.0+ (API 26+)
  - Uses Chrome Custom Tabs for OAuth flow
  - Returns `WebAppleIdCredentialResult` with redirect URL
  - **Requires backend implementation**
- **Enables:** `appleSignIn()` method

### Hybrid Support

```ts
if (HYBRID_SUPPORTED) {
  // Can use hybridSignIn()
  const credential = await hybridSignIn('YOUR_WEB_CLIENT_ID');
}
```

- **iOS:** Supported on iOS 13+
- **Android:** Supported on Android 8.0+ (API 26+)
- **Enables:** `hybridSignIn()` method
- **Checks:** All available sign-in methods at once

### Passkeys Support

```ts
if (PASSKEYS_SUPPORTED) {
  // Can use createPassKey()
  await createPassKey({ requestJson: '...' });
}
```

- **iOS:** Supported on iOS 16+
- **Android:** Supported on Android 9.0+ (API 28+)
- **Enables:** `createPassKey()` and `getPassKey()` methods
- **Standard:** WebAuthn/FIDO2 compliant

## Best Practices

1. **Always check constants before calling methods:**
   ```ts
   if (GOOGLE_ID_SUPPORTED) {
     await googleSignIn('...');
   } else {
     // Show alternative sign-in method
   }
   ```

2. **Check multiple constants for Google Sign-In on Android:**
   ```ts
   if (GOOGLE_ID_SUPPORTED && (Platform.OS === 'ios' || GOOGLE_PLAY_SERVICES_SUPPORTED)) {
     await googleSignIn('...');
   }
   ```

3. **Provide fallback options:**
   ```ts
   const availableMethods = [];
   if (GOOGLE_ID_SUPPORTED) availableMethods.push('Google');
   if (APPLE_ID_SUPPORTED) availableMethods.push('Apple');
   if (PASSWORD_SUPPORTED) availableMethods.push('Password');

   if (availableMethods.length === 0) {
     // No native methods available, show custom authentication
   }
   ```

4. **Use constants for conditional UI:**
   ```tsx
   {GOOGLE_ID_SUPPORTED && (
     <GoogleSignInButton onPress={() => googleSignIn('...')} />
   )}
   {APPLE_ID_SUPPORTED && (
     <AppleSignInButton onPress={() => appleSignIn()} />
   )}
   ```

## Example: Complete Sign-In Screen

```tsx
import {
  GOOGLE_ID_SUPPORTED,
  APPLE_ID_SUPPORTED,
  PASSWORD_SUPPORTED,
  HYBRID_SUPPORTED,
  googleSignIn,
  appleSignIn,
  passwordSignIn,
  hybridSignIn,
} from 'react-native-oauth-essentials';

function SignInScreen() {
  // Try hybrid sign-in on mount
  useEffect(() => {
    if (HYBRID_SUPPORTED) {
      handleHybridSignIn();
    }
  }, []);

  async function handleHybridSignIn() {
    try {
      const credential = await hybridSignIn('YOUR_WEB_CLIENT_ID');
      if (credential.type !== CredentialsType.CANCELLED) {
        await processCredential(credential);
      }
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <View>
      {GOOGLE_ID_SUPPORTED && (
        <Button title="Sign in with Google" onPress={() => googleSignIn('...')} />
      )}

      {APPLE_ID_SUPPORTED && (
        <Button title="Sign in with Apple" onPress={() => appleSignIn()} />
      )}

      {PASSWORD_SUPPORTED && (
        <Button title="Sign in with Password" onPress={() => showPasswordForm()} />
      )}

      {!GOOGLE_ID_SUPPORTED && !APPLE_ID_SUPPORTED && !PASSWORD_SUPPORTED && (
        <Text>No native sign-in methods available</Text>
      )}
    </View>
  );
}
```
