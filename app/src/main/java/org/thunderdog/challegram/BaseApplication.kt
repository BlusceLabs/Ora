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

    @Volatile private var markerFile: java.io.File? = null

    fun writeStep(step: String) {
      try {
        val f = markerFile ?: return
        val fos = java.io.FileOutputStream(f, false)
        fos.write("LAST_STEP: $step\nTime: ${java.util.Date()}\n".toByteArray())
        fos.fd.sync()
        fos.close()
      } catch (_: Throwable) {}
    }

    fun installEarlyCrashHandler(context: android.content.Context) {
      markerFile = java.io.File(context.filesDir, "jamii_step.txt")
      val crashFile = java.io.File(context.filesDir, "jamii_early_crash.txt")
      val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()
      Thread.setDefaultUncaughtExceptionHandler { thread, ex ->
        try {
          java.io.FileOutputStream(crashFile, false).use { fos ->
            val msg = "Crashed on thread: ${thread.name}\n" +
              "Time: ${java.util.Date()}\n\n" +
              android.util.Log.getStackTraceString(ex)
            fos.write(msg.toByteArray())
            fos.fd.sync()
          }
        } catch (_: Throwable) {}
        defaultHandler?.uncaughtException(thread, ex)
      }
    }
  }

  override fun attachBaseContext(base: android.content.Context?) {
    super.attachBaseContext(base)
    try {
      val dir = base?.filesDir ?: return
      markerFile = java.io.File(dir, "jamii_step.txt")
      writeStep("attachBaseContext-done")
    } catch (_: Throwable) {}
  }

  override fun onCreate() {
    writeStep("onCreate-start")
    installEarlyCrashHandler(applicationContext)
    writeStep("crash-handler-installed")
    super.onCreate()
    writeStep("super-onCreate-done")
    scope = MainScope()
    writeStep("scope-created")

    writeStep("before-PushManagerBridge-initialize")
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
    writeStep("PushManagerBridge-done")

    writeStep("before-UI-initApp")
    UI.initApp(applicationContext)
    writeStep("UI-initApp-done")

    if (!BuildConfig.EXPERIMENTAL) {
      writeStep("before-TelegramXExtension-configure")
      val deviceTokenRetriever = TdlibNotificationUtils.getDeviceTokenRetriever()
      TelegramXExtension.configure(this, deviceTokenRetriever)
      writeStep("TelegramXExtension-configured")
      if (deviceTokenRetriever !is FirebaseDeviceTokenRetriever) {
        FirebaseMessaging.getInstance().isAutoInitEnabled = false
      }
    }

    writeStep("onCreate-complete")
  }

  override val workManagerConfiguration: Configuration
    get() = Configuration.Builder().build()
}
