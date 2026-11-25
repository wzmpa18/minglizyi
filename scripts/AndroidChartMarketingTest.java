package com.yandao.guoxue;

import android.graphics.Bitmap;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.json.JSONObject;
import org.json.JSONTokener;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.Assert.*;

/** Real pinned native WebView and server-authorized content; no mock UI or rights. */
@RunWith(AndroidJUnit4.class)
public class AndroidChartMarketingTest {
 private ActivityScenario<MainActivity> scenario;
 private String js(String code)throws Exception{
  CountDownLatch done=new CountDownLatch(1);AtomicReference<String> value=new AtomicReference<>("null");
  scenario.onActivity(a->a.getBridge().getWebView().evaluateJavascript(code,r->{value.set(r);done.countDown();}));
  boolean responded=done.await(45,TimeUnit.SECONDS);
  if(!responded)shot("FAILED_WebViewCallback");
  assertTrue("Actual WebView response",responded);
  Object decoded=new JSONTokener(value.get()).nextValue();return decoded==JSONObject.NULL?"":String.valueOf(decoded);
 }
 private void waitText(String text,int seconds)throws Exception{
  long end=System.currentTimeMillis()+seconds*1000L;
  do{if("true".equals(js("document.body.innerText.includes("+JSONObject.quote(text)+")")))return;Thread.sleep(500);}while(System.currentTimeMillis()<end);
  shot("FAILED_"+text.replaceAll("[^\\p{L}\\p{N}]","_"));
  fail("Actual page did not show required learning control: "+text);
 }
 private void route(String route,String ready,int seconds)throws Exception{
  String navigated=js("(()=>{const target="+JSONObject.quote(route)+".replace(/\\/$/,'');const e=[...document.querySelectorAll('a[href]')].find(e=>new URL(e.href,location.href).pathname.replace(/\\/$/,'')===target);if(e){e.click();return 'LINK'}return 'MISSING'})()");
  if(!"LINK".equals(navigated))js("setTimeout(()=>{window.location.href="+JSONObject.quote(route)+"},100);true");
  waitText(ready,seconds);
 }
 private void waitCondition(String expression,int seconds,String label)throws Exception{
  long end=System.currentTimeMillis()+seconds*1000L;
  do{if("true".equals(js(expression)))return;Thread.sleep(500);}while(System.currentTimeMillis()<end);
  fail(label);
 }
 private void click(String text)throws Exception{
  String result=js("(()=>{const e=[...document.querySelectorAll('button,a')].find(e=>e.innerText.trim().includes("+JSONObject.quote(text)+"));if(!e||e.disabled)return 'MISSING';e.scrollIntoView({block:'center'});e.click();return 'CLICKED'})()");
  assertEquals("Actual public control: "+text,"CLICKED",result);
 }
 private void shot(String name)throws Exception{
  Thread.sleep(1500);
  Bitmap bitmap=InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();assertNotNull(bitmap);
  assertEquals(1080,bitmap.getWidth());assertEquals(1920,bitmap.getHeight());
  File dir=new File(InstrumentationRegistry.getInstrumentation().getTargetContext().getExternalFilesDir(null),"learning-marketing");assertTrue(dir.isDirectory()||dir.mkdirs());
  try(OutputStream out=new FileOutputStream(new File(dir,name+".png"))){assertTrue(bitmap.compress(Bitmap.CompressFormat.PNG,100,out));}
  bitmap.recycle();
  // Gradle uninstalls test applications on exit; preserve only public PNGs in
  // a shell-owned shared directory before that cleanup removes app files.
  try(android.os.ParcelFileDescriptor fd=InstrumentationRegistry.getInstrumentation().getUiAutomation().executeShellCommand("mkdir -p /sdcard/Download/yandao-learning-marketing; cp '"+new File(dir,name+".png").getAbsolutePath()+"' '/sdcard/Download/yandao-learning-marketing/"+name+".png'")){
   try(InputStream in=new android.os.ParcelFileDescriptor.AutoCloseInputStream(fd)){while(in.read()!=-1){}}
  }
 }

 private void pressExact(String label)throws Exception{
  String control="(()=>{const e=[...document.querySelectorAll('button')].find(b=>b.innerText.trim()==="+JSONObject.quote(label)+"&&!b.disabled&&b.getClientRects().length);if(!e)return false;e.scrollIntoView({block:'center'});e.click();return true})()";
  waitCondition(control,40,"Visible control missing: "+label);
 }
 private void openChart(String id)throws Exception{
  String path="/yixue/"+id+"/";
  js("setTimeout(()=>location.assign("+JSONObject.quote(path)+"),100);true");
  waitCondition("location.pathname.replace(/\\/$/,'')==="+JSONObject.quote(path.substring(0,path.length()-1))+"&&document.body.innerText.length>100",70,"Chart route missing: "+id);
 }
 private void captureBoard(String name,String marker)throws Exception{
  waitText(marker,45);
  js("window.scrollTo(0,0);true");
  shot(name);
 }
 @Test public void captureFourRealCharts()throws Exception{
  try(ActivityScenario<MainActivity> activity=ActivityScenario.launch(MainActivity.class)){
   scenario=activity;
   waitCondition("!!document.body&&document.body.innerText.length>10",80,"Native application did not render");
   js("(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.innerText.trim()==='同意并继续');if(b)b.click();return true})()");
   waitText("首页",70);
   openChart("bazi");pressExact("排盘");captureBoard("01_八字四柱","四柱");
   openChart("qimen");pressExact("排盘");captureBoard("02_奇门九宫","九宫盘 · 点击宫位阅读");
   openChart("ziwei");pressExact("排盘");captureBoard("03_紫微十二宫","命宫");
   openChart("liuyao");pressExact("报数起卦");pressExact("起卦");captureBoard("04_六爻本变卦","变卦");
  }
 }
}
