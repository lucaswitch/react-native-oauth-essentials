# Password Sign-In

Using the built-in password sign-in features is much more secure than storing usernames and passwords manually. Android
and iOS keep saved credentials cryptographically secure, and when synced (e.g., via Google Password Manager on Android
or iCloud Keychain on Apple devices), they can be accessed across your devices. This makes signing in with a username
and password take only a few seconds.

You can check more on following links:

1. [Apple Support - iCloud Keychain](https://support.apple.com/en-md/120758) - Details how Apple
   keeps passwords secure and synced across devices.
2. [Google Chrome Developers - Passkeys and Google Password Manager](https://developer.chrome.com/blog/passkeys-gpm-desktop) -
   Explains how Google encrypts and syncs passwords and passkeys on Android and other devices.

## Platform Support

### iOS
- **Minimum:** iOS 12+
- Uses iOS Keychain Services
- Integrates with iCloud Keychain for sync across devices
- Presents native password autofill UI
- Supports AutoFill everywhere
- Check `PASSWORD_SUPPORTED` constant before using

### Android
- **Minimum:** Android 7.0+ (API 24+)
- Uses Credential Manager API
- Integrates with Google Smart Lock for Passwords
- Can sync credentials across devices via Google account
- Presents native credential picker UI
- Supports autofill everywhere
- Check `PASSWORD_SUPPORTED` constant before using

## Introduction

Always start by calling `getPassword` to try retrieving saved credentials automatically. If it fails, catch the error
and show your own login UI for the user to enter their username and password. Validate these credentials on your
backend, and once your backend returns the API credentials, store the same username/password using the `passwordSignIn`
method so that future sign-ins can happen automatically. Android and iOS keep saved credentials cryptographically secure
and synced across devices, making sign-in fast and safe.

## Methods

### `getPassword(): Promise<false | PasswordCredentialResult>`

Retrieves a previously stored password credential from the device.

#### Parameters

This function does **not** take any parameters.

#### Returns

`Promise<false | PasswordCredentialResult>`

**PasswordCredentialResult:**
```typescript
{
  type: CredentialsType.PASSWORD;
  data: {
    username: string;                // Stored username
    password: string;                // Stored password
  };
}
```

- Resolves to a `PasswordCredentialResult` object if a stored credential exists.
- Resolves to `false` if no stored password is found.

#### Error Codes

| Error Code | Description | Platform |
|------------|-------------|----------|
| `NO_ACTIVITY_ERROR` | No Android activity context available | Android only |
| `INVALID_RESULT_ERROR` | Invalid result from credential manager | Both |

#### Notes

- Always check `PASSWORD_SUPPORTED` before calling this method
- Available on both Android (API 24+) and iOS (12+)
- Useful for retrieving credentials that were previously saved via the password manager
- Returns `false` if no credential is stored (not an error)

#### Example Usage (TypeScript)

```ts
import { getPassword, PASSWORD_SUPPORTED, CredentialsType } from 'react-native-oauth-essentials';

async function retrievePassword(): Promise<void> {
  if (!PASSWORD_SUPPORTED) {
    console.log('Password sign-in is not supported on this platform.');
    return;
  }

  try {
    const credential = await getPassword();

    if (!credential) {
      console.log('No stored password found.');
      // Show manual login UI
      return;
    }

    if (credential.type === CredentialsType.PASSWORD) {
      console.log('Retrieved password credential');
      console.log('Username:', credential.data.username);

      // Authenticate with your backend
      await authenticateWithBackend(
        credential.data.username,
        credential.data.password
      );
    }
  } catch (error) {
    console.error('Failed to get stored password:', error);
    // Show manual login UI
  }
}
```

### `passwordSignIn(username: string, password: string): Promise<boolean>`

Saves username/password credentials to the platform's credential manager.

#### Parameters

| Name       | Type     | Description                   |
|------------|----------|-------------------------------|
| `username` | `string` | The username of the account.  |
| `password` | `string` | The password for the account. |

#### Returns

`Promise<boolean>`

- Resolves to `true` if credentials are successfully saved
- Resolves to `false` if saving fails

#### Error Codes

| Error Code | Description | Platform |
|------------|-------------|----------|
| `NO_ACTIVITY_ERROR` | No Android activity context available | Android only |

#### Notes

- Always check `PASSWORD_SUPPORTED` before calling this method
- The password **cannot** be a previously stored credential retrieved via `getPassword`
- Only call this method after successful backend authentication
- Available on both Android (API 24+) and iOS (12+)
- The credential will be synced via iCloud Keychain (iOS) or Google Password Manager (Android)

#### Example Usage (TypeScript)

```ts
import { passwordSignIn, PASSWORD_SUPPORTED } from 'react-native-oauth-essentials';

async function signInWithPassword(username: string, password: string): Promise<void> {
  if (!PASSWORD_SUPPORTED) {
    console.log('Password sign-in is not supported on this platform.');
    return;
  }

  try {
    // First authenticate with your backend
    const authSuccess = await authenticateWithBackend(username, password);

    if (!authSuccess) {
      console.log('Invalid credentials');
      return;
    }

    // Save credentials to credential manager for future auto sign-in
    const saved = await passwordSignIn(username, password);

    if (saved) {
      console.log('Credentials saved successfully - will auto sign-in next time');
    } else {
      console.log('Failed to save credentials - will need to sign in manually next time');
    }
  } catch (error) {
    console.error('Password sign-in error:', error);
  }
}
```

## Best Practices

1. **Always try `getPassword()` first** - Check for stored credentials before showing login UI
2. **Only save after backend validation** - Don't save credentials until your backend confirms they're valid
3. **Handle the `false` case gracefully** - `getPassword()` returning `false` is normal, not an error
4. **Sync benefits** - Saved credentials work across all user's devices via iCloud/Google sync
5. **Security** - Credentials are encrypted and stored securely by the OS
6. **Combine with biometrics** - Consider adding biometric authentication for extra security

## Recommended Flow

```typescript
async function handleAuth() {
  // 1. Try to get saved credentials first
  const saved = await getPassword();

  if (saved && saved.type === CredentialsType.PASSWORD) {
    // Auto sign-in with saved credentials
    await authenticateWithBackend(saved.data.username, saved.data.password);
    return;
  }

  // 2. No saved credentials, show login UI
  const { username, password } = await showLoginUI();

  // 3. Authenticate with backend
  const success = await authenticateWithBackend(username, password);

  if (success) {
    // 4. Save credentials for next time
    await passwordSignIn(username, password);
  }
}
```

## Platform-Specific Details

### iOS (12+)
- Stored in iOS Keychain (highly secure)
- Synced via iCloud Keychain to all user's Apple devices
- Supports AutoFill in Safari and WKWebView
- Integrated with Face ID / Touch ID prompts

### Android (7.0+ / API 24+)
- Uses Credential Manager API
- Synced via Google Password Manager to all user's devices with same Google account
- Supports AutoFill framework in apps and browsers
- Can prompt for device authentication (PIN/fingerprint/face)
