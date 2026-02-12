# Apple ID Sign-In

## Methods

### `appleSignIn(): Promise<AppleIdCredentialResult>`

Performs Apple ID sign-in on iOS (and macOS if applicable).

#### Parameters

This function does not take any parameters.

#### Returns

`Promise<AppleIdCredentialResult>`

The promise resolves to an Apple ID credential object:

- `type` – Always `CredentialsType.APPLE_ID`.
- `data` – Currently an empty object `{}` (used to represent successful Apple sign-in).

#### Notes

- Always check `APPLE_ID_SUPPORTED` before calling this method.
- Only available on iOS 13+.
- Useful for retrieving Apple ID credentials if a user has previously signed in with Apple.

#### Example Usage (TypeScript)

```ts
import {
  appleSignIn,
  APPLE_ID_SUPPORTED,
  CredentialsType,
} from 'OauthEssentials';

async function signInWithApple(): Promise<void> {
  if (!APPLE_ID_SUPPORTED) {
    console.log('Apple ID sign-in is not supported on this platform.');
    return;
  }

  try {
    const credential = await appleSignIn();
    console.log('Signed in with Apple ID:', credential.data);
  } catch (error) {
    console.error('Apple sign-in failed:', error);
  }
}
