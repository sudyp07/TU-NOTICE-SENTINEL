package com.sudyp.tunoticesentinel.data

data class BotStatus(
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
    val version: String = "3.3.0",
    val cachedAt: Long = 0,
)

data class Notice(
    val id: String,
    val title: String,
    val url: String,
    val bsDate: String?,
    val adDate: String?,
    val originalDate: String?,
    val isNew: Boolean,
    val isRead: Boolean,
    val discoveredAt: String?,
    val bookmarked: Boolean = false,
)

data class LogEntry(
    val id: String,
    val timestamp: String,
    val level: String,
    val message: String,
)

data class NotificationRecord(
    val id: String,
    val type: String,
    val noticeCount: Int,
    val timestamp: String,
    val recipient: String,
    val status: String,
    val summary: String,
)
