import AuthenticationServices
import React

public class HybridRetriever: RCTPromiseSettler,
ASAuthorizationControllerDelegate,
ASAuthorizationControllerPresentationContextProviding  {

  private var controller: ASAuthorizationController?

  init(
    clientId: String,
    options: NSDictionary,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock,
    emitEvent: ((String, NSDictionary) -> Void)?
  ) {
    super.init(resolve: resolve, reject: reject, emitEvent: emitEvent)

    let controller = ASAuthorizationController(authorizationRequests: [
      AppleIdRetriever.createRequest(options: options),
      ASAuthorizationPasswordProvider().createRequest()
    ])

    controller.delegate = self
    controller.presentationContextProvider = self
    self.controller = controller

    if #available(iOS 16.0, *) {
      controller.performRequests(options: .preferImmediatelyAvailableCredentials)
    } else {
      controller.performRequests()
    }
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
    }
    else if let credential = authorization.credential as? ASPasswordCredential {
      succeed(CredentialFactory.fromPassword(credential: credential))
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
