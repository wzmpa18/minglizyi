import Foundation
import UIKit
import UserNotifications
import Capacitor
import WidgetKit

@objc(LocalCalendarPlugin)
public class LocalCalendarPlugin: CAPPlugin, CAPBridgedPlugin, UNUserNotificationCenterDelegate {
    public let identifier="LocalCalendarPlugin"
    public let jsName="LocalCalendar"
    public let pluginMethods:[CAPPluginMethod]=[
        CAPPluginMethod(name:"status",returnType:CAPPluginReturnPromise),
        CAPPluginMethod(name:"requestAuthorization",returnType:CAPPluginReturnPromise),
        CAPPluginMethod(name:"sync",returnType:CAPPluginReturnPromise),
        CAPPluginMethod(name:"addWidget",returnType:CAPPluginReturnPromise)]
    private let worker=DispatchQueue(label:"com.yandaoguoxue.calendar.sync")
    public override func load(){UNUserNotificationCenter.current().delegate=self}
    private func state(_ call:CAPPluginCall,scheduled:Int?=nil){
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            let allowed=settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional
            var result:JSObject=["native":true,"platform":"ios","widgets":ProcessInfo.processInfo.isOperatingSystemAtLeast(OperatingSystemVersion(majorVersion:17,minorVersion:0,patchVersion:0)) && FileManager.default.containerURL(forSecurityApplicationGroupIdentifier:"group.com.yandaoguoxue.calendar") != nil,"notifications":allowed]
            if let count=scheduled { result["scheduled"]=count }
            call.resolve(result)
        }
    }
    @objc func status(_ call:CAPPluginCall){state(call)}
    @objc func requestAuthorization(_ call:CAPPluginCall){
        UNUserNotificationCenter.current().requestAuthorization(options:[.alert,.sound,.badge]){ _,error in
            if let error=error{call.reject("通知授权未完成：\(error.localizedDescription)");return}
            self.state(call)
        }
    }
    @objc func addWidget(_ call:CAPPluginCall){call.resolve(["requested":false,"added":false])}
    @objc func sync(_ call:CAPPluginCall){
        guard let text=call.getString("payload"),text.utf8.count<=250000,
              let bytes=text.data(using:.utf8),let payload=(try? JSONSerialization.jsonObject(with:bytes)) as? [String:Any],
              let snapshot=payload["snapshot"] as? [String:Any],snapshot["schemaVersion"] as? Int == 1,
              let expires=snapshot["expiresAt"] as? Double,expires>Date().timeIntervalSince1970*1000,
              let rows=payload["reminders"] as? [[String:Any]],rows.count<=64 else{call.reject("日历快照无效或过期");return}
        let now=Date().timeIntervalSince1970*1000
        guard rows.allSatisfy({ row in guard let id=row["id"] as? Int,let at=row["at"] as? Double else{return false};return id>0 && at>now && at<now+366*86400000 })else{call.reject("提醒时间无效");return}
        worker.async {
            do {
                guard let root=FileManager.default.containerURL(forSecurityApplicationGroupIdentifier:"group.com.yandaoguoxue.calendar")else{call.reject("系统未授予日历组件容器，请更新安装包后再试");return}
                let file=root.appendingPathComponent("calendar-v1.json")
                try bytes.write(to:file,options:.atomic)
                try FileManager.default.setAttributes([.protectionKey:FileProtectionType.completeUntilFirstUserAuthentication],ofItemAtPath:file.path)
                if #available(iOS 17.0,*) { for kind in ["YandaoCalendarClock","YandaoCalendarPillars","YandaoCalendarAgenda"]{WidgetCenter.shared.reloadTimelines(ofKind:kind)} }
            }catch{call.reject("组件快照保存失败：\(error.localizedDescription)");return}
            let center=UNUserNotificationCenter.current(),ready=DispatchSemaphore(value:0)
            var old:[UNNotificationRequest]=[]
            center.getPendingNotificationRequests{items in old=items;ready.signal()}
            guard ready.wait(timeout:.now()+10) == .success else{call.reject("系统提醒队列暂不可用");return}
            center.removePendingNotificationRequests(withIdentifiers:old.filter{$0.identifier.hasPrefix("yandao-calendar-")}.map{$0.identifier})
            let group=DispatchGroup(),errors=NSLock();var failed=false
            for row in rows {
                guard let id=row["id"] as? Int,let at=row["at"] as? Double else{continue}
                let content=UNMutableNotificationContent()
                content.title=payload["notificationTitle"] as? String ?? "言道日历"
                content.body=payload["notificationBody"] as? String ?? "有一项安排，请打开应用查看"
                content.sound = .default;content.userInfo=["open_calendar":true]
                let trigger=UNTimeIntervalNotificationTrigger(timeInterval:max(1,at/1000-Date().timeIntervalSince1970),repeats:false)
                group.enter();center.add(UNNotificationRequest(identifier:"yandao-calendar-\(id)",content:content,trigger:trigger)){error in
                    if error != nil{errors.lock();failed=true;errors.unlock()};group.leave()
                }
            }
            guard group.wait(timeout:.now()+15) == .success,!failed else{call.reject("部分系统提醒未能注册，请检查通知权限后刷新");return}
            self.state(call,scheduled:rows.count)
        }
    }
    public func userNotificationCenter(_ center:UNUserNotificationCenter,willPresent notification:UNNotification,withCompletionHandler completionHandler:@escaping(UNNotificationPresentationOptions)->Void){completionHandler([.banner,.sound])}
    public func userNotificationCenter(_ center:UNUserNotificationCenter,didReceive response:UNNotificationResponse,withCompletionHandler completionHandler:@escaping()->Void){
        if response.notification.request.content.userInfo["open_calendar"] as? Bool == true {
            DispatchQueue.main.async{if let web=self.bridge?.webView,let url=URL(string:"capacitor://localhost/calendar/"){web.load(URLRequest(url:url))}}
        }
        completionHandler()
    }
}
