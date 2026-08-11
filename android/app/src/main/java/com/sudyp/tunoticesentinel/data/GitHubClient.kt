package com.sudyp.tunoticesentinel.data

import com.sudyp.tunoticesentinel.data.remote.GitHubStatusDto
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

class GitHubClient(private val client: OkHttpClient = OkHttpClient()) {
    suspend fun trigger(owner: String, repository: String, workflow: String, token: String): Unit = withContext(Dispatchers.IO) {
        requireFields(owner, repository, workflow, token)
        val body = JSONObject().put("ref", "main").toString().toRequestBody("application/json".toMediaType())
        val request = request("https://api.github.com/repos/$owner/$repository/actions/workflows/$workflow/dispatches", token)
            .post(body).build()
        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) throw IllegalStateException(githubError(response.code, response.body?.string()))
        }
    }

    suspend fun latest(owner: String, repository: String, workflow: String, token: String): GitHubStatusDto = withContext(Dispatchers.IO) {
        requireFields(owner, repository, workflow, token)
        val request = request("https://api.github.com/repos/$owner/$repository/actions/workflows/$workflow/runs?per_page=1", token).get().build()
        client.newCall(request).execute().use { response ->
            val text = response.body?.string().orEmpty()
            if (!response.isSuccessful) throw IllegalStateException(githubError(response.code, text))
            val run = JSONObject(text).optJSONArray("workflow_runs")?.optJSONObject(0)
                ?: return@withContext GitHubStatusDto(state = "unknown")
            val status = run.optString("status")
            val conclusion = run.optString("conclusion")
            GitHubStatusDto(
                state = if (status != "completed") "running" else if (conclusion == "success") "success" else "failed",
                status = status,
                conclusion = conclusion,
                updatedAt = run.optString("updated_at"),
                url = run.optString("html_url"),
                runNumber = run.optInt("run_number"),
            )
        }
    }

    private fun request(url: String, token: String) = Request.Builder()
        .url(url)
        .header("Accept", "application/vnd.github+json")
        .header("Authorization", "Bearer ${token.trim()}")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .header("User-Agent", "TU-Notice-Sentinel-Android")

    private fun requireFields(owner: String, repository: String, workflow: String, token: String) {
        require(owner.isNotBlank() && repository.isNotBlank() && workflow.isNotBlank() && token.isNotBlank()) {
            "Complete the GitHub owner, repository, workflow, and token fields first."
        }
    }

    private fun githubError(code: Int, body: String?): String {
        val safeMessage = runCatching { JSONObject(body.orEmpty()).optString("message") }.getOrDefault("")
        return "GitHub request failed ($code)${if (safeMessage.isBlank()) "" else ": $safeMessage"}"
    }
}
