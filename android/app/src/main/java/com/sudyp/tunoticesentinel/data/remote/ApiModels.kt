package com.sudyp.tunoticesentinel.data.remote

data class TokenResponse(val token: String = "", val expiresIn: Int = 0)

data class StatusDto(
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
    val serverTime: String? = null,
)

data class NoticeDto(
    val id: String = "",
    val title: String = "Untitled notice",
    val url: String = "",
    val bsDate: String? = null,
    val adDate: String? = null,
    val originalDate: String? = null,
    val isNew: Boolean = false,
    val isRead: Boolean = false,
    val discoveredAt: String? = null,
)

data class NoticesResponse(val notices: List<NoticeDto> = emptyList(), val total: Int = 0)

data class LogDto(
    val id: String? = null,
    val timestamp: String = "",
    val level: String = "INFO",
    val message: String = "",
)

data class LogsResponse(val logs: List<LogDto> = emptyList())

data class NotificationDto(
    val id: String = "",
    val type: String = "email",
    val noticeCount: Int = 0,
    val timestamp: String = "",
    val recipient: String = "hidden",
    val status: String = "unknown",
    val summary: String = "Notification",
)

data class NotificationsResponse(val notifications: List<NotificationDto> = emptyList())
data class ActionResponse(val accepted: Boolean? = null, val enabled: Boolean? = null, val message: String? = null)
data class GitHubStatusDto(val state: String = "unknown", val status: String? = null, val conclusion: String? = null, val updatedAt: String? = null, val url: String? = null, val runNumber: Int? = null)
