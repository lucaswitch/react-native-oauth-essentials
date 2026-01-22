export type GoogleSignInOptions = {
  authorizedAccounts?: boolean;
  autoSelectEnabled?: boolean;
};

export type PasswordCredentialResult = {
  type: CredentialsType.PASSWORD;
  data: {
    username: string;
    password: string;
  };
};

export type GoogleIdCredentialResult = {
  type: CredentialsType.GOOGLE_ID;
  data: {
    idToken: string;
    id: string;
    displayName: string;
    givenName: string;
    familyName: string;
    profilePictureUri?: string | null;
    phoneNumber?: string | null;
  };
};

export type AppleIdCredentialResult = {
  type: CredentialsType.APPLE_ID;
  data: {};
};

export enum CredentialsType {
  GOOGLE_ID = 'GOOGLE_ID',
  PASSWORD = 'PASSWORD',
  APPLE_ID = 'APPLE_ID',
}

export enum CredentialError {
  NO_PLAY_SERVICES_ERROR = 'NO_PLAY_SERVICES_ERROR',
  NO_ACTIVITY_ERROR = 'NO_ACTIVITY_ERROR',
  INVALID_RESULT_ERROR = 'INVALID_RESULT_ERROR',
}
