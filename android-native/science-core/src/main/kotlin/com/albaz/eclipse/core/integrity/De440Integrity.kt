package com.albaz.eclipse.core.integrity

data class AssetFingerprint(
    val name: String,
    val sizeBytes: Long,
    val sha256: String
)

enum class IntegrityStatus { VERIFIED, MISSING, CORRUPT }

object De440Integrity {
    const val FULL_KERNEL_NAME = "de440.bsp"
    const val FULL_KERNEL_SIZE = 119_799_808L
    const val FULL_KERNEL_SHA256 = "a4ce9bf9b3282becc9f4b2ac3cebe03a2ae7599981aabd7265fd8482fff7c4b5"

    val expectedParts: List<AssetFingerprint> = listOf(
        AssetFingerprint(
            "de440.bsp.part001",
            33_554_432L,
            "c82327e943876775462eae7f50a9ba75259f9e6074a08b613fa423640d6d1b84"
        ),
        AssetFingerprint(
            "de440.bsp.part002",
            33_554_432L,
            "3bf39a078cdbb920cd44231d3fc24dc87ffb766703cbb5faa96d02c38bfb82f2"
        ),
        AssetFingerprint(
            "de440.bsp.part003",
            33_554_432L,
            "7189ab5e85a73d8bd1fe67111c7cfca5b8af34aa18511c366ab1e354fdcdcb8a"
        ),
        AssetFingerprint(
            "de440.bsp.part004",
            19_136_512L,
            "2f6ca02ce40deb793b95cfea43c412616e151924cf496ca666dd3e5ad76b0105"
        )
    )

    fun validateParts(actual: List<AssetFingerprint>): IntegrityStatus {
        val byName = actual.associateBy { it.name }
        for (expected in expectedParts) {
            val found = byName[expected.name] ?: return IntegrityStatus.MISSING
            if (found.sizeBytes != expected.sizeBytes) return IntegrityStatus.CORRUPT
            if (!found.sha256.equals(expected.sha256, ignoreCase = true)) return IntegrityStatus.CORRUPT
        }
        return IntegrityStatus.VERIFIED
    }

    fun validateFullKernel(actual: AssetFingerprint?): IntegrityStatus {
        actual ?: return IntegrityStatus.MISSING
        if (actual.name != FULL_KERNEL_NAME) return IntegrityStatus.CORRUPT
        if (actual.sizeBytes != FULL_KERNEL_SIZE) return IntegrityStatus.CORRUPT
        if (!actual.sha256.equals(FULL_KERNEL_SHA256, ignoreCase = true)) return IntegrityStatus.CORRUPT
        return IntegrityStatus.VERIFIED
    }
}
