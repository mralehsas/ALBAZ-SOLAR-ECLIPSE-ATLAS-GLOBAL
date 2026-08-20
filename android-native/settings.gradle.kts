pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "ALBAZEclipseAtlasNative"

include(
    ":app",
    ":core-domain",
    ":core-time",
    ":core-eclipse",
    ":core-local",
    ":core-ephemeris",
    ":feature-home",
    ":feature-results",
)
