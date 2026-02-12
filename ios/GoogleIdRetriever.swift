import GoogleSignIn
import React

public class GoogleIdRetriever: RCTPromiseSettler {

  init(
    clientId: String,
    options: NSDictionary,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock,
    emitEvent: ((String, NSDictionary) -> Void)?
  ) {
    super.init(resolve: resolve, reject: reject, emitEvent: emitEvent)
    performGoogleSignIn(clientId:clientId, options: options)
  }

  private func performGoogleSignIn(clientId: String, options: NSDictionary) {
    var rootVC: UIViewController?
    DispatchQueue.main.sync {
        if #available(iOS 13.0, *) {
            rootVC = UIApplication.shared.connectedScenes
                .compactMap { $0 as? UIWindowScene }
                .flatMap { $0.windows }
                .first { $0.isKeyWindow }?
                .rootViewController
        } else {
            rootVC = UIApplication.shared.keyWindow?.rootViewController
        }
    }

    guard let rootVC = rootVC else {
      self.reject?(
        CredentialError.noSignInAvailable.rawValue,
        "No root view controller available",
        nil
      )
      self.emitEvent?("onCredentialFailure", [
        "code": CredentialError.noSignInAvailable.rawValue,
        "message": "No root view controller available"
      ])

      self.cleanup()
      return
    }

    GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clientId)
    GIDSignIn.sharedInstance.signIn(withPresenting: rootVC) { result, error in
      
      if let error = error {
        let nsError = error as NSError
        if nsError.code == GIDSignInError.canceled.rawValue {
          let result = CredentialFactory.fromCancelled()
          self.resolve?(result)
          self.emitEvent?("onCredentialSuccess", result as NSDictionary)
        } else {
          self.reject?(CredentialError.invalidResult.rawValue, error.localizedDescription, error)
          self.emitEvent?("onCredentialFailure", [
            "code": CredentialError.invalidResult.rawValue,
            "message": error.localizedDescription
          ])
        }
        self.cleanup()
        return
      }
      
      guard let user = result?.user else {
          self.reject?(CredentialError.invalidResult.rawValue, "No user returned", nil)
          self.emitEvent?("onCredentialFailure", [
            "code": CredentialError.invalidResult.rawValue,
            "message": "No user returned"
          ])
          
          self.cleanup()
          return
      }

      let result = CredentialFactory.fromGoogleId(user: user)
      self.resolve?(result)
      self.emitEvent?("onCredentialSuccess", result as NSDictionary)
      self.cleanup()
    }
  }
}
