import {
  type CodegenTypes,
  type TurboModule,
  TurboModuleRegistry,
} from 'react-native';

export interface Spec extends TurboModule {
  getConstants(): {
    readonly GOOGLE_PLAY_SERVICES_SUPPORTED: boolean;
    readonly PASSWORD_SUPPORTED: boolean;
    readonly GOOGLE_ID_SUPPORTED: boolean;
    readonly APPLE_ID_SUPPORTED: boolean;
  };

  googleSignIn(webClientId: string, options: Object): Promise<Object>;

  appleSignIn(appleIdentifier?: string, redirectUrl?: string): Promise<Object>;

  passwordSignIn(username: string, password: string): Promise<boolean>;

  getPassword(): Promise<Object>;

  hybridSignIn(googleClientId: string, options: Object): Promise<Object>;

  readonly onCredentialReceived: CodegenTypes.EventEmitter<Object>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('OauthEssentials');
