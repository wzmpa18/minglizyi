package com.yandao.guoxue.plugins;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * v25.0.88: 排盘记录与命主档案原生存储插件。
 *
 * 所有工具页的排盘记录不再依赖 WebView localStorage（清缓存即丢数据），
 * 统一落到 APP 私有 SQLite 数据库（paipan_store.db，随卸载移除、不联网）：
 *   - paipan_records  全工具排盘记录（input/result 存 JSON 字符串，支持断网恢复）
 *   - mingzhu_profiles 统一命主档案库（跨工具共享命主基础信息）
 *
 * JS 侧通过 Capacitor.Plugins.PaipanStore 调用；web/无原生桥环境由
 * 前端 nativePaipanStore.ts 回退 localStorage 同构实现。
 */
@CapacitorPlugin(name = "PaipanStore")
public class PaipanStorePlugin extends Plugin {

    private static final String DB_NAME = "paipan_store.db";
    private static final int DB_VERSION = 1;
    private static final int DEFAULT_LIMIT = 200;
    private static final int MAX_LIMIT = 500;

    /** SQLiteOpenHelper：私有数据库，无需任何存储权限 */
    private static class Db extends SQLiteOpenHelper {
        Db(Context ctx) {
            super(ctx, DB_NAME, null, DB_VERSION);
        }

        @Override
        public void onCreate(SQLiteDatabase db) {
            db.execSQL("CREATE TABLE paipan_records (" +
                    "id INTEGER PRIMARY KEY AUTOINCREMENT," +
                    "tool TEXT NOT NULL," +
                    "profile_id TEXT," +
                    "title TEXT," +
                    "input TEXT," +
                    "result TEXT," +
                    "note TEXT," +
                    "created_at INTEGER NOT NULL," +
                    "updated_at INTEGER NOT NULL)");
            db.execSQL("CREATE INDEX idx_records_tool ON paipan_records(tool, created_at DESC)");
            db.execSQL("CREATE TABLE mingzhu_profiles (" +
                    "id TEXT PRIMARY KEY," +
                    "name TEXT NOT NULL," +
                    "gender TEXT," +
                    "birth_date TEXT," +
                    "birth_time TEXT," +
                    "birth_place TEXT," +
                    "extra TEXT," +
                    "created_at INTEGER NOT NULL," +
                    "updated_at INTEGER NOT NULL)");
        }

