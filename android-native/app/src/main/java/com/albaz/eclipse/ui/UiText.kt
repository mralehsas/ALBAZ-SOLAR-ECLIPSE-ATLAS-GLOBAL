package com.albaz.eclipse.ui

enum class AppLanguage { AR, EN }

data class UiText(
    val atlas: String, val subtitle: String, val home: String, val results: String,
    val engine: String, val ready: String,
    val de440Preparing: String, val de440Verified: String, val de440Missing: String, val de440Corrupt: String, val de440Note: String,
    val event: String, val year: String, val search: String, val observer: String,
    val latitude: String, val longitude: String, val altitude: String,
    val calculate: String, val calculating: String, val noEvents: String, val noResult: String,
    val localType: String, val magnitude: String, val obscuration: String, val sunAltitude: String, val sunAzimuth: String,
    val contacts: String, val catalogue: String, val fullCatalogue: String, val fixtureCatalogue: String,
    val total: String, val annular: String, val partial: String, val none: String, val solver: String, val quickSites: String
)

fun uiText(language: AppLanguage): UiText = if (language == AppLanguage.AR) {
    UiText(
        atlas = "أطلس الباز للكسوف الشمسي", subtitle = "Android Native Scientific DEV2",
        home = "الحساب", results = "النتائج", engine = "المحرك العلمي", ready = "جاهز",
        de440Preparing = "جارٍ تدقيق DE440…", de440Verified = "DE440 VERIFIED • Native SPK Type 2",
        de440Missing = "ملفات DE440 غير موجودة", de440Corrupt = "DE440 فشل في التحقق",
        de440Note = "الحالة VERIFIED لا تظهر إلا بعد بصمة SHA-256 واختبار SPK فعلي",
        event = "حدث الكسوف", year = "السنة", search = "بحث", observer = "موقع الراصد",
        latitude = "خط العرض", longitude = "خط الطول", altitude = "الارتفاع م",
        calculate = "احسب الكسوف", calculating = "جارٍ الحساب…", noEvents = "لا يوجد حدث في بيانات هذه النسخة",
        noResult = "احسب حدثًا أولًا لعرض الظروف المحلية", localType = "النوع المحلي", magnitude = "المقدار",
        obscuration = "الاحتجاب", sunAltitude = "ارتفاع الشمس", sunAzimuth = "سمت الشمس", contacts = "التماسات UTC",
        catalogue = "الكتالوج", fullCatalogue = "الكتالوج الكامل 2613 حدثًا", fixtureCatalogue = "بيانات DEV2 المرجعية",
        total = "كلي", annular = "حلقي", partial = "جزئي", none = "لا كسوف محلي", solver = "الحل المحلي", quickSites = "مواقع سريعة"
    )
} else {
    UiText(
        atlas = "ALBAZ Solar Eclipse Atlas", subtitle = "Android Native Scientific DEV2",
        home = "Compute", results = "Results", engine = "Scientific engine", ready = "READY",
        de440Preparing = "Auditing DE440…", de440Verified = "DE440 VERIFIED • Native SPK Type 2",
        de440Missing = "DE440 assets are missing", de440Corrupt = "DE440 verification failed",
        de440Note = "VERIFIED appears only after SHA-256 validation and a real SPK smoke evaluation",
        event = "Eclipse event", year = "Year", search = "Search", observer = "Observer location",
        latitude = "Latitude", longitude = "Longitude", altitude = "Altitude m",
        calculate = "Compute eclipse", calculating = "Computing…", noEvents = "No event in this build data",
        noResult = "Compute an event first to show local circumstances", localType = "Local type", magnitude = "Magnitude",
        obscuration = "Obscuration", sunAltitude = "Sun altitude", sunAzimuth = "Sun azimuth", contacts = "UTC contacts",
        catalogue = "Catalogue", fullCatalogue = "Full 2613-event catalogue", fixtureCatalogue = "DEV2 reference data",
        total = "Total", annular = "Annular", partial = "Partial", none = "No local eclipse", solver = "Local solver", quickSites = "Quick sites"
    )
}
