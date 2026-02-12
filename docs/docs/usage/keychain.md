# Password Sign-In

Using the built-in password sign-in features is much more secure than storing usernames and passwords manually. Android
and iOS keep saved credentials cryptographically secure, and when synced (e.g., via Google Password Manager on Android
or iCloud Keychain on Apple devices), they can be accessed across your devices. This makes signing in with a username
and password take only a few seconds.

You can check more on following links:

1. [Apple Support - iCloud Keychain](https://support.apple.com/en-md/120758?utm_source=chatgpt.com) - Details how Apple
   keeps passwords secure and synced across devices.
2. [Google Chrome Developers - Passkeys and Google Password Manager](https://developer.chrome.com/blog/passkeys-gpm-desktop?utm_source=chatgpt.com) -
   Explains how Google encrypts and syncs passwords and passkeys on Android and other devices.

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

- Resolves to a `PasswordCredentialResult` object if a stored credential exists.
- Resolves to `false` if no stored password is found.

#### Notes

- Always check `PASSWORD_SUPPORTED` before calling this method.
- Available on both Android and iOS.
- Useful for retrieving credentials that were previously saved via the password manager.

#### Example Usage (TypeScript)

```ts
import { getPassword, PASSWORD_SUPPORTED } from 'OauthEssentials';

async function retrievePassword(): Promise<void> {
  if (!PASSWORD_SUPPORTED) {
    console.log('Password sign-in is not supported on this platform.');
    return;
  }

  try {
    const credential = await getPassword();
    if (!credential) {
      console.log('No stored password found.');
    } else {
      console.log('Retrieved password credential:', credential);
    }
  } catch (error) {
    console.error('Failed to get stored password:', error);
  }
}
```

### `passwordSignIn(username: string, password: string): Promise<boolean>`

Performs a password-based sign-in with the provided username and password.

#### Parameters

| Name       | Type     | Description                   |
|------------|----------|-------------------------------|
| `username` | `string` | The username of the account.  |
| `password` | `string` | The password for the account. |

#### Returns

`Promise<boolean>`

- Resolves to `true` if sign-in succeeds.
- Resolves to `false` (or throws) if sign-in fails.

#### Notes

- Always check `PASSWORD_SUPPORTED` before calling this method.
- The password **cannot** be a previously stored credential retrieved via `getPassword`.
- Available on both Android and iOS.

#### Example Usage (TypeScript)

```ts
import { passwordSignIn, PASSWORD_SUPPORTED } from 'OauthEssentials';

async function signInWithPassword(): Promise<void> {
  if (!PASSWORD_SUPPORTED) {
    console.log('Password sign-in is not supported on this platform.');
    return;
  }

  try {
    const success = await passwordSignIn('myUsername', 'myPassword');
    if (success) {
      console.log('Signed in successfully with password.');
    } else {
      console.log('Password sign-in failed.');
    }
  } catch (error) {
    console.error('Password sign-in error:', error);
  }
}
