package com.yandao.guoxue.plugins;

import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.graphics.BitmapFactory;
import android.graphics.Bitmap;
import android.media.ExifInterface;
import android.util.Base64;
import android.content.Intent;
import android.app.Activity;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.chinese.ChineseTextRecognizerOptions;
import org.json.*;
import java.io.*;

/** Opaque AEAD envelopes only. No network, analytics, content logging or backup permission. */
@CapacitorPlugin(name="LifeVault")
public class LifeVaultPlugin extends Plugin {
 private SQLiteDatabase db;
 private byte[] exportBytes;
 private synchronized SQLiteDatabase database(){
  if(db==null){File f=new File(getContext().getNoBackupFilesDir(),"life-vault-v1.sqlite");db=SQLiteDatabase.openOrCreateDatabase(f,null);db.execSQL("PRAGMA secure_delete=ON");db.execSQL("CREATE TABLE IF NOT EXISTS vault_items (k TEXT PRIMARY KEY NOT NULL, v TEXT NOT NULL)");}return db;
 }
 private String valid(String key)throws Exception{if(key==null||!key.matches("life:[a-zA-Z0-9:_-]{1,240}"))throw new Exception("invalid key");return key;}
 @PluginMethod public synchronized void commit(PluginCall call){
  SQLiteDatabase d=database();boolean begun=false;
  try{JSArray rows=call.getArray("rows");if(rows==null||rows.length()>200)throw new Exception();d.beginTransaction();begun=true;
   JSObject expected=call.getObject("check");if(expected!=null){String wanted=expected.optString("etag",null),actual=null;try(Cursor c=d.rawQuery("SELECT v FROM vault_items WHERE k=?",new String[]{valid(expected.getString("key"))})){if(c.moveToFirst())actual=new JSONObject(c.getString(0)).optString("etag",null);}if(!java.util.Objects.equals(wanted,actual))throw new Exception("revision conflict");}

   for(int i=0;i<rows.length();i++){JSONObject r=rows.getJSONObject(i);String k=valid(r.getString("key")),v=r.get("value").toString();if(v.length()>2000000)throw new Exception();d.execSQL("INSERT OR REPLACE INTO vault_items(k,v) VALUES (?,?)",new Object[]{k,v});}
   d.setTransactionSuccessful();d.endTransaction();begun=false;call.resolve();
  }catch(Exception e){if(begun)d.endTransaction();call.reject("私人记录未写入，原数据保留");}
 }
 @PluginMethod public synchronized void read(PluginCall call){try(Cursor c=database().rawQuery("SELECT v FROM vault_items WHERE k=?",new String[]{valid(call.getString("key"))})){JSObject out=new JSObject();if(c.moveToFirst())out.put("value",new JSONTokener(c.getString(0)).nextValue());call.resolve(out);}catch(Exception e){call.reject("私人记录读取失败");}}
 @PluginMethod public synchronized void page(PluginCall call){try{String p=valid(call.getString("prefix")),after=call.getString("after","");int limit=Math.max(1,Math.min(1000,call.getInt("limit",100)));JSArray rows=new JSArray();try(Cursor c=database().rawQuery("SELECT k,v FROM vault_items WHERE k>=? AND k<? AND k>? ORDER BY k LIMIT ?",new String[]{p,p+"\uffff",after,String.valueOf(limit)})){while(c.moveToNext()){JSObject row=new JSObject();row.put("key",c.getString(0));row.put("value",new JSONTokener(c.getString(1)).nextValue());rows.put(row);}}JSObject out=new JSObject();out.put("rows",rows);call.resolve(out);}catch(Exception e){call.reject("私人记录索引读取失败");}}
 @PluginMethod public void ocr(PluginCall call){
  try{String value=call.getString("base64","");if(value.length()>28000000)throw new Exception();byte[] bytes=Base64.decode(value,Base64.DEFAULT);
   BitmapFactory.Options bounds=new BitmapFactory.Options();bounds.inJustDecodeBounds=true;BitmapFactory.decodeByteArray(bytes,0,bytes.length,bounds);if(bounds.outWidth<1||bounds.outHeight<1)throw new Exception();
   BitmapFactory.Options options=new BitmapFactory.Options();int sample=1;while(Math.max(bounds.outWidth,bounds.outHeight)/sample>4000)sample*=2;options.inSampleSize=sample;Bitmap bitmap=BitmapFactory.decodeByteArray(bytes,0,bytes.length,options);if(bitmap==null)throw new Exception();
   int rotation=0;try{int o=new ExifInterface(new ByteArrayInputStream(bytes)).getAttributeInt(ExifInterface.TAG_ORIENTATION,1);if(o==6)rotation=90;else if(o==3)rotation=180;else if(o==8)rotation=270;}catch(Exception ignored){}
   final int w=(rotation==90||rotation==270)?bitmap.getHeight():bitmap.getWidth(),h=(rotation==90||rotation==270)?bitmap.getWidth():bitmap.getHeight();
   com.google.mlkit.vision.text.TextRecognizer reader=TextRecognition.getClient(new ChineseTextRecognizerOptions.Builder().build());
   reader.process(InputImage.fromBitmap(bitmap,rotation)).addOnSuccessListener(result->{JSArray blocks=new JSArray();int i=0;for(Text.TextBlock block:result.getTextBlocks())for(Text.Line line:block.getLines()){JSObject b=new JSObject();b.put("id","line-"+(i++));b.put("page",1);b.put("text",line.getText());b.put("confidence",JSONObject.NULL);android.graphics.Rect r=line.getBoundingBox();JSArray box=new JSArray();box.put(r==null?0:(double)r.left/w);box.put(r==null?0:(double)r.top/h);box.put(r==null?1:(double)r.width()/w);box.put(r==null?1:(double)r.height()/h);b.put("box",box);blocks.put(b);}JSObject out=new JSObject();out.put("blocks",blocks);out.put("model","ML Kit bundled Chinese 16.0.1");out.put("confirmed",false);call.resolve(out);reader.close();bitmap.recycle();}).addOnFailureListener(error->{reader.close();bitmap.recycle();call.reject("本机识字失败，请保留原件并手动核对；未调用云端");});
  }catch(Exception e){call.reject("此图片无法本机识字；支持JPEG/PNG/WebP单页，原件不变");}
 }
 @PluginMethod public void saveDocument(PluginCall call){
  try{if(exportBytes!=null)throw new Exception();exportBytes=Base64.decode(call.getString("base64",""),Base64.DEFAULT);Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType(call.getString("type","application/octet-stream").split(";")[0]);String name=call.getString("name","言道资料.bin").replaceAll("[\\\\/\\p{Cntrl}]","_");intent.putExtra(Intent.EXTRA_TITLE,name);startActivityForResult(call,intent,"documentSaved");}catch(Exception e){exportBytes=null;call.reject("无法打开系统保存窗口，请重试");}
 }
 @ActivityCallback private void documentSaved(PluginCall call,ActivityResult result){
  try{if(call==null)return;boolean saved=false;if(result.getResultCode()==Activity.RESULT_OK&&result.getData()!=null&&result.getData().getData()!=null&&exportBytes!=null){try(OutputStream out=getContext().getContentResolver().openOutputStream(result.getData().getData(),"w")){if(out==null)throw new Exception();out.write(exportBytes);out.flush();saved=true;}}JSObject response=new JSObject();response.put("saved",saved);call.resolve(response);}catch(Exception e){if(call!=null)call.reject("系统保存未完成，未记录备份成功");}finally{if(exportBytes!=null)java.util.Arrays.fill(exportBytes,(byte)0);exportBytes=null;}
 }
}
