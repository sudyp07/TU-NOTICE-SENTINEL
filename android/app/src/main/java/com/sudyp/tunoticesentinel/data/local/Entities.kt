package com.sudyp.tunoticesentinel.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "status")
data class StatusEntity(
    @PrimaryKey val id: Int = 1,
    val configured: Boolean = false,
    val online: Boolean = false,
    val bot: String = "unknown",
    val website: String = "unknown",
    val scraper: String = "unknown",
    val state: String = "unknown",
    val gmail: String = "unknown",
    val github: String = "unknown",
    val lastChecked: String? = null,
    val lastSuccessfulRun: String? = null,
    val lastFailedRun: String? = null,
    val lastError: String? = null,
    val noticesScanned: Int = 0,
    val storedNotices: Int = 0,
    val newNotices: Int = 0,
    val emailsSent: Int = 0,
    val version: String = "3.1",
    val cachedAt: Long = System.currentTimeMillis(),
)

@Entity(tableName = "notices")
data class NoticeEntity(
    @PrimaryKey val id: String,
    val title: String,
    val url: String,
    val bsDate: String? = null,
    val adDate: String? = null,
    val originalDate: String? = null,
    val isNew: Boolean = false,
    val isRead: Boolean = false,
    val discoveredAt: String? = null,
    val bookmarked: Boolean = false,
)

@Entity(tableName = "logs")
data class LogEntity(
    @PrimaryKey val id: String,
    val timestamp: String,
    val level: String,
    val message: String,
)

@Entity(tableName = "notifications")
data class NotificationEntity(
    @PrimaryKey val id: String,
    val type: String,
    val noticeCount: Int,
    val timestamp: String,
    val recipient: String,
    val status: String,
    val summary: String,
)

@Entity(tableName = "result_archive")
data class ResultEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val program: String,
    val semester: String,
    val symbolNumber: String,
    val result: String,
    val grade: String,
    val notes: String,
    val savedAt: Long = System.currentTimeMillis(),
)

@Entity(tableName = "download_history")
data class DownloadEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val title: String,
    val url: String,
    val downloadedAt: Long = System.currentTimeMillis(),
)
