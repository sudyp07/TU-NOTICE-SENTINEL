package com.sudyp.tunoticesentinel.notifications

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.sudyp.tunoticesentinel.MainActivity
import com.sudyp.tunoticesentinel.R
import com.sudyp.tunoticesentinel.SentinelApplication
import com.sudyp.tunoticesentinel.data.SentinelRepository
import com.sudyp.tunoticesentinel.data.local.NotificationEntity
import java.time.Instant

class NoticeSyncWorker(context: Context, parameters: WorkerParameters) : CoroutineWorker(context, parameters) {
    override suspend fun doWork(): Result {
        val app = applicationContext as SentinelApplication
        val settings = app.settings.read()
        if (!settings.backgroundAlerts || !settings.baseUrl.startsWith("https://") || settings.apiKey.isBlank()) {
            return Result.success()
        }
        return try {
            val newRows = SentinelRepository(app.database, settings.baseUrl, settings.apiKey).refreshAll()
            val preferences = applicationContext.getSharedPreferences("sentinel_worker", Context.MODE_PRIVATE)
            val initialized = preferences.getBoolean("initialized", false)
            if (initialized && newRows.isNotEmpty()) {
                notifyNewNotices(applicationContext, newRows.map { it.title })
                val now = Instant.now().toString()
                app.database.sentinelDao().saveNotifications(listOf(NotificationEntity("local-$now", "push", newRows.size, now, "This device", "delivered", "New TU notice alert")))
            }
            preferences.edit().putBoolean("initialized", true).apply()
            Result.success()
        } catch (_: Exception) {
            Result.retry()
        }
    }

    companion object {
        const val WORK_NAME = "tu-notice-background-sync"
        private const val CHANNEL_ID = "new-tu-notices"
        private const val NOTIFICATION_ID = 4001

        fun notifyNewNotices(context: Context, titles: List<String>) {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            40,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val text = if (titles.size == 1) titles.first() else "${titles.size} new TU notices are available"
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(if (titles.size == 1) "New TU notice" else "New TU notices")
            .setContentText(text)
            .setStyle(NotificationCompat.BigTextStyle().bigText(titles.take(5).joinToString("\n")))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION))
            .setDefaults(NotificationCompat.DEFAULT_SOUND or NotificationCompat.DEFAULT_VIBRATE)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()
        runCatching { NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, notification) }
        }

        fun createChannel(context: Context) {
            if (android.os.Build.VERSION.SDK_INT < 26) return
            val sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            val attributes = AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).build()
            val channel = NotificationChannel(
                CHANNEL_ID,
                "New TU notices",
                NotificationManager.IMPORTANCE_HIGH,
            ).apply {
                description = "Alerts with sound when TU Notice Sentinel finds a new notice"
                enableVibration(true)
                setSound(sound, attributes)
            }
            context.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }
}
