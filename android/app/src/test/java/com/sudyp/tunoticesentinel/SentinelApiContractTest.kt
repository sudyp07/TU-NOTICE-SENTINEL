package com.sudyp.tunoticesentinel

import com.sudyp.tunoticesentinel.data.remote.SentinelApi
import org.junit.Assert.assertEquals
import org.junit.Test
import retrofit2.http.GET
import retrofit2.http.POST

class SentinelApiContractTest {
    @Test
    fun actionRoutesMatchBackendV33() {
        assertEquals("api/check", postPath("checkNow"))
        assertEquals("api/test-email", postPath("testEmail"))
        assertEquals("api/bot/enable", postPath("enableBot"))
        assertEquals("api/bot/disable", postPath("disableBot"))
        assertEquals("api/bot/test", postPath("runTest"))
        assertEquals("api/github/workflow", postPath("triggerWorkflow"))
    }

    @Test
    fun readRoutesMatchBackendV33() {
        assertEquals("api/status", getPath("status"))
        assertEquals("api/notices", getPath("notices"))
        assertEquals("api/notices/latest", getPath("latestNotice"))
        assertEquals("api/logs", getPath("logs"))
        assertEquals("api/notifications", getPath("notifications"))
        assertEquals("api/github/status", getPath("githubStatus"))
    }

    private fun postPath(methodName: String): String = SentinelApi::class.java.declaredMethods
        .first { it.name == methodName }
        .getAnnotation(POST::class.java)
        .value

    private fun getPath(methodName: String): String = SentinelApi::class.java.declaredMethods
        .first { it.name == methodName }
        .getAnnotation(GET::class.java)
        .value
}
