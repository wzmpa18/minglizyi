package com.yandao.guoxue.plugins;

import android.util.AtomicFile;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.json.JSONObject;

/** Permanent, app-private files. Never uses Android/WebView cache directories. */
@CapacitorPlugin(name = "OfflineFiles")
public class OfflineFilesPlugin extends Plugin {
    private static final int MAX_BYTES = 8 * 1024 * 1024;
    private AtomicFile file(PluginCall call) throws Exception {
        String key = call.getString("key");
        if (key == null || key.isEmpty() || key.length() > 2000) throw new Exception("Invalid offline file key");
        byte[] hash = MessageDigest.getInstance("SHA-256").digest(key.getBytes(StandardCharsets.UTF_8));
        StringBuilder name = new StringBuilder();
        for (byte b : hash) name.append(String.format("%02x", b & 255));
        File dir = new File(getContext().getFilesDir(), "offline-learning");
        if (!dir.isDirectory() && !dir.mkdirs()) throw new Exception("Cannot create offline directory");
        return new AtomicFile(new File(dir, name + ".json"));
    }
    @PluginMethod public synchronized void read(PluginCall call) {
        try {
            AtomicFile f = file(call);
            JSObject result = new JSObject();
            if (!f.getBaseFile().exists() && !new File(f.getBaseFile()+".bak").exists()) {
                result.put("value", JSONObject.NULL);
            } else {
                try (FileInputStream in = f.openRead(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                    byte[] buffer = new byte[8192]; int n;
                    while ((n=in.read(buffer))!=-1) {
                        if (out.size()+n>MAX_BYTES) throw new Exception("Offline file exceeds supported size");
                        out.write(buffer,0,n);
                    }
                    result.put("value", new String(out.toByteArray(), StandardCharsets.UTF_8));
                }
            }
            call.resolve(result);
        } catch (Exception e) { call.reject("Offline read failed", e); }
    }
    @PluginMethod public synchronized void write(PluginCall call) {
        AtomicFile f = null; FileOutputStream out = null;
        try {
            String value = call.getString("value");
            if (value == null) throw new Exception("Missing offline data");
            byte[] bytes = value.getBytes(StandardCharsets.UTF_8);
            if (bytes.length>MAX_BYTES) throw new Exception("Offline page too large");
            f=file(call); out=f.startWrite(); out.write(bytes); f.finishWrite(out); out=null;
            JSObject result=new JSObject(); result.put("saved",true); result.put("bytes",bytes.length); call.resolve(result);
        } catch (Exception e) { if(f!=null && out!=null)f.failWrite(out);call.reject("Offline write failed",e); }
    }
    @PluginMethod public synchronized void remove(PluginCall call) {
        try { file(call).delete();call.resolve(); } catch(Exception e){call.reject("Offline remove failed",e);}
    }
}
