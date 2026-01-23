---
sidebar_position: 1
---

# Hybrid Sign-In

## Introduction

**Hybrid sign-in** is a user-friendly approach that combines the best of native and app-level authentication. It relies
entirely on the platform’s built-in sign-in methods, giving users a seamless and familiar experience and making the app
feel like a **world-class app**.

A good UX is to **dispatch hybrid sign-in immediately**. If any error occurs, fall back to a **custom UI** with your
desired authentication flow.

> ⚠️ **Important:**
> - Users **cannot choose** the platform methods.
> - **Google ID must be configured** for hybrid sign-in to work properly.

We **highly recommend** using hybrid sign-in as the **default** for unauthenticated users, while still providing
alternative sign-in options to cover all cases.

## Methods

### `hybridSignIn(googleClientId: string, options?: GoogleSignInOptions)`

Performs all available sign-in methods on the platform at once.
This is typically used on app startup to retrieve any existing sign-in credentials.

#### Parameters

| Name             | Type                             | Description                                                                                             |
|------------------|----------------------------------|---------------------------------------------------------------------------------------------------------|
| `googleClientId` | `string`                         | The web client ID for Google Sign-In. Required for Google ID authentication.                            |
| `options`        | `GoogleSignInOptions` (optional) | Optional configuration for Google Sign-In. See [GoogleSignInOptions](#googlesigninoptions) for details. |

#### Returns

`Promise<AppleIdCredentialResult | GoogleIdCredentialResult | PasswordCredentialResult>`

The promise resolves to whichever credential is available on the platform:

- `AppleIdCredentialResult` – if an Apple ID credential is found.
- `GoogleIdCredentialResult` – if a Google ID credential is found.
- `PasswordCredentialResult` – if a stored password credential is found.

#### Notes

- Always check the platform support constants before using hybrid sign-in:
  - `APPLE_ID_SUPPORTED`
  - `GOOGLE_ID_SUPPORTED`
  - `PASSWORD_SUPPORTED`
- On iOS, Apple ID and stored passwords may be returned.
- On Android, Google ID and stored passwords may be returned.
- Useful for automatically signing in users if credentials are already available.

#### Example Usage (TypeScript)

```ts
import {
  hybridSignIn,
  GOOGLE_ID_SUPPORTED,
  APPLE_ID_SUPPORTED,
  PASSWORD_SUPPORTED,
  CredentialsType,
} from 'OauthEssentials';

async function initAuth(): Promise<void> {
  if (GOOGLE_ID_SUPPORTED &&  PASSWORD_SUPPORTED) {
    try {
      const credential = await hybridSignIn('YOUR_GOOGLE_CLIENT_ID', {
        authorizedAccounts: true,
        autoSelectEnabled: true,
      });

      switch (credential.type) {
        case CredentialsType.GOOGLE_ID:
          console.log('Signed in with Google:', credential.data);
          break;
        case CredentialsType.APPLE_ID:
          console.log('Signed in with Apple ID:', credential.data);
          break;
        case CredentialsType.PASSWORD:
          console.log('Signed in with stored password:', credential.data.username);
          break;
      }
    } catch (error) {
      console.error('Hybrid sign-in failed:', error);
    }
  } else {
    console.log('No sign-in methods supported on this platform.');
  }
}
