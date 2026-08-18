package com.sudyp.tunoticesentinel.data.remote

import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiFactory {
    fun create(baseUrl: String): SentinelApi {
        val normalized = baseUrl.trim().let { if (it.endsWith('/')) it else "$it/" }
        require(normalized.startsWith("https://")) { "Server URL must use HTTPS" }
        val client = OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)
            .build()
        return Retrofit.Builder()
            .baseUrl(normalized)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(SentinelApi::class.java)
    }
}
