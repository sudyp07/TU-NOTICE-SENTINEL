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
    ): NoticesResponse

    @GET("api/logs")
    suspend fun logs(@Header("Authorization") authorization: String): LogsResponse

    @GET("api/notifications")
    suspend fun notifications(@Header("Authorization") authorization: String): NotificationsResponse

    @POST("api/check")
    suspend fun checkNow(@Header("Authorization") authorization: String, @Body body: Map<String, String> = emptyMap()): ActionResponse

    @POST("api/check")
    suspend fun testEmail(@Header("Authorization") authorization: String, @Body body: Map<String, String> = mapOf("mode" to "test-email")): ActionResponse

    @POST("api/bot/enabled")
    suspend fun enableBot(@Header("Authorization") authorization: String, @Body body: Map<String, Boolean> = mapOf("enabled" to true)): ActionResponse

    @POST("api/bot/enabled")
    suspend fun disableBot(@Header("Authorization") authorization: String, @Body body: Map<String, Boolean> = mapOf("enabled" to false)): ActionResponse

    @POST("api/tests/run")
    suspend fun runTest(@Header("Authorization") authorization: String, @Body body: Map<String, String> = emptyMap()): ActionResponse

    @POST("api/check")
    suspend fun triggerWorkflow(@Header("Authorization") authorization: String, @Body body: Map<String, String> = emptyMap()): ActionResponse

    @DELETE("api/logs")
    suspend fun clearLogs(@Header("Authorization") authorization: String)
}
