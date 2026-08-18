package com.sudyp.tunoticesentinel

import com.sudyp.tunoticesentinel.data.remote.SentinelApi
import org.junit.Assert.assertEquals
import org.junit.Test
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST

class SentinelApiContractTest {
    @Test
    fun actionRoutesMatchBackendV34() {
        assertEquals("api/check", postPath("checkNow"))
        assertEquals("api/notifications/test", postPath("testEmail"))
        assertEquals("api/bot/enabled", postPath("setBotEnabled"))
        assertEquals("api/tests/run", postPath("runTest"))
    }

    @Test
    fun readRoutesMatchBackendV34() {
        assertEquals("api/status", getPath("status"))
        assertEquals("api/notices", getPath("notices"))
        assertEquals("api/notices/latest", getPath("latestNotice"))
        assertEquals("api/logs", getPath("logs"))
        assertEquals("api/notifications", getPath("notifications"))
    }

    @Test
    fun deleteRoutesMatchBackendV34() {
        assertEquals("api/logs", deletePath("clearLogs"))
    }

    private fun postPath(methodName: String): String = SentinelApi::class.java.declaredMethods
        .firstOrNull { it.name == methodName }
        ?.getAnnotation(POST::class.java)
        ?.value
        ?: error("No @POST method named $methodName in SentinelApi")

    private fun getPath(methodName: String): String = SentinelApi::class.java.declaredMethods
        .firstOrNull { it.name == methodName }
        ?.getAnnotation(GET::class.java)
        ?.value
        ?: error("No @GET method named $methodName in SentinelApi")

    private fun deletePath(methodName: String): String = SentinelApi::class.java.declaredMethods
        .firstOrNull { it.name == methodName }
        ?.getAnnotation(DELETE::class.java)
        ?.value
        ?: error("No @DELETE method named $methodName in SentinelApi")
}
