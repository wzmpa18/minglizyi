#!/usr/bin/env python3
"""Read-only structural audit for the approved medical exam practice bank."""

import json
import sqlite3
import sys

db_path = sys.argv[1]
db = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
db.row_factory = sqlite3.Row

summary = db.execute("""
SELECT COUNT(1) approved,
       COUNT(DISTINCT category) categories,
       SUM(CASE WHEN json_array_length(options) != 5 THEN 1 ELSE 0 END) bad_options,
       SUM(CASE WHEN answer NOT IN ('A','B','C','D','E') THEN 1 ELSE 0 END) bad_answer,
       SUM(CASE WHEN trim(analysis) = '' THEN 1 ELSE 0 END) no_analysis,
       SUM(CASE WHEN source_id <= 0 THEN 1 ELSE 0 END) no_source,
       SUM(CASE WHEN exam_spec_version != '2025-tcm-zhiye-v1' THEN 1 ELSE 0 END) wrong_spec
FROM questions WHERE track='yikao' AND status='approved'
""").fetchone()

duplicates = db.execute("""
SELECT COUNT(1) n FROM (
  SELECT lower(replace(replace(replace(stem,'，',''),'。',''),' ','')) normalized, COUNT(1) count
  FROM questions WHERE track='yikao' AND status='approved'
  GROUP BY normalized HAVING count > 1
)
""").fetchone()[0]

coverage = [dict(row) for row in db.execute("""
SELECT category, difficulty, COUNT(1) count
FROM questions WHERE track='yikao' AND status='approved'
GROUP BY category, difficulty ORDER BY category, difficulty
""")]

print(json.dumps({"summary": dict(summary), "duplicateStemGroups": duplicates, "coverage": coverage}, ensure_ascii=False, indent=2))
