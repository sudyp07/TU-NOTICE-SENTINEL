package com.sudyp.tunoticesentinel

import com.sudyp.tunoticesentinel.data.DateNormalizer
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class DateNormalizerTest {
    @Test fun normalizesNepaliBsDate() {
        assertEquals("2083-04-15", DateNormalizer.normalize("मिति २०८३/४/१५", DateNormalizer.Calendar.BS))
    }

    @Test fun rejectsMalformedJoinedDate() {
        assertNull(DateNormalizer.normalize("208326-047-1530", DateNormalizer.Calendar.BS))
    }

    @Test fun normalizesAdDate() {
        assertEquals("2026-07-30", DateNormalizer.normalize("2026.7.30", DateNormalizer.Calendar.AD))
    }
}
