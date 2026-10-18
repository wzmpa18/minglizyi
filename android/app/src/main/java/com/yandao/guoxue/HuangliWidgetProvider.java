package com.yandao.guoxue;

import android.app.*;
import android.appwidget.*;
import android.content.*;
import android.widget.RemoteViews;
import org.json.*;

/** Calendar snapshots come from the app's shared lunar engine. No native approximation. */
public class HuangliWidgetProvider extends AppWidgetProvider {
    private static final String UPDATE="com.yandao.guoxue.action.HUANGLI_AUTO_UPDATE";
    protected boolean isLarge(){return false;}
    protected boolean isAgenda(){return false;}
    public static JSONObject current(Context context){
        JSONObject snapshot=CalendarSystemReceiver.read(context).optJSONObject("snapshot");
        if(snapshot==null||snapshot.optInt("schemaVersion")!=1)return null;
        long now=System.currentTimeMillis();if(snapshot.optLong("expiresAt")<=now)return null;
        JSONArray rows=snapshot.optJSONArray("entries");if(rows==null)return null;
        for(int i=0;i<rows.length();i++){JSONObject row=rows.optJSONObject(i);if(row!=null&&row.optLong("from")<=now&&row.optLong("until")>now)return row;}
        return null;
    }
    private static PendingIntent open(Context context){
        Intent intent=new Intent(context,MainActivity.class).putExtra("open_calendar",true).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(context,6100,intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    }
    protected RemoteViews views(Context context){
        boolean large=isLarge();RemoteViews views=new RemoteViews(context.getPackageName(),large?R.layout.widget_huangli_large:R.layout.widget_huangli_small);
        JSONObject payload=CalendarSystemReceiver.read(context),snapshot=payload.optJSONObject("snapshot"),row=current(context);
        String zone=snapshot==null?"Asia/Shanghai":snapshot.optString("timeZone","Asia/Shanghai");
        String date=row==null?"言道日历":row.optString("solar"),lunar=row==null?"快照过期或未生成，请打开日历刷新":row.optString("lunar");
        int clock=large?R.id.widget_clock_large:R.id.widget_clock_small;
        views.setString(clock,"setTimeZone",zone);
        if(large){
            views.setTextViewText(R.id.tv_solar_large,date);views.setTextViewText(R.id.tv_lunar_large,lunar);
            views.setTextViewText(R.id.tv_ganzhi_large,row==null?"":row.optString("pillars"));
            views.setTextViewText(R.id.tv_wuxing_large,row==null?"":("四柱快照 · "+row.optString("clock")));
            views.setTextViewText(R.id.tv_chongsha_large,zone+" · 标准民用时");
            JSONArray reminders=payload.optJSONArray("reminders");
            views.setTextViewText(R.id.tv_yi_large,isAgenda()&&reminders!=null&&reminders.length()>0?payload.optString("notificationBody","有一项安排，请打开应用查看"):"时间由系统时钟显示");
            views.setTextViewText(R.id.tv_ji_large,"历法快照覆盖7天，过期请打开应用刷新");
            views.setTextViewText(R.id.tv_jieqi_large,row==null?"":row.optString("jieqi"));
            views.setOnClickPendingIntent(R.id.widget_root_large,open(context));
        }else{
            views.setTextViewText(R.id.tv_solar_small,date);views.setTextViewText(R.id.tv_lunar_small,lunar);
            views.setTextViewText(R.id.tv_yi_small,row==null?"":row.optString("jieqi"));
            views.setTextViewText(R.id.tv_ji_small,zone);
            views.setOnClickPendingIntent(R.id.widget_root_small,open(context));
        }
        return views;
    }
    public static void updateAll(Context context){
        AppWidgetManager manager=AppWidgetManager.getInstance(context);
        HuangliWidgetProvider[] providers={new HuangliWidgetProvider(),new HuangliWidgetProviderLarge(),new CalendarAgendaWidgetProvider()};
        for(HuangliWidgetProvider provider:providers){int[] ids=manager.getAppWidgetIds(new ComponentName(context,provider.getClass()));if(ids.length>0)manager.updateAppWidget(ids,provider.views(context));}
        JSONObject row=current(context);if(row==null)return;
        AlarmManager alarms=(AlarmManager)context.getSystemService(Context.ALARM_SERVICE);if(alarms==null)return;
        PendingIntent next=PendingIntent.getBroadcast(context,6101,new Intent(context,HuangliWidgetProvider.class).setAction(UPDATE),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        alarms.set(AlarmManager.RTC,row.optLong("until"),next);
    }
    @Override public void onUpdate(Context context,AppWidgetManager manager,int[] ids){updateAll(context);}
    @Override public void onReceive(Context context,Intent intent){super.onReceive(context,intent);if(UPDATE.equals(intent.getAction()))updateAll(context);}
}