        @Override
        public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
            // v1 首版，无历史结构需要迁移
        }
    }

    private Db dbHelper;

    private synchronized Db db() {
        if (dbHelper == null) dbHelper = new Db(getContext());
        return dbHelper;
    }

    // ==================== 命主档案库 ====================

    @PluginMethod
    public void saveProfile(PluginCall call) {
        try {
            String id = call.getString("id");
            String name = call.getString("name");
            if (name == null || name.trim().isEmpty()) {
                call.reject("name is required");
                return;
            }
            long now = System.currentTimeMillis();
            if (id == null || id.trim().isEmpty()) {
                id = UUID.randomUUID().toString();
            }
            JSONObject extra = call.getObject("extra", null);

            SQLiteDatabase d = db().getWritableDatabase();
            long createdAt = now;
            Cursor c = d.rawQuery("SELECT created_at FROM mingzhu_profiles WHERE id=?", new String[]{id});
            if (c.moveToFirst()) createdAt = c.getLong(0);
            c.close();

            ContentValues cv = new ContentValues();
            cv.put("id", id);
            cv.put("name", name.trim());
            cv.put("gender", call.getString("gender"));
            cv.put("birth_date", call.getString("birthDate"));
            cv.put("birth_time", call.getString("birthTime"));
            cv.put("birth_place", call.getString("birthPlace"));
            cv.put("extra", extra == null ? null : extra.toString());
            cv.put("created_at", createdAt);
            cv.put("updated_at", now);
            d.insertWithOnConflict("mingzhu_profiles", null, cv, SQLiteDatabase.CONFLICT_REPLACE);

            JSObject ret = new JSObject();
            ret.put("profile", getProfileRow(d, id));
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("saveProfile failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void listProfiles(PluginCall call) {
        try {
            String query = call.getString("query");
            SQLiteDatabase d = db().getReadableDatabase();
            Cursor c;
            if (query != null && !query.trim().isEmpty()) {
                c = d.query("mingzhu_profiles", null, "name LIKE ?",
                        new String[]{"%" + query.trim() + "%"}, null, null, "updated_at DESC");
            } else {
                c = d.query("mingzhu_profiles", null, null, null, null, null, "updated_at DESC");
            }
            List<JSObject> rows = new ArrayList<>();
            while (c.moveToNext()) rows.add(rowToProfile(c));
            c.close();

            JSObject ret = new JSObject();
            org.json.JSONArray arr = new org.json.JSONArray();
            for (JSObject o : rows) arr.put(o);
            ret.put("profiles", arr);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("listProfiles failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void deleteProfile(PluginCall call) {
        try {
            String id = call.getString("id");
            if (id == null || id.isEmpty()) {
                call.reject("id is required");
                return;
            }
            SQLiteDatabase d = db().getWritableDatabase();
            d.delete("mingzhu_profiles", "id=?", new String[]{id});
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("deleteProfile failed: " + e.getMessage());
        }
    }

    // ==================== 排盘记录 ====================

    @PluginMethod
    public void saveRecord(PluginCall call) {
        try {
            String tool = call.getString("tool");
            if (tool == null || tool.trim().isEmpty()) {
                call.reject("tool is required");
                return;
            }
            Long existingId = numericLong(call, "id");
            // 命主档案 id 为 UUID 字符串，按字符串存取
            String profileId = call.getString("profileId");
            JSONObject input = call.getObject("input", null);
            JSONObject result = call.getObject("result", null);

            long now = System.currentTimeMillis();
            ContentValues cv = new ContentValues();
            cv.put("tool", tool.trim());
            cv.put("profile_id", profileId == null || profileId.isEmpty() ? null : profileId);
            cv.put("title", call.getString("title"));
            cv.put("input", input == null ? null : input.toString());
            cv.put("result", result == null ? null : result.toString());
            cv.put("note", call.getString("note"));
            cv.put("updated_at", now);

            SQLiteDatabase d = db().getWritableDatabase();
            long id;
            if (existingId != null && existingId > 0) {
                id = existingId;
                int changed = d.update("paipan_records", cv, "id=?", new String[]{String.valueOf(existingId)});
                if (changed == 0) {
                    cv.put("id", existingId);
                    cv.put("created_at", now);
                    id = d.insertOrThrow("paipan_records", null, cv);
                }
            } else {
                cv.put("created_at", now);
                id = d.insertOrThrow("paipan_records", null, cv);
            }

            JSObject ret = new JSObject();
            ret.put("id", id);
            ret.put("savedAt", now);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("saveRecord failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void listRecords(PluginCall call) {
        try {
            String tool = call.getString("tool");
            Long limitVal = numericLong(call, "limit");
            int limit = limitVal == null || limitVal <= 0 ? DEFAULT_LIMIT
                    : (int) Math.min(limitVal, MAX_LIMIT);
            SQLiteDatabase d = db().getReadableDatabase();
            Cursor c;
            if (tool != null && !tool.trim().isEmpty()) {
                c = d.query("paipan_records", null, "tool=?",
                        new String[]{tool.trim()}, null, null, "created_at DESC", String.valueOf(limit));
            } else {
                c = d.query("paipan_records", null, null, null, null, null,
                        "created_at DESC", String.valueOf(limit));
            }
            List<JSObject> rows = new ArrayList<>();
            while (c.moveToNext()) rows.add(rowToRecord(c));
            c.close();

            JSObject ret = new JSObject();
            org.json.JSONArray arr = new org.json.JSONArray();
            for (JSObject o : rows) arr.put(o);
            ret.put("records", arr);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("listRecords failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getRecord(PluginCall call) {
        try {
            Long id = numericLong(call, "id");
            if (id == null || id <= 0) {
                call.reject("id is required");
                return;
            }
            SQLiteDatabase d = db().getReadableDatabase();
            Cursor c = d.query("paipan_records", null, "id=?",
                    new String[]{String.valueOf(id)}, null, null, null);
            JSObject ret = new JSObject();
            if (c.moveToFirst()) {
                ret.put("record", rowToRecord(c));
            } else {
                ret.put("record", JSONObject.NULL);
            }
            c.close();
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("getRecord failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void deleteRecord(PluginCall call) {
        try {
            Long id = numericLong(call, "id");
            if (id == null || id <= 0) {
                call.reject("id is required");
                return;
            }
            SQLiteDatabase d = db().getWritableDatabase();
            d.delete("paipan_records", "id=?", new String[]{String.valueOf(id)});
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("deleteRecord failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void clearAll(PluginCall call) {
        try {
            SQLiteDatabase d = db().getWritableDatabase();
            d.execSQL("DELETE FROM paipan_records");
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("clearAll failed: " + e.getMessage());
        }
    }

    /** 按工具清空记录（不清档案库，不影响其他工具） */
    @PluginMethod
    public void clearRecords(PluginCall call) {
        try {
            String tool = call.getString("tool");
            if (tool == null || tool.isEmpty()) {
                call.reject("tool is required");
                return;
            }
            SQLiteDatabase d = db().getWritableDatabase();
            d.delete("paipan_records", "tool=?", new String[]{tool});
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("clearRecords failed: " + e.getMessage());
        }
    }

    // ==================== 行转换 ====================

    private static JSObject getProfileRow(SQLiteDatabase d, String id) {
        Cursor c = d.query("mingzhu_profiles", null, "id=?", new String[]{id}, null, null, null);
        JSObject o = new JSObject();
        if (c.moveToFirst()) o = rowToProfile(c);
        c.close();
        return o;
    }

    // JSON decodes small integers as Integer, while Capacitor getLong only accepts Long.
    private static Long numericLong(PluginCall call, String key) {
        Object value = call.getData().opt(key);
        if (!(value instanceof Number)) return null;
        double number = ((Number) value).doubleValue();
        if (Double.isNaN(number) || Double.isInfinite(number) || number != Math.rint(number)) return null;
        return ((Number) value).longValue();
    }

    private static JSObject rowToProfile(Cursor c) {
        JSObject o = new JSObject();
        o.put("id", c.getString(c.getColumnIndexOrThrow("id")));
        o.put("name", c.getString(c.getColumnIndexOrThrow("name")));
        String v = c.getString(c.getColumnIndexOrThrow("gender"));
        o.put("gender", v == null ? JSONObject.NULL : v);
        v = c.getString(c.getColumnIndexOrThrow("birth_date"));
        o.put("birthDate", v == null ? JSONObject.NULL : v);
        v = c.getString(c.getColumnIndexOrThrow("birth_time"));
        o.put("birthTime", v == null ? JSONObject.NULL : v);
        v = c.getString(c.getColumnIndexOrThrow("birth_place"));
        o.put("birthPlace", v == null ? JSONObject.NULL : v);
        String extra = c.getString(c.getColumnIndexOrThrow("extra"));
        if (extra != null) {
            try {
                o.put("extra", new JSONObject(extra));
            } catch (JSONException e) {
                o.put("extra", JSONObject.NULL);
            }
        } else {
            o.put("extra", JSONObject.NULL);
        }
        o.put("createdAt", c.getLong(c.getColumnIndexOrThrow("created_at")));
        o.put("updatedAt", c.getLong(c.getColumnIndexOrThrow("updated_at")));
        return o;
    }

    private static JSObject rowToRecord(Cursor c) {
        JSObject o = new JSObject();
        o.put("id", c.getLong(c.getColumnIndexOrThrow("id")));
        o.put("tool", c.getString(c.getColumnIndexOrThrow("tool")));
        String v = c.getString(c.getColumnIndexOrThrow("profile_id"));
        o.put("profileId", v == null ? JSONObject.NULL : v);
        v = c.getString(c.getColumnIndexOrThrow("title"));
        o.put("title", v == null ? JSONObject.NULL : v);
        String json = c.getString(c.getColumnIndexOrThrow("input"));
        putJson(o, "input", json);
        json = c.getString(c.getColumnIndexOrThrow("result"));
        putJson(o, "result", json);
        v = c.getString(c.getColumnIndexOrThrow("note"));
        o.put("note", v == null ? JSONObject.NULL : v);
        o.put("createdAt", c.getLong(c.getColumnIndexOrThrow("created_at")));
        o.put("updatedAt", c.getLong(c.getColumnIndexOrThrow("updated_at")));
        return o;
    }

    private static void putJson(JSObject o, String key, String json) {
        if (json != null) {
            try {
                o.put(key, new JSONObject(json));
            } catch (JSONException e) {
                o.put(key, JSONObject.NULL);
            }
        } else {
            o.put(key, JSONObject.NULL);
        }
    }
}
