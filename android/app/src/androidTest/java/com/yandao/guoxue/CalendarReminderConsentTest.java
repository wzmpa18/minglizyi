package com.yandao.guoxue;

import android.app.PendingIntent;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;

/** Runs only on the disposable CI emulator, without an account or user records. */
@RunWith(AndroidJUnit4.class)
public class CalendarReminderConsentTest {
    private Context context;
    @Before public void reset(){
        context=InstrumentationRegistry.getInstrumentation().getTargetContext();
        CalendarSystemReceiver.setConsent(context,false);
        context.getSharedPreferences(CalendarSystemReceiver.PREFS,0).edit().clear().commit();
    }
    @After public void cleanup(){CalendarSystemReceiver.setConsent(context,false);}
    private boolean enabled(){
        return context.getPackageManager().getComponentEnabledSetting(new ComponentName(context,CalendarSystemReceiver.class))
            ==PackageManager.COMPONENT_ENABLED_STATE_ENABLED;
    }
    private JSONObject payload(long at) throws Exception {
        return new JSONObject().put("reminders",new JSONArray().put(new JSONObject().put("id",987654).put("at",at).put("exact",false)));
    }
    @Test public void manifestDisablesReceiverOnFreshInstall() throws Exception {
        context.getPackageManager().setComponentEnabledSetting(new ComponentName(context,CalendarSystemReceiver.class),PackageManager.COMPONENT_ENABLED_STATE_DEFAULT,PackageManager.DONT_KILL_APP);
        assertFalse(context.getPackageManager().getReceiverInfo(new ComponentName(context,CalendarSystemReceiver.class),PackageManager.GET_DISABLED_COMPONENTS).enabled);
    }
    @Test public void passiveSyncDoesNotEnableBackgroundLaunch() throws Exception {
        assertFalse(CalendarSystemReceiver.hasConsent(context));
        assertEquals(0,CalendarSystemReceiver.replace(context,payload(System.currentTimeMillis()+3600000)));
        assertFalse(enabled());
    }
    @Test public void optInWithFutureReminderEnablesRecoveryAndOptOutDisablesIt() throws Exception {
        CalendarSystemReceiver.setConsent(context,true);
        assertEquals(1,CalendarSystemReceiver.replace(context,payload(System.currentTimeMillis()+3600000)));
        assertTrue(enabled());
        CalendarSystemReceiver.setConsent(context,false);
        assertFalse(enabled());
        assertEquals(0,CalendarSystemReceiver.schedule(context));
        assertEquals(0,context.getSharedPreferences(CalendarSystemReceiver.PREFS,0).getInt("registeredCount",-1));
    }
    @Test public void noPendingReminderDoesNotEnableRecovery() throws Exception {
        CalendarSystemReceiver.setConsent(context,true);
        CalendarSystemReceiver.replace(context,new JSONObject().put("reminders",new JSONArray()));
        assertFalse(enabled());
    }
    @Test public void expiredQueueDisablesRecovery() throws Exception {
        CalendarSystemReceiver.setConsent(context,true);
        context.getSharedPreferences(CalendarSystemReceiver.PREFS,0).edit().putString("payload",payload(System.currentTimeMillis()-1000).toString()).commit();
        assertEquals(0,CalendarSystemReceiver.schedule(context));
        assertFalse(enabled());
    }
    @Test public void noDesktopWidgetDoesNotCreateRefreshAlarm(){
        HuangliWidgetProvider.updateAll(context);
        PendingIntent refresh=PendingIntent.getBroadcast(context,6101,new Intent(context,HuangliWidgetProvider.class)
            .setAction("com.yandao.guoxue.action.HUANGLI_AUTO_UPDATE"),PendingIntent.FLAG_NO_CREATE|PendingIntent.FLAG_IMMUTABLE);
        assertNull(refresh);
    }
}
