package com.sudyp.tunoticesentinel

import android.app.Application
import androidx.room.Room
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.sudyp.tunoticesentinel.data.local.SentinelDatabase
import com.sudyp.tunoticesentinel.notifications.NoticeSyncWorker
import com.sudyp.tunoticesentinel.security.SettingsStore
import java.util.concurrent.TimeUnit

class SentinelApplication : Application() {
    val database: SentinelDatabase by lazy {
        Room.databaseBuilder(this, SentinelDatabase::class.java, "sentinel-cache.db")
            .addMigrations(MIGRATION_1_2)
            .build()
    }
    val settings: SettingsStore by lazy { SettingsStore(this) }

    override fun onCreate() {
        super.onCreate()
        NoticeSyncWorker.createChannel(this)
        val request = PeriodicWorkRequestBuilder<NoticeSyncWorker>(15, TimeUnit.MINUTES)
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .build()
        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            NoticeSyncWorker.WORK_NAME,
            ExistingPeriodicWorkPolicy.UPDATE,
            request,
        )
    }

    companion object {
        private val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(database: SupportSQLiteDatabase) {
                database.execSQL("ALTER TABLE notices ADD COLUMN bookmarked INTEGER NOT NULL DEFAULT 0")
                database.execSQL("CREATE TABLE IF NOT EXISTS result_archive (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, program TEXT NOT NULL, semester TEXT NOT NULL, symbolNumber TEXT NOT NULL, result TEXT NOT NULL, grade TEXT NOT NULL, notes TEXT NOT NULL, savedAt INTEGER NOT NULL)")
                database.execSQL("CREATE TABLE IF NOT EXISTS download_history (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, title TEXT NOT NULL, url TEXT NOT NULL, downloadedAt INTEGER NOT NULL)")
            }
        }
    }
}
