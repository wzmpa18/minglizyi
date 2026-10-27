import XCTest

/// Real, pinned application UI only. No mock pages, simulated entitlements,
/// purchase actions, external messages or private-account screenshots.
final class GuoxueStudyMarketing: XCTestCase {
    private func shot(_ feature:String,_ name:String,_ app:XCUIApplication){
        let attachment=XCTAttachment(screenshot:app.screenshot())
        attachment.name="MARKETING_"+feature+"_"+name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
    private func insideContent(_ box:CGRect,_ screen:CGRect)->Bool{
        return !box.isEmpty && box.minY>=screen.minY+65 && box.maxY<=screen.maxY-100
    }
    private func fixedTab(_ label:String,_ type:XCUIElement.ElementType)->Bool{
        return type == .link && Set(["首页","发现","言道学堂","聊天","我的"]).contains(label)
    }
    private func visible(_ element:XCUIElement,_ app:XCUIApplication)->Bool{
        return element.exists && element.isHittable && insideContent(element.frame,app.frame)
    }
    private func reveal(_ element:XCUIElement,_ app:XCUIApplication){
        XCTAssertTrue(element.waitForExistence(timeout:45),"The requested public learning control must exist")
        guard !fixedTab(element.label,element.elementType) else{
            XCTFail("Fixed bottom navigation must use tab(), never document scrolling");return
        }
        for _ in 0..<40{
            if visible(element,app){return}
            let box=element.frame
            let from=app.coordinate(withNormalizedOffset:CGVector(dx:0.48,dy:0.70))
            let to=app.coordinate(withNormalizedOffset:CGVector(dx:0.48,dy:0.43))
            if box.minY<app.frame.minY+65{to.press(forDuration:0.05,thenDragTo:from)}else{from.press(forDuration:0.05,thenDragTo:to)}
        }
        XCTFail("The requested learning control never entered the complete usable viewport")
    }
    private func element(_ name:String,_ app:XCUIApplication)->XCUIElement{
        let predicate=NSPredicate(format:"label CONTAINS %@",name)
        let button=app.buttons.matching(predicate).firstMatch,link=app.links.matching(predicate).firstMatch,text=app.staticTexts.matching(predicate).firstMatch
        for _ in 0..<60 {
            if button.exists{return button};if link.exists{return link};if text.exists{return text}
            Thread.sleep(forTimeInterval:0.25)
        }
        return button
    }
    private func tap(_ name:String,_ app:XCUIApplication){
        let target=element(name,app)
        reveal(target,app)
        let enabled=XCTNSPredicateExpectation(predicate:NSPredicate(format:"enabled == true"),object:target)
        XCTAssertEqual(XCTWaiter.wait(for:[enabled],timeout:20),.completed,"Learning action must be enabled")
        target.tap()
    }
    private func tab(_ name:String,_ app:XCUIApplication){
        // Fixed bottom navigation is intentionally below the document viewport.
        // Scrolling the document cannot move it into reveal()'s content bounds.
        let target=app.links[name].firstMatch
        let ready=XCTNSPredicateExpectation(predicate:NSPredicate{_,_ in
            target.exists && target.isHittable && target.isEnabled && target.frame.intersects(app.frame)
        },object:target)
        XCTAssertEqual(XCTWaiter.wait(for:[ready],timeout:30),.completed,"The real bottom navigation must be visible and tappable")
        target.tap()
    }
    private func home(_ app:XCUIApplication){
        let consent=app.buttons["同意并继续"]
        let home=app.links["首页"].firstMatch
        let ready=XCTNSPredicateExpectation(predicate:NSPredicate{_,_ in (consent.exists && consent.isHittable)||(home.exists && home.isHittable)},object:app)
        XCTAssertEqual(XCTWaiter.wait(for:[ready],timeout:60),.completed,"The real application must finish mounting")
        if consent.exists && consent.isHittable{consent.tap()}
        XCTAssertTrue(home.waitForExistence(timeout:30))
        tab("首页",app)
        XCTAssertTrue(app.links.matching(NSPredicate(format:"label CONTAINS %@","中医学习")).firstMatch.waitForExistence(timeout:30))
    }
    private func medical(_ app:XCUIApplication){
        home(app);tap("中医学习",app)
        XCTAssertTrue(app.links.matching(NSPredicate(format:"label CONTAINS %@","倪师自学专区")).firstMatch.waitForExistence(timeout:45))
    }
    private func pastePublicNote(_ field:XCUIElement,_ app:XCUIApplication){
        reveal(field,app);field.tap();field.press(forDuration:1.1)
        let chinese=app.menuItems["粘贴"].firstMatch,english=app.menuItems["Paste"].firstMatch
        let button=app.buttons["粘贴"].firstMatch
        if chinese.waitForExistence(timeout:3){chinese.tap()}
        else if english.exists{english.tap()}
        else if button.exists{button.tap()}
        else{field.typeText("Study note: verify the source before summarizing.")}
        let done=app.toolbars.buttons["完成"].firstMatch
        if done.exists && done.isHittable{done.tap()}
    }
    func testFixedBottomNavigationLayoutGuard(){
        let screen=CGRect(x:0,y:0,width:440,height:956)
        let footer=CGRect(x:360,y:900,width:60,height:40)
        XCTAssertFalse(insideContent(footer,screen))
        XCTAssertTrue(footer.intersects(screen))
        XCTAssertTrue(fixedTab("我的",.link))
        XCTAssertTrue(fixedTab("首页",.link))
        XCTAssertFalse(fixedTab("我的学习笔记",.staticText))
        XCTAssertTrue(insideContent(CGRect(x:20,y:120,width:400,height:80),screen))
    }
    func testLatestLearningMarketing() throws{
        continueAfterFailure=false
        guard let session=ProcessInfo.processInfo.environment["GUOXUE_QA_SESSION_B64"],!session.isEmpty else{XCTFail("The normal review session was not forwarded to this isolated test runner");return}
        let app=XCUIApplication()
        app.launchArguments += ["-AppleLanguages","(zh-Hans)","-AppleLocale","zh_CN","--qa-marketing-auth"]
        app.launchEnvironment["GUOXUE_QA_SESSION_B64"]=session
        app.launch()
        medical(app)
        reveal(app.links.matching(NSPredicate(format:"label CONTAINS %@","倪师自学专区")).firstMatch,app)
        shot("medical-home","中医学习首页",app)

        tap("倪师自学专区",app)
        tap("保存完整中医资料",app)
        let prepared=app.staticTexts["中医资料已保存，可离线阅读。"].firstMatch
        XCTAssertTrue(prepared.waitForExistence(timeout:600),"The real client must finish its authorized content and member-model download")
        let lecture=app.buttons.matching(NSPredicate(format:"label CONTAINS %@","人纪·针灸教程")).firstMatch
        reveal(lecture,app);lecture.tap()
        let annotation=app.buttons["摘录并批注"].firstMatch
        XCTAssertTrue(annotation.waitForExistence(timeout:60),"The installed real course must expose its original excerpts")
        reveal(app.staticTexts["人纪·针灸教程"].firstMatch,app)
        shot("ni-study","课程原课摘记",app)
        reveal(annotation,app)
        annotation.tap()
        let comment=app.textViews["原文批注"].firstMatch
        XCTAssertTrue(comment.waitForExistence(timeout:30))
        pastePublicNote(comment,app)
        tap("保存摘录与批注",app)
        XCTAssertTrue(app.staticTexts["原文摘录与批注已保存"].waitForExistence(timeout:30))
        tap("我的原文摘录与批注",app)
        let publicNote=app.staticTexts.matching(NSPredicate(format:"label CONTAINS %@","先核对原文出处")).firstMatch
        let fallbackNote=app.staticTexts.matching(NSPredicate(format:"label CONTAINS %@","Study note: verify the source")).firstMatch
        if publicNote.exists{reveal(publicNote,app)}else{reveal(fallbackNote,app)}
        reveal(app.staticTexts["我的学习笔记"].firstMatch,app)
        shot("ni-study","原文批注与个人笔记_公开演示文字",app)

        medical(app)
        tap("三维人体图谱",app)
        let reset=app.buttons["恢复完整体表与全身视角"].firstMatch
        XCTAssertTrue(reset.waitForExistence(timeout:120),"Authorized installed model must really open")
        let ready=app.staticTexts.matching(NSPredicate(format:"label BEGINSWITH %@","拖动旋转")).firstMatch
        XCTAssertTrue(ready.waitForExistence(timeout:120),"Actual model meshes must finish preparing")
        reset.tap()
        // Exercise the real WKWebView/system text-menu path, not just CSS in a
        // desktop browser. The current model gesture may inspect a layer; reset
        // below before capturing the product's default appearance.
        app.coordinate(withNormalizedOffset:CGVector(dx:0.5,dy:0.43)).press(forDuration:1.3)
        for label in ["拷贝","复制","查询","搜索网页","Copy","Look Up","Search Web"] {
            XCTAssertFalse(app.menuItems[label].exists,"Model gestures must not open a native text menu")
            let action=app.buttons[label].firstMatch
            XCTAssertFalse(action.exists && action.isHittable,"Model gestures must not expose native text actions")
        }
        reset.tap()
        // The renderer is real WKWebView/WebGL. Allow it to settle after the
        // user's reset; do not replace its canvas with any generated bitmap.
        Thread.sleep(forTimeInterval:2)
        shot("anatomy","默认体表与蓝色内裤",app)
        app.buttons["打开模型显示设置"].firstMatch.tap()
        XCTAssertTrue(app.buttons["关闭目录"].firstMatch.waitForExistence(timeout:10))
        shot("anatomy","独立设置侧栏与模型",app)
        app.coordinate(withNormalizedOffset:CGVector(dx:0.78,dy:0.42)).tap()
        let closeDirectory=app.buttons["关闭目录"].firstMatch
        let collapsed=XCTNSPredicateExpectation(predicate:NSPredicate{_,_ in !closeDirectory.exists || !closeDirectory.isHittable},object:closeDirectory)
        XCTAssertEqual(XCTWaiter.wait(for:[collapsed],timeout:10),.completed,"Model interaction must collapse the settings panel")
        reset.tap()
        app.buttons["返回中医"].firstMatch.tap()
        XCTAssertTrue(app.links.matching(NSPredicate(format:"label CONTAINS %@","倪师自学专区")).firstMatch.waitForExistence(timeout:30))

        tap("典籍原文",app)
        let book=app.links.matching(NSPredicate(format:"label CONTAINS %@","黄帝内经·素问原文")).firstMatch
        reveal(book,app)
        shot("original-texts","整本典籍与来源目录",app)
        book.tap();tap("上古天真",app)
        XCTAssertTrue(app.buttons["展开章节目录"].waitForExistence(timeout:30))
        shot("original-texts","古籍原文应用内阅读",app)

        home(app);tab("我的",app)
        let share=app.buttons.matching(NSPredicate(format:"label CONTAINS %@","学习分享码")).firstMatch
        if !share.waitForExistence(timeout:5){tap("学习分享",app)}
        reveal(share,app);share.tap()
        let copy=app.buttons["复制学习链接"].firstMatch
        XCTAssertTrue(copy.waitForExistence(timeout:45),"The ordinary server response must return the real learning share code")
        let enabled=XCTNSPredicateExpectation(predicate:NSPredicate(format:"enabled == true"),object:copy)
        XCTAssertEqual(XCTWaiter.wait(for:[enabled],timeout:20),.completed)
        reveal(copy,app)
        shot("study-sharing","学习分享码_未发起外部分享",app)
    }
}
