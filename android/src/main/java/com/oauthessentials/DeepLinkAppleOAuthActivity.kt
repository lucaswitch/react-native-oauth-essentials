package com.oauthessentials

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.util.Log
import com.oauthessentials.OauthEssentialsModule.Companion.LOG_TAG
import com.oauthessentials.OauthEssentialsModule.Companion.WEB_APPLE_ID_BROADCAST_INTENT

class DeepLinkAppleOAuthActivity : Activity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    if (intent is Intent) {
      handleOnNewIntent(intent)
    }
    intent?.data?.let { uri ->
      val queryParams = uri.queryParameterNames.associateWith { uri.getQueryParameter(it) }
      Log.d("DeepLink", "All query params: $queryParams")

      val broadcast = Intent("com.metabolic.APP_OAUTH_RESULT").apply {
        queryParams.forEach { (key, value) ->
          putExtra(key, value)
        }
      }
      sendBroadcast(broadcast)

      finish()
    }

    intent?.data?.let { uri ->

      val url = uri.toString()
      Log.d(LOG_TAG, "Received deep link url: ${url}")
      val broadcast = Intent(WEB_APPLE_ID_BROADCAST_INTENT)
      broadcast.putExtra("url", url)
      sendBroadcast(broadcast)
    }
  }

  override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)
    if (intent is Intent) {
      handleOnNewIntent(intent)
    }
  }

  private fun handleOnNewIntent(intent: Intent) {
    intent.data?.let { uri ->
      val queryParams = uri.queryParameterNames.associateWith { uri.getQueryParameter(it) }
      Log.d(LOG_TAG, "Received query parameters: $queryParams")

      val broadcast = Intent(WEB_APPLE_ID_BROADCAST_INTENT).apply {
        queryParams.forEach { (key, value) ->
          putExtra(key, value)
        }
      }
      sendBroadcast(broadcast)
    }
  }
}
