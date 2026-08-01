# 中医数据包

> **数据资产清单** | 传统文化科普记载，不构成医疗建议

---

## 一、数据资产清单

| 文件名 | 数据内容 | 数据量 | 来源项目 | 协议 |
|:---|:---|:---:|:---|:---:|
| 中药数据库.json | 中药材性味归经功效 | 347 味 | TCM-Learning-Assistant | MIT |
| 方剂数据库.json | 经典方剂组成功效 | 100 首 | TCM-Learning-Assistant | MIT |
| 经络穴位数据库.json | 十二经络 + 常用穴位 | 12 经 + 20 穴 | tcm-cli | MIT |
| 典籍文本库.json | 伤寒论/金匮/黄帝内经 | 1037 条 | nihaixia | MulanPSL-2.0 |
| tcm_工具函数.py | 性味匹配/方剂查询工具 | 约300行 | tcm-cli | MIT |

---

## 二、字段说明

### 2.1 中药数据库.json

| 字段 | 类型 | 说明 |
|:---|:---|:---|
| id | string | 唯一标识符 (h001~h347) |
| name | string | 中药名称 |
| pinyin | string | 拼音 |
| alias | array | 别名列表 |
| nature | string | 性味 (四气五味) |
| meridian | string | 归经 |
| efficacy | string | 功效 |
| indications | string | 适应证 (典籍原文记载，非医疗建议) |
| dosage | string | 用法用量 (典籍原文记载，非医疗建议) |
| contraindications | string | 禁忌 (典籍原文记载，非医疗建议) |
| source | string | 典籍出处 |

### 2.2 方剂数据库.json

| 字段 | 类型 | 说明 |
|:---|:---|:---|
| id | string | 唯一标识符 (f001~f100) |
| name | string | 方剂名称 |
| pinyin | string | 拼音 |
| alias | array | 别名列表 |
| composition | array | 组成 (含 herb/dosage/role/note) |
| efficacy | string | 功效 |
| indications | string | 主治 (典籍原文记载，非医疗建议) |
| contraindications | string | 禁忌 |
| usage | string | 用法 (典籍原文记载，非医疗建议) |
| source | string | 出处 |
| category | string | 分类 |
| classic_text | string | 经典原文 |
| classic_source | string | 经典原文出处 |
| classic_usage | string | 经典煎服法 |

### 2.3 经络穴位数据库.json

**经络 (meridians):**

| 字段 | 类型 | 说明 |
|:---|:---|:---|
| name | string | 经络名称 |
| pinyin | string | 拼音 |
| english | string | 英文名称 |
| element | string | 五行属性 |
| yin_yang | string | 阴阳属性 |
| paired | string | 表里经络 |

**穴位 (acupoints):**

| 字段 | 类型 | 说明 |
|:---|:---|:---|
| name | string | 穴位名称 |
| pinyin | string | 拼音 |
| code | string | 国标编码 |
| meridian | string | 所属经络 |
| location | string | 定位描述 |
| function | string | 功效 |
| literature | string | 文献出处 |

### 2.4 典籍文本库.json

| 字段 | 类型 | 说明 |
|:---|:---|:---|
| classic | string | 典籍名称 |
| chapter | string | 章节名称 |
| subchapter | string | 子章节 |
| subsection | string | 小节 |
| content_preview | string | 内容摘要 |
| content_lines | int | 内容行数 |
| source_mark | string | 出处标记 |

### 2.5 tcm_工具函数.py

| 函数 | 说明 |
|:---|:---|
| search_herb(query) | 搜索中药 (名称/拼音/别名) |
| match_herb_by_nature(nature) | 按性味匹配中药 |
| match_herb_by_meridian(meridian) | 按归经匹配中药 |
| classify_herb_properties(herb_name) | 分类查询中药属性 |
| search_formula(query) | 搜索方剂 |
| analyze_formula_composition(formula_name) | 拆解方剂君臣佐使组成 |
| search_formulas_by_herb(herb_name) | 查询包含某中药的方剂 |
| search_formulas_by_category(category) | 按分类查询方剂 |
| search_meridian(query) | 查询经络 |
| search_acupoint(query) | 查询穴位 |
| list_acupoints_by_meridian(meridian) | 按经络查询穴位 |
| get_meridian_by_element(element) | 按五行查询经络 |
| analyze_herb_formula_relationship(herb_name) | 综合分析中药-方剂关系 |
| search_all(query) | 全文搜索中药和方剂 |

