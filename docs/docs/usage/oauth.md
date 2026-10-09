# OAuth Sign-In

`oauthSignIn` signs in with any OAuth 2.0 / OpenID Connect provider (Microsoft, GitHub, Facebook, Auth0, Keycloak,
your own server...) using the authorization code flow with PKCE, in a secure browser session.

## Platform Support

### iOS
- Uses `ASWebAuthenticationSession`
- The redirect scheme does not need to be registered in `Info.plist`
- `prefersEphemeralSession` disables cookie sharing with Safari

### Android
- Uses Chrome Custom Tabs
- The redirect must reach the library `CustomTabsActivity`. `OAUTH_REDIRECT_URI` (`<applicationId>://oauth/callback`)
  already does; for another uri, add an intent filter for it to `com.oauthessentials.CustomTabsActivity` in your
  `AndroidManifest.xml`

## Methods

### `oauthSignIn(options: OAuthSignInOptions)`

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| `authorizationEndpoint` | `string` | Provider authorization url |
| `clientId` | `string` | Your OAuth client id |
| `redirectUri` | `string?` | Defaults to `OAUTH_REDIRECT_URI` |
| `scopes` | `string[]?` | Requested scopes |
| `additionalParameters` | `Record<string, string>?` | Extra authorization parameters, like `prompt`. May override `scope`; `state`, `redirect_uri`, `code_challenge` and the other parameters set by the library are ignored |
| `tokenEndpoint` | `string?` | Exchanges the code for tokens on the device |
| `usePKCE` | `boolean?` | Defaults to `true` |
| `prefersEphemeralSession` | `boolean?` | iOS only |

#### Returns

`Promise<OAuthCredentialResult | CancelledCredentialResult>`

`OAuthCredentialResult.data` has the authorization `code`, `state`, `redirectUri`, the PKCE `codeVerifier`, every
redirect parameter in `params` and, with `tokenEndpoint`, the token response in `tokens`.

The `state` is generated and verified by the library. A provider `access_denied` error resolves as `CANCELLED`; other
provider errors, and a non JSON token response, reject with `INVALID_RESULT_ERROR`. When the browser cannot be opened it
rejects with `BROWSER_UNAVAILABLE`, when the token request fails (offline, DNS, TLS...) with `NETWORK_ERROR`, and when
`redirectUri` has no scheme with `CONFIGURATION_ERROR`. Every rejection has a `code`: narrow it with
`isCredentialError`. `oauthSignIn` does not emit events.

#### Example: exchange the code on your backend (recommended)

```ts
import { oauthSignIn, OAUTH_REDIRECT_URI, CredentialsType } from 'react-native-oauth-essentials';

const result = await oauthSignIn({
  authorizationEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
  clientId: 'YOUR_CLIENT_ID',
  scopes: ['openid', 'profile', 'email', 'offline_access'],
});

if (result.type === CredentialsType.OAUTH) {
  await api.post('/auth/microsoft', {
    code: result.data.code,
    codeVerifier: result.data.codeVerifier,
    redirectUri: result.data.redirectUri, // must match OAUTH_REDIRECT_URI registered in the provider
  });
}
```

#### Example: public client token exchange on the device

```ts
const result = await oauthSignIn({
  authorizationEndpoint: 'https://your-tenant.auth0.com/authorize',
  tokenEndpoint: 'https://your-tenant.auth0.com/oauth/token',
  clientId: 'YOUR_CLIENT_ID',
  scopes: ['openid', 'profile'],
});

if (result.type === CredentialsType.OAUTH) {
  console.log(result.data.tokens?.access_token);
}
```

Never put a client secret in the app: providers that require one (GitHub OAuth apps, Facebook) must exchange the code
on your backend.
