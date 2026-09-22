# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment the
# following to hide the original source file name.
#-renamesourcefileattribute SourceFile

# ==================== v25.0.88 言道国学自定义规则 ====================

# Capacitor 桥核心：JS↔Java 交互通过反射调用，混淆即白屏（AAR 自带 consumer
# rules 已含此条，双保险显式保留）
-keep class com.getcapacitor.** { *; }

# 排盘记录原生存储插件：@PluginMethod 由桥反射调用
-keep class com.yandao.guoxue.plugins.** { *; }

# 黄历桌面小组件：系统 AppWidget 框架按 Manifest 类名反射实例化
-keep class com.yandao.guoxue.HuangliWidgetProvider { *; }
