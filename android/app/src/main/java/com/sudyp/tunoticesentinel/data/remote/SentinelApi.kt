package com.sudyp.tunoticesentinel.data.remote

import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.Body
import retrofit2.http.POST
import retrofit2.http.Query

interface SentinelApi {
    @POST("api/auth/token")
    suspend fun issueToken(@Header("X-API-Key") apiKey: String, @Body body: Map<String, String> = emptyMap()): TokenResponse

    @GET("api/status")
    suspend fun status(@Header("Authorization") authorization: String): StatusDto

    @GET("api/notices")
    suspend fun notices(
        @Header("Authorization") authorization: String,
        @Query("limit") limit: Int = 200,
        @Query("search") search: String? = null,
        @Query("unreadOnly") unreadOnly: Boolean? = null,
    ): NoticesResponse

    @GET("api/notices/latest")
    suspend fun latestNotice(@Header("Authorization") authorization: String): LatestNoticeResponse

    @GET("api/logs")
    suspend fun logs(
        @Header("Authorization") authorization: String,
        @Query("level") level: String? = null,
    ): LogsResponse

    @GET("api/notifications")
    suspend fun notifications(@Header("Authorization") authorization: String): NotificationsResponse

    @POST("api/check")
    suspend fun checkNow(@Header("Authorization") authorization: String, @Body body: Map<String, String> = emptyMap()): ActionResponse

    @POST("api/notifications/test")
    suspend fun testEmail(@Header("Authorization") authorization: String, @Body body: Map<String, String> = emptyMap()): ActionResponse

    @POST("api/bot/enabled")
    suspend fun setBotEnabled(@Header("Authorization") authorization: String, @Body body: Map<String, Any> = emptyMap()): ActionResponse

    @POST("api/tests/run")
    suspend fun runTest(@Header("Authorization") authorization: String, @Body body: Map<String, String> = emptyMap()): BotTestResponse

    @DELETE("api/logs")
    suspend fun clearLogs(@Header("Authorization") authorization: String)
}
