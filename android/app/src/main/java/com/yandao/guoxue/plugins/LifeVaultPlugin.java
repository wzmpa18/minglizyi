package com.yandao.guoxue.plugins;

import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.util.Base64;
import android.content.Intent;
import android.app.Activity;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.concurrent.Executors;
import java.util.concurrent.ExecutorService;
import org.json.*;
import java.io.*;

/** Opaque AEAD envelopes only. No network, analytics, content logging or backup permission. */
@CapacitorPlugin(name="LifeVault")
public class LifeVaultPlugin extends Plugin {
 @Override public void load(){AndroidOfflineOcr.clearPdfTemps(getContext());}
 private SQLiteDatabase db;
 private byte[] exportBytes;
 private final ExecutorService ocrWorker=Executors.newSingleThreadExecutor();
 private synchronized SQLiteDatabase database(){
  if(db==null){File f=new File(getContext().getNoBackupFilesDir(),"life-vault-v1.sqlite");db=SQLiteDatabase.openOrCreateDatabase(f,null);db.execSQL("PRAGMA secure_delete=ON");db.execSQL("CREATE TABLE IF NOT EXISTS vault_items (k TEXT PRIMARY KEY NOT NULL, v TEXT NOT NULL)");}return db;
 }
 private String valid(String key)throws Exception{if(key==null||!key.matches("life:[a-zA-Z0-9:_-]{1,240}"))throw new Exception("invalid key");return key;}
 @PluginMethod public synchronized void commit(PluginCall call){
  SQLiteDatabase d=database();boolean begun=false;
  try{JSArray rows=call.getArray("rows");if(rows==null||rows.length()>20000)throw new Exception();d.beginTransaction();begun=true;
   JSObject expected=call.getObject("check");if(expected!=null){String wanted=expected.optString("etag",null),actual=null;try(Cursor c=d.rawQuery("SELECT v FROM vault_items WHERE k=?",new String[]{valid(expected.getString("key"))})){if(c.moveToFirst())actual=new JSONObject(c.getString(0)).optString("etag",null);}if(!java.util.Objects.equals(wanted,actual))throw new Exception("revision conflict");String deletion=expected.optString("deletePrefix","");if(!deletion.isEmpty()){if(!deletion.matches("life:[a-zA-Z0-9_-]{8,80}:"))throw new Exception();d.execSQL("DELETE FROM vault_items WHERE k>=? AND k<?",new Object[]{deletion,deletion+"\uffff"});}}

   for(int i=0;i<rows.length();i++){JSONObject r=rows.getJSONObject(i);String k=valid(r.getString("key"));if(r.isNull("value")){d.execSQL("DELETE FROM vault_items WHERE k=?",new Object[]{k});continue;}String v=r.get("value").toString();if(v.length()>2000000)throw new Exception();d.execSQL("INSERT OR REPLACE INTO vault_items(k,v) VALUES (?,?)",new Object[]{k,v});}
   d.setTransactionSuccessful();d.endTransaction();begun=false;call.resolve();
  }catch(Exception e){if(begun)d.endTransaction();call.reject("私人记录未写入，原数据保留");}
 }
 @PluginMethod public synchronized void read(PluginCall call){try(Cursor c=database().rawQuery("SELECT v FROM vault_items WHERE k=?",new String[]{valid(call.getString("key"))})){JSObject out=new JSObject();if(c.moveToFirst())out.put("value",new JSONTokener(c.getString(0)).nextValue());call.resolve(out);}catch(Exception e){call.reject("私人记录读取失败");}}
 @PluginMethod public synchronized void storageStatus(PluginCall call){try{File dir=getContext().getNoBackupFilesDir();android.os.StatFs stat=new android.os.StatFs(dir.getAbsolutePath());JSObject out=new JSObject();out.put("availableBytes",stat.getAvailableBytes());out.put("databaseBytes",new File(dir,"life-vault-v1.sqlite").length());call.resolve(out);}catch(Exception e){call.reject("当前设备未能读取剩余空间，未推测容量");}}
 @PluginMethod public synchronized void page(PluginCall call){try{String p=valid(call.getString("prefix")),after=call.getString("after","");int limit=Math.max(1,Math.min(1000,call.getInt("limit",100)));JSArray rows=new JSArray();try(Cursor c=database().rawQuery("SELECT k,v FROM vault_items WHERE k>=? AND k<? AND k>? ORDER BY k LIMIT ?",new String[]{p,p+"\uffff",after,String.valueOf(limit)})){while(c.moveToNext()){JSObject row=new JSObject();row.put("key",c.getString(0));row.put("value",new JSONTokener(c.getString(1)).nextValue());rows.put(row);}}JSObject out=new JSObject();out.put("rows",rows);call.resolve(out);}catch(Exception e){call.reject("私人记录索引读取失败");}}
 @PluginMethod public void ocr(PluginCall call){ocrWorker.execute(()->{
  try{String value=call.getString("base64","");if(value.length()>28000000)throw new Exception();call.resolve(AndroidOfflineOcr.recognize(getContext(),Base64.decode(value,Base64.DEFAULT),call.getString("type","image/png"),call.getInt("page",1)));}
  catch(Exception error){call.reject("离线识字未完成，请保留原件手动核对；未调用云端。支持20MiB以内图片或逐页PDF；加密PDF请先用本人阅读器处理。");}
  catch(OutOfMemoryError error){call.reject("本机内存不足，已停止识字，原件保留；请选择较小的副本");}
 });}
 @PluginMethod public void previewPdfPage(PluginCall call){ocrWorker.execute(()->{try{String value=call.getString("base64","");if(value.length()>28000000)throw new Exception();AndroidOfflineOcr.PdfImage image=AndroidOfflineOcr.pdfImage(getContext(),Base64.decode(value,Base64.DEFAULT),call.getInt("page",1));try{ByteArrayOutputStream bytes=new ByteArrayOutputStream();image.bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG,100,bytes);JSObject result=new JSObject();result.put("base64",Base64.encodeToString(bytes.toByteArray(),Base64.NO_WRAP));result.put("totalPages",image.pages);call.resolve(result);}finally{image.bitmap.recycle();}}catch(Exception|OutOfMemoryError error){call.reject("本机PDF页预览未完成，原文件仍保留；未使用远程查看器");}});}
 @PluginMethod public void renderPdf(PluginCall call){ocrWorker.execute(()->{
  android.graphics.pdf.PdfDocument pdf=new android.graphics.pdf.PdfDocument();
  try{String text=call.getString("text","");if(text.length()>2000000)throw new Exception();android.graphics.Paint paint=new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);paint.setColor(android.graphics.Color.BLACK);paint.setTextSize(12);android.graphics.Paint.FontMetrics fm=paint.getFontMetrics();float lineHeight=18,y=40-fm.ascent;int pageNo=1;
   android.graphics.pdf.PdfDocument.Page page=pdf.startPage(new android.graphics.pdf.PdfDocument.PageInfo.Builder(595,842,pageNo).create());
   for(String paragraph:text.split("\\r?\\n",-1)){int offset=0;do{if(y>802){pdf.finishPage(page);page=pdf.startPage(new android.graphics.pdf.PdfDocument.PageInfo.Builder(595,842,++pageNo).create());y=40-fm.ascent;}int count=paragraph.isEmpty()?0:paint.breakText(paragraph,offset,paragraph.length(),true,515,null);if(!paragraph.isEmpty()&&count<1)throw new Exception();if(count>0)page.getCanvas().drawText(paragraph,offset,offset+count,40,y,paint);offset+=count;y+=lineHeight;}while(offset<paragraph.length());}
   pdf.finishPage(page);java.io.ByteArrayOutputStream bytes=new java.io.ByteArrayOutputStream();pdf.writeTo(bytes);JSObject result=new JSObject();result.put("base64",Base64.encodeToString(bytes.toByteArray(),Base64.NO_WRAP));call.resolve(result);
  }catch(Exception|OutOfMemoryError e){call.reject("本机PDF未生成，请按日期分批导出；原记录保留");}finally{pdf.close();}
 });}
 @PluginMethod public void saveDocument(PluginCall call){
  if(exportBytes!=null){call.reject("已有系统保存窗口，请先完成或取消");return;}
  try{exportBytes=Base64.decode(call.getString("base64",""),Base64.DEFAULT);Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType(call.getString("type","application/octet-stream").split(";")[0]);String name=call.getString("name","言道资料.bin").replaceAll("[\\\\/\\p{Cntrl}]","_");intent.putExtra(Intent.EXTRA_TITLE,name);startActivityForResult(call,intent,"documentSaved");}catch(Exception e){exportBytes=null;call.reject("无法打开系统保存窗口，请重试");}
 }
 @ActivityCallback private void documentSaved(PluginCall call,ActivityResult result){
  try{if(call==null)return;boolean saved=false;if(result.getResultCode()==Activity.RESULT_OK&&result.getData()!=null&&result.getData().getData()!=null&&exportBytes!=null){try(OutputStream out=getContext().getContentResolver().openOutputStream(result.getData().getData(),"w")){if(out==null)throw new Exception();out.write(exportBytes);out.flush();saved=true;}}JSObject response=new JSObject();response.put("saved",saved);call.resolve(response);}catch(Exception e){if(call!=null)call.reject("系统保存未完成，未记录备份成功");}finally{if(exportBytes!=null)java.util.Arrays.fill(exportBytes,(byte)0);exportBytes=null;}
 }
}
