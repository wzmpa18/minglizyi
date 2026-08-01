"""
修复紫微斗数jishiyu截图 - 使用更宽泛的元素查找
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
        
        # 紫微斗数
        print("=== 紫微斗数基准截图 ===")
        await page.goto(JISHIYU, wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(2000)
        
        # 点击紫微斗数
        await page.get_by_text("紫微斗数").first.click()
        await page.wait_for_timeout(2000)
        
        # 尝试点击所有可点击元素中包含"排盘"的
        all_clickable = page.locator("a, input[type='submit'], input[type='button'], button, .layui-btn")
        count = await all_clickable.count()
        print(f"找到 {count} 个可点击元素")
        
        clicked = False
        for i in range(count):
            el = all_clickable.nth(i)
            try:
                text = await el.inner_text()
            except:
                try:
                    text = await el.get_attribute("value") or ""
                except:
                    text = ""
            if "排盘" in text or "开始" in text or "确定" in text:
                print(f"  点击: {text}")
                await el.click()
                clicked = True
                await page.wait_for_timeout(3000)
                break
        
        if not clicked:
            # 尝试点击layui-btn
            layui_btns = page.locator(".layui-btn")
            lc = await layui_btns.count()
            print(f"layui-btn: {lc}")
            if lc > 0:
                for i in range(lc):
                    btn = layui_btns.nth(i)
                    t = await btn.inner_text()
                    print(f"  btn{i}: {t}")
                    if "排" in t or "确" in t:
                        await btn.click()
                        await page.wait_for_timeout(3000)
                        clicked = True
                        break
                if not clicked and lc > 0:
                    await layui_btns.first.click()
                    await page.wait_for_timeout(3000)
                    clicked = True
        
        await page.screenshot(path=str(OUT_ZW / "jishiyu_zw_result.png"), full_page=True)
        print("已保存jishiyu紫微结果页")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
