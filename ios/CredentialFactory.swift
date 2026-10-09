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
          "likelyReal": appleIdCredential.realUserStatus == .likelyReal,
          "state": appleIdCredential.state ?? NSNull()
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
          "id": credential.credentialID.base64URLEncodedString(),
          "rawId": credential.credentialID.base64URLEncodedString(),
          "type": "public-key",
          "response": [
            "clientDataJSON": credential.rawClientDataJSON.base64URLEncodedString(),
            "attestationObject": (credential.rawAttestationObject ?? Data()).base64URLEncodedString()
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
          "id": credential.credentialID.base64URLEncodedString(),
          "rawId": credential.credentialID.base64URLEncodedString(),
          "type": "public-key",
          "response": [
            "clientDataJSON": credential.rawClientDataJSON.base64URLEncodedString(),
            "authenticatorData": credential.rawAuthenticatorData.base64URLEncodedString(),
            "signature": credential.signature.base64URLEncodedString(),
            "userHandle": credential.userID.base64URLEncodedString()
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

    public static func fromGoogleId(user: GIDGoogleUser, serverAuthCode: String?) -> [String: Any] {
        let profile = user.profile
        let data: [String: Any] = [
          "idToken": user.idToken?.tokenString ?? "",
          "id": user.userID ?? "",
          "displayName": profile?.name ?? "",
          "givenName": profile?.givenName ?? "",
          "familyName": profile?.familyName ?? "",
          "profilePictureUri": profile?.imageURL(withDimension: 200)?.absoluteString ?? "",
          "email": profile?.email ?? "",
          "accessToken": user.accessToken.tokenString,
          "serverAuthCode": serverAuthCode ?? NSNull(),
          "grantedScopes": user.grantedScopes ?? []
        ]

        let result: [String: Any] = [
          "type": CredentialsType.googleId.rawValue,
          "data": data
        ]
        return result
    }
}

/// base64url without padding (RFC 4648 §5), used by WebAuthn and PKCE.
extension Data {
    func base64URLEncodedString() -> String {
        return base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }

    init?(base64URLEncoded string: String) {
        var base64 = string
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        let remainder = base64.count % 4
        if remainder > 0 {
            base64.append(String(repeating: "=", count: 4 - remainder))
        }
        self.init(base64Encoded: base64)
    }
}
