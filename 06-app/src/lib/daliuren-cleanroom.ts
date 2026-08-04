/**
 * 大六壬净室算法模块
 * 1:1 逐行复刻吉时雨 da6ren.js 核心算法
 * 不作任何自主增删、优化、修复
 * 基准：吉时雨原生源码 da6ren.js (AGPL-3.0)
 */

import {
  GAN, ZHI, JIAZI_TABLE,
  getYearGanZhi, getKongwang,
} from "@/algorithm-core";

// ============================================================================
// 720课查表 —— 严格与吉时雨 da6ren.js 第25行一致
// 甲申缺 午/未 两个地支条目，与吉时雨源码完全一致
// ============================================================================
const _720KE: Record<string, Record<string, string>> = {
  "甲子": { "子": "戌申午", "丑": "子亥戌", "寅": "寅巳申", "卯": "辰巳午", "辰": "辰午申", "巳": "申亥寅", "午": "申亥寅", "未": "辰申子", "申": "子巳戌", "酉": "寅申寅", "戌": "寅酉辰", "亥": "戌午寅" },
  "乙丑": { "子": "巳丑酉", "丑": "丑戌未", "寅": "亥酉未", "卯": "子亥戌", "辰": "辰丑戌", "巳": "寅卯辰", "午": "申戌子", "未": "未戌丑", "申": "酉丑巳", "酉": "寅未子", "戌": "戌辰戌", "亥": "卯戌巳" },
  "丙寅": { "子": "子未寅", "丑": "戌午寅", "寅": "亥申巳", "卯": "丑亥酉", "辰": "子亥戌", "巳": "巳申寅", "午": "辰巳午", "未": "辰午申", "申": "申亥寅", "酉": "酉丑巳", "戌": "子巳戌", "亥": "寅申寅" },
  "丁卯": { "子": "巳戌卯", "丑": "卯酉卯", "寅": "戌巳子", "卯": "未卯亥", "辰": "子酉午", "巳": "亥酉未", "午": "丑子亥", "未": "卯子午", "申": "辰巳午", "酉": "酉亥丑", "戌": "酉子卯", "亥": "亥卯未" },
  "戊辰": { "子": "子未寅", "丑": "子申辰", "寅": "寅亥申", "卯": "丑亥酉", "辰": "卯寅丑", "巳": "巳申寅", "午": "寅午午", "未": "申戌子", "申": "亥寅巳", "酉": "子辰申", "戌": "寅未子", "亥": "亥巳亥" },
  "己巳": { "子": "巳戌卯", "丑": "巳亥巳", "寅": "酉辰亥", "卯": "卯亥未", "辰": "寅亥申", "巳": "丑亥酉", "午": "卯寅丑", "未": "巳申寅", "申": "申申午", "酉": "亥丑卯", "戌": "申亥寅", "亥": "酉丑巳" },
  "庚午": { "子": "辰申子", "丑": "辰酉寅", "寅": "寅申寅", "卯": "戌巳子", "辰": "子申辰", "巳": "巳寅亥", "午": "寅子戌", "未": "午巳辰", "申": "申寅巳", "酉": "戌未酉", "戌": "申戌子", "亥": "酉子卯" },
  "辛未": { "子": "寅辰午", "丑": "亥丑丑", "寅": "亥卯未", "卯": "巳戌卯", "辰": "巳丑辰", "巳": "酉辰亥", "午": "卯亥未", "未": "亥未未", "申": "午辰寅", "酉": "巳辰卯", "戌": "未丑戌", "亥": "申亥寅" },
  "壬申": { "子": "丑寅卯", "丑": "子寅辰", "寅": "巳申亥", "卯": "未亥卯", "辰": "辰酉寅", "巳": "寅申寅", "午": "午丑申", "未": "子申辰", "申": "巳寅亥", "酉": "午辰寅", "戌": "戌酉申", "亥": "亥申寅" },
  "癸酉": { "子": "未午巳", "丑": "丑戌未", "寅": "亥子丑", "卯": "丑卯巳", "辰": "辰未戌", "巳": "酉丑巳", "午": "未子巳", "未": "卯酉卯", "申": "亥午丑", "酉": "巳丑酉", "戌": "午卯子", "亥": "未巳卯" },
  "甲戌": { "子": "午辰寅", "丑": "子亥戌", "寅": "寅巳申", "卯": "辰巳午", "辰": "辰午申", "巳": "申亥寅", "午": "寅午戌", "未": "子巳戌", "申": "寅申寅", "酉": "子未寅", "戌": "戌午寅", "亥": "申巳寅" },
  "乙亥": { "子": "未卯亥", "丑": "丑戌未", "寅": "酉未巳", "卯": "戌酉申", "辰": "辰亥巳", "巳": "丑寅卯", "午": "申戌子", "未": "未戌丑", "申": "未亥卯", "酉": "寅未子", "戌": "巳亥巳", "亥": "午丑申" },
  "丙子": { "子": "子未寅", "丑": "申辰子", "寅": "午卯子", "卯": "丑亥酉", "辰": "戌酉申", "巳": "巳申寅", "午": "寅卯辰", "未": "辰午申", "申": "申亥寅", "酉": "酉丑巳", "戌": "巳戌卯", "亥": "午子午" },
  "丁丑": { "子": "巳戌卯", "丑": "亥未丑", "寅": "卯戌巳", "卯": "巳丑酉", "辰": "子辰戌", "巳": "亥酉未", "午": "子亥戌", "未": "丑戌未", "申": "申酉戌", "酉": "酉亥丑", "戌": "午戌辰", "亥": "酉丑巳" },
  "戊寅": { "子": "子未寅", "丑": "戌午寅", "寅": "寅亥申", "卯": "丑亥酉", "辰": "子亥戌", "巳": "巳申寅", "午": "辰巳午", "未": "辰午申", "申": "申亥寅", "酉": "丑午酉", "戌": "子巳戌", "亥": "寅申寅" },
  "己卯": { "子": "巳戌卯", "丑": "卯酉卯", "寅": "戌巳子", "卯": "未卯亥", "辰": "子酉午", "巳": "亥酉未", "午": "丑子亥", "未": "卯子午", "申": "辰巳午", "酉": "亥丑卯", "戌": "酉子卯", "亥": "亥卯未" },
  "庚辰": { "子": "辰申子", "丑": "寅未子", "寅": "寅申寅", "卯": "午丑申", "辰": "子申辰", "巳": "巳寅亥", "午": "寅子戌", "未": "卯寅丑", "申": "申寅巳", "酉": "午未申", "戌": "申戌子", "亥": "寅巳申" },
  "辛巳": { "子": "寅辰午", "丑": "申亥寅", "寅": "酉丑巳", "卯": "卯申丑", "辰": "巳亥巳", "巳": "未寅酉", "午": "午寅戌", "未": "寅亥申", "申": "丑亥酉", "酉": "卯寅丑", "戌": "巳申寅", "亥": "午未申" },
  "壬午": { "子": "丑寅卯", "丑": "申戌子", "寅": "酉子卯", "卯": "未亥卯", "辰": "辰酉寅", "巳": "午子午", "午": "午丑申", "未": "戌午寅", "申": "巳寅亥", "酉": "寅子戌", "戌": "戌酉申", "亥": "亥午子" },
  "癸未": { "子": "巳辰卯", "丑": "丑戌未", "寅": "申寅申", "卯": "巳未酉", "辰": "辰未戌", "巳": "酉丑巳", "午": "巳戌卯", "未": "未丑未", "申": "卯戌巳", "酉": "卯亥未", "戌": "戌未辰", "亥": "巳卯丑" },
  "甲申": { "子": "午辰寅", "丑": "子亥戌", "寅": "寅巳申", "卯": "辰巳午", "辰": "辰午申", "巳": "申亥寅", "申": "辰申子", "酉": "子巳戌", "戌": "寅申寅", "亥": "戌巳子" },
  "乙酉": { "子": "巳丑酉", "丑": "丑戌未", "寅": "未巳卯", "卯": "申未午", "辰": "辰酉卯", "巳": "亥子丑", "午": "申戌子", "未": "未戌丑", "申": "申子辰", "酉": "未子巳", "戌": "卯酉卯", "亥": "亥午丑" },
  "丙戌": { "子": "子未寅", "丑": "酉巳丑", "寅": "亥申巳", "卯": "丑亥酉", "辰": "卯寅丑", "巳": "巳申寅", "午": "亥子丑", "未": "子寅辰", "申": "申亥寅", "酉": "酉丑巳", "戌": "申丑午", "亥": "巳亥巳" },
  "丁亥": { "子": "巳戌卯", "丑": "巳亥巳", "寅": "午丑申", "卯": "未卯亥", "辰": "巳亥寅", "巳": "酉未巳", "午": "戌酉申", "未": "亥未丑", "申": "申酉戌", "酉": "酉亥丑", "戌": "午戌寅", "亥": "未亥卯" },
  "戊子": { "子": "子未寅", "丑": "巳申丑", "寅": "寅亥申", "卯": "丑亥酉", "辰": "戌酉申", "巳": "巳申寅", "午": "寅卯辰", "未": "辰午申", "申": "卯午酉", "酉": "辰申子", "戌": "巳戌卯", "亥": "午子午" },
  "己丑": { "子": "巳戌卯", "丑": "亥未丑", "寅": "卯戌巳", "卯": "卯亥未", "辰": "子辰戌", "巳": "亥酉未", "午": "子亥戌", "未": "丑戌未", "申": "寅卯辰", "酉": "卯巳未", "戌": "午戌辰", "亥": "酉丑巳" },
  "庚寅": { "子": "辰申子", "丑": "子巳戌", "寅": "寅申寅", "卯": "戌巳子", "辰": "子申辰", "巳": "巳寅亥", "午": "午辰寅", "未": "子亥戌", "申": "申寅巳", "酉": "辰巳午", "戌": "辰午申", "亥": "申亥寅" },
  "辛卯": { "子": "巳未酉", "丑": "酉子卯", "寅": "亥卯未", "卯": "卯申丑", "辰": "卯酉卯", "巳": "戌巳子", "午": "未卯亥", "未": "子未子", "申": "亥酉未", "酉": "丑子亥", "戌": "卯子午", "亥": "辰巳午" },
  "壬辰": { "子": "丑寅卯", "丑": "申戌子", "寅": "戌丑辰", "卯": "未亥卯", "辰": "寅未子", "巳": "巳亥巳", "午": "午丑申", "未": "子申辰", "申": "巳寅亥", "酉": "寅子戌", "戌": "戌酉申", "亥": "亥辰戌" },
  "癸巳": { "子": "卯寅丑", "丑": "丑戌未", "寅": "未申酉", "卯": "未酉亥", "辰": "申亥寅", "巳": "酉丑巳", "午": "午亥辰", "未": "巳亥巳", "申": "卯戌巳", "酉": "巳丑酉", "戌": "戌未辰", "亥": "丑亥酉" },
  "甲午": { "子": "寅子戌", "丑": "子亥戌", "寅": "寅巳申", "卯": "辰巳午", "辰": "辰午申", "巳": "申亥寅", "午": "寅午戌", "未": "子巳戌", "申": "寅申寅", "酉": "酉辰亥", "戌": "戌午寅", "亥": "申巳寅" },
  "乙未": { "子": "卯亥未", "丑": "丑戌未", "寅": "亥寅巳", "卯": "戌卯午", "辰": "辰未丑", "巳": "酉戌亥", "午": "申戌子", "未": "未戌丑", "申": "亥卯未", "酉": "巳戌卯", "戌": "戌辰戌", "亥": "午丑申" },
  "丙申": { "子": "戌巳子", "丑": "子申辰", "寅": "巳寅亥", "卯": "丑亥酉", "辰": "卯寅丑", "巳": "巳申寅", "午": "酉戌亥", "未": "子寅辰", "申": "申亥寅", "酉": "酉丑巳", "戌": "卯申丑", "亥": "寅申寅" },
  "丁酉": { "子": "未子巳", "丑": "卯酉卯", "寅": "亥午丑", "卯": "巳丑酉", "辰": "午卯子", "巳": "丑巳巳", "午": "申未午", "未": "酉未丑", "申": "亥子丑", "酉": "酉亥丑", "戌": "子卯午", "亥": "亥卯未" },
  "戊戌": { "子": "子未寅", "丑": "寅戌午", "寅": "寅亥申", "卯": "丑亥酉", "辰": "卯寅丑", "巳": "巳申寅", "午": "亥子丑", "未": "子寅辰", "申": "亥寅巳", "酉": "寅午戌", "戌": "申丑午", "亥": "亥巳亥" },
  "己亥": { "子": "巳戌卯", "丑": "巳亥巳", "寅": "午丑申", "卯": "未卯亥", "辰": "巳寅亥", "巳": "卯丑亥", "午": "戌酉申", "未": "亥未丑", "申": "丑寅卯", "酉": "丑卯巳", "戌": "寅巳申", "亥": "亥卯未" },
  "庚子": { "子": "辰申子", "丑": "巳戌卯", "寅": "寅申寅", "卯": "戌巳子", "辰": "子申辰", "巳": "午卯子", "午": "午辰寅", "未": "戌酉申", "申": "申寅巳", "酉": "寅卯辰", "戌": "辰午申", "亥": "午酉子" },
  "辛丑": { "子": "卯巳未", "丑": "巳丑丑", "寅": "酉丑巳", "卯": "卯申丑", "辰": "亥未辰", "巳": "卯戌巳", "午": "巳丑酉", "未": "巳未未", "申": "亥酉未", "酉": "子亥戌", "戌": "丑戌未", "亥": "寅卯辰" },
  "壬寅": { "子": "辰巳午", "丑": "辰午申", "寅": "申亥寅", "卯": "未亥卯", "辰": "子巳戌", "巳": "寅申寅", "午": "午丑申", "未": "戌午寅", "申": "巳寅亥", "酉": "戌申午", "戌": "子亥戌", "亥": "亥寅巳" },
  "癸卯": { "子": "丑子亥", "丑": "丑戌未", "寅": "辰巳午", "卯": "未酉亥", "辰": "酉子卯", "巳": "酉丑巳", "午": "午亥辰", "未": "卯酉卯", "申": "卯戌巳", "酉": "未亥卯", "戌": "戌未辰", "亥": "亥酉未" },
  "甲辰": { "子": "寅子戌", "丑": "子亥戌", "寅": "寅巳申", "卯": "辰巳午", "辰": "辰午申", "巳": "申亥寅", "午": "申子辰", "未": "子巳戌", "申": "寅申寅", "酉": "午丑申", "戌": "子申辰", "亥": "申巳寅" },
  "乙巳": { "子": "酉巳丑", "丑": "丑戌未", "寅": "丑亥酉", "卯": "卯寅丑", "辰": "辰巳申", "巳": "未申酉", "午": "申戌子", "未": "未戌丑", "申": "酉丑巳", "酉": "寅未子", "戌": "巳亥巳", "亥": "午丑申" },
  "丙午": { "子": "子未寅", "丑": "戌午寅", "寅": "子酉午", "卯": "丑亥酉", "辰": "卯寅丑", "巳": "巳申寅", "午": "申酉戌", "未": "申戌子", "申": "申亥寅", "酉": "酉丑巳", "戌": "辰酉寅", "亥": "午子午" },
  "丁未": { "子": "巳戌卯", "丑": "巳丑丑", "寅": "酉辰亥", "卯": "卯亥未", "辰": "亥辰辰", "巳": "丑巳巳", "午": "卯午午", "未": "未丑戌", "申": "申酉戌", "酉": "酉亥丑", "戌": "亥戌戌", "亥": "亥卯未" },
  "戊申": { "子": "子未寅", "丑": "子申辰", "寅": "寅亥申", "卯": "丑亥酉", "辰": "卯寅丑", "巳": "巳申寅", "午": "戌酉午", "未": "子寅辰", "申": "寅巳申", "酉": "辰申子", "戌": "卯申丑", "亥": "寅申寅" },
  "己酉": { "子": "未子巳", "丑": "卯酉卯", "寅": "亥午丑", "卯": "卯亥未", "辰": "午卯子", "巳": "卯丑亥", "午": "戌午申", "未": "酉未丑", "申": "亥子丑", "酉": "丑卯巳", "戌": "卯午酉", "亥": "亥卯未" },
  "庚戌": { "子": "辰申子", "丑": "申丑午", "寅": "寅申寅", "卯": "戌巳子", "辰": "子申辰", "巳": "巳寅亥", "午": "午辰寅", "未": "午巳辰", "申": "申寅巳", "酉": "亥子丑", "戌": "子寅辰", "亥": "寅巳申" },
  "辛亥": { "子": "丑卯巳", "丑": "巳申亥", "寅": "未亥卯", "卯": "卯申丑", "辰": "巳亥巳", "巳": "午丑申", "午": "未卯亥", "未": "巳寅亥", "申": "午辰寅", "酉": "戌酉申", "戌": "亥戌未", "亥": "丑寅卯" },
  "壬子": { "子": "寅卯辰", "丑": "辰午申", "寅": "午酉子", "卯": "未亥卯", "辰": "巳戌卯", "巳": "午子午", "午": "午丑申", "未": "未卯亥", "申": "午卯子", "酉": "戌申午", "戌": "戌酉申", "亥": "亥子卯" },
  "癸丑": { "子": "子亥戌", "丑": "丑戌未", "寅": "寅卯辰", "卯": "卯巳未", "辰": "辰未戌", "巳": "酉丑巳", "午": "午亥辰", "未": "未丑未", "申": "卯戌巳", "酉": "巳丑酉", "戌": "戌未辰", "亥": "亥酉未" },
  "甲寅": { "子": "戌申午", "丑": "子亥戌", "寅": "寅巳申", "卯": "辰巳午", "辰": "辰午申", "巳": "申亥寅", "午": "申午午", "未": "子巳戌", "申": "寅申寅", "酉": "酉辰亥", "戌": "戌午寅", "亥": "丑亥亥" },
  "乙卯": { "子": "未卯亥", "丑": "丑戌未", "寅": "亥酉未", "卯": "丑子亥", "辰": "辰卯子", "巳": "辰巳午", "午": "申戌子", "未": "酉子卯", "申": "亥卯未", "酉": "寅未子", "戌": "卯酉卯", "亥": "午丑申" },
  "丙辰": { "子": "午丑申", "丑": "子申辰", "寅": "亥申巳", "卯": "丑亥酉", "辰": "卯寅丑", "巳": "巳申寅", "午": "亥午午", "未": "申戌子", "申": "申亥寅", "酉": "酉丑巳", "戌": "寅未子", "亥": "巳亥巳" },
  "丁巳": { "子": "巳戌卯", "丑": "巳亥巳", "寅": "酉辰亥", "卯": "亥未卯", "辰": "亥申巳", "巳": "丑亥酉", "午": "卯寅丑", "未": "巳申寅", "申": "申酉戌", "酉": "酉亥丑", "戌": "申亥寅", "亥": "酉丑巳" },
  "戊午": { "子": "子未寅", "丑": "戌午申", "寅": "寅亥申", "卯": "丑亥酉", "辰": "卯寅丑", "巳": "巳申寅", "午": "寅午午", "未": "申戌子", "申": "酉子卯", "酉": "寅午戌", "戌": "辰酉寅", "亥": "午子午" },
  "己未": { "子": "巳戌卯", "丑": "巳丑丑", "寅": "酉辰亥", "卯": "卯亥未", "辰": "亥辰辰", "巳": "丑巳巳", "午": "卯午午", "未": "未丑戌", "申": "未申申", "酉": "酉酉酉", "戌": "亥戌戌", "亥": "亥卯未" },
  "庚申": { "子": "辰申子", "丑": "卯丑丑", "寅": "寅申寅", "卯": "戌巳子", "辰": "子申辰", "巳": "巳寅亥", "午": "午辰寅", "未": "酉未未", "申": "申寅巳", "酉": "亥酉酉", "戌": "子寅辰", "亥": "丑亥亥" },
  "辛酉": { "子": "丑卯巳", "丑": "卯午酉", "寅": "寅午戌", "卯": "未子巳", "辰": "卯酉卯", "巳": "亥午丑", "午": "巳丑酉", "未": "午卯子", "申": "午辰寅", "酉": "丑酉酉", "戌": "酉戌未", "亥": "亥子丑" },
  "壬戌": { "子": "亥子丑", "丑": "子寅辰", "寅": "辰未戌", "卯": "未亥卯", "辰": "辰酉寅", "巳": "巳亥巳", "午": "午丑申", "未": "未卯亥", "申": "巳寅亥", "酉": "午辰寅", "戌": "戌酉申", "亥": "亥戌未" },
  "癸亥": { "子": "戌酉申", "丑": "丑戌未", "寅": "丑寅卯", "卯": "丑卯巳", "辰": "辰未戌", "巳": "酉丑巳", "午": "午亥辰", "未": "巳亥巳", "申": "卯戌巳", "酉": "未卯亥", "戌": "巳寅亥", "亥": "未巳卯" },
};

