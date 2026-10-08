import {
  type CodegenTypes,
  type TurboModule,
  TurboModuleRegistry,
} from 'react-native';

export interface Spec extends TurboModule {
  // Events
  readonly onCredentialSuccess: CodegenTypes.EventEmitter<CredentialSuccessEvent>;
  readonly onCredentialFailure: CodegenTypes.EventEmitter<CredentialErrorEvent>;
  readonly onAppleIdCredentialRevoked: CodegenTypes.EventEmitter<AppleIdCredentialRevokedEvent>;

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
   * Performs the google sign in.
   * @param androidAndIOSClientId
   * @param options
   */
  googleSignIn(androidAndIOSClientId: string, options: Object): Promise<Object>;

  /**
   * Restores a previous google sign in without showing the account picker when possible.
   * @param androidAndIOSClientId
   * @param options
   */
  googleSilentSignIn(
    androidAndIOSClientId: string,
    options: Object
  ): Promise<Object>;

  /**
   * Clears the stored sign in state (Google session on iOS, Credential Manager state on Android).
   */
  signOut(): Promise<boolean>;

  /**
   * Sign ins with apple.
   * @param androidWebUrl
   * @param options
   */
  appleSignIn(androidWebUrl: string | null, options: Object): Promise<Object>;

  /**
   * Gets the Apple ID credential state for the given user. [iOS only]
   * @param userId
   */
  getAppleIdCredentialState(userId: string): Promise<string>;

  /**
   * Saves the username/password credential
   * @param username
   * @param password
   */
  passwordSignIn(username: string, password: string): Promise<boolean>;

  /**
   * Gets the saved password.
   */
  getPassword(): Promise<Object>;

  /**
   * Performs the called so "hybrid sign in"
   * @param googleClientId
   * @param options
   */
  hybridSignIn(googleClientId: string, options: Object): Promise<Object>;

  /**
   * Creates the passkey.
   */
  createPassKey(options: Object): Promise<Object>;

  /**
   * Gets the passkey
   * @param options
   */
  getPassKey(options: Object): Promise<Object>;

  /**
   * Cancels a pending passkey AutoFill request. [iOS only]
   */
  cancelPassKeyAutoFill(): Promise<boolean>;

  /**
   * Generates a PKCE code verifier/challenge pair and a random state.
   */
  generatePkce(): Promise<Object>;

  /**
   * Opens an authorization url in a secure browser session and resolves with the redirect url.
   * @param url
   * @param options
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
