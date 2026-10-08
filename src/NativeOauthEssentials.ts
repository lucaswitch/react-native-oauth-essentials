import {
  type CodegenTypes,
  type TurboModule,
  TurboModuleRegistry,
} from 'react-native';

export interface Spec extends TurboModule {
  // Events
  /** Emitted with the `{ type, data }` a credential method resolves with, including `CANCELLED`. */
  readonly onCredentialSuccess: CodegenTypes.EventEmitter<CredentialSuccessEvent>;
  /** Emitted with `{ code, message }` when a credential method rejects. */
  readonly onCredentialFailure: CodegenTypes.EventEmitter<CredentialErrorEvent>;
  /** iOS only: emitted with `{ type: 'REVOKED' }` on `credentialRevokedNotification`. */
  readonly onAppleIdCredentialRevoked: CodegenTypes.EventEmitter<AppleIdCredentialRevokedEvent>;

  /**
   * Read once when the module loads. See the exported constants in `index.tsx` for the values.
   */
  getConstants(): {
    readonly GOOGLE_PLAY_SERVICES_SUPPORTED: boolean;
    readonly PASSWORD_SUPPORTED: boolean;
    readonly GOOGLE_ID_SUPPORTED: boolean;
    readonly APPLE_ID_SUPPORTED: boolean;
    readonly HYBRID_SUPPORTED: boolean;
    readonly PASSKEYS_SUPPORTED: boolean;
    readonly OAUTH_REDIRECT_URI: string;
  };

  /**
   * iOS: GoogleSignIn `signIn` from the top most view controller. Android: Credential Manager
   * Google ID / "Sign in with Google" option, then the Authorization API when `scopes` or
   * `offlineAccess` are set. Resolves `GOOGLE_ID` or `CANCELLED`.
   * @param androidAndIOSClientId - Web client id on Android, iOS client id on iOS ('' reads
   * `GIDClientID` from Info.plist). Rejects `CONFIGURATION_ERROR` when it is missing or, on iOS,
   * when its reversed URL scheme is not registered.
   * @param options - GoogleSignInOptions, already normalized by `index.tsx`.
   */
  googleSignIn(androidAndIOSClientId: string, options: Object): Promise<Object>;

  /**
   * iOS: GoogleSignIn `restorePreviousSignIn` (no UI). Android: Credential Manager filtered to
   * authorized accounts with auto select, authorization without UI.
   * Resolves `GOOGLE_ID` or `CANCELLED`, rejects `NO_SIGN_IN_AVAILABLE` when there is nothing to restore.
   */
  googleSilentSignIn(
    androidAndIOSClientId: string,
    options: Object
  ): Promise<Object>;

  /**
   * iOS: GoogleSignIn `signOut`. Android: Credential Manager `clearCredentialState`.
   * Resolves `true`. Does not emit events.
   */
  signOut(): Promise<boolean>;

  /**
   * iOS: native Apple ID request (`fullName`, `email`, `options.nonce`, `options.state`); resolves
   * `APPLE_ID` or `CANCELLED`, `androidWebUrl` is ignored.
   * Android: opens `androidWebUrl` in a Custom Tab and resolves `WEB_APPLE_ID` with the redirect
   * url or `CANCELLED`; `options` is ignored.
   * Unlike `appleSignIn` in `index.tsx`, it does not fill `email`/`fullName` from previous results.
   */
  appleSignIn(androidWebUrl: string | null, options: Object): Promise<Object>;

  /**
   * iOS: `ASAuthorizationAppleIDProvider.getCredentialState`, resolves `AUTHORIZED`, `REVOKED`,
   * `TRANSFERRED` or `NOT_FOUND`. Android: always rejects `NOT_SUPPORTED_ERROR`.
   */
  getAppleIdCredentialState(userId: string): Promise<string>;

  /**
   * iOS: resolves `false` without doing anything. Android: Credential Manager
   * `CreatePasswordRequest`, resolves `true` when saved and `false` on any error.
   */
  passwordSignIn(username: string, password: string): Promise<boolean>;

  /**
   * Shows the saved passwords. Resolves `PASSWORD`, or `CANCELLED` when there is none or the user
   * dismisses it.
   */
  getPassword(): Promise<Object>;

  /**
   * iOS: Apple ID + password request (`googleClientId` ignored). Android: Google ID + password
   * Credential Manager request. Resolves the picked credential or `CANCELLED`.
   */
  hybridSignIn(googleClientId: string, options: Object): Promise<Object>;

  /**
   * Registers a passkey from `options.requestJson` (WebAuthn creation options).
   * Resolves `PASSKEY` with the registration response JSON string in `data`, or `CANCELLED`.
   */
  createPassKey(options: Object): Promise<Object>;

  /**
   * Asserts a passkey from `options.requestJson` (WebAuthn request options), with
   * `options.mediation === 'autofill'` on iOS for QuickType bar AutoFill.
   * Resolves `PASSKEY` with the authentication response JSON string in `data`, or `CANCELLED`.
   */
  getPassKey(options: Object): Promise<Object>;

  /**
   * iOS 16+: cancels a pending AutoFill `getPassKey` (which resolves `CANCELLED`) and resolves
   * `true`, or resolves `false` when there is none. Android: resolves `false`.
   */
  cancelPassKeyAutoFill(): Promise<boolean>;

  /**
   * Resolves `{ codeVerifier, codeChallenge, state }`: a 32 byte random base64url verifier, its
   * SHA-256 base64url challenge (PKCE S256) and a 16 byte random base64url state.
   */
  generatePkce(): Promise<Object>;

  /**
   * Opens `url` in `ASWebAuthenticationSession` (iOS, `options.callbackScheme`,
   * `options.prefersEphemeralSession`) or a Custom Tab (Android, http/https only, `options`
   * ignored). Resolves `{ type: 'REDIRECT', data: { url } }` with the redirect url, or `CANCELLED`.
   * Does not emit events.
   */
  openAuthSession(url: string, options: Object): Promise<Object>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('OauthEssentials');

type CredentialSuccessEvent = {
  type: string;
  data: Object;
};

type CredentialErrorEvent = {
  code: string;
  message: string;
};

type AppleIdCredentialRevokedEvent = {
  type: string;
};
