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

val de440Path = providers.gradleProperty("de440Path")
val de440PartsDir = providers.gradleProperty("de440PartsDir")

tasks.register<JavaExec>("runDe440SpkRegression") {
    group = "verification"
    description = "Reads the real DE440 DAF/SPK Type-2 kernel and checks reference vectors."
    dependsOn(tasks.named("testClasses"))
    classpath = sourceSets["test"].runtimeClasspath
    mainClass.set("com.albaz.eclipse.core.spk.De440SpkRegressionMainKt")
    doFirst { args(de440Path.get()) }
}

tasks.register<JavaExec>("runDe440AssemblerRegression") {
    group = "verification"
    description = "Checks strict assembly of the four audited R14.2 DE440 parts."
    dependsOn(tasks.named("testClasses"))
    classpath = sourceSets["test"].runtimeClasspath
    mainClass.set("com.albaz.eclipse.core.spk.De440AssemblerRegressionMainKt")
    doFirst { args(de440PartsDir.get()) }
}
