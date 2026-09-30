# ============================================================
# NAMMA OORU JOBS — Production ProGuard / R8 Rules
# ============================================================

# ── Capacitor Core ──────────────────────────────────────────
-keep class com.getcapacitor.** { *; }
-keep class com.getcapacitor.plugin.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep @com.getcapacitor.annotation.PluginMethod class * { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.annotation.PluginMethod public *;
}

# ── App Main Activity ────────────────────────────────────────
-keep class com.nammaoorujobs.app.** { *; }

# ── AndroidX / Support Libraries ────────────────────────────
-keep class androidx.** { *; }
-keep interface androidx.** { *; }
-dontwarn androidx.**

# ── SplashScreen ────────────────────────────────────────────
-keep class androidx.core.splashscreen.** { *; }

# ── WebView / JavaScript Bridge ─────────────────────────────
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface

# ── Firebase / Google Services (Push Notifications) ─────────
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# ── Push Notifications Plugin ────────────────────────────────
-keep class com.capacitorjs.plugins.pushnotifications.** { *; }

# ── Capawesome Google Sign-In & Credential Manager ──────────
-keep class io.capawesome.capacitorjs.plugins.googlesignin.** { *; }
-keep class androidx.credentials.** { *; }
-keep interface androidx.credentials.** { *; }
-keep class com.google.android.libraries.identity.googleid.** { *; }
-dontwarn androidx.credentials.**
-dontwarn com.google.android.libraries.identity.googleid.**
-dontwarn io.capawesome.capacitorjs.plugins.googlesignin.**

# ── Cordova Android ─────────────────────────────────────────
-keep class org.apache.cordova.** { *; }
-dontwarn org.apache.cordova.**

# ── General Android ─────────────────────────────────────────
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
-keepattributes Signature
-keepattributes Exceptions
-keepattributes EnclosingMethod

# Keep Parcelable implementations
-keepclassmembers class * implements android.os.Parcelable {
    static ** CREATOR;
}

# Keep Serializable implementations
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    !static !transient <fields>;
    !private <fields>;
    !private <methods>;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# Keep enum classes
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# ── Suppress common warnings ─────────────────────────────────
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**
-dontwarn java.lang.invoke.**
-dontwarn javax.annotation.**
