import AuthenticationServices
import GoogleSignIn

class CredentialFactory {
  
    public static func fromCancelled() -> [String: Any] {
        return [
            "type": CredentialsType.cancelled.rawValue,
            "data": NSNull()
        ]
    }
    
    public static func fromAppleId(appleIdCredential: ASAuthorizationAppleIDCredential) -> [String: Any]  {
        let idToken: Any =
        appleIdCredential.identityToken
        .flatMap { String(data: $0, encoding: .utf8) } ?? NSNull()

        let authorizationCode: Any =
        appleIdCredential.authorizationCode
        .flatMap { String(data: $0, encoding: .utf8) } ?? NSNull()

        let fullName =
        appleIdCredential.fullName
        .flatMap { PersonNameComponentsFormatter().string(from: $0) } ?? ""

        let data: [String: Any] = [
          "idToken": idToken,
          "authorizationCode": authorizationCode,
          "user": appleIdCredential.user,
          "email": appleIdCredential.email ?? "",
          "fullName": fullName,
          "likelyReal": appleIdCredential.realUserStatus == .likelyReal
        ]

        let result: [String: Any] = [
          "type": CredentialsType.appleId.rawValue,
          "data": data
        ]
        
        return result
    }
    
    public static func fromPassword(credential: ASPasswordCredential) -> [String: Any] {
        let data: [String: Any] = [
            "username": credential.user, "password": credential.password
        ]
        let result: [String: Any] = [
          "type": CredentialsType.password.rawValue,
          "data": data
        ]
        return result
    }
    
    @available(iOS 16.0, *)
    public static func fromPasskeyRegistration(credential: ASAuthorizationPlatformPublicKeyCredentialRegistration) -> [String: Any] {
        let responseJson: [String: Any] = [
          "id": base64URLEncode(credential.credentialID),
          "rawId": base64URLEncode(credential.credentialID),
          "type": "public-key",
          "response": [
            "clientDataJSON": base64URLEncode(credential.rawClientDataJSON),
            "attestationObject": base64URLEncode(credential.rawAttestationObject ?? Data())
          ]
        ]

        guard let jsonData = try? JSONSerialization.data(withJSONObject: responseJson),
              let jsonString = String(data: jsonData, encoding: .utf8) else {
          return [
            "type": CredentialsType.passkey.rawValue,
            "data": "{}"
          ]
        }

        return [
          "type": CredentialsType.passkey.rawValue,
          "data": jsonString
        ]
    }

    @available(iOS 16.0, *)
    public static func fromPasskeyAssertion(credential: ASAuthorizationPlatformPublicKeyCredentialAssertion) -> [String: Any] {
        let responseJson: [String: Any] = [
          "id": base64URLEncode(credential.credentialID),
          "rawId": base64URLEncode(credential.credentialID),
          "type": "public-key",
          "response": [
            "clientDataJSON": base64URLEncode(credential.rawClientDataJSON),
            "authenticatorData": base64URLEncode(credential.rawAuthenticatorData),
            "signature": base64URLEncode(credential.signature),
            "userHandle": base64URLEncode(credential.userID)
          ]
        ]

        guard let jsonData = try? JSONSerialization.data(withJSONObject: responseJson),
              let jsonString = String(data: jsonData, encoding: .utf8) else {
          return [
            "type": CredentialsType.passkey.rawValue,
            "data": "{}"
          ]
        }

        return [
          "type": CredentialsType.passkey.rawValue,
          "data": jsonString
        ]
    }

    private static func base64URLEncode(_ data: Data) -> String {
        return data.base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }

    public static func fromGoogleId(user: GIDGoogleUser) -> [String: Any] {
        let profile = user.profile
        let data: [String: Any] = [
          "idToken": user.idToken?.tokenString ?? "",
          "id": user.userID ?? "",
          "displayName": profile?.name ?? "",
          "givenName": profile?.givenName ?? "",
          "familyName": profile?.familyName ?? "",
          "profilePictureUri": profile?.imageURL(withDimension: 200)?.absoluteString ?? "",
          "email": profile?.email ?? ""
        ]

        let result: [String: Any] = [
          "type": CredentialsType.googleId.rawValue,
          "data": data
        ]
        return result
    }
}
