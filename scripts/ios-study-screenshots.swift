import XCTest

final class GuoxueStudyScreenshots: XCTestCase {
    private func shot(_ name:String,_ app:XCUIApplication){
        let attachment=XCTAttachment(screenshot:app.screenshot())
        attachment.name=name;attachment.lifetime = .keepAlways;add(attachment)
    }
    private func tapVisible(_ query:XCUIElementQuery,_ name:String,_ app:XCUIApplication){
        let element=query.matching(NSPredicate(format:"label CONTAINS %@",name)).firstMatch
        XCTAssertTrue(element.waitForExistence(timeout:30),"Missing UI: "+name)
        for _ in 0..<16 {if element.isHittable {if !element.isEnabled{let ready=XCTNSPredicateExpectation(predicate:NSPredicate(format:"enabled == true"),object:element);guard XCTWaiter.wait(for:[ready],timeout:15) == .completed else{XCTFail("UI remained disabled: "+name);return}};element.tap();return};if element.frame.minY<70{app.swipeDown()}else{app.swipeUp()}}
        XCTFail("UI not reachable: "+name)
    }
    private func awaitHome(_ app:XCUIApplication){
        let consent=app.buttons["同意并继续"],home=app.links["我的"].firstMatch
        // A cold WKWebView can mount privacy consent after the launch animation.
        // Wait for actual visible controls; do not assume an eight-second delay.
        let ready=XCTNSPredicateExpectation(predicate:NSPredicate { _,_ in
            (consent.exists && consent.isHittable) || (home.exists && home.isHittable)
        },object:app)
        guard XCTWaiter.wait(for:[ready],timeout:60) == .completed else{shot("00_实际启动未就绪",app);XCTFail("Actual privacy or home UI must become visible");return}
        if consent.exists && consent.isHittable{consent.tap()}
        guard home.waitForExistence(timeout:30) else{shot("00_实际首页未出现",app);XCTFail("Home must be reachable after consent");return}
    }
    func testCompleteAnatomyDownloadEntry() throws {
        continueAfterFailure=false
        let app=XCUIApplication();app.launchArguments += ["-AppleLanguages","(zh-Hans)","-AppleLocale","zh_CN"];app.launch()
        awaitHome(app)
        tapVisible(app.links,"我的",app)
        if !app.buttons.matching(NSPredicate(format:"label CONTAINS %@","离线内容")).firstMatch.exists {tapVisible(app.buttons,"系统中心",app)}
        tapVisible(app.buttons,"离线内容",app)
        XCTAssertTrue(app.staticTexts["完整三维学习资料"].waitForExistence(timeout:45),"The published anatomy resources must be grouped into one download entry")
        XCTAssertEqual(app.buttons.matching(identifier:"一次下载完整资料").count,1)
        XCTAssertFalse(app.staticTexts["三维人体四层观察包"].exists)
        XCTAssertFalse(app.staticTexts["三维解剖与经络学习图谱"].exists)
        shot("07_真实应用_三维资料一次下载",app)
    }
    func testNativeLearningImagesSurviveRestart() throws {
        continueAfterFailure=false
        let app=XCUIApplication()
        func openOffline(){
            awaitHome(app);tapVisible(app.links,"我的",app)
            // Wait for the persisted drawer state to hydrate before toggling it.
            // Otherwise a fast relaunch can close an already restored drawer.
            if !app.buttons.matching(NSPredicate(format:"label CONTAINS %@","离线内容")).firstMatch.waitForExistence(timeout:5){tapVisible(app.buttons,"系统中心",app)}
            tapVisible(app.buttons,"离线内容",app)
            XCTAssertTrue(app.staticTexts["本机离线保存正常"].waitForExistence(timeout:30))
            tapVisible(app.links,"查看动图与图片示例",app)
            guard app.staticTexts["合谷"].firstMatch.waitForExistence(timeout:30) else{shot("08_合谷详情实际导航失败",app);XCTFail("The actual client route must open the requested point, not reload the home page");return}
        }
        app.launchArguments += ["-AppleLanguages","(zh-Hans)","-AppleLocale","zh_CN"]
        app.launch();openOffline()
        let saved=app.staticTexts["合谷图片已保存，可离线查看"],animation=app.staticTexts["本经动图已保存，可离线查看"]
        guard saved.waitForExistence(timeout:60) else{shot("08_合谷原图实际保存失败",app);XCTFail("An original image must be SHA verified and saved through the real native bridge");return}
        XCTAssertTrue(animation.waitForExistence(timeout:30))
        shot("08_真实应用_原图与动图原生保存",app)
        app.terminate()
        app.launchArguments += ["--qa-learning-offline"]
        app.launch();openOffline()
        XCTAssertTrue(saved.waitForExistence(timeout:30),"Retained images must resolve while CI blocks fetch/XHR after restart")
        XCTAssertTrue(animation.waitForExistence(timeout:30))
        shot("09_真实应用_重启并阻断网络后读回原图",app)
    }
    func testLifePrivateNativeStorage() throws {
        continueAfterFailure=false
        let app=XCUIApplication();app.launchArguments += ["-AppleLanguages","(zh-Hans)","-AppleLocale","zh_CN"];app.launch()
        awaitHome(app)
        tapVisible(app.links,"我的",app);tapVisible(app.links,"人生记录",app)
        let password=app.secureTextFields["档案密码"].firstMatch
        XCTAssertTrue(password.waitForExistence(timeout:30),"Private local mode must work without social login")
        password.tap();password.typeText("qa-native-vault-20261019")
        tapVisible(app.buttons,"新建独立档案",app)
        let acknowledged=app.buttons["已自行妥善保存"]
        guard acknowledged.waitForExistence(timeout:30) else {shot("09_实际原生档案新建失败现场",app);XCTFail("Real WebCrypto and native SQLite must create an encrypted vault");return}
        acknowledged.tap();tapVisible(app.buttons,"新增记录",app)
        let title=app.textFields["标题"].firstMatch
        XCTAssertTrue(title.waitForExistence(timeout:15));title.tap();title.typeText("QA synthetic local record")
        let body=app.textViews.matching(NSPredicate(format:"label BEGINSWITH %@","正文")).firstMatch
        XCTAssertTrue(body.exists);body.tap();let sample=String(repeating:"Synthetic private note, not a real patient. ",count:24);body.typeText(sample)
        // Finish the native keyboard interaction before scrolling to the sticky
        // toolbar. A WebKit keyboard scroll can otherwise consume the first tap.
        let keyboardDone=app.toolbars.buttons["完成"].firstMatch
        if keyboardDone.exists && keyboardDone.isHittable {keyboardDone.tap()}
        tapVisible(app.buttons,"保存记录",app)
        guard app.staticTexts["已保存到本机档案，未上传"].waitForExistence(timeout:30) else {shot("10_实际保存提示未出现",app);XCTFail("Manual save must acknowledge the real committed record");return}
        tapVisible(app.buttons,"关闭编辑",app)
        shot("06_真实应用_人生记录_合成测试数据",app)
        tapVisible(app.buttons,"锁定",app)
        XCTAssertTrue(password.waitForExistence(timeout:10));password.tap();password.typeText("qa-native-vault-20261019");tapVisible(app.buttons,"解锁档案",app)
        let record=app.buttons.matching(NSPredicate(format:"label CONTAINS %@","QA synthetic local record")).firstMatch
        XCTAssertTrue(record.waitForExistence(timeout:30),"Lock and reopen must retain the local original")
        record.tap();XCTAssertTrue(body.waitForExistence(timeout:15));XCTAssertEqual(body.value as? String,sample,"Private notes must not be truncated at the public 500-character limit")
        tapVisible(app.buttons,"关闭编辑",app);tapVisible(app.buttons,"备份与导出",app);tapVisible(app.buttons,"刷新本机用量",app)
        let space=app.staticTexts.matching(NSPredicate(format:"label BEGINSWITH %@","可用容量：")).firstMatch
        XCTAssertTrue(space.waitForExistence(timeout:25),"Native disk capacity must be returned by LifeVault, not a browser quota")
        XCTAssertNotNil(space.label.range(of:"[0-9]+\\.[0-9]+ (KiB|MiB)",options:.regularExpression),"Do not substitute an unknown capacity or a fabricated success")
        shot("07_真实应用_本机容量与备份状态",app)
    }
    private func captureProduct(_ name:String,_ key:String,_ app:XCUIApplication){
        let title=app.staticTexts[name].firstMatch
        XCTAssertTrue(title.waitForExistence(timeout:30),"Missing product label: "+name)
        for _ in 0..<40 {
            let y=title.frame.minY
            if title.isHittable {
                shot("IAP_"+key+"_真实商品入口_未模拟价格",app);return
            }
            let from=app.coordinate(withNormalizedOffset:CGVector(dx:0.5,dy:0.72))
            let to=app.coordinate(withNormalizedOffset:CGVector(dx:0.5,dy:0.52))
            if y > 0 && y < 70 {to.press(forDuration:0.05,thenDragTo:from)}
            else {from.press(forDuration:0.05,thenDragTo:to)}
        }
        XCTFail("Could not frame product: "+name)
    }
    func testActualLearningScreens() throws {
        continueAfterFailure=false
        let app=XCUIApplication();app.launchArguments += ["-AppleLanguages","(zh-Hans)","-AppleLocale","zh_CN"]
        app.launch()
        let consent=app.buttons["同意并继续"]
        let start=app.links.matching(NSPredicate(format:"label CONTAINS %@","开始入门学习")).firstMatch
        // A fresh WebKit process can show the privacy gate after the launch
        // snapshot. Wait for the real UI, rather than skipping late consent.
        for _ in 0..<30 {
            if consent.exists && consent.isHittable {consent.tap()}
            if start.waitForExistence(timeout:3){break}
        }
        XCTAssertTrue(start.exists,"Learning home must load after the visible privacy gate")
        shot("00_真实应用_学习首页",app)
        start.tap()
        let lesson=app.buttons["标记已读，开始自测"]
        XCTAssertTrue(lesson.waitForExistence(timeout:40),"Real bundled learning screen did not load")
        shot("01_真实应用_经典入门与连续听学",app)
        tapVisible(app.links,"打开中医典籍库",app)
        XCTAssertTrue(app.staticTexts.containing(NSPredicate(format:"label CONTAINS %@","典籍")).firstMatch.waitForExistence(timeout:25))
        shot("02_真实应用_中医整本典籍",app)
        tapVisible(app.links,"首页",app)
        tapVisible(app.links,"言道日历",app)
        XCTAssertTrue(app.buttons["全屏国风时钟"].waitForExistence(timeout:30),"Calendar must actually render")
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format:"label CONTAINS %@","非出生四柱")).firstMatch.exists)
        shot("04_真实应用_言道日历_已验证页面",app)
        tapVisible(app.links,"桌面组件与提醒设置",app)
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format:"label CONTAINS %@","当前包已接入")).firstMatch.waitForExistence(timeout:20),"Native calendar plugin must report widget support")
        app.buttons["刷新组件快照与提醒"].tap()
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format:"label CONTAINS %@","已向系统同步0条提醒")).firstMatch.waitForExistence(timeout:30),"Snapshot must be written through the real native bridge")
        shot("05_真实应用_系统组件支持说明",app)
        tapVisible(app.links,"我的",app)
        tapVisible(app.links,"会员中心",app)
        let purchase=app.staticTexts["把经典读深，把学习继续"]
        if purchase.waitForExistence(timeout:20){shot("03_真实应用_学习会员审核参考",app)}
        else {shot("03_真实应用_个人中心",app)}
        for (name,key) in [("月度会员","monthly"),("季度会员","quarterly"),("年度会员","yearly"),("终身会员","lifetime")] {
            captureProduct(name,key,app)
        }
        tapVisible(app.links,"AI点数",app)
        for count in [10,50,100,500] {captureProduct("\(count)点AI学习点数","credits\(count)",app)}
    }
}
