package com.yandao.guoxue.plugins;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Matrix;
import android.media.ExifInterface;
import com.googlecode.tesseract.android.TessBaseAPI;
import com.googlecode.tesseract.android.ResultIterator;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import org.json.*;
import java.io.*;
import java.security.MessageDigest;

/** Bundled local engine, no GMS/HTTP client/telemetry. Originals never change. */
public final class AndroidOfflineOcr {
 private static File prepareOcr(android.content.Context context)throws Exception{
  JSONObject manifest;try(InputStream in=context.getAssets().open("life-ocr/model-manifest.json")){ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] buffer=new byte[4096];int n;while((n=in.read(buffer))!=-1)out.write(buffer,0,n);manifest=new JSONObject(new String(out.toByteArray(),java.nio.charset.StandardCharsets.UTF_8));}
  File root=new File(context.getNoBackupFilesDir(),"life-ocr-v1"),directory=new File(root,"tessdata");if(!directory.isDirectory()&&!directory.mkdirs())throw new Exception();
  JSONArray models=manifest.getJSONArray("models");for(int i=0;i<models.length();i++){JSONObject model=models.getJSONObject(i);String name=model.getString("name");if(!name.matches("(chi_sim|chi_tra|eng)"))throw new Exception();File file=new File(directory,name+".traineddata");
   if(!file.exists()){File pending=new File(directory,name+".pending");try(InputStream input=context.getAssets().open("life-ocr/tessdata/"+name+".traineddata");OutputStream output=new FileOutputStream(pending)){byte[] buffer=new byte[65536];int n;while((n=input.read(buffer))!=-1)output.write(buffer,0,n);}if(!pending.renameTo(file))throw new Exception();}
   MessageDigest digest=MessageDigest.getInstance("SHA-256");try(InputStream input=new FileInputStream(file)){byte[] buffer=new byte[65536];int n;while((n=input.read(buffer))!=-1)digest.update(buffer,0,n);}StringBuilder hex=new StringBuilder();for(byte v:digest.digest())hex.append(String.format(java.util.Locale.ROOT,"%02x",v&255));if(file.length()!=model.getLong("bytes")||!hex.toString().equals(model.getString("sha256")))throw new Exception("Model integrity failure");
  }return root;
 }
 public static JSObject recognize(Context context,byte[] bytes)throws Exception{
  Bitmap bitmap=null;TessBaseAPI engine=null;ResultIterator iterator=null;
  try{if(bytes.length>20*1024*1024)throw new Exception("OCR source exceeds 20MiB");
   BitmapFactory.Options bounds=new BitmapFactory.Options();bounds.inJustDecodeBounds=true;BitmapFactory.decodeByteArray(bytes,0,bytes.length,bounds);if(bounds.outWidth<1||bounds.outHeight<1)throw new Exception();
   BitmapFactory.Options options=new BitmapFactory.Options();int sample=1;while(Math.max(bounds.outWidth,bounds.outHeight)/sample>4000)sample*=2;options.inSampleSize=sample;options.inPreferredConfig=Bitmap.Config.ARGB_8888;bitmap=BitmapFactory.decodeByteArray(bytes,0,bytes.length,options);if(bitmap==null)throw new Exception();
   int orientation=1;try{orientation=new ExifInterface(new ByteArrayInputStream(bytes)).getAttributeInt(ExifInterface.TAG_ORIENTATION,1);}catch(Exception ignored){}
   Matrix matrix=new Matrix();if(orientation==3||orientation==4)matrix.setRotate(180);if(orientation==5||orientation==6)matrix.setRotate(90);if(orientation==7||orientation==8)matrix.setRotate(-90);if(orientation==2||orientation==4||orientation==5||orientation==7)matrix.postScale(-1,1);
   if(!matrix.isIdentity()){Bitmap rotated=Bitmap.createBitmap(bitmap,0,0,bitmap.getWidth(),bitmap.getHeight(),matrix,true);if(rotated!=bitmap)bitmap.recycle();bitmap=rotated;}
   int w=bitmap.getWidth(),h=bitmap.getHeight();engine=new TessBaseAPI();if(!engine.init(prepareOcr(context).getAbsolutePath(),"chi_sim+chi_tra+eng",TessBaseAPI.OEM_LSTM_ONLY))throw new Exception();engine.setVariable("debug_file","/dev/null");engine.setImage(bitmap);String recognized=engine.getUTF8Text();JSArray blocks=new JSArray();
   if(recognized!=null&&!recognized.trim().isEmpty()){iterator=engine.getResultIterator();if(iterator!=null){iterator.begin();int i=0;do{int level=TessBaseAPI.PageIteratorLevel.RIL_TEXTLINE;String text=iterator.getUTF8Text(level);if(text==null||text.trim().isEmpty())continue;android.graphics.Rect r=iterator.getBoundingRect(level);JSObject block=new JSObject();block.put("id","line-"+(i++));block.put("page",1);block.put("text",text.trim());block.put("confidence",Math.max(0,Math.min(1,iterator.confidence(level)/100.0)));JSArray box=new JSArray();box.put((double)r.left/w);box.put((double)r.top/h);box.put((double)r.width()/w);box.put((double)r.height()/h);block.put("box",box);blocks.put(block);}while(iterator.next(TessBaseAPI.PageIteratorLevel.RIL_TEXTLINE));}}
   JSObject result=new JSObject();result.put("blocks",blocks);result.put("model","Tesseract4Android 4.9.0 / tessdata_fast 87416418 chi_sim+chi_tra+eng");result.put("confirmed",false);return result;
  }finally{if(iterator!=null)iterator.delete();if(engine!=null)engine.recycle();if(bitmap!=null&&!bitmap.isRecycled())bitmap.recycle();}

 }
}
