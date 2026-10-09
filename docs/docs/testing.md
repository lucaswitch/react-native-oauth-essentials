---
sidebar_position: 2.8
---

# Testing with Jest

The library is a TurboModule, so importing it in Jest without a native module fails with a
`native module "OauthEssentials" was not found` error. Use the mock shipped at `react-native-oauth-essentials/jest`.

## Setup

Mock the library in a setup file referenced by `setupFiles` in your Jest config:

```js
// jest.setup.js (referenced by "setupFiles" in the Jest config)
jest.mock('react-native-oauth-essentials', () => require('react-native-oauth-essentials/jest'));
```

```json title="package.json"
{
  "jest": {
    "preset": "react-native",
    "setupFiles": ["./jest.setup.js"]
  }
}
```

You can also call the same `jest.mock(...)` at the top of a single test file.

## What the mock returns

Every method is a `jest.fn()` that resolves a plausible result:

| Method | Resolves |
|---|---|
| `googleSignIn`, `googleSilentSignIn`, `hybridSignIn` | `GOOGLE_ID` with mock data (`idToken: 'mock-google-id-token'`) |
| `appleSignIn` | `APPLE_ID` with mock data |
| `getPassword` | `PASSWORD` with `{ username: 'mock.user@example.com', password: 'mock-password' }` |
| `createPassKey`, `getPassKey` | `PASSKEY` with a JSON string |
| `oauthSignIn` | `OAUTH` with `code: 'mock-authorization-code'` and the `redirectUri` you passed (or `OAUTH_REDIRECT_URI`) |
| `signOut`, `passwordSignIn` | `true` |
| `cancelPassKeyAutoFill` | `false` |
| `getAppleIdCredentialState` | `AppleIdCredentialState.AUTHORIZED` |

- The listeners (`addCredentialSuccessListener`, `addCredentialFailureListener`, `addAppleIdCredentialRevokedListener`)
  are `jest.fn()` returning `{ remove: jest.fn() }`. They never call your listener.
- The enums (`CredentialsType`, `CredentialError`, `AppleIdCredentialState`) and `isCredentialError` are the real ones.
- Every constant (`GOOGLE_ID_SUPPORTED`, `PASSKEYS_SUPPORTED`...) is `true`, and `OAUTH_REDIRECT_URI` is
  `'com.example.app://oauth/callback'`.

## Overriding results per test

```ts
import {
  googleSignIn,
  CredentialsType,
  CredentialError,
} from 'react-native-oauth-essentials';

it('handles a cancelled Google sign in', async () => {
  (googleSignIn as jest.Mock).mockResolvedValueOnce({ type: CredentialsType.CANCELLED, data: null });
  // render the screen and press the button...
});

it('handles a browser error', async () => {
  (googleSignIn as jest.Mock).mockRejectedValueOnce(
    Object.assign(new Error('x'), { code: CredentialError.BROWSER_UNAVAILABLE })
  );
  // ...
});

it('sends the client ids', async () => {
  // ...
  expect(googleSignIn).toHaveBeenCalledWith(
    { iosClientId: IOS_CLIENT_ID, webClientId: WEB_CLIENT_ID },
    expect.objectContaining({ mode: 'button' })
  );
});
```

Rejected errors need a `code` from `CredentialError` for `isCredentialError` to recognize them.

To change a constant, mock the module with your own values:

```ts
jest.mock('react-native-oauth-essentials', () => ({
  ...require('react-native-oauth-essentials/jest'),
  PASSKEYS_SUPPORTED: false,
}));
```
