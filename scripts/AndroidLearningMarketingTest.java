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
  assertTrue("Actual WebView response",done.await(15,TimeUnit.SECONDS));
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
  if(!"LINK".equals(navigated))js("window.location.href="+JSONObject.quote(route));
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
 }
 @Test public void captureActualLatestLearningFeatures()throws Exception{
  byte[] raw;try(InputStream in=InstrumentationRegistry.getInstrumentation().getContext().getAssets().open("marketing-session.json");ByteArrayOutputStream out=new ByteArrayOutputStream()){
   byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1)out.write(b,0,n);raw=out.toByteArray();
  }
  String storage=new String(raw,StandardCharsets.UTF_8);
  try(ActivityScenario<MainActivity> activity=ActivityScenario.launch(MainActivity.class)){
   scenario=activity;long until=System.currentTimeMillis()+90000;
   while(System.currentTimeMillis()<until){try{if("true".equals(js("!!document.body&&document.body.innerText.length>20")))break;}catch(Exception ignored){}Thread.sleep(500);}
   js("(()=>{const s="+storage+";for(const k of Object.keys(s))localStorage.setItem(k,s[k]);location.reload();return true})()");
   // The real first-launch privacy gate intentionally mounts before navigation.
   // Accept its visible control rather than assuming the home navigation exists.
   long consentUntil=System.currentTimeMillis()+90000;
   while(System.currentTimeMillis()<consentUntil){
    if("true".equals(js("document.body.innerText.includes('首页')")))break;
    js("(()=>{const e=[...document.querySelectorAll('button')].find(e=>e.innerText.trim()==='同意并继续');if(e)e.click();return true})()");
    Thread.sleep(500);
   }
   waitText("首页",30);
   route("/zhongyi/","倪师自学专区",90);js("window.scrollTo(0,0)");shot("03_中医学习_Android实际界面");
   route("/zhongyi/ni-study/","保存完整中医资料",90);click("保存完整中医资料");waitText("中医资料已保存，可离线阅读。",900);
   click("人纪·针灸教程");waitText("摘录并批注",90);js("window.scrollTo(0,0)");shot("02_课程笔记_Android实际界面");
   route("/zhongyi/anatomy3d/","恢复完整体表与全身视角",180);waitText("拖动旋转",180);click("恢复完整体表与全身视角");
   assertEquals("true",js("!!document.querySelector('canvas')&&document.querySelector('canvas').width>0"));Thread.sleep(3000);shot("01_三维人体_Android实际界面");
   route("/zhongyi/","典籍原文",90);click("典籍原文");waitText("黄帝内经·素问原文",90);click("黄帝内经·素问原文");waitText("上古天真",90);click("上古天真");waitText("展开章节目录",90);shot("04_经典原文_Android实际界面");
   route("/discover/","同辰雅集",90);waitText("携盘交流",90);
   js("(()=>{const e=[...document.querySelectorAll('a,button,p,h2,h3,span')].find(e=>e.innerText.trim()==='同辰雅集');if(e)e.scrollIntoView({block:'center'});return true})()");shot("05_同辰交流_Android实际界面");
   route("/zhongyi/ai/","如何阅读《黄帝内经》的篇章结构？",90);click("如何阅读《黄帝内经》的篇章结构？");click("发送");
   waitCondition("document.querySelectorAll('div.bg-muted').length>=2&&[...document.querySelectorAll('button')].some(e=>e.innerText.trim()==='发送'&&!e.disabled)",120,"The normal account must receive an actual AI learning response");
   String answer=js("[...document.querySelectorAll('div.bg-muted')].at(-1).innerText");
   assertTrue("Actual AI learning content",answer.length()>120);assertFalse(answer.contains("暂时无法核对账号权益"));assertFalse(answer.contains("AI服务暂时不可用"));
   js("[...document.querySelectorAll('div.bg-muted')].at(-1).scrollIntoView({block:'start'})");shot("06_AI显式标识_公开文献学习题_实际响应");
   route("/profile/","退出登录",90);click("退出登录");waitText("确认退出登录？",30);
   assertEquals("CLICKED",js("(()=>{const e=[...document.querySelectorAll('button')].find(e=>e.innerText.trim()==='退出');if(!e)return 'MISSING';e.click();return 'CLICKED'})()"));
   waitCondition("!localStorage.getItem('yandao_user_token')&&!localStorage.getItem('yandao_user_profile')",30,"Ordinary logout must clear the local session immediately");
   File dir=new File(InstrumentationRegistry.getInstrumentation().getTargetContext().getExternalFilesDir(null),"learning-marketing");
   try(OutputStream out=new FileOutputStream(new File(dir,"native-checks.json"))){out.write("{\"normalAccountAiResponse\":true,\"logoutClearedLocalSession\":true,\"physicalDevice\":false,\"syntheticInterface\":false}".getBytes(StandardCharsets.UTF_8));}
  }
 }
}
