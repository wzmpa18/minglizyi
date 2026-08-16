#!/bin/bash
echo '=== MATERIALS (正骨) ==='
sqlite3 -header -column /www/yandaoguoxue-backend/data/academy.db "SELECT id, track, substr(title,1,30) AS title, status, length(text_content) AS chars, content_hash IS NOT NULL AND content_hash!='' AS has_hash FROM materials WHERE title LIKE '%正骨%';"
echo '=== KP COUNT ==='
sqlite3 /www/yandaoguoxue-backend/data/academy.db "SELECT material_id, count(*) FROM knowledge_points WHERE material_id IN (SELECT id FROM materials WHERE title LIKE '%正骨%') GROUP BY material_id;"
echo '=== ALL MATERIALS SUMMARY ==='
sqlite3 -header -column /www/yandaoguoxue-backend/data/academy.db "SELECT id, substr(title,1,24) AS title, status FROM materials ORDER BY id;"