// ============================================================================
// 月将表 —— 严格与吉时雨 da6ren.js 第28-41行一致
// ============================================================================
const YUE_JIANG: Record<string, string[]> = {
  "雨水": ["亥", "登明"],
  "春分": ["戌", "河魁"],
  "谷雨": ["酉", "从魁"],
  "小满": ["申", "传送"],
  "夏至": ["未", "小吉"],
  "大暑": ["午", "胜光"],
  "处暑": ["巳", "太乙"],
  "秋分": ["辰", "天罡"],
  "霜降": ["卯", "太冲"],
  "小雪": ["寅", "功曹"],
  "冬至": ["丑", "大吉"],
  "大寒": ["子", "神后"],
};

const YUE_JIANG2: string[][] = [
  ["亥", "登明"], ["戌", "河魁"], ["酉", "从魁"], ["申", "传送"],
  ["未", "小吉"], ["午", "胜光"], ["巳", "太乙"], ["辰", "天罡"],
  ["卯", "太冲"], ["寅", "功曹"], ["丑", "大吉"], ["子", "神后"],
];

const YUE_ZHI = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];
const SHI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 12月将
const _12YUEJIANG = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
// 12地支
const _12DIZHI = ["寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑"];
// 10天干
const _10TIANGAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸", "〇", "〇"];
// 12神
const _12SHEN = ["贵", "蛇", "朱", "合", "勾", "龙", "空", "虎", "常", "玄", "阴", "后"];

