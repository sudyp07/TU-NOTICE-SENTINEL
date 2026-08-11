package com.sudyp.tunoticesentinel.data.local

import com.sudyp.tunoticesentinel.data.BotStatus
import com.sudyp.tunoticesentinel.data.LogEntry
import com.sudyp.tunoticesentinel.data.Notice
import com.sudyp.tunoticesentinel.data.NotificationRecord

fun StatusEntity.toDomain() = BotStatus(configured, online, bot, website, scraper, state, gmail, github, lastChecked, lastSuccessfulRun, lastFailedRun, lastError, noticesScanned, storedNotices, newNotices, emailsSent, version, cachedAt)
fun NoticeEntity.toDomain() = Notice(id, title, url, bsDate, adDate, originalDate, isNew, isRead, discoveredAt, bookmarked)
fun LogEntity.toDomain() = LogEntry(id, timestamp, level, message)
fun NotificationEntity.toDomain() = NotificationRecord(id, type, noticeCount, timestamp, recipient, status, summary)
