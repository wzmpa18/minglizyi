"""
完整捕获jishiyu基准页紫微斗数和大六壬结果截图
"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

OUT_ZW = Path(r"C:\Users\ZhuanZ\AppData\Roaming\TRAE SOLO CN\ModularData\ai-agent\work-mode-projects\6a6580914b5a620c48f555a3\yixuezyizuixin\05-验收报告\01-紫微斗数")
OUT_DLR = Path(r"C:\Users\ZhuanZ\AppData\Roaming\TRAE SOLO CN\ModularData\ai-agent\work-mode-projects\6a6580914b5a620c48f555a3\yixuezyizuixin\05-验收报告\03-大六壬")
JISHIYU = "http://localhost:3001/index.html"
VIEWPORT = {"width": 375, "height": 812}

async def fill_and_submit_ziwei(page, y, m, d, h, gender="男"):
    """填写紫微斗数表单并提交"""
    # 找到表单输入框（layui风格）
    # 等待表单出现
    await page.wait_for_timeout(1500)
    
    # 尝试填写年月日时 - jishiyu可能使用select下拉框
    # 先截图看状态
    await page.screenshot(path=str(OUT_ZW / "jishiyu_zw_form.png"), full_page=False)
    
    # 查找输入框
    selects = page.locator("select")
    inputs = page.locator("input")
    print(f"  selects: {await selects.count()}, inputs: {await inputs.count()}")
    
    # 点击排盘按钮
    btns = page.get_by_role("button")
    btn_count = await btns.count()
    print(f"  buttons: {btn_count}")
    
    # 尝试找排盘按钮
    for i in range(btn_count):
        btn = btns.nth(i)
        text = await btn.inner_text()
        if "排盘" in text or "确定" in text or "开始" in text:
            print(f"  点击按钮: {text}")
            await btn.click()
            await page.wait_for_timeout(3000)
            return True
    
    # 如果没找到按钮，尝试找submit类型的input
    for i in range(await inputs.count()):
        inp = inputs.nth(i)
        try:
            itype = await inp.get_attribute("type")
            ivalue = await inp.get_attribute("value") or ""
            if itype == "submit" or "排盘" in ivalue:
                await inp.click()
                await page.wait_for_timeout(3000)
                return True
        except:
            pass
    
    return False

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport=VIEWPORT, device_scale_factor=2,
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)"
        )
        page = await context.new_page()
        
        # ===== 紫微斗数 =====
        print("=== 紫微斗数基准截图 ===")
        await page.goto(JISHIYU, wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(2000)
        
        # 点击紫微斗数入口
        zw_link = page.get_by_text("紫微斗数").first
        await zw_link.click()
        await page.wait_for_timeout(2000)
        
        # 截图表单状态
        await page.screenshot(path=str(OUT_ZW / "jishiyu_zw_form.png"), full_page=False)
        print("已截取jishiyu紫微表单页")
        
        # 直接使用默认参数点击排盘
        success = await fill_and_submit_ziwei(page, 1990, 6, 15, 0)
        if success:
            await page.screenshot(path=str(OUT_ZW / "jishiyu_zw_result.png"), full_page=True)
            print("已截取jishiyu紫微结果页")
        else:
            print("未能自动排盘，保存当前页面")
            await page.screenshot(path=str(OUT_ZW / "jishiyu_zw_result.png"), full_page=True)
        
        # ===== 大六壬 =====
        print("\n=== 大六壬基准截图 ===")
        await page.goto(JISHIYU, wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(2000)
        
        dlr_link = page.get_by_text("大六壬").first
        await dlr_link.click()
        await page.wait_for_timeout(2000)
        
        await page.screenshot(path=str(OUT_DLR / "jishiyu_dlr_form.png"), full_page=False)
        print("已截取jishiyu大六壬表单页")
        
        success = await fill_and_submit_ziwei(page, 2026, 7, 29, 19)
        if success:
            await page.screenshot(path=str(OUT_DLR / "jishiyu_dlr_result.png"), full_page=True)
            print("已截取jishiyu大六壬结果页")
        else:
            await page.screenshot(path=str(OUT_DLR / "jishiyu_dlr_result.png"), full_page=True)
        
        await browser.close()
    print("\n完成")

if __name__ == "__main__":
    asyncio.run(main())