const _HOUR_ZHI: Record<string, number> = {
  "子": 23, "丑": 1, "寅": 3, "卯": 5, "辰": 7, "巳": 9,
  "午": 11, "未": 13, "申": 15, "酉": 17, "戌": 19, "亥": 21,
};

// 十干寄宫
const _10GAN_JIGONG: Record<string, string> = {
  "甲": "寅", "乙": "辰", "丙": "巳", "丁": "未", "戊": "巳",
  "己": "未", "庚": "申", "辛": "戌", "壬": "亥", "癸": "丑",
};

// ============================================================================
// 辅助函数 —— 严格与吉时雨 da6ren.js 一致
// ============================================================================

/** 天干五行 (view_ziwei.js:1088) */
function tianganWuxing(tiangan: string): string {
  if ((tiangan == ("甲")) || (tiangan == ("乙"))) return "木";
  if ((tiangan == ("丙")) || (tiangan == ("丁"))) return "火";
  if ((tiangan == ("戊")) || (tiangan == ("己"))) return "土";
  if ((tiangan == ("庚")) || (tiangan == ("辛"))) return "金";
  if ((tiangan == ("壬")) || (tiangan == ("癸"))) return "水";
  return "";
}

/** 地支五行 (view_ziwei.js:1125) */
function dizhiWuxing(dizhi: string): string {
  if ((dizhi == ("寅")) || (dizhi == ("卯"))) return "木";
  if ((dizhi == ("巳")) || (dizhi == ("午"))) return "火";
  if ((dizhi == ("丑")) || (dizhi == ("辰")) || (dizhi == ("未")) || (dizhi == ("戌"))) return "土";
  if ((dizhi == ("申")) || (dizhi == ("酉"))) return "金";
  if ((dizhi == ("亥")) || (dizhi == ("子"))) return "水";
  return "";
}

