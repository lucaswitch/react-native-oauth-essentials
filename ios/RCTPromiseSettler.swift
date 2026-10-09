import AuthenticationServices
import React
import UIKit

public typealias EventEmitter = ((_ eventName: String, _ body: [String: Any]) -> Void)?
public class RCTPromiseSettler: NSObject {
  internal var resolve: RCTPromiseResolveBlock?
  internal var reject: RCTPromiseRejectBlock?
  internal var emitEvent: ((String, NSDictionary) -> Void)?

  init(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock,
    emitEvent: ((String, NSDictionary) -> Void)?
  ) {
    self.resolve = resolve
    self.reject = reject
    self.emitEvent = emitEvent
  }

  public func settled() -> Bool {
    return self.resolve == nil && self.reject == nil
  }

  internal func succeed(_ result: [String: Any]) {
    self.resolve?(result)
    self.emitEvent?("onCredentialSuccess", result as NSDictionary)
    cleanup()
  }

  internal func fail(_ code: CredentialError, _ message: String, _ error: Error? = nil) {
    self.reject?(code.rawValue, message, error)
    self.emitEvent?("onCredentialFailure", [
      "code": code.rawValue,
      "message": message
    ])
    cleanup()
  }

  internal func cleanup() -> Void {
    self.resolve = nil
    self.reject = nil
    self.emitEvent = nil
  }

  /// ASAuthorizationController failure: a cancellation resolves as CANCELLED, anything else rejects.
  internal func finish(authorizationError error: Error) {
    let nsError = error as NSError
    if nsError.domain == ASAuthorizationError.errorDomain,
       nsError.code == ASAuthorizationError.canceled.rawValue {
      succeed(CredentialFactory.fromCancelled())
    } else {
      fail(.invalidResult, error.localizedDescription, error)
    }
  }

  /// Checks what ASWebAuthenticationSession (also used by GoogleSignIn) needs to start: no Guided
  /// Access, the app active (waiting up to `browserActiveTimeout`) and a view controller in a
  /// foreground active scene. A failed start is then reported as BROWSER_UNAVAILABLE without relying
  /// on the error the session returns. Calls `open` with that view controller, or fails.
  internal func whenBrowserCanOpen(_ name: String, _ open: @escaping (UIViewController) -> Void) {
    if UIAccessibility.isGuidedAccessEnabled {
      fail(.browserUnavailable, "\(name) cannot open the browser while Guided Access is enabled")
      return
    }

    PresentationContext.whenActive(timeout: Self.browserActiveTimeout) { active in
      guard active else {
        self.fail(.browserUnavailable, "\(name) requires the app to be active")
        return
      }
      guard let presenter = PresentationContext.topViewController() else {
        self.fail(.noActivity, "No view controller available to present \(name)")
        return
      }
      guard presenter.view.window?.windowScene?.activationState == .foregroundActive else {
        self.fail(.browserUnavailable, "\(name) cannot open the browser: the app window is not in the foreground")
        return
      }
      open(presenter)
    }
  }

  /// How long to wait for the app to become active before giving up on opening the browser.
  private static let browserActiveTimeout: TimeInterval = 2
}

/// Finds where to present the sign in UI. Must be called on the main thread.
enum PresentationContext {

  static func activeWindowScene() -> UIWindowScene? {
    let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
    return scenes.first { $0.activationState == .foregroundActive }
      ?? scenes.first { $0.activationState == .foregroundInactive }
  }

  static func activeWindow() -> UIWindow? {
    guard let scene = activeWindowScene() else { return nil }
    return scene.windows.first { $0.isKeyWindow }
      ?? scene.windows.first { !$0.isHidden && $0.windowLevel == .normal }
  }

  /// The top most view controller that is attached to a window.
  static func topViewController() -> UIViewController? {
    var top = activeWindow()?.rootViewController
    while let presented = top?.presentedViewController, !presented.isBeingDismissed {
      top = presented
    }
    guard let viewController = top, viewController.viewIfLoaded?.window != nil else {
      return nil
    }
    return viewController
  }

  static func anchor() -> ASPresentationAnchor {
    if let window = activeWindow() {
      return window
    }
    if let scene = activeWindowScene() {
      return UIWindow(windowScene: scene)
    }
    return ASPresentationAnchor()
  }

  /// Calls completion(true) once the app is active, or completion(false) after the timeout.
  static func whenActive(timeout: TimeInterval, _ completion: @escaping (Bool) -> Void) {
    if UIApplication.shared.applicationState == .active {
      completion(true)
      return
    }

    var observer: NSObjectProtocol?
    var finished = false
    let finish: (Bool) -> Void = { active in
      if finished { return }
      finished = true
      if let observer = observer {
        NotificationCenter.default.removeObserver(observer)
      }
      completion(active)
    }

    observer = NotificationCenter.default.addObserver(
      forName: UIApplication.didBecomeActiveNotification,
      object: nil,
      queue: .main
    ) { _ in finish(true) }

    DispatchQueue.main.asyncAfter(deadline: .now() + timeout) {
      finish(UIApplication.shared.applicationState == .active)
    }
  }
}
