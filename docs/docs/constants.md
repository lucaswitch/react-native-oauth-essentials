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
  OAUTH_REDIRECT_URI,
} from 'react-native-oauth-essentials';
```

## Available Constants

| Constant | Type | Description | iOS | Android |
|----------|------|-------------|-----|---------|
| `GOOGLE_PLAY_SERVICES_SUPPORTED` | `boolean` | Google Play Services are installed and up-to-date. | Always `false` | `true` if Play Services are available |
| `PASSWORD_SUPPORTED` | `boolean` | `getPassword()` / `passwordSignIn()` exist on the platform. | Always `true` | Always `true` (the methods still need Play Services) |
| `GOOGLE_ID_SUPPORTED` | `boolean` | Google Sign-In can be used. Check this before calling `googleSignIn()`. | Always `true` | Same as `GOOGLE_PLAY_SERVICES_SUPPORTED` |
| `APPLE_ID_SUPPORTED` | `boolean` | Apple Sign-In can be used. | Always `true` (native) | Always `true` (web flow) |
| `HYBRID_SUPPORTED` | `boolean` | `hybridSignIn()` exists on the platform. | Always `true` | Always `true` (the method still needs Play Services) |
| `PASSKEYS_SUPPORTED` | `boolean` | Passkeys (WebAuthn/FIDO2) are supported. | iOS 16+ | Android 9.0+ (API 28+) |

> **Note:** The values are read once, when the module loads. On Android, `getPassword()`, `passwordSignIn()` and
> `hybridSignIn()` reject with `NOT_SUPPORTED_ERROR` without Google Play Services even though `PASSWORD_SUPPORTED` and
> `HYBRID_SUPPORTED` are `true`, so also check `GOOGLE_PLAY_SERVICES_SUPPORTED` before calling them.

### `OAUTH_REDIRECT_URI`

`string`. The default redirect URI used by `oauthSignIn()`: `<bundle id, lowercased>://oauth/callback` on iOS and
`<applicationId>://oauth/callback` on Android (the URI the library's `CustomTabsActivity` handles; it is also where your
Apple web flow must redirect on Android). Register this URI with your OAuth provider, or pass your own `redirectUri`. See [Generic OAuth](./usage/oauth.md).

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
- **Required for:** Google Sign-In, passwords and hybrid sign-in on Android

### Password Support

```ts
if (PASSWORD_SUPPORTED && (Platform.OS === 'ios' || GOOGLE_PLAY_SERVICES_SUPPORTED)) {
  const credential = await getPassword();
}
```

- **iOS:** Always `true`. `passwordSignIn()` resolves `false` without doing anything (use `textContentType` instead)
- **Android:** Always `true`, but the methods reject with `NOT_SUPPORTED_ERROR` without Google Play Services
- **Enables:** `passwordSignIn()` and `getPassword()` methods

### Google ID Support

```ts
if (GOOGLE_ID_SUPPORTED) {
  // Can use googleSignIn()
  await googleSignIn('YOUR_WEB_CLIENT_ID');
}
```

- **iOS:** Always `true`
- **Android:** Same as `GOOGLE_PLAY_SERVICES_SUPPORTED`
- **Enables:** `googleSignIn()`, `googleSilentSignIn()` and `signOut()` methods

### Apple ID Support

```ts
if (APPLE_ID_SUPPORTED) {
  // Can use appleSignIn()
  await appleSignIn(Platform.OS === 'android' ? 'https://yourserver.com/auth/apple' : undefined);
}
```

- **iOS:** Always `true`
  - Uses native `AuthenticationServices` framework
  - Returns `AppleIdCredentialResult` with full user data
- **Android:** Always `true`
  - Uses Custom Tabs for the web OAuth flow
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

- **iOS:** Always `true`. Offers Apple ID + saved passwords
- **Android:** Always `true`, but `hybridSignIn()` rejects with `NOT_SUPPORTED_ERROR` without Google Play Services.
  Offers Google ID + saved passwords
- **Enables:** `hybridSignIn()` method

### Passkeys Support

```ts
if (PASSKEYS_SUPPORTED) {
  // Can use createPassKey()
  await createPassKey({ requestJson: '...' });
}
```

- **iOS:** Supported on iOS 16+
- **Android:** Supported on Android 9.0+ (API 28+)
- **Enables:** `createPassKey()`, `getPassKey()` and `cancelPassKeyAutoFill()` methods
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

2. **Check Play Services for passwords and hybrid sign-in on Android:**
   ```ts
   if (HYBRID_SUPPORTED && (Platform.OS === 'ios' || GOOGLE_PLAY_SERVICES_SUPPORTED)) {
     await hybridSignIn('...');
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