/** 天乙贵人 (da6ren.js:104-123) */
function tianyiguiren(gan: string, zhi: string, isDaytime: boolean): string {
  const conditions: Record<string, string[]> = {
    "甲": ["丑", "未"], "戊": ["丑", "未"], "庚": ["丑", "未"],
    "乙": ["子", "申"], "己": ["子", "申"],
    "丙": ["亥", "酉"], "丁": ["亥", "酉"],
    "壬": ["巳", "卯"], "癸": ["巳", "卯"],
    "辛": ["午", "寅"],
  };
  if (isDaytime) return conditions[gan][0];
  else return conditions[gan][1];
}

/** 刑 (da6ren.js:125-140) */
function xing(ez: string): string {
  let returnVal = "";
  if (ez == "子") returnVal = "卯";
  if (ez == "丑") returnVal = "戌";
  if (ez == "寅") returnVal = "巳";
  if (ez == "卯") returnVal = "子";
  if (ez == "巳") returnVal = "申";
  if (ez == "未") returnVal = "丑";
  if (ez == "申") returnVal = "寅";
  if (ez == "戌") returnVal = "未";
  if (ez == "辰") returnVal = "戌";
  if (ez == "午") returnVal = "子";
  if (ez == "酉") returnVal = "卯";
  if (ez == "亥") returnVal = "巳";
  return returnVal;
}

