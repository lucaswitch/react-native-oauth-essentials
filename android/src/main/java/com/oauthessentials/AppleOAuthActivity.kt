package com.oauthessentials

import android.app.Activity
import android.os.Bundle
import androidx.browser.customtabs.CustomTabsIntent
import androidx.core.net.toUri

class AppleOAuthActivity : Activity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    intent.getStringExtra("appId")
    val clientId = intent.getStringExtra("clientId")
    val redirectUrl = intent.getStringExtra("redirectUrl")
    val nonce = intent.getStringExtra("nonce")
    val state = intent.getStringExtra("state")

    val uri = "https://appleid.apple.com/auth/authorize".toUri()
      .buildUpon()
      .appendQueryParameter("client_id", clientId)
      .appendQueryParameter("redirect_uri", redirectUrl)
      .appendQueryParameter("nonce", nonce)
      .appendQueryParameter("state", state)
      .appendQueryParameter("response_type", "code")
      .appendQueryParameter("response_mode", "form_post")
      .appendQueryParameter("scope", "name email")
      .build()

    val customTabsIntent = CustomTabsIntent.Builder()
      .setShowTitle(true)
      .build()

    customTabsIntent.launchUrl(this, uri)

  }
}
