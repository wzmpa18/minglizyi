package com.yandao.guoxue;

import android.app.*;
import android.content.*;
import android.os.Build;
import org.json.*;

/** Only system-scheduled local reminders. No network, wake loop or private text. */
public class CalendarSystemReceiver extends BroadcastReceiver {
    public static final String PREFS="yandao_calendar_system_v1",ACTION="com.yandao.guoxue.CALENDAR_REMINDER";
    public static JSONObject read(Context context) {
        try{return new JSONObject(context.getSharedPreferences(PREFS,0).getString("payload","{}"));}catch(Exception error){return new JSONObject();}
    }
    private static PendingIntent alarmIntent(Context context,int id) {
        Intent intent=new Intent(context,CalendarSystemReceiver.class).setAction(ACTION).putExtra("id",id);
        return PendingIntent.getBroadcast(context,id,intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    }
    public static synchronized int replace(Context context,JSONObject data) throws Exception {
        AlarmManager manager=(AlarmManager)context.getSystemService(Context.ALARM_SERVICE);
        JSONArray old=read(context).optJSONArray("reminders");
        JSONArray reminders=data.getJSONArray("reminders");if(reminders.length()>128)throw new Exception("超过本应用本轮128项队列预算");
        long now=System.currentTimeMillis();
        for(int i=0;i<reminders.length();i++){
            JSONObject item=reminders.getJSONObject(i);long at=item.getLong("at");
            if(item.getInt("id")<=0||at<=now||at>now+366L*86400000L)throw new Exception("提醒时间无效");
        }
        if(!context.getSharedPreferences(PREFS,0).edit().putString("payload",data.toString()).commit())throw new Exception("本机存储失败");
        if(manager!=null&&old!=null)for(int i=0;i<old.length();i++)manager.cancel(alarmIntent(context,old.getJSONObject(i).getInt("id")));
        return schedule(context);
    }
    public static synchronized int schedule(Context context) {
        AlarmManager manager=(AlarmManager)context.getSystemService(Context.ALARM_SERVICE);if(manager==null)return 0;
        JSONArray reminders=read(context).optJSONArray("reminders");if(reminders==null)return 0;int registered=0,failed=0;
        for(int i=0;i<reminders.length();i++)try{
            JSONObject item=reminders.getJSONObject(i);long at=item.getLong("at");if(at<=System.currentTimeMillis())continue;
            PendingIntent intent=alarmIntent(context,item.getInt("id"));
            if(item.optBoolean("exact",false)&&(Build.VERSION.SDK_INT<31||manager.canScheduleExactAlarms()))manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,intent);
            else manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,intent);
            registered++;
        }catch(Exception ignored){failed++;}
        context.getSharedPreferences(PREFS,0).edit().putInt("registeredCount",registered).putInt("registrationFailed",failed).putLong("lastScheduleAt",System.currentTimeMillis()).apply();return registered;
    }
    @Override public void onReceive(Context context,Intent intent) {
        if(!ACTION.equals(intent.getAction())){schedule(context);HuangliWidgetProvider.updateAll(context);return;}
        synchronized(CalendarSystemReceiver.class){
        int id=intent.getIntExtra("id",0);JSONObject payload=read(context);JSONArray rows=payload.optJSONArray("reminders"),remaining=new JSONArray();boolean due=false;
        if(rows==null)return;
        for(int i=0;i<rows.length();i++)try{JSONObject row=rows.getJSONObject(i);if(row.getInt("id")==id){long delta=System.currentTimeMillis()-row.getLong("at");due=delta>=0&&delta<1800000;}else remaining.put(row);}catch(Exception ignored){}
        try{payload.put("reminders",remaining);context.getSharedPreferences(PREFS,0).edit().putString("payload",payload.toString()).commit();}catch(Exception ignored){}
        if(!due)return;
        NotificationManager manager=(NotificationManager)context.getSystemService(Context.NOTIFICATION_SERVICE);if(manager==null)return;
        if(Build.VERSION.SDK_INT>=26)manager.createNotificationChannel(new NotificationChannel("yandao-calendar","言道日历",NotificationManager.IMPORTANCE_DEFAULT));
        Intent open=new Intent(context,MainActivity.class).putExtra("open_calendar",true).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent action=PendingIntent.getActivity(context,6100,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder builder=Build.VERSION.SDK_INT>=26?new Notification.Builder(context,"yandao-calendar"):new Notification.Builder(context);
        builder.setSmallIcon(android.R.drawable.ic_menu_my_calendar).setContentTitle(payload.optString("notificationTitle","言道日历")).setContentText(payload.optString("notificationBody","有一项安排，请打开应用查看")).setContentIntent(action).setAutoCancel(true).setVisibility(Notification.VISIBILITY_PRIVATE);
        try{manager.notify(id,builder.build());}catch(SecurityException ignored){}
        }
    }
}
