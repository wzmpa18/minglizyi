"""
生成并排对比图
"""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

OUT_ZW = Path(r"C:\Users\ZhuanZ\AppData\Roaming\TRAE SOLO CN\ModularData\ai-agent\work-mode-projects\6a6580914b5a620c48f555a3\yixuezyizuixin\05-验收报告\01-紫微斗数")
OUT_DLR = Path(r"C:\Users\ZhuanZ\AppData\Roaming\TRAE SOLO CN\ModularData\ai-agent\work-mode-projects\6a6580914b5a620c48f555a3\yixuezyizuixin\05-验收报告\03-大六壬")
OUT_HOME = Path(r"C:\Users\ZhuanZ\AppData\Roaming\TRAE SOLO CN\ModularData\ai-agent\work-mode-projects\6a6580914b5a620c48f555a3\yixuezyizuixin\05-验收报告\02-首页校准")

def make_side_by_side(left_path, right_path, output_path, left_label="jishiyu基准", right_label="当前系统", target_h=None):
    """合成并排对比图"""
    if not left_path.exists() or not right_path.exists():
        print(f"  跳过: {output_path.name} (源文件缺失)")
        return False
    
    left = Image.open(left_path).convert("RGB")
    right = Image.open(right_path).convert("RGB")
    
    # 统一高度
    if target_h is None:
        target_h = min(left.height, right.height, 2000)
    
    if left.height != target_h:
        w = int(left.width * target_h / left.height)
        left = left.resize((w, target_h), Image.LANCZOS)
    if right.height != target_h:
        w = int(right.width * target_h / right.height)
        right = right.resize((w, target_h), Image.LANCZOS)
    
    # 统一宽度
    w = max(left.width, right.width)
    canvas = Image.new("RGB", (w * 2 + 4, target_h + 40), (255, 255, 255))
    
    # 粘贴
    canvas.paste(left, (0, 40))
    canvas.paste(right, (w + 4, 40))
    
    # 画分隔线
    draw = ImageDraw.Draw(canvas)
    draw.line([(w + 2, 40), (w + 2, target_h + 40)], fill=(200, 0, 0), width=2)
    
    # 标签
    try:
        font = ImageFont.truetype("msyh.ttc", 24)
    except:
        font = ImageFont.load_default()
    draw.text((10, 8), left_label, fill=(200, 0, 0), font=font)
    draw.text((w + 14, 8), right_label, fill=(0, 100, 200), font=font)
    
    canvas.save(str(output_path), quality=90)
    print(f"  已生成: {output_path.name}")
    return True

# 大六壬并排对比
print("=== 大六壬并排对比 ===")
make_side_by_side(
    OUT_DLR / "jishiyu_dlr_result.png",
    OUT_DLR / "01_八专课_2026_07_29_19.png",
    OUT_DLR / "06_并排对比_jishiyu_vs_ours.png",
    "jishiyu基准（默认参数）", "当前系统（八专课2026-07-29）"
)

# 首页并排对比（已有）
print("\n=== 首页并排对比 ===")
make_side_by_side(
    OUT_HOME / "01_ref_jishiyu.png",
    OUT_HOME / "02_ours_current.png",
    OUT_HOME / "06_并排对比.png",
    "jishiyu基准", "当前系统"
)

print("\n完成")
