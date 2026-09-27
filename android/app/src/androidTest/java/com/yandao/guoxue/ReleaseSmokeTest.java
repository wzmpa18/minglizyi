package com.yandao.guoxue;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.core.app.ActivityScenario;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONTokener;

@RunWith(AndroidJUnit4.class)
public class ReleaseSmokeTest {
 private String js(ActivityScenario<MainActivity> s,String code) throws Exception {
  CountDownLatch latch=new CountDownLatch(1);AtomicReference<String> value=new AtomicReference<>("");
  s.onActivity(a->a.getBridge().getWebView().evaluateJavascript(code,r->{value.set(r);latch.countDown();}));
  assertTrue("WebView callback",latch.await(10,TimeUnit.SECONDS));
  Object result=new JSONTokener(value.get()).nextValue();return String.valueOf(result);
 }
 private void waitFor(ActivityScenario<MainActivity> s,String condition) throws Exception {
  long end=System.currentTimeMillis()+30000;
  while(System.currentTimeMillis()<end){if("true".equals(js(s,condition)))return;Thread.sleep(150);}
  fail("Timed out: "+condition);
 }
 @Test public void membershipAndNativePersistence() throws Exception {
  long id;
  try(ActivityScenario<MainActivity> s=ActivityScenario.launch(MainActivity.class)){
   s.onActivity(a->assertNotNull("PaipanStore registered before bridge creation",a.getBridge().getPlugin("PaipanStore")));
   waitFor(s,"!!document.querySelector('a[href=\"/profile\"],a[href=\"/profile/\"]')");
   js(s,"document.querySelector('a[href=\"/profile\"],a[href=\"/profile/\"]').click()");
   waitFor(s,"!!document.querySelector('a[href=\"/membership/\"]')");
   js(s,"document.querySelector('a[href=\"/membership/\"]').click()");
   waitFor(s,"location.pathname==='/membership/' && document.body.innerText.includes('会员中心')");
   js(s,"window.__qaDone=false;window.Capacitor.nativePromise('PaipanStore','saveRecord',{tool:'__release_smoke__',title:'temporary automated check',input:{year:1990,month:5,day:20,hour:14,minute:37},result:{verified:true}}).then(r=>{window.__qaId=r.id;window.__qaDone=true}).catch(e=>{window.__qaError=e.message;window.__qaDone=true})");
   waitFor(s,"window.__qaDone===true");
   assertEquals("true",js(s,"typeof window.__qaError === 'undefined'"));
   id=Long.parseLong(js(s,"String(window.__qaId)"));assertTrue(id>0);
  }
  try(ActivityScenario<MainActivity> s=ActivityScenario.launch(MainActivity.class)){
   waitFor(s,"!!window.Capacitor && !!window.Capacitor.nativePromise");
   js(s,"window.__qaDone=false;window.Capacitor.nativePromise('PaipanStore','getRecord',{id:"+id+"}).then(r=>{window.__qaOk=!!r.record && r.record.input.minute===37 && r.record.result.verified===true;window.__qaDone=true}).catch(e=>{window.__qaError=e.message;window.__qaDone=true})");
   waitFor(s,"window.__qaDone===true");assertEquals("true",js(s,"window.__qaOk"));
   js(s,"window.__qaDeleted=false;(async()=>{await window.Capacitor.nativePromise('PaipanStore','deleteRecord',{id:"+id+"});const rs=await window.Capacitor.nativePromise('PaipanStore','listRecords',{tool:'__release_smoke__'});for(const r of (rs.records||[])){await window.Capacitor.nativePromise('PaipanStore','deleteRecord',{id:r.id});}window.__qaDeleted=true})()");
   waitFor(s,"window.__qaDeleted===true");
  }
 }
 @Test public void durableOfflineFiles() throws Exception {
  try(ActivityScenario<MainActivity> s=ActivityScenario.launch(MainActivity.class)){
   s.onActivity(a->assertNotNull("OfflineFiles registered",a.getBridge().getPlugin("OfflineFiles")));
   waitFor(s,"!!window.Capacitor && !!window.Capacitor.nativePromise");
   js(s,"window.__fileDone=false;window.Capacitor.nativePromise('OfflineFiles','write',{key:'__release_smoke_file__',value:JSON.stringify({chapter:'离线测试',saved:true})}).then(()=>window.__fileDone=true)");
   waitFor(s,"window.__fileDone===true");
   s.onActivity(a->{java.io.File dir=new java.io.File(a.getFilesDir(),"offline-learning");assertTrue("Permanent files directory exists",dir.isDirectory());assertFalse("Not cache directory",dir.getAbsolutePath().startsWith(a.getCacheDir().getAbsolutePath()));});
  }
  try(ActivityScenario<MainActivity> s=ActivityScenario.launch(MainActivity.class)){
   waitFor(s,"!!window.Capacitor && !!window.Capacitor.nativePromise");
   js(s,"window.__fileDone=false;(async()=>{const r=await window.Capacitor.nativePromise('OfflineFiles','read',{key:'__release_smoke_file__'});window.__fileOk=JSON.parse(r.value).saved===true;await window.Capacitor.nativePromise('OfflineFiles','remove',{key:'__release_smoke_file__'});window.__fileDone=true})()");
   waitFor(s,"window.__fileDone===true");assertEquals("true",js(s,"window.__fileOk"));
  }
 }
 @Test public void paymentPreflight() throws Exception {
  org.junit.Assume.assumeTrue("Explicit opt-in for non-paying live order", "true".equals(androidx.test.platform.app.InstrumentationRegistry.getArguments().getString("paymentPreflight")));
  try(ActivityScenario<MainActivity> s=ActivityScenario.launch(MainActivity.class)){
   waitFor(s,"document.readyState === 'complete'");
   js(s,"window.__payDone=false;(async()=>{let orderId;try{const p=JSON.parse(localStorage.getItem('yandao_user_profile')||'{}');if(!p.userId)throw Error('No signed-in user');const post=async(path,body)=>(await fetch('/api/payment/'+path,{method:'POST',headers:{'Content-Type':'application/json','X-Client-Platform':'android'},body:JSON.stringify(body)})).json();const r=await post('create',{userId:String(p.userId),type:'MEMBERSHIP',amount:37,channel:'wechat',extra:{membershipLevel:'monthly',membershipDays:30}});orderId=r.data?.orderId;if(!r.success||!orderId||!r.data.codeUrl)throw Error(r.message||'No payment QR');window.__payQr=true;const q=await post('query',{orderId});window.__payQuery=q.success===true;}catch(e){window.__payError=e.message;}finally{if(orderId){try{const c=await(await fetch('/api/payment/close',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({orderId,channel:'wechat'})})).json();window.__payClosed=c.success===true;}catch(e){window.__payError=e.message;}}window.__payDone=true;}})()");
   waitFor(s,"window.__payDone===true");
   assertEquals("Payment preflight: "+js(s,"window.__payError||''"),"true",js(s,"window.__payQr===true && window.__payQuery===true && window.__payClosed===true"));
  }
 }
}
