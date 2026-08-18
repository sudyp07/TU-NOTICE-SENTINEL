package com.sudyp.tunoticesentinel.data

object DateNormalizer {
    private val nepaliDigits = "०१२३४५६७८९"
    private val datePattern = Regex("(?:19|20|21)\\d{2}[-/.]\\d{1,2}[-/.]\\d{1,2}")

    fun normalize(value: String?, calendar: Calendar): String? {
        if (value.isNullOrBlank()) return null
        val ascii = buildString {
            value.trim().forEach { character ->
                val index = nepaliDigits.indexOf(character)
                append(if (index >= 0) index else character)
            }
        }.replace('/', '-').replace('.', '-')
        val found = datePattern.find(ascii)?.value ?: return null
        val parts = found.split('-').mapNotNull(String::toIntOrNull)
        if (parts.size != 3) return null
        val (year, month, day) = parts
        if (month !in 1..12 || day !in 1..32) return null
        if (calendar == Calendar.AD && (year !in 1900..2099 || day > 31)) return null
        if (calendar == Calendar.BS && year !in 1970..2199) return null
        return "%04d-%02d-%02d".format(year, month, day)
    }

    enum class Calendar { BS, AD }
}
