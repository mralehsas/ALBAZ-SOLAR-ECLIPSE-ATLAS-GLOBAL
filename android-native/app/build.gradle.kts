import org.gradle.api.tasks.Copy

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.albaz.eclipse"
    compileSdk = 37

    defaultConfig {
        applicationId = "com.albaz.eclipse"
        minSdk = 26
        targetSdk = 37
        versionCode = 2001
        versionName = "0.2.0-dev1"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    packaging {
        resources.excludes += "/META-INF/{AL2.0,LGPL2.1}"
    }
}

val generatedBesselianAssets = layout.buildDirectory.dir("generated/besselianAssets")
val syncBesselianData by tasks.registering(Copy::class) {
    val repositoryCatalogue = rootProject.file("../besselian_data.js")
    val fallbackFixture = rootProject.file("science-core/src/test/resources/besselian_fixture.js")
    from(provider { if (repositoryCatalogue.exists()) repositoryCatalogue else fallbackFixture })
    into(generatedBesselianAssets)
    rename { "besselian_data.js" }
}

android.sourceSets["main"].assets.srcDir(generatedBesselianAssets)
tasks.named("preBuild").configure { dependsOn(syncBesselianData) }

dependencies {
    implementation(project(":science-core"))

    val composeBom = platform("androidx.compose:compose-bom:2026.08.00")
    implementation(composeBom)
    androidTestImplementation(composeBom)

    implementation("androidx.activity:activity-compose:1.13.0")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.10.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.10.0")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    debugImplementation("androidx.compose.ui:ui-tooling")
}
