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

export type CancelledCredentialResult = {
  type: CredentialsType.CANCELLED;
  data: null;
};

export type AppleIdCredentialResult = {
  type: CredentialsType.APPLE_ID;
  data: {
    idToken: string;
  };
};

export type WebAppleIdCredentialResult = {
  type: CredentialsType.WEB_APPLE_ID;
  data: {
    url: string;
    scheme: string | null;
    host: string | null;
    path: string | null;
    query: string | null;
  };
};

export enum CredentialsType {
  GOOGLE_ID = 'GOOGLE_ID', // GoogleId credentials type
  PASSWORD = 'PASSWORD', // Password credentials type
  APPLE_ID = 'APPLE_ID', // IOS AppleId credentials type
  WEB_APPLE_ID = 'WEB_APPLE_ID', // Android AppleId credentials type
  CANCELLED = 'CANCELLED', // type when the user cancels it
}

export enum CredentialError {
  NO_PLAY_SERVICES_ERROR = 'NO_PLAY_SERVICES_ERROR',
  NO_ACTIVITY_ERROR = 'NO_ACTIVITY_ERROR',
  INVALID_RESULT_ERROR = 'INVALID_RESULT_ERROR',
}
