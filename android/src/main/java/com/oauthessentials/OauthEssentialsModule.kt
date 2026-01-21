package com.oauthessentials

import com.facebook.react.bridge.ReactApplicationContext

class OauthEssentialsModule(reactContext: ReactApplicationContext) :
  NativeOauthEssentialsSpec(reactContext) {

  override fun multiply(a: Double, b: Double): Double {
    return a * b
  }

  companion object {
    const val NAME = NativeOauthEssentialsSpec.NAME
  }
}