/** 循环列表 (da6ren.js:149-170) */
interface CircularListInterface {
  next: () => string | null;
}

function CircularList(array: string[], curIndex: number, isForward: boolean = true): CircularListInterface {
  let currentIndex = curIndex;
  const length = array.length;

  function next(): string | null {
    if (length === 0) return null;
    const currentItem = array[currentIndex];
    currentIndex = isForward ? (currentIndex + 1) % length : (currentIndex - 1 + length) % length;
    return currentItem;
  }

  return { next };
}

/** 六亲关系 (da6ren.js:177-200) */
function get6qinRelation(gan: string, zhi: string): string {
  const wuxingRelations: Record<string, Record<string, string>> = {
    "木": { "生我": "水", "我生": "火", "同我": "木", "克我": "金", "我克": "土" },
    "火": { "生我": "木", "我生": "土", "同我": "火", "克我": "水", "我克": "金" },
    "土": { "生我": "火", "我生": "金", "同我": "土", "克我": "木", "我克": "水" },
    "金": { "生我": "土", "我生": "水", "同我": "金", "克我": "火", "我克": "木" },
    "水": { "生我": "金", "我生": "木", "同我": "水", "克我": "土", "我克": "火" },
  };
  const liuQinMap: Record<string, string> = {
    "同我": "兄", "我生": "子", "克我": "官", "我克": "财", "生我": "父",
  };
  const wx1 = tianganWuxing(gan);
  const wx2 = dizhiWuxing(zhi);

  for (const relation in wuxingRelations[wx1]) {
    if (wuxingRelations[wx1][relation] === wx2) {
      return liuQinMap[relation];
    }
  }
  return "";
}

