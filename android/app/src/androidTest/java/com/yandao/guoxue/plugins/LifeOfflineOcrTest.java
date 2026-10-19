package com.yandao.guoxue.plugins;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;
import android.content.Context;
import android.content.pm.PackageManager;
import com.getcapacitor.JSObject;
import org.json.*;
import java.io.*;
@RunWith(AndroidJUnit4.class)
public class LifeOfflineOcrTest {
 @Test public void bundledChineseEngineRunsWithoutGmsAndPreservesOriginal()throws Exception{
  Context app=InstrumentationRegistry.getInstrumentation().getTargetContext(),test=InstrumentationRegistry.getInstrumentation().getContext();boolean gms=false;try{app.getPackageManager().getPackageInfo("com.google.android.gms",0);gms=true;}catch(PackageManager.NameNotFoundException expected){}assertFalse("Use an AOSP image without GMS",gms);assertEquals("Airplane mode must be enabled for this test",1,android.provider.Settings.Global.getInt(app.getContentResolver(),android.provider.Settings.Global.AIRPLANE_MODE_ON,0));
  byte[] source;try(InputStream in=test.getAssets().open("life-ocr-synthetic.png");ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] buf=new byte[8192];int n;while((n=in.read(buf))!=-1)out.write(buf,0,n);source=out.toByteArray();}byte[] before=source.clone();long started=android.os.SystemClock.elapsedRealtime();JSObject result=AndroidOfflineOcr.recognize(app,source);assertArrayEquals(before,source);assertFalse(result.getBoolean("confirmed"));JSONArray blocks=result.getJSONArray("blocks");assertTrue("Actual native engine must produce text",blocks.length()>0);StringBuilder text=new StringBuilder();for(int i=0;i<blocks.length();i++){JSONObject line=blocks.getJSONObject(i);assertEquals(1,line.getInt("page"));assertEquals(4,line.getJSONArray("box").length());text.append(line.getString("text")).append('\n');}
  assertTrue("Decimal and negation are safety-critical fixture checks",text.toString().contains("0.5"));assertTrue(text.toString().contains("5.0"));assertTrue(text.toString().contains("不能"));assertTrue(text.toString().contains("左"));assertTrue(text.toString().contains("右"));
  result.put("elapsedMs",android.os.SystemClock.elapsedRealtime()-started);result.put("noGms",true);result.put("fixtureOnly",true);result.put("physicalDevice",false);try(OutputStream out=new FileOutputStream(new File(app.getExternalFilesDir(null),"qa-ocr-synthetic.json"))){out.write(result.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8));}
 }
 @Test public void invalidImageCannotBecomeConfirmedMedicalText()throws Exception{
  boolean refused=false;try{AndroidOfflineOcr.recognize(InstrumentationRegistry.getInstrumentation().getTargetContext(),new byte[]{1,2,3});}catch(Exception e){refused=true;}assertTrue(refused);
 }
}
