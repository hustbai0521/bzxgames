import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.example.bzxandroidgames"
    compileSdk = 36

    defaultConfig {
        // Keep the installed app identity so updates preserve existing user data.
        applicationId = "com.example.k602048"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    signingConfigs {
        getByName("debug") {
            storeFile = file("debug.keystore")
            storePassword = "android"
            keyAlias = "androiddebugkey"
            keyPassword = "android"
        }
    }

    buildTypes {
        debug {
            signingConfig = signingConfigs.getByName("debug")
        }
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    buildFeatures { compose = true }
    packaging { resources.excludes += "/META-INF/{AL2.0,LGPL2.1}" }
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2025.09.00"))
    implementation("androidx.core:core-ktx:1.17.0")
    implementation("androidx.activity:activity-compose:1.10.1")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.9.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.9.0")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    debugImplementation("androidx.compose.ui:ui-tooling")
    testImplementation("junit:junit:4.13.2")
}

kotlin {
    compilerOptions { jvmTarget = JvmTarget.JVM_17 }
}

configurations.configureEach {
    resolutionStrategy.force(
        "org.jetbrains.kotlinx:kotlinx-coroutines-core-jvm:1.10.1",
        "org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.1",
        "org.jetbrains.kotlinx:kotlinx-serialization-core-jvm:1.9.0"
    )
}

tasks.register("exportDebugApk") {
    group = "distribution"
    description = "Builds and exports debug APKs with the current project and display names."
    dependsOn("assembleDebug")
    val debugApk = layout.buildDirectory.file("outputs/apk/debug/app-debug.apk")
    val exportedApks = listOf(
        rootProject.layout.projectDirectory.file("${rootProject.name}-debug.apk"),
        rootProject.layout.projectDirectory.file("小游戏合集-debug.apk")
    )
    inputs.file(debugApk)
    outputs.files(exportedApks)
    doLast {
        exportedApks.forEach { debugApk.get().asFile.copyTo(it.asFile, overwrite = true) }
    }
}