// ============================================================================
// 参数接口
// ============================================================================
export interface DaLiuRenParams {
  datetime: Date;
  realsun: boolean;
  diqu: string;
  isMan: boolean;
  yearMing: number;
  yueJiangMethod: number;
  guirenMethod: number;
  guirenSunni: number;
  zhanbuTime: string;
  yongShen: string;
}

export interface DaLiuRenResult {
  params: DaLiuRenParams;
  date: string;
  siZhu: [string, string][];
  zhanbuTime: string;
  jieqiInfo: { from: string; fromDate: string; to: string; toDate: string };
  data: {
    yueJiangList: Record<string, string>;
    guishenList: Record<string, string>;
    tianganList: Record<string, string>;
    _4keList: string[][];
    _3chuanList: string[][];
    _12nianshaList: Record<string, string>;
    _12gongList: Record<string, string>;
    sym3chuanList: { gan3chuan: string[]; zhi3chuan: string[]; sym3chuan: string[] } | null;
  };
  yuejiang: string;
  isMan: boolean;
  yearGanzhi: string;
  xingYear: string;
  yongShen: string;
  kongwang: string | null;
  isDaytime: boolean;
}

// ============================================================================
// 核心排盘 —— 1:1 复刻吉时雨 da6ren.js paipan 方法
// ============================================================================

/**
 * 大六壬排盘
 * 严格 1:1 复刻吉时雨 da6ren.js 的 paipan 方法
 * 依赖外部传入的 Solar/Lunar 八字计算
 */
