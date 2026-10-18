import XCTest

final class GuoxueStudyScreenshots: XCTestCase {
    private func shot(_ name:String,_ app:XCUIApplication){
        let attachment=XCTAttachment(screenshot:app.screenshot())
        attachment.name=name;attachment.lifetime = .keepAlways;add(attachment)
    }
    private func tapVisible(_ query:XCUIElementQuery,_ name:String,_ app:XCUIApplication){
        let element=query.matching(NSPredicate(format:"label CONTAINS %@",name)).firstMatch
        XCTAssertTrue(element.waitForExistence(timeout:30),"Missing UI: "+name)
        for _ in 0..<12 {if element.isHittable {element.tap();return};app.swipeUp()}
        XCTFail("UI not reachable: "+name)
    }
    private func captureProduct(_ name:String,_ key:String,_ app:XCUIApplication){
        let title=app.staticTexts[name].firstMatch
        XCTAssertTrue(title.waitForExistence(timeout:30),"Missing product label: "+name)
        for _ in 0..<40 {
            let y=title.frame.minY
            if title.isHittable && y >= 70 && y < app.frame.height * 0.3 {
                shot("IAP_"+key+"_真实商品入口_未模拟价格",app);return
            }
            let from=app.coordinate(withNormalizedOffset:CGVector(dx:0.5,dy:0.72))
            let to=app.coordinate(withNormalizedOffset:CGVector(dx:0.5,dy:0.52))
            if y < 70 {to.press(forDuration:0.05,thenDragTo:from)}
            else {from.press(forDuration:0.05,thenDragTo:to)}
        }
        XCTFail("Could not frame product: "+name)
    }
    func testActualLearningScreens() throws {
        continueAfterFailure=false
        let app=XCUIApplication();app.launchArguments += ["-AppleLanguages","(zh-Hans)","-AppleLocale","zh_CN"]
        app.launch()
        let consent=app.buttons["同意并继续"]
        if consent.waitForExistence(timeout:20){consent.tap()}
        shot("00_真实应用_学习首页",app)
        let start=app.links.matching(NSPredicate(format:"label CONTAINS %@","开始入门学习")).firstMatch
        if start.waitForExistence(timeout:25){start.tap()}
        let lesson=app.buttons["标记已读，开始自测"]
        XCTAssertTrue(lesson.waitForExistence(timeout:40),"Real bundled learning screen did not load")
        shot("01_真实应用_经典入门与连续听学",app)
        tapVisible(app.links,"打开中医典籍库",app)
        XCTAssertTrue(app.staticTexts.containing(NSPredicate(format:"label CONTAINS %@","典籍")).firstMatch.waitForExistence(timeout:25))
        shot("02_真实应用_中医整本典籍",app)
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
        tapVisible(app.links,"首页",app)
        tapVisible(app.links,"言道日历",app)
        XCTAssertTrue(app.buttons["全屏国风时钟"].waitForExistence(timeout:30),"Calendar must actually render")
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format:"label CONTAINS %@","非出生四柱")).firstMatch.exists)
        shot("04_真实应用_言道日历_已验证页面",app)
        tapVisible(app.links,"桌面组件与提醒设置",app)
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format:"label CONTAINS %@","WidgetKit")).firstMatch.waitForExistence(timeout:20))
        shot("05_真实应用_系统组件支持说明",app)
    }
}
