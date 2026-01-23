import AuthenticationServices
import React

public class HybridRetriever: RCTPromiseSettler,
ASAuthorizationControllerDelegate,
ASAuthorizationControllerPresentationContextProviding  {

  init(
    clientId: String,
    options: NSDictionary,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    super.init(resolve: resolve, reject: reject)

    let controller = ASAuthorizationController(authorizationRequests: [
      ASAuthorizationAppleIDProvider().createRequest(),
      ASAuthorizationPasswordProvider().createRequest()
    ])

    controller.delegate = self
    controller.presentationContextProvider = self

    if #available(iOS 16.0, *) {
      controller.performRequests(options: .preferImmediatelyAvailableCredentials)
    } else {
      controller.performRequests()
    }
  }

  public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
    return UIWindow()
  }

  public func authorizationController(
    controller: ASAuthorizationController,
    didCompleteWithAuthorization authorization: ASAuthorization
  ) {
    if let appleIDCredential = authorization.credential as? ASAuthorizationAppleIDCredential {
      let idToken: Any =
      appleIDCredential.identityToken
      .flatMap { String(data: $0, encoding: .utf8) } ?? NSNull()

      let authorizationCode: Any =
      appleIDCredential.authorizationCode
      .flatMap { String(data: $0, encoding: .utf8) } ?? NSNull()

      let fullName =
      appleIDCredential.fullName
      .flatMap { PersonNameComponentsFormatter().string(from: $0) } ?? ""

      let data: [String: Any] = [
        "idToken": idToken,
        "authorizationCode": authorizationCode,
        "user": appleIDCredential.user,
        "email": appleIDCredential.email ?? "",
        "fullName": fullName,
        "likelyReal": appleIDCredential.realUserStatus == .likelyReal
      ]

      let result: [String: Any] = [
        "type": CredentialsType.appleId.rawValue,
        "data": data
      ]

      self.resolve?(result)
    }
    else if let credential = authorization.credential as? ASPasswordCredential {
      let result = [
        "username": credential.user,
        "password": credential.password
      ]
      resolve?(result)
      cleanup()
    }
  }

  public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
    self.reject?(
      CredentialError.invalidResult.rawValue,
      error.localizedDescription,
      error
    )
  }
}
