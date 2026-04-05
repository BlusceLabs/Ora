/*
 * This file is a part of Jamii
 * Copyright © 2014 (tgx-android@pm.me)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * File created on 05/04/2015 at 08:53
 */
package org.thunderdog.challegram

import android.content.Context
import androidx.multidex.MultiDexApplication
import androidx.work.Configuration
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.MainScope
import org.thunderdog.challegram.push.FirebaseDeviceTokenRetriever
import org.thunderdog.challegram.service.PushHandler
import org.thunderdog.challegram.telegram.TdlibNotificationUtils
import org.thunderdog.challegram.tool.UI
import org.thunderdog.challegram.unsorted.Settings
import tgx.bridge.DeviceTokenRetriever
import tgx.bridge.DeviceTokenRetrieverFactory
import tgx.bridge.PushManagerBridge
import tgx.extension.TelegramXExtension

class BaseApplication : MultiDexApplication(), Configuration.Provider {
  companion object {
    lateinit var scope: CoroutineScope

    fun installEarlyCrashHandler(context: android.content.Context) {
      val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()
      Thread.setDefaultUncaughtExceptionHandler { thread, ex ->
        try {
          val file = java.io.File(context.filesDir, "jamii_early_crash.txt")
          java.io.FileWriter(file).use { w ->
            w.write("Crashed on thread: ${thread.name}\n")
            w.write("Time: ${java.util.Date()}\n\n")
            w.write(android.util.Log.getStackTraceString(ex))
          }
        } catch (_: Throwable) {}
        defaultHandler?.uncaughtException(thread, ex)
      }
    }
  }

  override fun onCreate() {
    installEarlyCrashHandler(applicationContext)
    super.onCreate()
    scope = MainScope()

    PushManagerBridge.initialize(
      scope,

      PushHandler(),
      object : DeviceTokenRetrieverFactory {
        override fun onCreateNewTokenRetriever(context: Context): DeviceTokenRetriever {
          val defaultTokenRetriever = FirebaseDeviceTokenRetriever()
          val tokenRetriever = TelegramXExtension.createNewTokenRetriever(context)
          return tokenRetriever?.takeIf {
            !BuildConfig.EXPERIMENTAL && (
              Settings.instance().isExperimentEnabled(Settings.EXPERIMENT_FLAG_FORCE_ALTERNATIVE_PUSH_SERVICE) ||
              !defaultTokenRetriever.isAvailable(applicationContext)
            )
          } ?: defaultTokenRetriever
        }
      }
    )

    UI.initApp(applicationContext)

    if (!BuildConfig.EXPERIMENTAL) {
      val deviceTokenRetriever = TdlibNotificationUtils.getDeviceTokenRetriever()
      TelegramXExtension.configure(this, deviceTokenRetriever)
      if (deviceTokenRetriever !is FirebaseDeviceTokenRetriever) {
        FirebaseMessaging.getInstance().isAutoInitEnabled = false
      }
    }
  }

  override val workManagerConfiguration: Configuration
    get() = Configuration.Builder().build()
}