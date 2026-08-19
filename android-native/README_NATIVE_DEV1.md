# ALBAZ Solar Eclipse Atlas Android — Native Scientific Edition DEV1

هذه الحزمة هي **المرحلة الأولى** من إعادة بناء تطبيق Android بشكل Native، وليست إعادة تغليف WebView/Capacitor.

## ما تم بناؤه في DEV1

- `science-core`: نواة Kotlin مستقلة عن Android لقراءة كتالوج Besselian وحساب الظروف المحلية.
- حساب C1 / C2 / MAX / C3 / C4 مع إبقاء C2/C3 فارغتين في الكسوف الجزئي.
- النوع المحلي، المقدار المحلي location-dependent، الاحتجاب، ارتفاع الشمس وسمتها.
- دعم العرض التاريخي اليولياني قبل الإصلاح الغريغوري داخل النواة.
- عقد سلامة DE440 ببصمات R14.2 الأصلية: لا تُعرض حالة Verified إلا بعد تطابق الحجم وSHA-256.
- واجهة Android أصلية بـ Kotlin + Jetpack Compose: Home + Results، عربي/إنكليزي، RTL/LTR، Edge-to-edge.
- لا يوجد `WebView` أو `Capacitor` في مصدر DEV1.

## مصدر بيانات الكسوف

عند وضع مجلد هذا المشروع باسم `android-native/` داخل مستودع
`ALBAZ-SOLAR-ECLIPSE-ATLAS-GLOBAL`، تقوم مهمة Gradle تلقائيًا بنسخ:

`../besselian_data.js`

إلى Assets، وبذلك يستخدم التطبيق كتالوج المستودع الكامل (2613 حدثًا ضمن مرجع المشروع).

الحزمة المستقلة هنا تحتوي Fixture صغيرًا من حدثي 1999 و2026 لاختبارات regression فقط، ولا يجوز وصفه ككتالوج كامل.

## حالة DE440 في DEV1

تم تنفيذ **Integrity Gate** فقط، مع المقاسات والبصمات المعتمدة في R14.2. ملف kernel نفسه وقارئ SPK Native السابق لم يكونا متاحين كملفات مصدر قابلة للاسترجاع في مكتبة المحادثات الحالية، لذلك لا تدعي هذه المرحلة أن DE440 نشط. الواجهة تقول ذلك صراحة.

المرحلة DEV2 ستضيف قارئ DAF/SPK Type-2 الفعلي وتجميع الأجزاء الأربعة أو آلية إحضارها الموثقة، ثم تربط نتيجة التدقيق بالنواة دون خلطها بحل Besselian المحلي.

## التحقق المنفذ في هذه البيئة

نفّذ:

```bash
./scripts/run_core_regression.sh
python3 scripts/project_preflight.py
```

تمت كتابة اختبارات النواة أولًا ومشاهدة فشلها قبل إضافة التنفيذ (TDD)، ثم أصبحت خضراء.

## ملاحظة بناء Android

هذه البيئة لا تحتوي Android SDK أو Gradle executable؛ لذلك **لم يتم ادعاء بناء APK/AAB**. تم تدقيق النواة JVM وبنية مشروع Android والملفات والإصدارات والتحذيرات العلمية. البناء النهائي يجب أن يُنفذ في Android Studio/JDK 17 بعد توفير Gradle Wrapper الكامل أو توليده.

## نطاق المرحلة التالية

1. DE440 SPK native verifier الفعلي.
2. خريطة MapLibre Native 2D ومسار الظل وGIS المدن.
3. Globe 3D مستقل Lazy-loaded.
4. التقرير والتصدير والـBaseline Profile وMacrobenchmark.
