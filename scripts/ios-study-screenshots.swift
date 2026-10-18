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
    }
}
