import Foundation
import Capacitor
import SQLite3
import Vision
import UIKit
import ImageIO

@objc(LifeVaultPlugin)
public class LifeVaultPlugin: CAPPlugin, CAPBridgedPlugin, UIDocumentPickerDelegate {
 public let identifier="LifeVaultPlugin"
 public let jsName="LifeVault"
 public let pluginMethods:[CAPPluginMethod]=[CAPPluginMethod(name:"commit",returnType:CAPPluginReturnPromise),CAPPluginMethod(name:"page",returnType:CAPPluginReturnPromise),CAPPluginMethod(name:"read",returnType:CAPPluginReturnPromise),CAPPluginMethod(name:"ocr",returnType:CAPPluginReturnPromise),CAPPluginMethod(name:"saveDocument",returnType:CAPPluginReturnPromise)]
 private let queue=DispatchQueue(label:"vip.yandao.private-vault")
 private var db:OpaquePointer?
 private var exportCall:CAPPluginCall?
 private var exportURL:URL?
 private let transient=unsafeBitCast(-1,to:sqlite3_destructor_type.self)
 private func database() throws -> OpaquePointer {
  if let d=db{return d}
  var dir=FileManager.default.urls(for:.applicationSupportDirectory,in:.userDomainMask)[0].appendingPathComponent("PrivateLifeVault",isDirectory:true)
  try FileManager.default.createDirectory(at:dir,withIntermediateDirectories:true,attributes:[.protectionKey:FileProtectionType.complete])
  var flags=URLResourceValues();flags.isExcludedFromBackup=true;try dir.setResourceValues(flags)
  let file=dir.appendingPathComponent("vault-v1.sqlite")
  guard sqlite3_open(file.path,&db)==SQLITE_OK,let d=db else {throw NSError(domain:"Vault",code:1)}
  guard sqlite3_exec(d,"PRAGMA secure_delete=ON; CREATE TABLE IF NOT EXISTS vault_items(k TEXT PRIMARY KEY NOT NULL,v TEXT NOT NULL)",nil,nil,nil)==SQLITE_OK else {throw NSError(domain:"Vault",code:2)}
  try FileManager.default.setAttributes([.protectionKey:FileProtectionType.complete],ofItemAtPath:file.path)
  return d
 }
 private func valid(_ key:String)->Bool{key.range(of:"^life:[a-zA-Z0-9:_-]{1,240}$",options:.regularExpression) != nil}
 private func bind(_ s:OpaquePointer,_ i:Int32,_ text:String){sqlite3_bind_text(s,i,text,-1,transient)}
 @objc func commit(_ call:CAPPluginCall){queue.async{do{
  let d=try self.database();guard let rows=call.getArray("rows") as? [[String:Any]],rows.count<=200 else{throw NSError(domain:"Vault",code:3)}
  guard sqlite3_exec(d,"BEGIN IMMEDIATE",nil,nil,nil)==SQLITE_OK else{throw NSError(domain:"Vault",code:4)}
  do{for row in rows{guard let key=row["key"] as? String,self.valid(key),let value=row["value"] else{throw NSError(domain:"Vault",code:5)}
    let data=try JSONSerialization.data(withJSONObject:value,options:[.fragmentsAllowed,.sortedKeys]);guard data.count<=2000000,let text=String(data:data,encoding:.utf8) else{throw NSError(domain:"Vault",code:6)}
    var stmt:OpaquePointer?;guard sqlite3_prepare_v2(d,"INSERT OR REPLACE INTO vault_items(k,v) VALUES (?,?)",-1,&stmt,nil)==SQLITE_OK,let s=stmt else{throw NSError(domain:"Vault",code:7)}
    self.bind(s,1,key);self.bind(s,2,text);let status=sqlite3_step(s);sqlite3_finalize(s);guard status==SQLITE_DONE else{throw NSError(domain:"Vault",code:8)}
   };guard sqlite3_exec(d,"COMMIT",nil,nil,nil)==SQLITE_OK else{throw NSError(domain:"Vault",code:9)}
  }catch{sqlite3_exec(d,"ROLLBACK",nil,nil,nil);throw error}
  call.resolve()
 }catch{call.reject("私人记录未写入，原数据保留")}}}
 private func query(_ sql:String,_ params:[String])throws->[[String:Any]]{
  let d=try database();var stmt:OpaquePointer?;guard sqlite3_prepare_v2(d,sql,-1,&stmt,nil)==SQLITE_OK,let s=stmt else{throw NSError(domain:"Vault",code:10)};defer{sqlite3_finalize(s)}
  for (i,v) in params.enumerated(){bind(s,Int32(i+1),v)}
  var rows:[[String:Any]]=[];var code=sqlite3_step(s)
  while code==SQLITE_ROW{let k=String(cString:sqlite3_column_text(s,0)),v=String(cString:sqlite3_column_text(s,1));let value=try JSONSerialization.jsonObject(with:Data(v.utf8),options:.fragmentsAllowed);rows.append(["key":k,"value":value]);code=sqlite3_step(s)}
  guard code==SQLITE_DONE else{throw NSError(domain:"Vault",code:11)};return rows
 }
 @objc func page(_ call:CAPPluginCall){queue.async{do{let p=call.getString("prefix") ?? "";guard self.valid(p) else{throw NSError(domain:"Vault",code:12)};let rows=try self.query("SELECT k,v FROM vault_items WHERE k>=? AND k<? AND k>? ORDER BY k LIMIT ?",[p,p+"\u{ffff}",call.getString("after") ?? "",String(max(1,min(1000,call.getInt("limit") ?? 100)))]);call.resolve(["rows":rows])}catch{call.reject("私人记录索引读取失败")}}}
 @objc func read(_ call:CAPPluginCall){queue.async{do{let k=call.getString("key") ?? "";guard self.valid(k) else{throw NSError(domain:"Vault",code:13)};let rows=try self.query("SELECT k,v FROM vault_items WHERE k=?",[k]);if let value=rows.first?["value"]{call.resolve(["value":value])}else{call.resolve()}}catch{call.reject("私人记录读取失败")}}}
 @objc func ocr(_ call:CAPPluginCall){queue.async{do{
  guard let encoded=call.getString("base64"),encoded.count<28000000,let data=Data(base64Encoded:encoded),let image=UIImage(data:data),let cg=image.cgImage else{throw NSError(domain:"OCR",code:1)}
  let request=VNRecognizeTextRequest();request.recognitionLevel = .accurate;request.recognitionLanguages=["zh-Hans","zh-Hant","en-US"];request.usesLanguageCorrection=false
  let orientations:[UIImage.Orientation:CGImagePropertyOrientation]=[.up:.up,.down:.down,.left:.left,.right:.right,.upMirrored:.upMirrored,.downMirrored:.downMirrored,.leftMirrored:.leftMirrored,.rightMirrored:.rightMirrored]
  try VNImageRequestHandler(cgImage:cg,orientation:orientations[image.imageOrientation] ?? .up,options:[:]).perform([request])
  let blocks:[[String:Any]]=(request.results ?? []).enumerated().compactMap{index,observation in guard let text=observation.topCandidates(1).first else{return nil};let b=observation.boundingBox;return ["id":"line-\(index)","page":1,"text":text.string,"confidence":text.confidence,"box":[b.minX,1-b.maxY,b.width,b.height]]}
  call.resolve(["blocks":blocks,"model":"Apple Vision VNRecognizeTextRequest revision \(request.revision)","confirmed":false])
 }catch{call.reject("本机识字失败，请保留原件手动核对；未调用云端")}}}
 @objc func saveDocument(_ call:CAPPluginCall){DispatchQueue.main.async{do{
  guard self.exportCall==nil,let encoded=call.getString("base64"),let data=Data(base64Encoded:encoded) else{throw NSError(domain:"Export",code:1)}
  let name=(call.getString("name") ?? "言道资料.bin").replacingOccurrences(of:"[/\\\\\\p{Cc}]",with:"_",options:.regularExpression)
  let dir=FileManager.default.temporaryDirectory.appendingPathComponent("life-export-"+UUID().uuidString,isDirectory:true);try FileManager.default.createDirectory(at:dir,withIntermediateDirectories:true,attributes:[.protectionKey:FileProtectionType.complete]);let file=dir.appendingPathComponent(name);try data.write(to:file,options:[.atomic,.completeFileProtection]);self.exportURL=file;self.exportCall=call
  let picker=UIDocumentPickerViewController(forExporting:[file],asCopy:true);picker.delegate=self;self.bridge?.viewController?.present(picker,animated:true)
 }catch{self.clearExport();call.reject("无法打开系统文件保存窗口")}}}
 private func clearExport(){if let file=exportURL{try? FileManager.default.removeItem(at:file);try? FileManager.default.removeItem(at:file.deletingLastPathComponent())};exportURL=nil;exportCall=nil}
 public func documentPicker(_ controller:UIDocumentPickerViewController,didPickDocumentsAt urls:[URL]){let call=exportCall;clearExport();call?.resolve(["saved":!urls.isEmpty])}
 public func documentPickerWasCancelled(_ controller:UIDocumentPickerViewController){let call=exportCall;clearExport();call?.resolve(["saved":false])}
 deinit{if let d=db{sqlite3_close(d)}}
}
