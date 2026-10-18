package com.yandao.guoxue.plugins;

import android.Manifest;
import android.app.AlarmManager;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Intent;
import android.os.Build;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.yandao.guoxue.CalendarSystemReceiver;
import com.yandao.guoxue.HuangliWidgetProvider;
import com.yandao.guoxue.HuangliWidgetProviderLarge;
import com.yandao.guoxue.CalendarAgendaWidgetProvider;
import org.json.JSONObject;

@CapacitorPlugin(name="LocalCalendar", permissions={@Permission(alias="notifications",strings={Manifest.permission.POST_NOTIFICATIONS})})
public class LocalCalendarPlugin extends Plugin {
    @PluginMethod public void status(PluginCall call) { call.resolve(state()); }
    private JSObject state() {
        JSObject result=new JSObject();
        result.put("native",true);result.put("widgets",true);result.put("platform","android");
        android.app.NotificationManager notifications=(android.app.NotificationManager)getContext().getSystemService(android.content.Context.NOTIFICATION_SERVICE);
        result.put("notifications",(Build.VERSION.SDK_INT<33||getPermissionState("notifications")==PermissionState.GRANTED)&&(Build.VERSION.SDK_INT<24||notifications==null||notifications.areNotificationsEnabled()));
        AlarmManager alarms=(AlarmManager)getContext().getSystemService(android.content.Context.ALARM_SERVICE);
        result.put("exactAlarms",Build.VERSION.SDK_INT<31||(alarms!=null&&alarms.canScheduleExactAlarms()));
        return result;
    }
    @PluginMethod public void requestAuthorization(PluginCall call) {
        if(Build.VERSION.SDK_INT>=33&&getPermissionState("notifications")!=PermissionState.GRANTED)requestPermissionForAlias("notifications",call,"afterPermission");
        else call.resolve(state());
    }
    @PermissionCallback private void afterPermission(PluginCall call) { call.resolve(state()); }
    @PluginMethod public void sync(PluginCall call) {
        try {
            String raw=call.getString("payload","");
            if(raw.length()>250000)throw new Exception("日历快照过大");
            JSONObject payload=new JSONObject(raw),snapshot=payload.getJSONObject("snapshot");
            if(snapshot.getInt("schemaVersion")!=1||snapshot.getJSONArray("entries").length()>300||snapshot.getLong("expiresAt")<=System.currentTimeMillis())throw new Exception("日历快照已过期或版本不受支持");
            CalendarSystemReceiver.replace(getContext(),payload);
            HuangliWidgetProvider.updateAll(getContext());
            JSObject result=state();result.put("scheduled",payload.getJSONArray("reminders").length());result.put("expiresAt",snapshot.getLong("expiresAt"));call.resolve(result);
        } catch(Exception error) {call.reject("日历同步失败："+error.getMessage());}
    }
    @PluginMethod public void addWidget(PluginCall call) {
        if(Build.VERSION.SDK_INT<26){call.reject("请从系统桌面的小组件列表添加言道日历。");return;}
        AppWidgetManager manager=AppWidgetManager.getInstance(getContext());
        if(!manager.isRequestPinAppWidgetSupported()){call.reject("此桌面不支持应用内添加，请长按桌面后选择小组件。");return;}
        String kind=call.getString("kind","clock");
        Class<?> type="pillars".equals(kind)?HuangliWidgetProviderLarge.class:"agenda".equals(kind)?CalendarAgendaWidgetProvider.class:HuangliWidgetProvider.class;
        boolean requested=manager.requestPinAppWidget(new ComponentName(getContext(),type),null,null);
        JSObject result=new JSObject();result.put("requested",requested);result.put("added",false);call.resolve(result);
    }
    @PluginMethod public void openExactSettings(PluginCall call) {
        if(Build.VERSION.SDK_INT>=31){Intent intent=new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,android.net.Uri.parse("package:"+getContext().getPackageName()));getActivity().startActivity(intent);}
        call.resolve(state());
    }
    @PluginMethod public void openDreamSettings(PluginCall call) {
        try{getActivity().startActivity(new Intent(Settings.ACTION_DREAM_SETTINGS));call.resolve();}catch(Exception error){call.reject("此设备没有可用的充电屏保设置。");}
    }
}
