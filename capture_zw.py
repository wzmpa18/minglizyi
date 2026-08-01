"""
正确捕获jishiyu紫微斗数结果截图
"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

OUT_ZW = Path(r"C:\Users\ZhuanZ\AppData\Roaming\TRAE SOLO CN\ModularData\ai-agent\work-mode-projects\6a6580914b5a620c48f555a3\yixuezyizuixin\05-验收报告\01-紫微斗数")
JISHIYU = "http://localhost:3001/index.html"
VIEWPORT = {"width": 375, "height": 812}

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport=VIEWPORT, device_scale_factor=2,
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)"
        )
        page = await context.new_page()
        
        await page.goto(JISHIYU, wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(2000)
        
        # 关闭可能的弹窗
        try:
            close_btn = page.locator(".close, [class*='close'], .layui-layer-close, .icon-close, .cancel")
            for i in range(await close_btn.count()):
                await close_btn.nth(i).click()
                await page.wait_for_timeout(500)
        except:
            pass
        
        # 滚动到底部确保看到所有工具
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await page.wait_for_timeout(500)
        await page.screenshot(path=str(OUT_ZW / "jishiyu_home_scrolled.png"), full_page=False)
        
        # 找到紫微斗数链接 - 尝试多种选择器
        zw = None
        selectors = [
            "text=紫微斗数",
            "p:has-text('紫微斗数')",
            "div:has-text('紫微斗数')",
            "a:has-text('紫微斗数')",
        ]
        for sel in selectors:
            try:
                loc = page.locator(sel).first
                if await loc.is_visible(timeout=1000):
                    zw = loc
                    print(f"找到紫微斗数: {sel}")
                    break
            except:
                pass
        
        if zw:
            await zw.click()
            await page.wait_for_timeout(2000)
            await page.screenshot(path=str(OUT_ZW / "jishiyu_zw_form.png"), full_page=False)
            print("已打开紫微表单")
            
            # 截图查看表单结构后，点击排盘按钮
            # 查找红色按钮
            submit_btn = None
            for sel in ["text=排盘", "text=开始排盘", "text=确定", ".layui-btn", "a:has-text('排盘')"]:
                try:
                    loc = page.locator(sel).first
                    if await loc.is_visible(timeout=1000):
                        submit_btn = loc
                        print(f"找到排盘按钮: {sel}")
                        break
                except:
                    pass
            
            if submit_btn:
                await submit_btn.click()
                await page.wait_for_timeout(4000)
                await page.screenshot(path=str(OUT_ZW / "jishiyu_zw_result.png"), full_page=True)
                print("紫微结果页已保存")
            else:
                # 尝试点击所有链接
                links = page.locator("a")
                for i in range(await links.count()):
                    t = await links.nth(i).inner_text()
                    if "排" in t:
                        await links.nth(i).click()
                        await page.wait_for_timeout(4000)
                        await page.screenshot(path=str(OUT_ZW / "jishiyu_zw_result.png"), full_page=True)
                        print(f"点击链接: {t}")
                        break
        else:
            print("未找到紫微斗数入口")
            await page.screenshot(path=str(OUT_ZW / "jishiyu_zw_form.png"), full_page=True)
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
