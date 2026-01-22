import { TurboModuleRegistry, type TurboModule } from 'react-native';

export interface Spec extends TurboModule {
  getConstants(): {
    readonly GOOGLE_PLAY_SERVICES_SUPPORTED: boolean;
    readonly PASSWORD_SUPPORTED: boolean;
    readonly GOOGLE_ID_SUPPORTED: boolean;
    readonly APPLE_ID_SUPPORTED: boolean;
  };

  googleSignIn(clientId: string, options: Object): Promise<Object>;

  appleSignIn(): Promise<Object>;

  passwordSignIn(username: string, password: string): Promise<boolean>;

  getPassword(): Promise<Object>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('OauthEssentials');
