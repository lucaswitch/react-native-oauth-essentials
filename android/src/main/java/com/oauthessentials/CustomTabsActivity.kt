package com.oauthessentials

import android.app.Activity
import android.content.Intent
import android.content.Intent.FLAG_ACTIVITY_NO_HISTORY
import android.os.Bundle
import android.util.Log
import androidx.browser.customtabs.CustomTabsIntent
import com.oauthessentials.OauthEssentialsModule.Companion.DISPLAY_CUSTOM_TABS_INTENT
import com.oauthessentials.OauthEssentialsModule.Companion.LOG_TAG
import com.oauthessentials.OauthEssentialsModule.Companion.WEB_APPLE_DEEP_LINK_RECEIVED_INTENT
import com.oauthessentials.OauthEssentialsModule.Companion.WEB_APPLE_CANCELLED_INTENT

class CustomTabsActivity : Activity() {
  private var deepLinkReceived = false
  private var customTabLaunched = false
  private var hasBeenPaused = false
  private var resultProcessed = false

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
   * When the activity resumes from background.
   * This is called when the user closes the Custom Tab without completing authentication.
   */
  override fun onResume() {
    super.onResume()
    Log.d(LOG_TAG, "CustomTabsActivity resumed")

    // Only check for cancellation if we've been paused (meaning the Custom Tab was shown)
    // If we launched a custom tab but haven't received a deep link,
    // it means the user closed the browser without completing auth
    if (hasBeenPaused && customTabLaunched && !deepLinkReceived && !resultProcessed) {
      Log.d(LOG_TAG, "CustomTabsActivity resumed without deep link, sending cancellation broadcast")
      resultProcessed = true
      sendBroadcast(
        Intent(WEB_APPLE_CANCELLED_INTENT).apply {
          setPackage(applicationContext.packageName)
        }
      )
      // Return control to the previous activity
      finish()
    }
  }

  /**
   * When the activity goes to background.
   * This happens when the Custom Tab is displayed.
   */
  override fun onPause() {
    super.onPause()
    Log.d(LOG_TAG, "CustomTabsActivity paused")
    if (customTabLaunched) {
      hasBeenPaused = true
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
      Log.d(LOG_TAG, "Launching Custom Tab with URL: $uri")
      customTabLaunched = true
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
      deepLinkReceived = true
      resultProcessed = true
      sendBroadcast(
        Intent(WEB_APPLE_DEEP_LINK_RECEIVED_INTENT).apply {
          setPackage(applicationContext.packageName)
          putExtra("url", uri.toString())
        }
      )
      // Return control to the previous activity
      finish()
    }
  }
}
