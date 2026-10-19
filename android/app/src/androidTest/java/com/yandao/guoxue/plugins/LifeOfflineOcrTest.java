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
 @Test public void nativeCapacityBridgeReturnsActualDeviceFreeSpaceOffline()throws Exception{
  try(androidx.test.core.app.ActivityScenario<com.yandao.guoxue.MainActivity> scenario=androidx.test.core.app.ActivityScenario.launch(com.yandao.guoxue.MainActivity.class)){
   long until=System.currentTimeMillis()+30000;String response="";
   for(boolean requested=false;System.currentTimeMillis()<until;){
    java.util.concurrent.CountDownLatch done=new java.util.concurrent.CountDownLatch(1);java.util.concurrent.atomic.AtomicReference<String> result=new java.util.concurrent.atomic.AtomicReference<>("");
    final boolean start=!requested;scenario.onActivity(activity->activity.getBridge().getWebView().evaluateJavascript(start?"(()=>{if(!window.Capacitor||!window.Capacitor.nativePromise)return 'WAIT';window.Capacitor.nativePromise('LifeVault','storageStatus',{}).then(r=>window.__qaPrivateCapacity=JSON.stringify(r)).catch(()=>window.__qaPrivateCapacity='ERROR');return 'REQUESTED';})()":"window.__qaPrivateCapacity||'WAIT'",value->{result.set(value);done.countDown();}));assertTrue(done.await(10,java.util.concurrent.TimeUnit.SECONDS));
    response=String.valueOf(new org.json.JSONTokener(result.get()).nextValue());if(response.equals("REQUESTED"))requested=true;else if(response.startsWith("{"))break;else assertNotEquals("ERROR",response);Thread.sleep(100);
   }
   JSONObject value=new JSONObject(response);assertTrue(value.getLong("availableBytes")>0);assertTrue(value.getLong("databaseBytes")>=0);value.put("physicalDevice",false);value.put("nativeBridge",true);value.put("airplaneMode",android.provider.Settings.Global.getInt(InstrumentationRegistry.getInstrumentation().getTargetContext().getContentResolver(),android.provider.Settings.Global.AIRPLANE_MODE_ON,0));assertEquals(1,value.getInt("airplaneMode"));android.util.Log.i("YandaoVaultProof",value.toString());
  }
 }
 @Test public void bundledChineseEngineRunsWithoutGmsAndPreservesOriginal()throws Exception{
  Context app=InstrumentationRegistry.getInstrumentation().getTargetContext(),test=InstrumentationRegistry.getInstrumentation().getContext();boolean gms=false;try{app.getPackageManager().getPackageInfo("com.google.android.gms",0);gms=true;}catch(PackageManager.NameNotFoundException expected){}assertFalse("Use an AOSP image without GMS",gms);assertEquals("Airplane mode must be enabled for this test",1,android.provider.Settings.Global.getInt(app.getContentResolver(),android.provider.Settings.Global.AIRPLANE_MODE_ON,0));
  byte[] source;try(InputStream in=test.getAssets().open("life-ocr-synthetic.png");ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] buf=new byte[8192];int n;while((n=in.read(buf))!=-1)out.write(buf,0,n);source=out.toByteArray();}byte[] before=source.clone();long started=android.os.SystemClock.elapsedRealtime();JSObject result=AndroidOfflineOcr.recognize(app,source);assertArrayEquals(before,source);assertFalse(result.getBoolean("confirmed"));JSONArray blocks=result.getJSONArray("blocks");assertTrue("Actual native engine must produce text",blocks.length()>0);StringBuilder text=new StringBuilder();for(int i=0;i<blocks.length();i++){JSONObject line=blocks.getJSONObject(i);assertEquals(1,line.getInt("page"));assertEquals(4,line.getJSONArray("box").length());text.append(line.getString("text")).append('\n');}
  assertTrue("Decimal and negation are safety-critical fixture checks",text.toString().contains("0.5"));assertTrue(text.toString().contains("5.0"));assertTrue(text.toString().contains("不能"));assertTrue(text.toString().contains("左"));assertTrue(text.toString().contains("右"));
  result.put("elapsedMs",android.os.SystemClock.elapsedRealtime()-started);result.put("noGms",true);result.put("fixtureOnly",true);result.put("physicalDevice",false);android.util.Log.i("YandaoOcrProof",result.toString());try(OutputStream out=new FileOutputStream(new File(app.getExternalFilesDir(null),"qa-ocr-synthetic.json"))){out.write(result.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8));}
 }
 @Test public void selectedPdfPageRunsOfflineAndLeavesNoDecryptedTemporaryFile()throws Exception{
  android.graphics.pdf.PdfDocument pdf=new android.graphics.pdf.PdfDocument();android.graphics.Paint paint=new android.graphics.Paint();paint.setTextSize(30);paint.setColor(android.graphics.Color.BLACK);
  for(int i=1;i<=2;i++){android.graphics.pdf.PdfDocument.Page page=pdf.startPage(new android.graphics.pdf.PdfDocument.PageInfo.Builder(600,800,i).create());page.getCanvas().drawColor(android.graphics.Color.WHITE);page.getCanvas().drawText(i==1?"FIRST PAGE ONLY":"SECOND PAGE 0.5 mg",30,100,paint);pdf.finishPage(page);}ByteArrayOutputStream output=new ByteArrayOutputStream();pdf.writeTo(output);pdf.close();Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();JSObject result=AndroidOfflineOcr.recognize(context,output.toByteArray(),"application/pdf",2);assertEquals(2,result.getInt("totalPages"));assertFalse(result.getBoolean("confirmed"));String text=result.getJSONArray("blocks").toString();assertTrue(text.contains("0.5"));assertFalse(text.contains("FIRST"));for(int i=0;i<result.getJSONArray("blocks").length();i++)assertEquals(2,result.getJSONArray("blocks").getJSONObject(i).getInt("page"));File[] leftovers=new File(context.getNoBackupFilesDir(),"life-rendering-v1").listFiles();assertTrue(leftovers==null||leftovers.length==0);result.put("fixtureOnly",true);result.put("physicalDevice",false);android.util.Log.i("YandaoOcrProof",result.toString());
 }
 @Test public void damagedDerivedModelIsRepairedFromBundledAsset()throws Exception{
  Context context=InstrumentationRegistry.getInstrumentation().getTargetContext(),test=InstrumentationRegistry.getInstrumentation().getContext();File directory=new File(context.getNoBackupFilesDir(),"life-ocr-v1/tessdata");assertTrue(directory.isDirectory()||directory.mkdirs());File model=new File(directory,"chi_sim.traineddata");try(FileOutputStream out=new FileOutputStream(model)){out.write(new byte[]{1,2,3});}
  byte[] original;try(InputStream in=test.getAssets().open("life-ocr-synthetic.png");ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] buffer=new byte[8192];int n;while((n=in.read(buffer))!=-1)out.write(buffer,0,n);original=out.toByteArray();}byte[] before=original.clone();JSObject result=AndroidOfflineOcr.recognize(context,original);assertArrayEquals(before,original);assertFalse(result.getBoolean("confirmed"));assertTrue(result.getJSONArray("blocks").length()>0);assertTrue("Verified full bundled model must replace damaged cache",model.length()>1000000);assertFalse(new File(directory,"chi_sim.pending").exists());result.put("fixtureOnly",true);result.put("modelCacheRepaired",true);result.put("physicalDevice",false);android.util.Log.i("YandaoOcrProof",result.toString());
 }
 @Test public void invalidImageCannotBecomeConfirmedMedicalText()throws Exception{
  boolean refused=false;try{AndroidOfflineOcr.recognize(InstrumentationRegistry.getInstrumentation().getTargetContext(),new byte[]{1,2,3});}catch(Exception e){refused=true;}assertTrue(refused);
 }
}
