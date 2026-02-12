# Google ID Sign-In

## Methods

### `googleSignIn(webClientId: string, options?: GoogleSignInOptions)`

Performs Google ID sign-in on Android and iOS platforms.

#### Parameters

| Name          | Type                             | Description                                                                                             |
|---------------|----------------------------------|---------------------------------------------------------------------------------------------------------|
| `webClientId` | `string`                         | The web client ID from your Google Cloud Console. Required for Google authentication.                   |
| `options`     | `GoogleSignInOptions` (optional) | Optional configuration for Google Sign-In. See [GoogleSignInOptions](#googlesigninoptions) for details. |

#### Returns

`Promise<GoogleIdCredentialResult>`

The promise resolves to a Google ID credential containing:

- `idToken` – The ID token from Google.
- `id` – The Google account ID.
- `displayName` – The full name of the user.
- `givenName` – The user's given name.
- `familyName` – The user's family name.
- `profilePictureUri` – Optional URL to the profile picture.
- `phoneNumber` – Optional phone number.

#### Notes

- Always check `GOOGLE_ID_SUPPORTED` before calling this method.
- On iOS, Google Play Services are not used, but Google sign-in is still supported via web flow.
- Options `authorizedAccounts` and `autoSelectEnabled` are only applied on Android.

#### Example Usage (TypeScript)

```ts
import {
  googleSignIn,
  GOOGLE_ID_SUPPORTED,
  CredentialsType,
} from 'OauthEssentials';

async function signInWithGoogle(): Promise<void> {
  if (!GOOGLE_ID_SUPPORTED) {
    console.log('Google sign-in is not supported on this platform.');
    return;
  }

  try {
    const credential = await googleSignIn('YOUR_GOOGLE_CLIENT_ID', {
      authorizedAccounts: true,
      autoSelectEnabled: true,
    });

    if (credential.type === CredentialsType.GOOGLE_ID) {
      console.log('Signed in with Google:');
      console.log('ID Token:', credential.data.idToken);
      console.log('User ID:', credential.data.id);
      console.log('Name:', credential.data.displayName);
      console.log('Given Name:', credential.data.givenName);
      console.log('Family Name:', credential.data.familyName);
      if (credential.data.profilePictureUri) {
        console.log('Profile Picture:', credential.data.profilePictureUri);
      }
      if (credential.data.phoneNumber) {
        console.log('Phone Number:', credential.data.phoneNumber);
      }
    }
  } catch (error) {
    console.error('Google sign-in failed:', error);
  }
}
