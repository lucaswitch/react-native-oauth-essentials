package com.oauthessentials

import android.app.Activity
import android.net.Uri
import android.os.Bundle

class AppleOAuthActivity : Activity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    val uri: Uri? = intent?.data
    if (uri != null) {
      handleOAuthCallback(uri)
    } else {
      finish()
    }
  }

  private fun handleOAuthCallback(uri: Uri) {
    val code = uri.getQueryParameter("code")
    val state = uri.getQueryParameter("state")
    val error = uri.getQueryParameter("error")

    when {
      error != null -> {
        notifyError(error)
      }

      code != null -> {
        processAuthCode(code, state)
      }

      else -> {
        notifyError("Invalid callback")
      }
    }

    finish()
  }

  private fun processAuthCode(code: String, state: String?) {
  }

  private fun notifyError(error: String) {
  }
}
