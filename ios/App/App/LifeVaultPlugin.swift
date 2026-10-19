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
 public let pluginMethods:[CAPPluginMethod]=[CAPPluginMethod(name:"commit",returnType:CAPPluginReturnPromise),CAPPluginMethod(name:"page",returnType:CAPPluginReturnPromise),CAPPluginMethod(name:"read",returnType:CAPPluginReturnPromise),CAPPluginMethod(name:"ocr",returnType:CAPPluginReturnPromise),CAPPluginMethod(name:"previewPdfPage",returnType:CAPPluginReturnPromise),CAPPluginMethod(name:"renderPdf",returnType:CAPPluginReturnPromise),CAPPluginMethod(name:"saveDocument",returnType:CAPPluginReturnPromise),CAPPluginMethod(name:"storageStatus",returnType:CAPPluginReturnPromise)]
 private let queue=DispatchQueue(label:"vip.yandao.private-vault")
 @objc func storageStatus(_ call:CAPPluginCall){queue.async{do{let dir=FileManager.default.urls(for:.applicationSupportDirectory,in:.userDomainMask)[0];let attrs=try FileManager.default.attributesOfFileSystem(forPath:dir.path);guard let free=attrs[.systemFreeSize] as? NSNumber else{throw NSError(domain:"VaultSpace",code:1)};let file=dir.appendingPathComponent("PrivateLifeVault/vault-v1.sqlite");let size=(try? FileManager.default.attributesOfItem(atPath:file.path)[.size] as? NSNumber)?.int64Value ?? 0;call.resolve(["availableBytes":free.int64Value,"databaseBytes":size])}catch{call.reject("当前设备未能读取剩余空间，未推测容量")}}}
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
  let d=try self.database();guard let rows=call.getArray("rows") as? [[String:Any]],rows.count<=20000 else{throw NSError(domain:"Vault",code:3)}
  guard sqlite3_exec(d,"BEGIN IMMEDIATE",nil,nil,nil)==SQLITE_OK else{throw NSError(domain:"Vault",code:4)}
  do{if let expected=call.getObject("check"),let key=expected["key"] as? String {guard self.valid(key) else{throw NSError(domain:"Vault",code:14)};let current=try self.query("SELECT k,v FROM vault_items WHERE k=?",[key]).first?["value"] as? [String:Any];guard (current?["etag"] as? String)==(expected["etag"] as? String) else{throw NSError(domain:"Vault",code:15)};if let prefix=expected["deletePrefix"] as? String{guard prefix.range(of:"^life:[a-zA-Z0-9_-]{8,80}:$",options:.regularExpression) != nil else{throw NSError(domain:"Vault",code:16)};var deletion:OpaquePointer?;guard sqlite3_prepare_v2(d,"DELETE FROM vault_items WHERE k>=? AND k<?",-1,&deletion,nil)==SQLITE_OK,let statement=deletion else{throw NSError(domain:"Vault",code:17)};self.bind(statement,1,prefix);self.bind(statement,2,prefix+"\u{ffff}");let code=sqlite3_step(statement);sqlite3_finalize(statement);guard code==SQLITE_DONE else{throw NSError(domain:"Vault",code:18)}}}
   for row in rows{guard let key=row["key"] as? String,self.valid(key),let value=row["value"] else{throw NSError(domain:"Vault",code:5)}
    if value is NSNull {var deletion:OpaquePointer?;guard sqlite3_prepare_v2(d,"DELETE FROM vault_items WHERE k=?",-1,&deletion,nil)==SQLITE_OK,let statement=deletion else{throw NSError(domain:"Vault",code:19)};self.bind(statement,1,key);let code=sqlite3_step(statement);sqlite3_finalize(statement);guard code==SQLITE_DONE else{throw NSError(domain:"Vault",code:20)};continue}
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
 @objc func read(_ call:CAPPluginCall){queue.async{do{let k=call.getString("key") ?? "";guard self.valid(k) else{throw NSError(domain:"Vault",code:13)};let rows=try self.query("SELECT k,v FROM vault_items WHERE k=?",[k]);if let value=rows.first?["value"]{call.resolve(["value":value])}else{call.resolve([:])}}catch{call.reject("私人记录读取失败")}}}
 private func pdfImage(_ data:Data,page:Int)throws->(CGImage,Int){
  guard data.count<=20*1024*1024,let provider=CGDataProvider(data:data as CFData),let pdf=CGPDFDocument(provider),!pdf.isEncrypted,page>0,page<=pdf.numberOfPages,pdf.numberOfPages<=10000,let selected=pdf.page(at:page) else{throw NSError(domain:"PDF",code:1)}
  let rect=selected.getBoxRect(.mediaBox);guard rect.width>0,rect.height>0 else{throw NSError(domain:"PDF",code:2)};let scale=3000/max(rect.width,rect.height),size=CGSize(width:rect.width*scale,height:rect.height*scale),format=UIGraphicsImageRendererFormat();format.scale=1;format.opaque=true
  let image=UIGraphicsImageRenderer(size:size,format:format).image{context in UIColor.white.setFill();context.fill(CGRect(origin:.zero,size:size));let cg=context.cgContext;cg.translateBy(x:0,y:size.height);cg.scaleBy(x:scale,y:-scale);cg.translateBy(x:-rect.minX,y:-rect.minY);cg.drawPDFPage(selected)}
  guard let cg=image.cgImage else{throw NSError(domain:"PDF",code:3)};return (cg,pdf.numberOfPages)
 }
 @objc func previewPdfPage(_ call:CAPPluginCall){queue.async{do{guard let encoded=call.getString("base64"),encoded.count<28000000,let data=Data(base64Encoded:encoded) else{throw NSError(domain:"PDF",code:4)};let (cg,total)=try self.pdfImage(data,page:call.getInt("page") ?? 1);guard let png=UIImage(cgImage:cg).pngData() else{throw NSError(domain:"PDF",code:5)};call.resolve(["base64":png.base64EncodedString(),"totalPages":total])}catch{call.reject("本机PDF页预览未完成，原件仍保留；未使用远程查看器")}}}
 @objc func ocr(_ call:CAPPluginCall){queue.async{do{
  guard let encoded=call.getString("base64"),encoded.count<28000000,let data=Data(base64Encoded:encoded) else{throw NSError(domain:"OCR",code:1)};let cg:CGImage,total:Int,page:Int
  if call.getString("type")=="application/pdf" {page=call.getInt("page") ?? 1;let rendered=try self.pdfImage(data,page:page);cg=rendered.0;total=rendered.1}
  else{guard let source=CGImageSourceCreateWithData(data as CFData,nil),let image=CGImageSourceCreateThumbnailAtIndex(source,0,[kCGImageSourceCreateThumbnailFromImageAlways:true,kCGImageSourceCreateThumbnailWithTransform:true,kCGImageSourceThumbnailMaxPixelSize:4000] as CFDictionary) else{throw NSError(domain:"OCR",code:2)};cg=image;page=1;total=1}
  let request=VNRecognizeTextRequest();request.recognitionLevel = .accurate;request.recognitionLanguages=["zh-Hans","zh-Hant","en-US"];request.usesLanguageCorrection=false
  try VNImageRequestHandler(cgImage:cg,orientation:.up,options:[:]).perform([request])
  let blocks:[[String:Any]]=(request.results ?? []).enumerated().compactMap{index,observation in guard let text=observation.topCandidates(1).first else{return nil};let b=observation.boundingBox;return ["id":"page-\(page)-line-\(index)","page":page,"text":text.string,"confidence":text.confidence,"box":[b.minX,1-b.maxY,b.width,b.height]]}
  call.resolve(["blocks":blocks,"model":"Apple Vision VNRecognizeTextRequest revision \(request.revision)","confirmed":false,"page":page,"totalPages":total])
 }catch{call.reject("本机识字失败，请保留原件手动核对；未调用云端。支持20MiB以内图片或逐页PDF")}}}
 @objc func renderPdf(_ call:CAPPluginCall){DispatchQueue.main.async{
  guard let text=call.getString("text"),text.count<=2000000 else{call.reject("单次PDF上限200万字符，请分批导出");return}
  let storage=NSTextStorage(string:text,attributes:[.font:UIFont.systemFont(ofSize:12),.foregroundColor:UIColor.black]);let layout=NSLayoutManager();storage.addLayoutManager(layout);let bounds=CGRect(x:0,y:0,width:595,height:842),area=CGRect(x:40,y:40,width:515,height:762);var ranges:[NSRange]=[]
  repeat{let container=NSTextContainer(size:area.size);container.lineFragmentPadding=0;layout.addTextContainer(container);let range=layout.glyphRange(for:container);ranges.append(range);if NSMaxRange(range)>=layout.numberOfGlyphs{break};if range.length==0||ranges.count>10000{call.reject("PDF布局未完成，请分批导出；原件保留");return}}while true
  let data=UIGraphicsPDFRenderer(bounds:bounds).pdfData{context in for range in ranges{context.beginPage();layout.drawBackground(forGlyphRange:range,at:area.origin);layout.drawGlyphs(forGlyphRange:range,at:area.origin)}}
  call.resolve(["base64":data.base64EncodedString()])
 }}
 @objc func saveDocument(_ call:CAPPluginCall){DispatchQueue.main.async{do{
  guard self.exportCall==nil else{call.reject("已有系统保存窗口，请先完成或取消");return}
  guard let presenter=self.bridge?.viewController else{call.reject("文件保存界面不可用");return}
  guard let encoded=call.getString("base64"),let data=Data(base64Encoded:encoded) else{throw NSError(domain:"Export",code:1)}
  let name=(call.getString("name") ?? "言道资料.bin").unicodeScalars.map { scalar in CharacterSet.controlCharacters.contains(scalar) || scalar.value == 47 || scalar.value == 92 ? "_" : String(scalar) }.joined()
  let dir=FileManager.default.temporaryDirectory.appendingPathComponent("life-export-"+UUID().uuidString,isDirectory:true);try FileManager.default.createDirectory(at:dir,withIntermediateDirectories:true,attributes:[.protectionKey:FileProtectionType.complete]);let file=dir.appendingPathComponent(name);try data.write(to:file,options:[.atomic,.completeFileProtection]);self.exportURL=file;self.exportCall=call
  let picker=UIDocumentPickerViewController(forExporting:[file],asCopy:true);picker.delegate=self;presenter.present(picker,animated:true)
 }catch{self.clearExport();call.reject("无法打开系统文件保存窗口")}}}
 private func clearExport(){if let file=exportURL{try? FileManager.default.removeItem(at:file);try? FileManager.default.removeItem(at:file.deletingLastPathComponent())};exportURL=nil;exportCall=nil}
 public func documentPicker(_ controller:UIDocumentPickerViewController,didPickDocumentsAt urls:[URL]){let call=exportCall;clearExport();call?.resolve(["saved":!urls.isEmpty])}
 public func documentPickerWasCancelled(_ controller:UIDocumentPickerViewController){let call=exportCall;clearExport();call?.resolve(["saved":false])}
 deinit{if let d=db{sqlite3_close(d)}}
}
