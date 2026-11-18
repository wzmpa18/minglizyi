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
public class AndroidLearningMarketingTest {
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
 @Test public void captureActualLatestLearningFeatures()throws Exception{
  byte[] raw;try(InputStream in=InstrumentationRegistry.getInstrumentation().getContext().getAssets().open("marketing-session.json");ByteArrayOutputStream out=new ByteArrayOutputStream()){
   byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1)out.write(b,0,n);raw=out.toByteArray();
  }
  String storage=new String(raw,StandardCharsets.UTF_8);
  try(ActivityScenario<MainActivity> activity=ActivityScenario.launch(MainActivity.class)){
   scenario=activity;long until=System.currentTimeMillis()+90000;
   while(System.currentTimeMillis()<until){try{if("true".equals(js("!!document.body&&document.body.innerText.length>20")))break;}catch(Exception ignored){}Thread.sleep(500);}
   js("(()=>{const s="+storage+";for(const k of Object.keys(s))localStorage.setItem(k,s[k]);setTimeout(()=>location.reload(),100);return true})()");
   // The real first-launch privacy gate intentionally mounts before navigation.
   // Accept its visible control rather than assuming the home navigation exists.
   long consentUntil=System.currentTimeMillis()+90000;
   while(System.currentTimeMillis()<consentUntil){
    if("true".equals(js("document.body.innerText.includes('首页')")))break;
    js("(()=>{const e=[...document.querySelectorAll('button')].find(e=>e.innerText.trim()==='同意并继续');if(e)e.click();return true})()");
    Thread.sleep(500);
   }
   waitText("易学排盘",30);shot("00_baidu_home");
   route("/yixue/","八字排盘",75);
   js("(()=>{const e=[...document.querySelectorAll('a')].find(e=>e.innerText.trim()==='八字排盘');if(e)e.scrollIntoView({block:'center'});return true})()");
   shot("01_baidu_chart_tools");
   route("/zhongyi/","倪师自学专区",90);js("window.scrollTo(0,0)");shot("02_baidu_tcm_home");
   route("/zhongyi/classic/","黄帝内经",75);js("window.scrollTo(0,0)");shot("03_baidu_medical_classics");
   route("/zhongyi/ai/","如何阅读《黄帝内经》的篇章结构？",90);
   click("如何阅读《黄帝内经》的篇章结构？");click("发送");
   waitCondition("document.querySelectorAll('div.bg-muted').length>=2&&[...document.querySelectorAll('button')].some(e=>e.innerText.trim()==='发送'&&!e.disabled)",120,"A real AI answer must be available");
   String answer=js("[...document.querySelectorAll('div.bg-muted')].at(-1).innerText");
   assertTrue("Actual learning answer",answer.length()>120&&!answer.contains("暂时无法核对账号权益")&&!answer.contains("AI服务暂时不可用"));
   waitText("AI生成",30);
   js("[...document.querySelectorAll('div.bg-muted')].at(-1).scrollIntoView({block:'start'})");
   shot("04_baidu_ai_text_label");
  }
 }
}
