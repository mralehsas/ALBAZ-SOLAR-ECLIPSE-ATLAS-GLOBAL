plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.compose.compiler)
}

android {
    namespace = "com.albaz.eclipseatlas"
    compileSdk = 37

    defaultConfig {
        applicationId = "com.albaz.eclipseatlas"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0-native-alpha"
    }

    buildFeatures {
        compose = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation(project(":core-domain"))
    implementation(project(":core-eclipse"))
    implementation(project(":core-local"))
    implementation(project(":feature-home"))
    implementation(project(":feature-results"))

    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.foundation)
    implementation(libs.compose.material3)
    implementation(libs.compose.ui.tooling.preview)
    implementation(libs.activity.compose)
    implementation(libs.lifecycle.viewmodel)
    implementation(libs.coroutines.android)

    debugImplementation(libs.compose.ui.tooling)
    debugImplementation(libs.compose.ui.test.manifest)
}
