import {
  type CodegenTypes,
  type TurboModule,
  TurboModuleRegistry,
} from 'react-native';

export interface Spec extends TurboModule {
  // Events
  readonly onCredentialSuccess: CodegenTypes.EventEmitter<CredentialSuccessEvent>;
  readonly onCredentialFailure: CodegenTypes.EventEmitter<CredentialErrorEvent>;

  getConstants(): {
    readonly GOOGLE_PLAY_SERVICES_SUPPORTED: boolean;
    readonly PASSWORD_SUPPORTED: boolean;
    readonly GOOGLE_ID_SUPPORTED: boolean;
    readonly APPLE_ID_SUPPORTED: boolean;
    readonly HYBRID_SUPPORTED: boolean;
    readonly PASSKEYS_SUPPORTED: boolean;
  };

  /**
   * Performs the google sign in.
   * @param androidAndIOSClientId
   * @param options
   */
  googleSignIn(androidAndIOSClientId: string, options: Object): Promise<Object>;

  /**
   * Sign ins with apple.
   * @param androidWebUrl
   */
  appleSignIn(androidWebUrl?: string): Promise<Object>;

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
