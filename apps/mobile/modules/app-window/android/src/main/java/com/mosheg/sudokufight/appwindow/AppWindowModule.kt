package com.mosheg.sudokufight.appwindow

import android.app.Activity
import android.os.Build
import androidx.annotation.RequiresApi
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * The Recents picture of a stage (QA levels-freeze-background, D65): while a stage runs, Android keeps no
 * picture of the app for Recents, so the board is never seen there while the stage is frozen. It is
 * Activity.setRecentsScreenshotEnabled (Android 13, API 33, and up): Recents shows the app's plain card, while
 * the player's own screenshots still work (this is not FLAG_SECURE).
 *
 * Below Android 13 there is no such switch: every function answers false and changes nothing (the JS side then
 * freezes the stage at the window's blur instead). The Activity call runs on the UI thread, inside an SDK_INT
 * check, in a @RequiresApi helper, so Android Lint (NewApi) sees the guard.
 *
 * The JS side is src/services/recentsPicture.ts (module name "AppWindow"), which never throws.
 */
class AppWindowModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AppWindow")

    /** Whether this Android has the switch (13, API 33, and up). */
    Function("isRecentsScreenshotToggleSupported") {
      return@Function Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
    }

    /**
     * Lets Android keep a picture of the app for Recents (true, its default) or not (false). True when the
     * switch was handed to the activity; false below Android 13 or with no activity.
     */
    Function("setRecentsScreenshotEnabled") { enabled: Boolean ->
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return@Function false
      val activity = appContext.currentActivity ?: return@Function false
      activity.runOnUiThread {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) applyRecentsScreenshot(activity, enabled)
      }
      return@Function true
    }
  }

  @RequiresApi(Build.VERSION_CODES.TIRAMISU)
  private fun applyRecentsScreenshot(activity: Activity, enabled: Boolean) {
    activity.setRecentsScreenshotEnabled(enabled)
  }
}
