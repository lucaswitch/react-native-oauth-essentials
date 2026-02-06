import {
  type CodegenTypes,
  type TurboModule,
  TurboModuleRegistry,
} from 'react-native';

export interface Spec extends TurboModule {
  // Events
  readonly onCredentialSuccess: CodegenTypes.EventEmitter<CredentialSuccessEvent>;
  readonly onCredentialFailure: CodegenTypes.EventEmitter<CredentialErrorEvent>;
  readonly onWebAppleCredentialSuccess: CodegenTypes.EventEmitter<CredentialSuccessEvent>;

  getConstants(): {
    readonly GOOGLE_PLAY_SERVICES_SUPPORTED: boolean;
    readonly PASSWORD_SUPPORTED: boolean;
    readonly GOOGLE_ID_SUPPORTED: boolean;
    readonly APPLE_ID_SUPPORTED: boolean;
    readonly HYBRID_SUPPORTED: boolean;
  };

  googleSignIn(webClientId: string, options: Object): Promise<Object>;

  appleSignIn(androidWebUrl?: string): Promise<Object>;

  passwordSignIn(username: string, password: string): Promise<boolean>;

  getPassword(): Promise<Object>;

  hybridSignIn(googleClientId: string, options: Object): Promise<Object>;
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
