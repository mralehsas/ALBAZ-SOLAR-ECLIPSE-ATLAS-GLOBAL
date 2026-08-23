package com.albaz.eclipseatlas.eclipse

class BesselianCatalog private constructor(
    private val events: List<BesselianElements>,
) {
    val size: Int
        get() = events.size

    fun findExact(year: Int, month: Int, day: Int): BesselianElements? =
        events.firstOrNull { it.year == year && it.month == month && it.day == day }

    fun eventsInYear(year: Int): List<BesselianElements> =
        events.filter { it.year == year }

    companion object {
        @Volatile
        private var cached: BesselianCatalog? = null

        fun loadDefault(): BesselianCatalog {
            cached?.let { return it }

            return synchronized(this) {
                cached ?: loadFromResource().also { loaded ->
                    require(loaded.size == 2613) {
                        "Unexpected audited Besselian event count: ${loaded.size}"
                    }
                    cached = loaded
                }
            }
        }

        private fun loadFromResource(): BesselianCatalog {
            val stream = requireNotNull(
                BesselianCatalog::class.java.getResourceAsStream("/besselian_data.js")
            ) { "besselian_data.js resource not found" }

            val source = stream.bufferedReader(Charsets.UTF_8).use { it.readText() }
            return BesselianCatalog(BesselianCsvParser.parseJavaScript(source))
        }
    }
}
