import AuthenticationServices
import React

public class AppleIdRetriever: RCTPromiseSettler,
  ASAuthorizationControllerDelegate,
  ASAuthorizationControllerPresentationContextProviding  {

  private var controller: ASAuthorizationController?

  init(
    options: NSDictionary,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock,
    emitEvent: ((String, NSDictionary) -> Void)?
  ) {
    super.init(resolve: resolve, reject: reject, emitEvent: emitEvent)

    let controller = ASAuthorizationController(authorizationRequests: [
      AppleIdRetriever.createRequest(options: options),
    ])
    controller.delegate = self
    controller.presentationContextProvider = self
    self.controller = controller
    controller.performRequests()
  }

  /// Apple only returns the email and full name on the first sign in, and only when requested.
  static func createRequest(options: NSDictionary?) -> ASAuthorizationAppleIDRequest {
    let request = ASAuthorizationAppleIDProvider().createRequest()
    request.requestedScopes = [.fullName, .email]
    if let nonce = options?["nonce"] as? String {
      request.nonce = nonce
    }
    if let state = options?["state"] as? String {
      request.state = state
    }
    return request
  }

  public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
    return PresentationContext.anchor()
  }

  public func authorizationController(
    controller: ASAuthorizationController,
    didCompleteWithAuthorization authorization: ASAuthorization
  ) {
    self.controller = nil
    if let appleIdCredential = authorization.credential as? ASAuthorizationAppleIDCredential {
      succeed(CredentialFactory.fromAppleId(appleIdCredential: appleIdCredential))
    } else {
      fail(.invalidResult, "Unexpected credential type")
    }
  }

  public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
    self.controller = nil
    let nsError = error as NSError
    if nsError.domain == ASAuthorizationError.errorDomain,
       nsError.code == ASAuthorizationError.canceled.rawValue {
      succeed(CredentialFactory.fromCancelled())
    } else {
      fail(.invalidResult, error.localizedDescription, error)
    }
  }
}
