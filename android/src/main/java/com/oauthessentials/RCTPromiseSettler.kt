package com.oauthessentials

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableMap

class RCTPromiseSettler(private val promise: Promise) {
  private var settled = false

  fun settled(): Boolean {
    return settled
  }

  fun resolve(value: Any) {
    if (settled) {
      throw IllegalStateException("Cannot resolve an already settled promise.")
    }
    settled = true
    promise.resolve(value)
  }

  fun reject(throwable: Throwable, userInfo: WritableMap) {
    if (settled) {
      throw IllegalStateException("Cannot reject an already settled promise.")
    }
    settled = true
    promise.reject(throwable, userInfo)
  }

  fun reject(code: String, userInfo: WritableMap) {
    if (settled) {
      throw IllegalStateException("Cannot reject an already settled promise.")
    }
    settled = true
    promise.reject(code, userInfo)
  }

  fun reject(code: String, throwable: Throwable?, userInfo: WritableMap) {
    if (settled) {
      throw IllegalStateException("Cannot reject an already settled promise.")
    }
    settled = true
    promise.reject(code, throwable, userInfo)
  }

  fun reject(code: String, message: String?, userInfo: WritableMap) {
    if (settled) {
      throw IllegalStateException("Cannot reject an already settled promise.")
    }
    settled = true
    promise.reject(code, message, userInfo)
  }

  fun reject(code: String?, message: String?, throwable: Throwable?, userInfo: WritableMap?) {
    if (settled) {
      throw IllegalStateException("Cannot reject an already settled promise.")
    }
    settled = true
    promise.reject(code, message, throwable, userInfo)
  }
}
