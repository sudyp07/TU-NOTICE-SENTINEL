package com.sudyp.tunoticesentinel.data.local

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(
    entities = [StatusEntity::class, NoticeEntity::class, LogEntity::class, NotificationEntity::class, ResultEntity::class, DownloadEntity::class],
    version = 2,
    exportSchema = false,
)
abstract class SentinelDatabase : RoomDatabase() {
    abstract fun sentinelDao(): SentinelDao
}