export function daliurenPaipan(
  params: DaLiuRenParams,
  solarInfo: {
    year: number; month: number; day: number; hour: number; minute: number;
    prevQi: string; prevJieQiName: string; prevJieQiDate: string;
    nextJieQiName: string; nextJieQiDate: string;
    jieQiTable: Record<string, { year: number; month: number; day: number; hour: number; minute: number }>;
    nianZhu: [string, string]; yueZhu: [string, string];
    riZhu: [string, string]; shiZhu: [string, string];
    isAfterXiaZhi: boolean; isBeforeDongZhi: boolean;
  }
): DaLiuRenResult {
  const { datetime, realsun, diqu, isMan, yearMing, yueJiangMethod, guirenMethod, guirenSunni, zhanbuTime, yongShen } = params;

  let year = solarInfo.year;
  let month = solarInfo.month;
  let day = solarInfo.day;
  let hour = solarInfo.hour;
  let minute = solarInfo.minute;

  const nianZhu = solarInfo.nianZhu;
  const yueZhu = solarInfo.yueZhu;
  const riZhu = solarInfo.riZhu;
  const shiZhu = solarInfo.shiZhu;

  const zhanbuTimeCur = zhanbuTime || shiZhu[1];

  // ===== 计算行年 (da6ren.js:262-278) =====
  const jiaziYear = getYearGanZhi(yearMing);
  let _60jiaziCircular: CircularListInterface;
  if (isMan) {
    _60jiaziCircular = CircularList(JIAZI_TABLE, 2); // 男从丙寅开始
  } else {
    _60jiaziCircular = CircularList(JIAZI_TABLE, 32); // 女从丙申开始
  }
  const age = new Date().getFullYear() - yearMing + 1;
  let xn = "";
  for (let i = 0; i < age; i++) {
    xn = _60jiaziCircular.next()!;
  }

  // ===== 排天盘(月将) (da6ren.js:281-315) =====
  let yueJiang: string;
  if (yueJiangMethod == 1) {
    yueJiang = YUE_JIANG[solarInfo.prevQi][0];
  } else {
    const yIdx = YUE_ZHI.indexOf(nianZhu[1]) + 1;
    const mIdx = YUE_ZHI.indexOf(yueZhu[1]) + 1;
    const dIdx = YUE_ZHI.indexOf(riZhu[1]) + 1;
    const hIdx = SHI_ZHI.indexOf(shiZhu[1]) + 1;
    const total = yIdx + mIdx + dIdx + hIdx;
    let mod = 0;
    if (total < 12) {
      mod = 12 - total;
    } else {
      mod = total % 12;
      if (mod == 0) mod = 12;
    }
    yueJiang = YUE_JIANG2[mod - 1][0];
  }

  const yjIdx = _12YUEJIANG.indexOf(yueJiang);
  const yuejiangIter = CircularList(_12YUEJIANG, yjIdx);
  const idx = _12DIZHI.indexOf(zhanbuTimeCur);
  const yueJiangList: Record<string, string> = {};
  for (let i = idx; i < 12; i++) {
    const dz = _12DIZHI[i];
    yueJiangList[dz] = yuejiangIter.next()!;
  }
  for (let i = 0; i < idx; i++) {
    const dz = _12DIZHI[i];
    yueJiangList[dz] = yuejiangIter.next()!;
  }

  // ===== 排人盘(贵人) (da6ren.js:317-349) =====
  const hourVal = _HOUR_ZHI[zhanbuTimeCur];
  const isDaytime = guirenMethod === 1 ? hourVal >= 5/*卯*/ && hourVal < 17/*酉*/ : guirenMethod === 2 ? true : false;
  const guiren = isDaytime
    ? tianyiguiren(riZhu[0], riZhu[1], true)
    : tianyiguiren(riZhu[0], riZhu[1], false);

  let guishenIter: CircularListInterface;
  const guishenList: Record<string, string> = {};
  for (let i = 0; i < 12; i++) {
    const dz = _12DIZHI[i];
    if (yueJiangList[dz] === guiren) {
      const shenIdx = 0;
      if (guirenSunni === 1) {
        guishenIter = CircularList(_12SHEN, shenIdx, "亥子丑寅卯辰".indexOf(dz) != -1 ? true : false);
      } else {
        guishenIter = CircularList(_12SHEN, shenIdx, isMan);
      }
      for (let x = i; x < 12; x++) {
        guishenList[_12DIZHI[x]] = guishenIter.next()!;
      }
      for (let x = 0; x < i; x++) {
        guishenList[_12DIZHI[x]] = guishenIter.next()!;
      }
      break;
    }
  }

  // ===== 排天干 (da6ren.js:351-376) =====
  const gan = riZhu[0];
  const zhi = riZhu[1];
  const tianganList: Record<string, string> = {};
  for (let i = 0; i < 12; i++) {
    const dz = _12DIZHI[i];
    if (yueJiangList[dz] === zhi) {
      const ganIdx = _10TIANGAN.indexOf(gan);
      let tianganIter: CircularListInterface;
      if (guirenSunni === 1)
        tianganIter = CircularList(_10TIANGAN, ganIdx);
      else
        tianganIter = CircularList(_10TIANGAN, ganIdx, isMan);
      for (let x = i; x < 12; x++) {
        tianganList[_12DIZHI[x]] = tianganIter.next()!;
      }
      for (let x = 0; x < i; x++) {
        tianganList[_12DIZHI[x]] = tianganIter.next()!;
      }
      break;
    }
  }

  // ===== 排时运命三传(阴盘六壬) (da6ren.js:378-422) =====
  let sym3chuanList: { gan3chuan: string[]; zhi3chuan: string[]; sym3chuan: string[] } | null = null;
  if (yongShen) {
    const sym = new Array(3);
    sym[0] = shiZhu[1];
    sym[1] = yueJiang;
    sym[2] = jiaziYear[1];

    const tgszstr = new Array(4);
    tgszstr[0] = yongShen[0];
    tgszstr[1] = yueJiangList[_10GAN_JIGONG[yongShen[0]]];
    tgszstr[2] = yueJiangList[tgszstr[1]];
    tgszstr[3] = yueJiangList[tgszstr[2]];
    if (yueJiang === shiZhu[1]) {
      tgszstr[2] = xing(tgszstr[2]);
      tgszstr[3] = xing(tgszstr[2]);
    }

    const dzszstr = new Array(4);
    dzszstr[0] = yongShen[1];
    dzszstr[1] = yueJiangList[dzszstr[0]];
    dzszstr[2] = yueJiangList[dzszstr[1]];
    dzszstr[3] = yueJiangList[dzszstr[2]];
    if (yueJiang === shiZhu[1]) {
      dzszstr[2] = xing(dzszstr[2]);
      dzszstr[3] = xing(dzszstr[2]);
    }

    sym3chuanList = {
      "gan3chuan": tgszstr,
      "zhi3chuan": dzszstr,
      "sym3chuan": sym,
    };
  }

  // ===== 排四课 (da6ren.js:425-481) =====
  const _4keList: string[][] = [];
  // 第一课
  _4keList[0] = [];
  _4keList[0].push(riZhu[0]); // 日干
  for (const ganKey in _10GAN_JIGONG) {
    if (ganKey === riZhu[0]) {
      const ji = _10GAN_JIGONG[ganKey];
      for (let i = 0; i < 12; i++) {
        if (_12DIZHI[i] === ji) {
          _4keList[0].push(yueJiangList[_12DIZHI[i]]); // 干阳
          _4keList[0].push(guishenList[_12DIZHI[i]]);
          break;
        }
      }
      break;
    }
  }

  // 第二课
  _4keList[1] = [];
  _4keList[1].push(_4keList[0][1]); // 取自干阳
  const gy = _4keList[0][1];
  for (let i = 0; i < 12; i++) {
    if (_12DIZHI[i] === gy) {
      _4keList[1].push(yueJiangList[_12DIZHI[i]]); // 干阴
      _4keList[1].push(guishenList[_12DIZHI[i]]);
      break;
    }
  }

  // 第三课
  _4keList[2] = [];
  _4keList[2].push(riZhu[1]); // 日支
  const rz = riZhu[1];
  for (let i = 0; i < 12; i++) {
    if (_12DIZHI[i] === rz) {
      _4keList[2].push(yueJiangList[_12DIZHI[i]]); // 支阳
      _4keList[2].push(guishenList[_12DIZHI[i]]);
      break;
    }
  }

  // 第四课
  _4keList[3] = [];
  _4keList[3].push(_4keList[2][1]); // 取自支阳
  const zy = _4keList[2][1];
  for (let i = 0; i < 12; i++) {
    if (_12DIZHI[i] === zy) {
      _4keList[3].push(yueJiangList[_12DIZHI[i]]); // 支阴
      _4keList[3].push(guishenList[_12DIZHI[i]]);
      break;
    }
  }

  // ===== 排三传 (da6ren.js:483-523) =====
  const ganzhi = riZhu[0] + riZhu[1];
  const sanchuan = _720KE[ganzhi][_4keList[0][1]].split("");
  const _3chuanList: string[][] = [];

  _3chuanList[0] = [];
  _3chuanList[1] = [];
  _3chuanList[2] = [];

  _3chuanList[0].push(sanchuan[0]);
  for (let i = 0; i < 12; i++) {
    if (yueJiangList[_12DIZHI[i]] === sanchuan[0]) {
      _3chuanList[0].push(tianganList[_12DIZHI[i]]);
      _3chuanList[0].push(guishenList[_12DIZHI[i]]);
      _3chuanList[0].push(get6qinRelation(riZhu[0], sanchuan[0]));
      break;
    }
  }

  _3chuanList[1].push(sanchuan[1]);
  for (let i = 0; i < 12; i++) {
    if (yueJiangList[_12DIZHI[i]] === sanchuan[1]) {
      _3chuanList[1].push(tianganList[_12DIZHI[i]]);
      _3chuanList[1].push(guishenList[_12DIZHI[i]]);
      _3chuanList[1].push(get6qinRelation(riZhu[0], sanchuan[1]));
      break;
    }
  }

  _3chuanList[2].push(sanchuan[2]);
  for (let i = 0; i < 12; i++) {
    if (yueJiangList[_12DIZHI[i]] === sanchuan[2]) {
      _3chuanList[2].push(tianganList[_12DIZHI[i]]);
      _3chuanList[2].push(guishenList[_12DIZHI[i]]);
      _3chuanList[2].push(get6qinRelation(riZhu[0], sanchuan[2]));
      break;
    }
  }

  // ===== 排12年煞 (da6ren.js:526-554) =====
  const zhiList = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  const yearShaList = ["太岁", "太阳", "丧门", "合神", "官符", "小耗", "大耗", "年墓", "白虎", "德神", "吊客", "病符"];
  const yearZhi = nianZhu[1];
  const startIndex = zhiList.indexOf(yearZhi);
  const _12nianshaList: Record<string, string> = {};
  for (let i = 0; i < 12; i++) {
    const zhiIndex = (startIndex + i) % 12;
    _12nianshaList[zhiList[zhiIndex]] = yearShaList[i];
  }

  // ===== 排命宫12宫 (da6ren.js:557-600) =====
  const dizhi = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  const palaces = ["命", "兄", "妻", "子", "财", "疾", "迁", "仆", "禄", "田", "德", "母"];
  const isYang = !(solarInfo.isAfterXiaZhi && solarInfo.isBeforeDongZhi);

  let mingZhiIndex = dizhi.indexOf(yueJiang) + 1 + dizhi.indexOf(shiZhu[1]) + 1 - 4;
  if (mingZhiIndex > 12) mingZhiIndex = mingZhiIndex - 12;
  const mingZhi = dizhi[mingZhiIndex - 1];

  const mingIdx = dizhi.indexOf(mingZhi);
  const _12gongList: Record<string, string> = {};
  if (isYang) {
    for (let i = 0; i < 12; i++) {
      const idx2 = (mingIdx + i) % 12;
      _12gongList[dizhi[idx2]] = palaces[i];
    }
  } else {
    for (let i = 0; i < 12; i++) {
      let idx2 = (mingIdx - i) % 12;
      if (idx2 < 0) idx2 = idx2 + 12;
      _12gongList[dizhi[idx2]] = palaces[i];
    }
  }

  // ===== 组装返回结果 (da6ren.js:602-637) =====
  return {
    params,
    date: `${year}年${month}月${day}日 ${hour}时${minute}分`,
    siZhu: [nianZhu, yueZhu, riZhu, shiZhu],
    zhanbuTime: zhanbuTimeCur,
    jieqiInfo: {
      from: solarInfo.prevJieQiName,
      fromDate: solarInfo.prevJieQiDate,
      to: solarInfo.nextJieQiName,
      toDate: solarInfo.nextJieQiDate,
    },
    data: {
      yueJiangList,
      guishenList,
      tianganList,
      _4keList,
      _3chuanList,
      _12nianshaList,
      _12gongList,
      sym3chuanList,
    },
    yuejiang: yueJiang,
    isMan,
    yearGanzhi: jiaziYear,
    xingYear: xn,
    yongShen,
    kongwang: getKongwang(riZhu[0] + riZhu[1]),
    isDaytime,
  };
}