package com.sudyp.tunoticesentinel.data

import androidx.room.withTransaction
import com.sudyp.tunoticesentinel.data.local.LogEntity
import com.sudyp.tunoticesentinel.data.local.NoticeEntity
import com.sudyp.tunoticesentinel.data.local.NotificationEntity
import com.sudyp.tunoticesentinel.data.local.SentinelDatabase
import com.sudyp.tunoticesentinel.data.local.StatusEntity
import com.sudyp.tunoticesentinel.data.local.toDomain
import com.sudyp.tunoticesentinel.data.remote.ApiFactory
import com.sudyp.tunoticesentinel.data.remote.SentinelApi
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.map
import retrofit2.HttpException

class SentinelRepository(
    private val database: SentinelDatabase,
    baseUrl: String,
    private val apiKey: String,
) {
    private val dao = database.sentinelDao()
    private val api: SentinelApi = ApiFactory.create(baseUrl)
    @Volatile private var sessionToken: String? = null

    val status = dao.observeStatus().map { it?.toDomain() }
    val notices = dao.observeNotices().map { rows -> rows.map { it.toDomain() } }
    val logs = dao.observeLogs().map { rows -> rows.map { it.toDomain() } }
    val notifications = dao.observeNotifications().map { rows -> rows.map { it.toDomain() } }

    private suspend fun token(force: Boolean = false): String {
        if (force) sessionToken = null
        sessionToken?.let { return it }
        return api.issueToken(apiKey).token.also { issued ->
            require(issued.isNotBlank()) { "Server returned an empty session token" }
            sessionToken = issued
        }
    }

    private suspend fun <T> authorized(call: suspend (String) -> T): T {
        return try {
            call("Bearer ${token()}")
        } catch (error: HttpException) {
            if (error.code() != 401) throw error
            call("Bearer ${token(force = true)}")
        }
    }

    suspend fun refreshAll(): List<NoticeEntity> = coroutineScope {
        val knownIds = dao.noticeIds().toSet()
        val bookmarkedIds = dao.bookmarkedNoticeIds().toSet()
        val readIds = dao.readNoticeIds().toSet()
        val authorization = "Bearer ${token()}"
        val statusRequest = async { api.status(authorization) }
        val noticeRequest = async { api.notices(authorization) }
        val logRequest = async { api.logs(authorization) }
        val notificationRequest = async { api.notifications(authorization) }
        val remoteStatus = statusRequest.await()
        val remoteNotices = noticeRequest.await().notices
        val remoteLogs = logRequest.await().logs
        val remoteNotifications = notificationRequest.await().notifications

        val mappedNotices = remoteNotices.filter { it.id.isNotBlank() && it.url.isNotBlank() }.map {
            NoticeEntity(
                id = it.id,
                title = it.title,
                url = it.url,
                bsDate = DateNormalizer.normalize(it.bsDate, DateNormalizer.Calendar.BS),
                adDate = DateNormalizer.normalize(it.adDate, DateNormalizer.Calendar.AD),
                originalDate = it.originalDate,
                isNew = it.isNew && it.id !in readIds,
                isRead = it.isRead || it.id in readIds,
                discoveredAt = it.discoveredAt,
                bookmarked = it.id in bookmarkedIds,
            )
        }
        database.withTransaction {
            dao.saveStatus(
                StatusEntity(
                    configured = remoteStatus.configured,
                    online = remoteStatus.online,
                    bot = remoteStatus.bot,
                    website = remoteStatus.website,
                    scraper = remoteStatus.scraper,
                    state = remoteStatus.state,
                    gmail = remoteStatus.gmail,
                    github = remoteStatus.github,
                    lastChecked = remoteStatus.lastChecked,
                    lastSuccessfulRun = remoteStatus.lastSuccessfulRun,
                    lastFailedRun = remoteStatus.lastFailedRun,
                    lastError = remoteStatus.lastError,
                    noticesScanned = remoteStatus.noticesScanned,
                    storedNotices = remoteStatus.storedNotices,
                    newNotices = remoteStatus.newNotices,
                    emailsSent = remoteStatus.emailsSent,
                    version = remoteStatus.version,
                    cachedAt = System.currentTimeMillis(),
                ),
            )
            dao.saveNotices(mappedNotices)
            dao.saveLogs(remoteLogs.mapIndexed { index, entry ->
                LogEntity(
                    id = entry.id ?: "${entry.timestamp}-${entry.message.hashCode()}-$index",
                    timestamp = entry.timestamp,
                    level = entry.level.uppercase(),
                    message = entry.message,
                )
            })
            dao.saveNotifications(remoteNotifications.filter { it.id.isNotBlank() }.map {
                NotificationEntity(it.id, it.type, it.noticeCount, it.timestamp, it.recipient, it.status, it.summary)
            })
        }
        mappedNotices.filter { it.id !in knownIds }
    }

    suspend fun checkNow() = authorized { api.checkNow(it) }
    suspend fun testEmail() = authorized { api.testEmail(it) }
    suspend fun setBotEnabled(enabled: Boolean) = authorized {
        if (enabled) api.enableBot(it) else api.disableBot(it)
    }
    suspend fun runBotTest() = authorized { api.runTest(it) }
    suspend fun triggerBackendWorkflow() = authorized { api.triggerWorkflow(it) }
    suspend fun clearLogs() {
        authorized { api.clearLogs(it) }
        dao.clearLogs()
    }

    suspend fun markNoticeRead(id: String) = dao.markNoticeRead(id)
}
