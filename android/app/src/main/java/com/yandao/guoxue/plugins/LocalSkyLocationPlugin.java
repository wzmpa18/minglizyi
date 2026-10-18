package com.yandao.guoxue.plugins;

import android.Manifest;
import android.content.Context;
import android.hardware.*;
import android.location.*;
import android.os.*;
import android.view.Surface;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;

/** User-triggered foreground location and magnetic heading; no storage, network or background service. */
@CapacitorPlugin(name="LocalSkyLocation", permissions={@Permission(alias="coarse", strings={Manifest.permission.ACCESS_COARSE_LOCATION}), @Permission(alias="fine", strings={Manifest.permission.ACCESS_FINE_LOCATION})})
public class LocalSkyLocationPlugin extends Plugin implements SensorEventListener {
 private final Handler handler=new Handler(Looper.getMainLooper());
 private LocationManager locations; private LocationListener locationListener; private PluginCall pending;
 private SensorManager sensors; private Runnable timer;
 @PluginMethod public void getCurrentPosition(PluginCall call) {
  if(getPermissionState("coarse")!=PermissionState.GRANTED && getPermissionState("fine")!=PermissionState.GRANTED){requestPermissionForAliases(new String[]{"coarse","fine"},call,"locationPermission");return;}
  locate(call);
 }
 @PermissionCallback private void locationPermission(PluginCall call){
  if(getPermissionState("coarse")==PermissionState.GRANTED || getPermissionState("fine")==PermissionState.GRANTED)locate(call);else call.reject("未获得定位权限，可以手动选择地点。");
 }
 private void locate(PluginCall call){getActivity().runOnUiThread(()->{
  if(pending!=null){call.reject("定位正在进行，请稍候。");return;}
  locations=(LocationManager)getContext().getSystemService(Context.LOCATION_SERVICE);pending=call;
  locationListener=new LocationListener(){@Override public void onLocationChanged(Location l){
   if(l==null||!l.hasAccuracy()||Math.abs(System.currentTimeMillis()-l.getTime())>300000)return;
   JSObject result=new JSObject();result.put("latitude",l.getLatitude());result.put("longitude",l.getLongitude());result.put("accuracy",l.getAccuracy());PluginCall done=pending;clearLocation();if(done!=null)done.resolve(result);
  }};
  try {
   boolean active=false;
   for(String provider:new String[]{LocationManager.NETWORK_PROVIDER,LocationManager.GPS_PROVIDER})if(locations.isProviderEnabled(provider)){locations.requestLocationUpdates(provider,0,0,locationListener,Looper.getMainLooper());active=true;}
   if(!active){failLocation("系统定位服务已关闭，请开启或手动选择地点。");return;}
   timer=()->failLocation("定位超时，请在开阔处重试或手动选择地点。");handler.postDelayed(timer,30000);
  }catch(SecurityException e){failLocation("未获得定位权限，可以手动选择地点。");}catch(Exception e){failLocation("暂时无法定位，请手动选择地点。");}
 });}
 private void failLocation(String message){PluginCall call=pending;clearLocation();if(call!=null)call.reject(message);}
 private void clearLocation(){if(timer!=null)handler.removeCallbacks(timer);timer=null;if(locations!=null&&locationListener!=null)try{locations.removeUpdates(locationListener);}catch(Exception ignored){}pending=null;locationListener=null;}
 @PluginMethod public void startCompass(PluginCall call){
  sensors=(SensorManager)getContext().getSystemService(Context.SENSOR_SERVICE);
  Sensor vector=sensors.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR);if(vector==null)vector=sensors.getDefaultSensor(Sensor.TYPE_GEOMAGNETIC_ROTATION_VECTOR);
  if(vector==null){call.reject("设备无可用磁北方向传感器，请使用手动模式。");return;}
  sensors.unregisterListener(this);
  if(!sensors.registerListener(this,vector,SensorManager.SENSOR_DELAY_UI)){call.reject("方向传感器暂不可用。");return;}
  call.resolve();
 }
 @PluginMethod public void stopCompass(PluginCall call){if(sensors!=null)sensors.unregisterListener(this);call.resolve();}
 @Override public void onSensorChanged(SensorEvent e){
  float[] original=new float[9],matrix=new float[9],angles=new float[3];SensorManager.getRotationMatrixFromVector(original,e.values);
  int rotation=getActivity().getWindowManager().getDefaultDisplay().getRotation();int x=SensorManager.AXIS_X,y=SensorManager.AXIS_Y;
  if(rotation==Surface.ROTATION_90){x=SensorManager.AXIS_Y;y=SensorManager.AXIS_MINUS_X;}else if(rotation==Surface.ROTATION_180){x=SensorManager.AXIS_MINUS_X;y=SensorManager.AXIS_MINUS_Y;}else if(rotation==Surface.ROTATION_270){x=SensorManager.AXIS_MINUS_Y;y=SensorManager.AXIS_X;}
  SensorManager.remapCoordinateSystem(original,x,y,matrix);SensorManager.getOrientation(matrix,angles);
  JSObject data=new JSObject();data.put("heading",(Math.toDegrees(angles[0])+360)%360);data.put("accuracy",e.accuracy);data.put("needsCalibration",e.accuracy<=SensorManager.SENSOR_STATUS_ACCURACY_LOW);data.put("screenUp",Math.abs(angles[1])<0.8&&Math.abs(angles[2])<0.8);data.put("landscape",rotation==Surface.ROTATION_90||rotation==Surface.ROTATION_270);notifyListeners("heading",data);
 }
 @Override public void onAccuracyChanged(Sensor sensor,int accuracy){}
 @Override protected void handleOnPause(){if(sensors!=null)sensors.unregisterListener(this);if(pending!=null)failLocation("应用已离开前台，请返回后重新定位。");notifyListeners("headingStopped",new JSObject());}
 @Override protected void handleOnDestroy(){if(sensors!=null)sensors.unregisterListener(this);clearLocation();}
}
