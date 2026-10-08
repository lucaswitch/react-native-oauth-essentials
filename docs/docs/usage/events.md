---
sidebar_position: 10
---

# Events

Besides resolving or rejecting, the sign in methods report their result through events. Use them for things that are
not tied to one call site: analytics, logging, or reacting to an Apple ID being revoked while the app runs.

Every listener returns an `EventSubscription`. Call `remove()` when you no longer need it (e.g. on unmount).

## Methods

### `addCredentialSuccessListener(listener)`

Called with the same `{ type, data }` the promise resolves with, **including `CANCELLED`**.

Emitted by `googleSignIn`, `googleSilentSignIn`, `getPassword`, `appleSignIn`, `hybridSignIn`, `createPassKey` and
`getPassKey`. Not emitted by `signOut`, `passwordSignIn`, `getAppleIdCredentialState`, `cancelPassKeyAutoFill` and
`oauthSignIn`.

The event `type` is a `CredentialsType` value and `data` is the result `data` (see
[`CredentialSuccessEvent`](../types#credentialsuccessevent)).

### `addCredentialFailureListener(listener)`

Called with `{ code, message }` when one of the methods above rejects, including `CONFIGURATION_ERROR` from the Google
and hybrid methods (see [`CredentialFailureEvent`](../types#credentialfailureevent); `code` is typed as
`CredentialErrorCode`). `oauthSignIn` never emits, so its `NETWORK_ERROR` and `CONFIGURATION_ERROR` only reject.

These rejections are not emitted:

- `SIMULTANEOUS_CALL_ERROR`
- iOS passkey `NOT_SUPPORTED_ERROR` (below iOS 16)
- iOS passkey call without `requestJson`

On Android, `passwordSignIn` resolves `false` on errors (including the user declining), which emits nothing.
`getPassword` resolves `CANCELLED` when the user dismisses it or there is no saved password (emitted as a success event)
and rejects with `INVALID_RESULT_ERROR` on other errors (emitted as a failure event).

### `addAppleIdCredentialRevokedListener(listener)` (iOS only)

Called when iOS posts `ASAuthorizationAppleIDProvider.credentialRevokedNotification`: the user stopped using Apple ID
with your app (Settings > Apple ID > Sign in with Apple) while the app is running. Sign the user out when it fires.
Never called on Android.

It only covers revocations while the app runs. Also call
[`getAppleIdCredentialState`](./apple.md) on app start.

## Example

```tsx
import { useEffect } from 'react';
import {
  addCredentialSuccessListener,
  addCredentialFailureListener,
  addAppleIdCredentialRevokedListener,
  CredentialsType,
} from 'react-native-oauth-essentials';

export function useAuthEvents(signOutLocally: () => void) {
  useEffect(() => {
    const subscriptions = [
      addCredentialSuccessListener((event) => {
        if (event.type !== CredentialsType.CANCELLED) {
          analytics.track('sign_in', { method: event.type });
        }
      }),
      addCredentialFailureListener((event) => {
        analytics.track('sign_in_error', { code: event.code, message: event.message });
      }),
      addAppleIdCredentialRevokedListener(() => signOutLocally()),
    ];
    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, [signOutLocally]);
}
```

:::caution
The success event carries the full result, including Google/Apple tokens and saved passwords. Do not send `event.data`
to analytics or logs.
:::
