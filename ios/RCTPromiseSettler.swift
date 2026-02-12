import React

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

  internal func cleanup() -> Void {
    self.resolve = nil
    self.reject = nil
    self.emitEvent = nil
  }
}
