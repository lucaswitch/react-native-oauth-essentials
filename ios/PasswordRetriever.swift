import React
import AuthenticationServices

public class PasswordRetriever: RCTPromiseSettler,
  ASAuthorizationControllerDelegate,
  ASAuthorizationControllerPresentationContextProviding {

  private var controller: ASAuthorizationController?

  override init(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock,
    emitEvent: ((String, NSDictionary) -> Void)?
  ) {
    super.init(resolve: resolve, reject: reject, emitEvent: emitEvent)

    let request = ASAuthorizationPasswordProvider().createRequest()
    let controller = ASAuthorizationController(authorizationRequests: [request])
    controller.delegate = self
    controller.presentationContextProvider = self
    self.controller = controller
    if #available(iOS 16.0, *) {
      controller.performRequests(options: .preferImmediatelyAvailableCredentials)
    } else {
      controller.performRequests()
    }
  }

  public func authorizationController(
    controller: ASAuthorizationController,
    didCompleteWithAuthorization authorization: ASAuthorization
  ) {
    self.controller = nil
    if let credential = authorization.credential as? ASPasswordCredential {
      succeed(CredentialFactory.fromPassword(credential: credential))
    } else {
      fail(.invalidResult, "Unexpected credential type")
    }
  }

  public func authorizationController(
    controller: ASAuthorizationController,
    didCompleteWithError error: Error
  ) {
    self.controller = nil
    finish(authorizationError: error)
  }

  public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
    return PresentationContext.anchor()
  }
}
