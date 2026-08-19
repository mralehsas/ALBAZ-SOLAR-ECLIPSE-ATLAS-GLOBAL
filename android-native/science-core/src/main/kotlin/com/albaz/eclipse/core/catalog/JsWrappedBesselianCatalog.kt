package com.albaz.eclipse.core.catalog

import com.albaz.eclipse.core.model.BesselianElements
import com.albaz.eclipse.core.model.GlobalEclipseType

object JsWrappedBesselianCatalog {
    private const val SYMBOL = "window.ALBAZ_BESSELIAN_CSV"

    fun parse(jsSource: String): List<BesselianElements> {
        val csv = extractPayload(jsSource)
        val lines = csv.lineSequence().map(String::trim).filter(String::isNotEmpty).toList()
        require(lines.size >= 2) { "Besselian catalogue is empty" }

        val header = lines.first().split(',').map(String::trim)
        val index = header.withIndex().associate { it.value to it.index }
        val required = listOf(
            "year", "month", "day", "dt", "eclipse_type", "magnitude", "lat_dd_ge", "lng_dd_ge",
            "t0", "x0", "x1", "x2", "x3", "y0", "y1", "y2", "y3", "d0", "d1", "d2",
            "mu0", "mu1", "mu2", "l10", "l11", "l12", "l20", "l21", "l22", "tan_f1", "tan_f2",
            "tmin", "tmax"
        )
        require(required.all(index::containsKey)) { "Besselian catalogue header is incomplete" }

        return lines.drop(1).mapIndexedNotNull { rowIndex, line ->
            val fields = line.split(',')
            if (fields.size < header.size) {
                throw IllegalArgumentException("Malformed Besselian row ${rowIndex + 2}: ${fields.size}/${header.size} fields")
            }
            fun s(name: String): String = fields[index.getValue(name)].trim()
            fun d(name: String): Double = s(name).toDoubleOrNull() ?: 0.0
            fun i(name: String): Int = s(name).toIntOrNull() ?: d(name).toInt()

            BesselianElements(
                year = i("year"),
                month = i("month"),
                day = i("day"),
                deltaTSeconds = d("dt"),
                globalType = GlobalEclipseType.fromCode(s("eclipse_type")),
                globalMagnitude = d("magnitude"),
                greatestLatitudeDeg = d("lat_dd_ge"),
                greatestLongitudeDeg = d("lng_dd_ge"),
                t0Hours = d("t0"),
                x0 = d("x0"), x1 = d("x1"), x2 = d("x2"), x3 = d("x3"),
                y0 = d("y0"), y1 = d("y1"), y2 = d("y2"), y3 = d("y3"),
                d0Deg = d("d0"), d1Deg = d("d1"), d2Deg = d("d2"),
                mu0Deg = d("mu0"), mu1Deg = d("mu1"), mu2Deg = d("mu2"),
                l10 = d("l10"), l11 = d("l11"), l12 = d("l12"),
                l20 = d("l20"), l21 = d("l21"), l22 = d("l22"),
                tanF1 = d("tan_f1"), tanF2 = d("tan_f2"),
                tMinHours = d("tmin"), tMaxHours = d("tmax"),
                catalogueTypeRaw = s("eclipse_type")
            )
        }
    }

    private fun extractPayload(source: String): String {
        val symbol = source.indexOf(SYMBOL)
        require(symbol >= 0) { "$SYMBOL not found" }
        val equals = source.indexOf('=', symbol + SYMBOL.length)
        require(equals >= 0) { "Besselian assignment is malformed" }
        val quote = source.indexOf('"', equals + 1)
        require(quote >= 0) { "Besselian string opening quote not found" }

        val out = StringBuilder(source.length.coerceAtMost(1_500_000))
        var i = quote + 1
        while (i < source.length) {
            val ch = source[i++]
            if (ch == '"') return out.toString()
            if (ch != '\\') {
                out.append(ch)
                continue
            }
            require(i < source.length) { "Dangling escape in Besselian string" }
            when (val escaped = source[i++]) {
                'n' -> out.append('\n')
                'r' -> out.append('\r')
                't' -> out.append('\t')
                '\\' -> out.append('\\')
                '"' -> out.append('"')
                else -> {
                    out.append('\\')
                    out.append(escaped)
                }
            }
        }
        throw IllegalArgumentException("Besselian string closing quote not found")
    }
}
