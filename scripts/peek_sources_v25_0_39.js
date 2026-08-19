#!/usr/bin/env node
'use strict';
const Database = require('/www/yandaoguoxue-backend/node_modules/better-sqlite3');
const D = new Database('/www/yandaoguoxue-backend/data/academy.db');

console.log('== source_registry 表结构 ==');
console.log(D.prepare("SELECT sql FROM sqlite_master WHERE name='source_registry'").get().sql);
console.log('\n== source_registry 现有记录 ==');
for (const r of D.prepare('SELECT * FROM source_registry ORDER BY id DESC LIMIT 10').all()) console.log(' ', JSON.stringify(r).slice(0, 400));
console.log('\n== loc_configs keys ==');
for (const r of D.prepare("SELECT key, substr(value,1,60) v FROM loc_configs").all()) console.log(' ', r.key, '=>', r.v);
