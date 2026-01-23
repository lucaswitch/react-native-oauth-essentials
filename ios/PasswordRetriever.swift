import React
import AuthenticationServices

class PasswordRetriever: RCTPromiseSettler,
  ASAuthorizationControllerDelegate,
  ASAuthorizationControllerPresentationContextProviding {

  init(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock) {
    super.init(resolve: resolve, reject: reject)

    let request = ASAuthorizationPasswordProvider().createRequest()
    let controller = ASAuthorizationController(authorizationRequests: [request])
    controller.delegate = self
    controller.presentationContextProvider = self
    if #available(iOS 16.0, *) {
      controller.performRequests(options: .preferImmediatelyAvailableCredentials)
    } else {
      controller.performRequests()
    }
  }

  func authorizationController(
    controller: ASAuthorizationController,
    didCompleteWithAuthorization authorization: ASAuthorization
  ) {
    if let credential = authorization.credential as? ASPasswordCredential {
      let result = [
        "username": credential.user,
        "password": credential.password
      ]
      resolve?(result)
      cleanup()
    }
  }

  func authorizationController(
    controller: ASAuthorizationController,
    didCompleteWithError error: Error
  ) {
    reject?(
      CredentialError.invalidResult.rawValue,
      error.localizedDescription,
      error
    )
    cleanup()
  }

  func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
    return UIWindow()
  }

  func getIsSettled() -> Bool {
    return resolve == nil || reject == nil
  }

  private func cleanup() {
    resolve = nil
    reject = nil
  }
}
