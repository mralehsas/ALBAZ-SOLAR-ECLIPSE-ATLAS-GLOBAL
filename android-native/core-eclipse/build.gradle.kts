plugins {
    alias(libs.plugins.kotlin.jvm)
}

kotlin {
    jvmToolchain(17)
}

sourceSets {
    main {
        resources {
            srcDir(rootProject.projectDir.parentFile)
            include("besselian_data.js")
        }
    }
}

dependencies {
    implementation(project(":core-domain"))
    testImplementation(libs.junit.jupiter)
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.test {
    useJUnitPlatform()
}
