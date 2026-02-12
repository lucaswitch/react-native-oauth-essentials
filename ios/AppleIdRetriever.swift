import AuthenticationServices
import React

public class AppleIdRetriever: RCTPromiseSettler,
  ASAuthorizationControllerDelegate,
  ASAuthorizationControllerPresentationContextProviding  {

  override init(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock,
    emitEvent: ((String, NSDictionary) -> Void)?
  ) {
    super.init(resolve: resolve, reject: reject, emitEvent: emitEvent)

    let controller = ASAuthorizationController(authorizationRequests: [
      ASAuthorizationAppleIDProvider().createRequest(),
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
    if let appleIdCredential = authorization.credential as? ASAuthorizationAppleIDCredential {
      let result = CredentialFactory.fromAppleId(appleIdCredential: appleIdCredential)
      self.resolve?(result)
      self.emitEvent?("onCredentialSuccess", result as NSDictionary)
      cleanup()
    }
  }

  public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
    let nsError = error as NSError
    if nsError.domain == ASAuthorizationError.errorDomain,
       nsError.code == ASAuthorizationError.canceled.rawValue {
      
      let result = CredentialFactory.fromCancelled()
      self.resolve?(result)
      self.emitEvent?("onCredentialSuccess", result as NSDictionary)
    } else {
      self.emitEvent?("onCredentialFailure", [
        "code": CredentialError.invalidResult.rawValue,
        "message": error.localizedDescription
      ])
    }
    cleanup()
  }
}
