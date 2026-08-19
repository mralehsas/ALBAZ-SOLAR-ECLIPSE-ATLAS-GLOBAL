package com.albaz.eclipse.ui

enum class AppLanguage { AR, EN }

data class UiText(
    val atlas: String,
    val subtitle: String,
    val home: String,
    val results: String,
    val engine: String,
    val ready: String,
    val de440Missing: String,
    val de440Note: String,
    val event: String,
    val year: String,
    val search: String,
    val observer: String,
    val latitude: String,
    val longitude: String,
    val altitude: String,
    val calculate: String,
    val calculating: String,
    val noEvents: String,
    val noResult: String,
    val localType: String,
    val magnitude: String,
    val obscuration: String,
    val sunAltitude: String,
    val sunAzimuth: String,
    val contacts: String,
    val catalogue: String,
    val fullCatalogue: String,
    val fixtureCatalogue: String,
    val total: String,
    val annular: String,
    val partial: String,
    val none: String,
    val solver: String,
    val quickSites: String
)

fun uiText(language: AppLanguage): UiText = if (language == AppLanguage.AR) {
    UiText(
        atlas = "أطلس الباز للكسوف الشمسي",
        subtitle = "Android Native Scientific DEV1",
        home = "الحساب", results = "النتائج", engine = "المحرك العلمي", ready = "جاهز",
        de440Missing = "DE440 غير مثبت في DEV1", de440Note = "لن يظهر كجاهز قبل تحقق البصمة الكاملة",
        event = "حدث الكسوف", year = "السنة", search = "بحث", observer = "موقع الراصد",
        latitude = "خط العرض", longitude = "خط الطول", altitude = "الارتفاع م",
        calculate = "احسب الكسوف", calculating = "جارٍ الحساب…", noEvents = "لا يوجد حدث في بيانات هذه النسخة",
        noResult = "احسب حدثًا أولًا لعرض الظروف المحلية", localType = "النوع المحلي", magnitude = "المقدار",
        obscuration = "الاحتجاب", sunAltitude = "ارتفاع الشمس", sunAzimuth = "سمت الشمس",
        contacts = "التماسات UTC", catalogue = "الكتالوج", fullCatalogue = "الكتالوج الكامل 2613 حدثًا",
        fixtureCatalogue = "بيانات DEV1 المرجعية", total = "كلي", annular = "حلقي", partial = "جزئي", none = "لا كسوف محلي",
        solver = "الحل المحلي", quickSites = "مواقع سريعة"
    )
} else {
    UiText(
        atlas = "ALBAZ Solar Eclipse Atlas",
        subtitle = "Android Native Scientific DEV1",
        home = "Compute", results = "Results", engine = "Scientific engine", ready = "READY",
        de440Missing = "DE440 not installed in DEV1", de440Note = "It is never shown as ready before full fingerprint verification",
        event = "Eclipse event", year = "Year", search = "Search", observer = "Observer location",
        latitude = "Latitude", longitude = "Longitude", altitude = "Altitude m",
        calculate = "Compute eclipse", calculating = "Computing…", noEvents = "No event in this build data",
        noResult = "Compute an event first to show local circumstances", localType = "Local type", magnitude = "Magnitude",
        obscuration = "Obscuration", sunAltitude = "Sun altitude", sunAzimuth = "Sun azimuth",
        contacts = "UTC contacts", catalogue = "Catalogue", fullCatalogue = "Full 2613-event catalogue",
        fixtureCatalogue = "DEV1 reference data", total = "Total", annular = "Annular", partial = "Partial", none = "No local eclipse",
        solver = "Local solver", quickSites = "Quick sites"
    )
}
