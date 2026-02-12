import React
import AuthenticationServices

public class PasswordRetriever: RCTPromiseSettler,
  ASAuthorizationControllerDelegate,
  ASAuthorizationControllerPresentationContextProviding {

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
    if let credential = authorization.credential as? ASPasswordCredential {
      let result = CredentialFactory.fromPassword(credential:  credential)
      self.resolve?(result)
      self.emitEvent?("onCredentialSuccess", result as NSDictionary)

      cleanup()
    }
  }

  public func authorizationController(
    controller: ASAuthorizationController,
    didCompleteWithError error: Error
  ) {
    let nsError = error as NSError
    if nsError.domain == ASAuthorizationError.errorDomain,
       nsError.code == ASAuthorizationError.canceled.rawValue {
    
      let result = CredentialFactory.fromCancelled()
      self.resolve?(result)
      self.emitEvent?("onCredentialSuccess", result as NSDictionary)
    } else {
      self.reject?(
        CredentialError.invalidResult.rawValue,
        error.localizedDescription,
        error
      )
      self.emitEvent?("onCredentialFailure", [
        "code": CredentialError.invalidResult.rawValue,
        "message": error.localizedDescription
      ])
    }

    self.cleanup()
  }

  public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
    return UIWindow()
  }

  func getIsSettled() -> Bool {
    return resolve == nil || reject == nil
  }
}
