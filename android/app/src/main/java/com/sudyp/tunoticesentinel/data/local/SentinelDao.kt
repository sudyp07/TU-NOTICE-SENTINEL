package com.sudyp.tunoticesentinel.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface SentinelDao {
    @Query("SELECT * FROM status WHERE id = 1")
    fun observeStatus(): Flow<StatusEntity?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveStatus(status: StatusEntity)

    @Query("SELECT * FROM notices ORDER BY COALESCE(adDate, discoveredAt, '') DESC, id DESC")
    fun observeNotices(): Flow<List<NoticeEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveNotices(notices: List<NoticeEntity>)

    @Query("UPDATE notices SET isRead = 1, isNew = 0 WHERE id = :id")
    suspend fun markNoticeRead(id: String)

    @Query("UPDATE notices SET isRead = 1, isNew = 0")
    suspend fun markAllNoticesRead()

    @Query("DELETE FROM notices WHERE isRead = 1 AND bookmarked = 0")
    suspend fun clearReadNotices()

    @Query("UPDATE notices SET bookmarked = NOT bookmarked WHERE id = :id")
    suspend fun toggleBookmark(id: String)

    @Query("SELECT id FROM notices")
    suspend fun noticeIds(): List<String>

    @Query("SELECT id FROM notices WHERE bookmarked = 1")
    suspend fun bookmarkedNoticeIds(): List<String>

    @Query("SELECT id FROM notices WHERE isRead = 1")
    suspend fun readNoticeIds(): List<String>

    @Query("SELECT * FROM logs ORDER BY timestamp DESC LIMIT 500")
    fun observeLogs(): Flow<List<LogEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveLogs(logs: List<LogEntity>)

    @Query("DELETE FROM logs")
    suspend fun clearLogs()

    @Query("SELECT * FROM notifications ORDER BY timestamp DESC LIMIT 200")
    fun observeNotifications(): Flow<List<NotificationEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveNotifications(notifications: List<NotificationEntity>)

    @Query("SELECT * FROM result_archive ORDER BY savedAt DESC")
    fun observeResults(): Flow<List<ResultEntity>>

    @Insert
    suspend fun saveResult(result: ResultEntity)

    @Query("DELETE FROM result_archive WHERE id = :id")
    suspend fun deleteResult(id: Long)

    @Query("SELECT * FROM download_history ORDER BY downloadedAt DESC LIMIT 100")
    fun observeDownloads(): Flow<List<DownloadEntity>>

    @Insert
    suspend fun saveDownload(download: DownloadEntity)
}
