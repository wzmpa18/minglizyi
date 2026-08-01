# tcm-cli ICD-10 映射合规改造记录

## 改造日期
2026-07-26

## 改造范围
tcm-cli 项目源码中与 ICD-10 映射功能相关的所有文件。

## 改造目标
将 ICD-10 映射功能从「疾病诊断对应」定位修正为「学术研究参考」，确保符合合规要求。

---

## 改造详情

### 1. `src/tcm/tools/modern.py`（核心文件）

| 改造项 | 改造前 | 改造后 |
|--------|--------|--------|
| 模块文档字符串 | `Modern evidence tools: clinical trial search, pharmacokinetic data, modern indication mapping.` | 新增合规改造说明段落，标注「现代医学研究参考映射」定位 |
| 工具注册名 | `modern.indication_map` | `modern.research_reference_map` |
| 工具描述 | `Map a TCM syndrome to its closest modern medical diagnoses (ICD-10).` | `现代医学研究参考映射：将中医证候与现代医学分类体系（ICD-10）进行学术研究对照。仅为学术研究参考，不构成临床诊断对应关系` |
| usage_guide | `When bridging TCM syndrome with modern medical classification.` | `用于中医证候与现代医学分类体系的学术研究对照。仅为学术研究参考，不构成临床诊断对应关系` |
| 函数名 | `indication_map` | `research_reference_map` |
| 函数文档字符串 | `Map TCM syndrome to modern diagnoses.` | 完整合规改造说明，包含改造日期、改造动作、免责声明 |
| 数据字段名 | `"diagnosis"` | `"reference"` |
| 返回字段名 | `"modern_diagnoses"` | `"modern_references"` |
| 未找到消息 | `No ICD-10 mapping found for '...'. This is a simplified mapping; consult TCM-Western medicine integration references.` | `未找到与「...」相关的现代医学研究参考映射。本映射仅供学术研究参考，不构成临床诊断对应关系。如需进一步研究，建议查阅中西医结合研究参考文献。` |
| 数据字典注释 | 无 | 新增：「中医证候与现代医学分类体系（ICD-10）学术研究参考对照表」及「合规说明：以下对照关系仅供学术研究参考，不构成临床诊断对应关系」 |
| 免责声明 | 已部分存在 | 全面强化：所有映射结果、描述、使用指南中均前置「仅为学术研究参考，不构成临床诊断对应关系」 |

### 2. `src/tcm/ui/suggestions.py`

| 改造项 | 改造前 | 改造后 |
|--------|--------|--------|
| 建议文本 | `Map 肾阴虚 to modern learning_querys` | `现代医学研究参考映射：肾阴虚` |

### 3. `README.md`

| 改造项 | 改造前 | 改造后 |
|--------|--------|--------|
| 工具表格 Modern 行 | `Clinical trial search, ICD-10 mapping, evidence summaries` | `Clinical trial search, 现代医学研究参考映射, evidence summaries` |

---

## 改造原则

1. **功能保留**：所有 ICD-10 映射数据（SYNDROME_ICD_MAP）完整保留，不做删除或修改
2. **语义修正**：将「疾病诊断、对应病症」等强医疗导向语义替换为「研究参考」「学术对照」
3. **免责前置**：所有映射结果输出中前置免责标注「仅为学术研究参考，不构成临床诊断对应关系」
4. **文档标注**：在模块文档字符串、函数文档字符串和关键注释中标注合规改造信息

---

## 验收对照

| 验收标准 | 状态 |
|----------|------|
| 定位为学术研究参考，无疾病诊断属性 | 通过 |
| 免责标注完整 | 通过 |
| 无「疾病诊断、对应病症」等强医疗导向语义 | 通过 |
| ICD-10 映射功能本身未被删除 | 通过 |
| 所有映射数据保留 | 通过 |
| 仅修正语义 | 通过 |

---

## 涉及文件清单

1. `C:\Users\ZhuanZ\AppData\Roaming\TRAE SOLO CN\ModularData\ai-agent\work-mode-projects\6a6580914b5a620c48f555a3\yixuezyizuixin\02-中医开源项目源码\tcm-cli\src\tcm\tools\modern.py`
2. `C:\Users\ZhuanZ\AppData\Roaming\TRAE SOLO CN\ModularData\ai-agent\work-mode-projects\6a6580914b5a620c48f555a3\yixuezyizuixin\02-中医开源项目源码\tcm-cli\src\tcm\ui\suggestions.py`
3. `C:\Users\ZhuanZ\AppData\Roaming\TRAE SOLO CN\ModularData\ai-agent\work-mode-projects\6a6580914b5a620c48f555a3\yixuezyizuixin\02-中医开源项目源码\tcm-cli\README.md`