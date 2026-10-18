package com.yandao.guoxue;
import android.service.dreams.DreamService;
import android.graphics.Color;
import android.view.Gravity;
import android.widget.*;
import org.json.JSONObject;
/** Charging/idle screen saver only. Never replaces the secure lock screen. */
public class CalendarDreamService extends DreamService {
    @Override public void onAttachedToWindow(){
        super.onAttachedToWindow();setInteractive(false);setFullscreen(true);setScreenBright(false);
        LinearLayout box=new LinearLayout(this);box.setOrientation(LinearLayout.VERTICAL);box.setGravity(Gravity.CENTER);box.setBackgroundColor(Color.rgb(17,24,32));box.setPadding(32,32,32,32);
        TextClock clock=new TextClock(this);clock.setFormat24Hour("HH:mm");clock.setFormat12Hour("h:mm a");clock.setTextSize(64);clock.setTextColor(Color.rgb(198,183,159));box.addView(clock);
        JSONObject row=HuangliWidgetProvider.current(this),snapshot=CalendarSystemReceiver.read(this).optJSONObject("snapshot");if(snapshot!=null)clock.setTimeZone(snapshot.optString("timeZone","Asia/Shanghai"));
        TextView text=new TextView(this);text.setTextSize(18);text.setTextColor(Color.rgb(198,183,159));text.setGravity(Gravity.CENTER);text.setText(row==null?"言道日历\n请打开应用刷新历法快照":row.optString("solar")+"\n"+row.optString("lunar")+"\n历法快照 · "+row.optString("clock"));box.addView(text);setContentView(box);
    }
}
