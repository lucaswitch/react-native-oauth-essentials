package com.oauthessentials

import android.app.Activity
import android.content.Intent
import android.content.Intent.FLAG_ACTIVITY_NO_HISTORY
import android.os.Bundle
import android.util.Log
import androidx.browser.customtabs.CustomTabsIntent
import com.oauthessentials.OauthEssentialsModule.Companion.DEEPLINK_WEB_APPLE_INTENT
import com.oauthessentials.OauthEssentialsModule.Companion.DISPLAY_CUSTOM_TABS_INTENT
import com.oauthessentials.OauthEssentialsModule.Companion.LOG_TAG

class CustomTabsActivity : Activity() {
  /**
   * When the activity is created.
   */
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    if (intent is Intent) {
      when (intent.action) {
        DISPLAY_CUSTOM_TABS_INTENT -> {
          handleOnDisplayCustomTabsIntent(intent)
        }

        else -> {
          handleOnDeepLinkIntent(intent)
        }
      }
    }
  }

  /**
   * When the activity is destroyed.
   */
  override fun onDestroy() {
    super.onDestroy()
    Log.d(LOG_TAG, "CustomTabsActivity destroyed")
  }

  /**
   * Whenever a new intent is received
   */
  override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)
    setIntent(intent)
    if (intent is Intent) {
      when (intent.action) {
        DISPLAY_CUSTOM_TABS_INTENT -> {
          handleOnDisplayCustomTabsIntent(intent)
        }

        else -> {
          handleOnDeepLinkIntent(intent)
        }
      }
    }
  }

  /**
   * Handles the display custom tabs opening.
   */
  private fun handleOnDisplayCustomTabsIntent(intent: Intent) {
    intent.data?.let { uri ->
      Log.d(LOG_TAG, "Receiving deep link")
      val tabIntent =
        CustomTabsIntent.Builder().setShowTitle(true).setUrlBarHidingEnabled(true).build()
      tabIntent.intent.addFlags(FLAG_ACTIVITY_NO_HISTORY)
      tabIntent.launchUrl(this, uri)
    }
  }

  /**
   * Handles the deep link intent.
   */
  private fun handleOnDeepLinkIntent(intent: Intent) {
    Log.d(LOG_TAG, "Received new incoming intent")
    intent.data?.let { uri ->
      sendBroadcast(
        Intent(DEEPLINK_WEB_APPLE_INTENT).apply {
          setPackage(applicationContext.packageName)
          putExtra("url", uri.toString())
        }
      )
      finish()
    }
  }
}