---

## 三、导入数据库 SQL 脚本 (SQLite)

```sql
-- 创建中药表
CREATE TABLE IF NOT EXISTS herbs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    pinyin TEXT,
    alias TEXT,
    nature TEXT,
    meridian TEXT,
    efficacy TEXT,
    indications TEXT,
    dosage TEXT,
    contraindications TEXT,
    source TEXT
);

-- 创建方剂表
CREATE TABLE IF NOT EXISTS formulas (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    pinyin TEXT,
    alias TEXT,
    efficacy TEXT,
    indications TEXT,
    contraindications TEXT,
    usage_text TEXT,
    source TEXT,
    category TEXT,
    classic_text TEXT,
    classic_source TEXT,
    classic_usage TEXT
);

-- 创建方剂组成表
CREATE TABLE IF NOT EXISTS formula_composition (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    formula_id TEXT NOT NULL,
    herb_name TEXT NOT NULL,
    dosage TEXT,
    role TEXT,
    note TEXT,
    FOREIGN KEY (formula_id) REFERENCES formulas(id)
);

-- 创建经络表
CREATE TABLE IF NOT EXISTS meridians (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    pinyin TEXT,
    english TEXT,
    element TEXT,
    yin_yang TEXT,
    paired TEXT
);

-- 创建穴位表
CREATE TABLE IF NOT EXISTS acupoints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    pinyin TEXT,
    code TEXT UNIQUE,
    meridian TEXT NOT NULL,
    location TEXT,
    function TEXT,
    literature TEXT
);

-- 创建典籍文本表
CREATE TABLE IF NOT EXISTS classic_texts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    classic TEXT NOT NULL,
    chapter TEXT,
    subchapter TEXT,
    subsection TEXT,
    content_preview TEXT,
    content_lines INTEGER,
    source_mark TEXT
);

-- 创建索引
CREATE INDEX idx_herbs_name ON herbs(name);
CREATE INDEX idx_herbs_nature ON herbs(nature);
CREATE INDEX idx_formulas_name ON formulas(name);
CREATE INDEX idx_formulas_category ON formulas(category);
CREATE INDEX idx_acupoints_meridian ON acupoints(meridian);
CREATE INDEX idx_classic_texts_classic ON classic_texts(classic);
```

### Python 导入示例

```python
import json
import sqlite3

# 连接数据库
conn = sqlite3.connect('tcm_data.db')
cursor = conn.cursor()

# 导入中药数据
with open('中药数据库.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for herb in data['herbs']:
    cursor.execute(
        'INSERT OR REPLACE INTO herbs '
        '(id, name, pinyin, alias, nature, meridian, efficacy, indications, dosage, contraindications, source) '
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        (
            herb['id'], herb['name'], herb.get('pinyin', ''),
            json.dumps(herb.get('alias', []), ensure_ascii=False),
            herb.get('nature', ''), herb.get('meridian', ''),
            herb.get('efficacy', ''), herb.get('indications', ''),
            herb.get('dosage', ''), herb.get('contraindications', ''),
            herb.get('source', '')
        )
    )

conn.commit()
conn.close()
print("数据导入完成!")
```

---

## 四、合规使用说明

### 重要声明

本数据包中所有内容均为**传统文化科普记载**，**不构成医疗建议**。

1. **数据性质**：本数据包收录的是传统中医典籍中的原文记载和现代开源项目中的数据整理，属于传统文化知识传播范畴。
2. **医疗建议**：数据中出现的"主治""治疗""适应证""处方""用法用量"等术语，均为中医典籍原文记载，**不代表现代医学建议**。
3. **使用限制**：
   - 不得将本数据用于临床诊断或治疗决策
   - 任何健康问题请咨询执业医师
   - 使用本数据产生的任何后果由使用者自行承担
4. **开源协议**：各数据文件遵循其来源项目的开源协议，详见各文件的 `_metadata.license` 字段。
5. **数据准确性**：数据来源于开源项目，可能存在疏漏，使用者应自行核实。

### 来源项目

| 项目 | 仓库地址 | 协议 |
|:---|:---|:---|
| TCM-Learning-Assistant | https://github.com/lab99x/tcmoc | MIT |
| tcm-cli | https://github.com/tcm-cli | MIT |
| nihaixia | https://github.com/jangviktor-web/nihaixia | MulanPSL-2.0 |

---

> **提取日期**: 2026-07-26
> **提取工具**: 自动化脚本 (extract_tcm_data.py)
