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
  String control="(()=>{const e=[...document.querySelectorAll('button,input[type=submit],[role=button]')].find(b=>[b.textContent?.trim(),b.innerText?.trim(),b.getAttribute('aria-label'),b.value].includes("+JSONObject.quote(label)+")&&!b.disabled&&b.getClientRects().length);if(!e)return false;e.scrollIntoView({block:'center'});e.click();return true})()";
  waitCondition(control,30,"Visible control missing: "+label);
 }
 private void navigateLink(String path)throws Exception{
  String target=JSONObject.quote(path);
  String expression="(()=>{const normal=s=>s.endsWith('/')&&s!=='/'?s.slice(0,-1):s;const e=[...document.querySelectorAll('a[href]')].find(a=>normal(new URL(a.href,location.href).pathname)==="+target+"&&!a.closest('footer[data-seo-only]'));if(!e)return false;e.scrollIntoView({block:'center'});e.click();return true})()";
  waitCondition(expression,20,"Public menu item missing: "+path);
  waitCondition("location.pathname===("+target+"+'/')||location.pathname==="+target,30,"Route missing: "+path);
 }
 private boolean capture(String id,String filename,String marker,String... buttons)throws Exception{
  try{
   if(!"/yixue".equals(js("location.pathname.replace(/\\/$/,'')"))){
    if(!"/".equals(js("location.pathname")))navigateLink("/");
    navigateLink("/yixue");
   }
   waitText("八字排盘",30);
   navigateLink("/yixue/"+id);
   if(id.equals("ziwei")&&"true".equals(js("!!document.querySelector('nav[aria-label=\"专业紫微盘快捷功能\"]')")))pressExact("快捷排盘");
   for(String button:buttons)pressExact(button);
   waitText(marker,45);
   js("window.scrollTo(0,0);true");
   shot(filename);
   return true;
  }catch(Exception|AssertionError failure){
   System.out.println("CHART_DIAG "+id+" "+js("JSON.stringify({path:location.pathname,lang:document.documentElement.lang,body:document.body.innerText.slice(0,420),buttons:[...document.querySelectorAll('button')].filter(x=>x.getClientRects().length).slice(0,22).map(x=>x.innerText.trim())})"));
   shot("FAILED_"+id);
   return false;
  }
 }
 @Test public void captureFourRealCharts()throws Exception{
  try(ActivityScenario<MainActivity> activity=ActivityScenario.launch(MainActivity.class)){
   scenario=activity;
   waitCondition("!!document.body&&document.body.innerText.length>10",80,"Native application did not render");
   js("localStorage.setItem('yandao_interface_locale','zh-CN');true");
   js("(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.innerText.trim()==='同意并继续');if(b)b.click();return true})()");
   waitText("首页",70);
   boolean all=capture("bazi","01_八字四柱","四柱","排盘");
   all &=capture("qimen","02_奇门九宫","九宫盘 · 点击宫位阅读","排盘");
   all &=capture("ziwei","03_紫微十二宫","命宫","排盘");
   all &=capture("liuyao","04_六爻本变卦","变卦","报数起卦","起卦");
   assertTrue("All four charts must render",all);
  }
 }
}
