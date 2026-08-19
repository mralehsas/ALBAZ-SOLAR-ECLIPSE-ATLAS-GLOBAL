plugins {
    id("org.jetbrains.kotlin.jvm")
}

kotlin {
    jvmToolchain(17)
}

tasks.register<JavaExec>("runCoreRegression") {
    group = "verification"
    description = "Runs the native eclipse core regression harness."
    dependsOn(tasks.named("testClasses"))
    classpath = sourceSets["test"].runtimeClasspath
    mainClass.set("com.albaz.eclipse.core.CoreRegressionMainKt")
    workingDir = rootProject.projectDir
}
