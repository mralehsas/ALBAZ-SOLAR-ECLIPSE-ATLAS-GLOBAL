import org.gradle.api.DefaultTask
import org.gradle.api.file.DirectoryProperty
import org.gradle.api.file.RegularFileProperty
import org.gradle.api.tasks.InputFile
import org.gradle.api.tasks.OutputDirectory
import org.gradle.api.tasks.TaskAction

abstract class GenerateBesselianAsset : DefaultTask() {
    @get:InputFile
    abstract val sourceFile: RegularFileProperty

    @get:OutputDirectory
    abstract val outputDirectory: DirectoryProperty

    @TaskAction
    fun generate() {
        val target = outputDirectory.file("besselian_data.js").get().asFile
        target.parentFile.mkdirs()
        sourceFile.get().asFile.copyTo(target, overwrite = true)
    }
}

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

val repositoryCatalogue = rootProject.file("../besselian_data.js")
val fallbackFixture = rootProject.file("science-core/src/test/resources/besselian_fixture.js")
val generateBesselianAsset = tasks.register<GenerateBesselianAsset>("generateBesselianAsset") {
    sourceFile.set(if (repositoryCatalogue.exists()) repositoryCatalogue else fallbackFixture)
    outputDirectory.set(layout.buildDirectory.dir("generated/besselianAssets"))
}

androidComponents {
    onVariants(selector().all()) { variant ->
        variant.sources.assets?.addGeneratedSourceDirectory(
            generateBesselianAsset,
            GenerateBesselianAsset::outputDirectory
        )
    }
}

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
