package com.yandao.guoxue.plugins;

import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Device-only Chinese reading. The plug-in rejects network-required voices, so
 * learning text is never sent to a TTS server. Voice data is managed by Android.
 */
@CapacitorPlugin(name = "LocalTts")
public class LocalTtsPlugin extends Plugin implements TextToSpeech.OnInitListener {
    private TextToSpeech tts;
    private volatile boolean initialized = false;
    private volatile String initError = null;
    private Voice offlineChineseVoice;
    private volatile String finalUtteranceId = null;

    @Override
    public void load() {
        tts = new TextToSpeech(getContext().getApplicationContext(), this);
        tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
            @Override public void onStart(String utteranceId) {
                notifyState("speaking", utteranceId, null);
            }
            @Override public void onDone(String utteranceId) {
                if (utteranceId != null && utteranceId.equals(finalUtteranceId)) {
                    finalUtteranceId = null;
                    notifyState("finished", utteranceId, null);
                }
            }
            @Override public void onError(String utteranceId) {
                notifyState("error", utteranceId, "本机语音朗读失败");
            }
            @Override public void onError(String utteranceId, int errorCode) {
                notifyState("error", utteranceId, "本机语音朗读失败（" + errorCode + "）");
            }
        });
    }

    @Override
    public void onInit(int status) {
        if (status != TextToSpeech.SUCCESS) {
            initError = "手机语音服务启动失败";
            return;
        }
        initialized = true;
        offlineChineseVoice = chooseOfflineChineseVoice(tts.getVoices());
        if (offlineChineseVoice == null) initError = "手机尚未安装离线中文语音包";
    }

    private Voice chooseOfflineChineseVoice(Set<Voice> voices) {
        if (voices == null) return null;
        Voice best = null;
        for (Voice voice : voices) {
            if (voice.getLocale() == null || !"zh".equalsIgnoreCase(voice.getLocale().getLanguage())) continue;
            if (voice.isNetworkConnectionRequired()) continue;
            if (best == null || voice.getQuality() > best.getQuality()) best = voice;
        }
        return best;
    }

    private void notifyState(String state, String utteranceId, String message) {
        JSObject data = new JSObject();
        data.put("state", state);
        if (utteranceId != null) data.put("utteranceId", utteranceId);
        if (message != null) data.put("message", message);
        notifyListeners("stateChange", data);
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject result = new JSObject();
        result.put("ready", initialized);
        result.put("available", initialized && offlineChineseVoice != null);
        result.put("voiceName", offlineChineseVoice == null ? "" : offlineChineseVoice.getName());
        result.put("message", initError == null ? (initialized ? "本机离线中文朗读可用" : "正在启动手机语音服务") : initError);
        call.resolve(result);
    }

    @PluginMethod
    public synchronized void speak(PluginCall call) {
        String text = call.getString("text", "").trim();
        if (text.isEmpty()) { call.reject("没有可朗读的文字"); return; }
        if (!initialized) { call.reject(initError == null ? "手机语音服务正在启动，请稍后重试" : initError); return; }
        if (offlineChineseVoice == null) { call.reject("手机尚未安装离线中文语音包"); return; }
        double requestedRate = call.getDouble("rate", 0.9);
        float rate = (float) Math.max(0.6, Math.min(1.3, requestedRate));
        tts.stop();
        tts.setLanguage(Locale.SIMPLIFIED_CHINESE);
        // setLanguage may switch voices, so pin the verified offline voice afterwards.
        tts.setVoice(offlineChineseVoice);
        tts.setSpeechRate(rate);

        List<String> chunks = splitText(text, 1000);
        String batch = Long.toString(System.currentTimeMillis());
        finalUtteranceId = batch + "-" + (chunks.size() - 1);
        Bundle params = new Bundle();
        int accepted = TextToSpeech.SUCCESS;
        for (int i = 0; i < chunks.size(); i++) {
            accepted = tts.speak(chunks.get(i), i == 0 ? TextToSpeech.QUEUE_FLUSH : TextToSpeech.QUEUE_ADD, params, batch + "-" + i);
            if (accepted == TextToSpeech.ERROR) break;
        }
        if (accepted == TextToSpeech.ERROR) { finalUtteranceId = null; call.reject("手机语音朗读启动失败"); return; }
        JSObject result = new JSObject();
        result.put("accepted", true);
        result.put("chunks", chunks.size());
        result.put("voiceName", offlineChineseVoice.getName());
        call.resolve(result);
    }

    private List<String> splitText(String text, int maxChars) {
        List<String> chunks = new ArrayList<>();
        String[] parts = text.split("(?<=[。！？；!?;\\n])");
        StringBuilder current = new StringBuilder();
        for (String part : parts) {
            String value = part.trim();
            if (value.isEmpty()) continue;
            if (current.length() + value.length() > maxChars && current.length() > 0) {
                chunks.add(current.toString()); current.setLength(0);
            }
            while (value.length() > maxChars) {
                chunks.add(value.substring(0, maxChars)); value = value.substring(maxChars);
            }
            current.append(value);
        }
        if (current.length() > 0) chunks.add(current.toString());
        if (chunks.isEmpty()) chunks.add(text.substring(0, Math.min(text.length(), maxChars)));
        return chunks;
    }

    @PluginMethod
    public synchronized void stop(PluginCall call) {
        finalUtteranceId = null;
        if (tts != null) tts.stop();
        notifyState("stopped", null, null);
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        if (tts != null) { tts.stop(); tts.shutdown(); tts = null; }
        super.handleOnDestroy();
    }
}
