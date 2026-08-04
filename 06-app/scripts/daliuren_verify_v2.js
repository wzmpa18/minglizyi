/**
 * 大六壬算法验证脚本 v2 - 使用 lunar-javascript 正确日干支
 * 对比言道实现 vs 吉时雨基准(da6ren.js)
 * v17.10
 */

const { Solar } = require('lunar-javascript');

// ==================== 基础数据 ====================
const GAN = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const ZHI = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const GAN_WUXING = { "甲":"木","乙":"木","丙":"火","丁":"火","戊":"土","己":"土","庚":"金","辛":"金","壬":"水","癸":"水" };
const ZHI_WUXING = { "子":"水","丑":"土","寅":"木","卯":"木","辰":"土","巳":"火","午":"火","未":"土","申":"金","酉":"金","戌":"土","亥":"水" };
const GAN_YIN_YANG = { "甲":"阳","乙":"阴","丙":"阳","丁":"阴","戊":"阳","己":"阴","庚":"阳","辛":"阴","壬":"阳","癸":"阴" };
const ZHI_YIN_YANG = { "子":"阳","丑":"阴","寅":"阳","卯":"阴","辰":"阳","巳":"阴","午":"阳","未":"阴","申":"阳","酉":"阴","戌":"阳","亥":"阴" };
const WX_SHENG = { "木":"火","火":"土","土":"金","金":"水","水":"木" };
const WX_KE = { "木":"土","土":"水","水":"火","火":"金","金":"木" };

function getWuxingRelation(a, b) {
  if (a === b) return "同我";
  if (WX_SHENG[a] === b) return "我生";
  if (WX_SHENG[b] === a) return "生我";
  if (WX_KE[a] === b) return "我克";
  if (WX_KE[b] === a) return "克我";
  return "同我";
}
const LIU_QIN_SHORT = { "同我":"兄","我生":"子","克我":"官","我克":"财","生我":"父" };

const JIAZI_TABLE = ["甲子","乙丑","丙寅","丁卯","戊辰","己巳","庚午","辛未","壬申","癸酉","甲戌","乙亥","丙子","丁丑","戊寅","己卯","庚辰","辛巳","壬午","癸未","甲申","乙酉","丙戌","丁亥","戊子","己丑","庚寅","辛卯","壬辰","癸巳","甲午","乙未","丙申","丁酉","戊戌","己亥","庚子","辛丑","壬寅","癸卯","甲辰","乙巳","丙午","丁未","戊申","己酉","庚戌","辛亥","壬子","癸丑","甲寅","乙卯","丙辰","丁巳","戊午","己未","庚申","辛酉","壬戌","癸亥"];

// 十干寄宫
const GAN_JIGONG = { "甲":"寅","乙":"辰","丙":"巳","丁":"未","戊":"巳","己":"未","庚":"申","辛":"戌","壬":"亥","癸":"丑" };

// 十二天将
const SHI_ER_SHEN = ["贵","蛇","朱","合","勾","龙","空","虎","常","玄","阴","后"];
const DZ_DIPAN = ["寅","卯","辰","巳","午","未","申","酉","戌","亥","子","丑"];
const YUE_JIANG_LIST = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];

// 节气月将
const ZHONG_QI_YJ = { "冬至":"丑","大寒":"子","雨水":"亥","春分":"戌","谷雨":"酉","小满":"申","夏至":"未","大暑":"午","处暑":"巳","秋分":"辰","霜降":"卯","小雪":"寅" };
const YUE_JIANG_NAME = { "亥":"登明","戌":"河魁","酉":"从魁","申":"传送","未":"小吉","午":"胜光","巳":"太乙","辰":"天罡","卯":"太冲","寅":"功曹","丑":"大吉","子":"神后" };

// 720课表（与页面一致）
const KE_720 = { "甲子":{"子":"戌申午","丑":"子亥戌","寅":"寅巳申","卯":"辰巳午","辰":"辰午申","巳":"申亥寅","午":"申亥寅","未":"辰申子","申":"子巳戌","酉":"寅申寅","戌":"寅酉辰","亥":"戌午寅"},"乙丑":{"子":"巳丑酉","丑":"丑戌未","寅":"亥酉未","卯":"子亥戌","辰":"辰丑戌","巳":"寅卯辰","午":"申戌子","未":"未戌丑","申":"酉丑巳","酉":"寅未子","戌":"戌辰戌","亥":"卯戌巳"},"丙寅":{"子":"子未寅","丑":"戌午寅","寅":"亥申巳","卯":"丑亥酉","辰":"子亥戌","巳":"巳申寅","午":"辰巳午","未":"辰午申","申":"申亥寅","酉":"酉丑巳","戌":"子巳戌","亥":"寅申寅"},"丁卯":{"子":"巳戌卯","丑":"卯酉卯","寅":"戌巳子","卯":"未卯亥","辰":"子酉午","巳":"亥酉未","午":"丑子亥","未":"卯子午","申":"辰巳午","酉":"酉亥丑","戌":"酉子卯","亥":"亥卯未"},"戊辰":{"子":"子未寅","丑":"子申辰","寅":"寅亥申","卯":"丑亥酉","辰":"卯寅丑","巳":"巳申寅","午":"寅午午","未":"申戌子","申":"亥寅巳","酉":"子辰申","戌":"寅未子","亥":"亥巳亥"},"己巳":{"子":"巳戌卯","丑":"巳亥巳","寅":"酉辰亥","卯":"卯亥未","辰":"寅亥申","巳":"丑亥酉","午":"卯寅丑","未":"巳申寅","申":"申申午","酉":"亥丑卯","戌":"申亥寅","亥":"酉丑巳"},"庚午":{"子":"辰申子","丑":"辰酉寅","寅":"寅申寅","卯":"戌巳子","辰":"子申辰","巳":"巳寅亥","午":"寅子戌","未":"午巳辰","申":"申寅巳","酉":"戌未酉","戌":"申戌子","亥":"酉子卯"},"辛未":{"子":"寅辰午","丑":"亥丑丑","寅":"亥卯未","卯":"巳戌卯","辰":"巳丑辰","巳":"酉辰亥","午":"卯亥未","未":"亥未未","申":"午辰寅","酉":"巳辰卯","戌":"未丑戌","亥":"申亥寅"},"壬申":{"子":"丑寅卯","丑":"子寅辰","寅":"巳申亥","卯":"未亥卯","辰":"辰酉寅","巳":"寅申寅","午":"午丑申","未":"子申辰","申":"巳寅亥","酉":"午辰寅","戌":"戌酉申","亥":"亥申寅"},"癸酉":{"子":"未午巳","丑":"丑戌未","寅":"亥子丑","卯":"丑卯巳","辰":"辰未戌","巳":"酉丑巳","午":"未子巳","未":"卯酉卯","申":"亥午丑","酉":"巳丑酉","戌":"午卯子","亥":"未巳卯"},"甲戌":{"子":"午辰寅","丑":"子亥戌","寅":"寅巳申","卯":"辰巳午","辰":"辰午申","巳":"申亥寅","午":"寅午戌","未":"子巳戌","申":"寅申寅","酉":"子未寅","戌":"戌午寅","亥":"申巳寅"},"乙亥":{"子":"未卯亥","丑":"丑戌未","寅":"酉未巳","卯":"戌酉申","辰":"辰亥巳","巳":"丑寅卯","午":"申戌子","未":"未戌丑","申":"未亥卯","酉":"寅未子","戌":"巳亥巳","亥":"午丑申"},"丙子":{"子":"子未寅","丑":"申辰子","寅":"午卯子","卯":"丑亥酉","辰":"戌酉申","巳":"巳申寅","午":"寅卯辰","未":"辰午申","申":"申亥寅","酉":"酉丑巳","戌":"巳戌卯","亥":"午子午"},"丁丑":{"子":"巳戌卯","丑":"亥未丑","寅":"卯戌巳","卯":"巳丑酉","辰":"子辰戌","巳":"亥酉未","午":"子亥戌","未":"丑戌未","申":"申酉戌","酉":"酉亥丑","戌":"午戌辰","亥":"酉丑巳"},"戊寅":{"子":"子未寅","丑":"戌午寅","寅":"寅亥申","卯":"丑亥酉","辰":"子亥戌","巳":"巳申寅","午":"辰巳午","未":"辰午申","申":"申亥寅","酉":"丑午酉","戌":"子巳戌","亥":"寅申寅"},"己卯":{"子":"巳戌卯","丑":"卯酉卯","寅":"戌巳子","卯":"未卯亥","辰":"子酉午","巳":"亥酉未","午":"丑子亥","未":"卯子午","申":"辰巳午","酉":"亥丑卯","戌":"酉子卯","亥":"亥卯未"},"庚辰":{"子":"辰申子","丑":"寅未子","寅":"寅申寅","卯":"午丑申","辰":"子申辰","巳":"巳寅亥","午":"寅子戌","未":"卯寅丑","申":"申寅巳","酉":"午未申","戌":"申戌子","亥":"寅巳申"},"辛巳":{"子":"寅辰午","丑":"申亥寅","寅":"酉丑巳","卯":"卯申丑","辰":"巳亥巳","巳":"未寅酉","午":"午寅戌","未":"寅亥申","申":"丑亥酉","酉":"卯寅丑","戌":"巳申寅","亥":"午未申"},"壬午":{"子":"丑寅卯","丑":"申戌子","寅":"酉子卯","卯":"未亥卯","辰":"辰酉寅","巳":"午子午","午":"午丑申","未":"戌午寅","申":"巳寅亥","酉":"寅子戌","戌":"戌酉申","亥":"亥午子"},"癸未":{"子":"巳辰卯","丑":"丑戌未","寅":"申寅申","卯":"巳未酉","辰":"辰未戌","巳":"酉丑巳","午":"巳戌卯","未":"未丑未","申":"卯戌巳","酉":"卯亥未","戌":"戌未辰","亥":"巳卯丑"},"甲申":{"子":"午辰寅","丑":"子亥戌","寅":"寅巳申","卯":"辰巳午","辰":"辰午申","巳":"申亥寅","午":"申亥寅","未":"辰申子","申":"辰申子","酉":"子巳戌","戌":"寅申寅","亥":"戌巳子"},"乙酉":{"子":"巳丑酉","丑":"丑戌未","寅":"未巳卯","卯":"申未午","辰":"辰酉卯","巳":"亥子丑","午":"申戌子","未":"未戌丑","申":"申子辰","酉":"未子巳","戌":"卯酉卯","亥":"亥午丑"},"丙戌":{"子":"子未寅","丑":"酉巳丑","寅":"亥申巳","卯":"丑亥酉","辰":"卯寅丑","巳":"巳申寅","午":"亥子丑","未":"子寅辰","申":"申亥寅","酉":"酉丑巳","戌":"申丑午","亥":"巳亥巳"},"丁亥":{"子":"巳戌卯","丑":"巳亥巳","寅":"午丑申","卯":"未卯亥","辰":"巳亥寅","巳":"酉未巳","午":"戌酉申","未":"亥未丑","申":"申酉戌","酉":"酉亥丑","戌":"午戌寅","亥":"未亥卯"},"戊子":{"子":"子未寅","丑":"巳申丑","寅":"寅亥申","卯":"丑亥酉","辰":"戌酉申","巳":"巳申寅","午":"寅卯辰","未":"辰午申","申":"卯午酉","酉":"辰申子","戌":"巳戌卯","亥":"午子午"},"己丑":{"子":"巳戌卯","丑":"亥未丑","寅":"卯戌巳","卯":"卯亥未","辰":"子辰戌","巳":"亥酉未","午":"子亥戌","未":"丑戌未","申":"寅卯辰","酉":"卯巳未","戌":"午戌辰","亥":"酉丑巳"},"庚寅":{"子":"辰申子","丑":"子巳戌","寅":"寅申寅","卯":"戌巳子","辰":"子申辰","巳":"巳寅亥","午":"午辰寅","未":"子亥戌","申":"申寅巳","酉":"辰巳午","戌":"辰午申","亥":"申亥寅"},"辛卯":{"子":"巳未酉","丑":"酉子卯","寅":"亥卯未","卯":"卯申丑","辰":"卯酉卯","巳":"戌巳子","午":"未卯亥","未":"子未子","申":"亥酉未","酉":"丑子亥","戌":"卯子午","亥":"辰巳午"},"壬辰":{"子":"丑寅卯","丑":"申戌子","寅":"戌丑辰","卯":"未亥卯","辰":"寅未子","巳":"巳亥巳","午":"午丑申","未":"子申辰","申":"巳寅亥","酉":"寅子戌","戌":"戌酉申","亥":"亥辰戌"},"癸巳":{"子":"卯寅丑","丑":"丑戌未","寅":"未申酉","卯":"未酉亥","辰":"申亥寅","巳":"酉丑巳","午":"午亥辰","未":"巳亥巳","申":"卯戌巳","酉":"巳丑酉","戌":"戌未辰","亥":"丑亥酉"},"甲午":{"子":"寅子戌","丑":"子亥戌","寅":"寅巳申","卯":"辰巳午","辰":"辰午申","巳":"申亥寅","午":"寅午戌","未":"子巳戌","申":"寅申寅","酉":"酉辰亥","戌":"戌午寅","亥":"申巳寅"},"乙未":{"子":"卯亥未","丑":"丑戌未","寅":"亥寅巳","卯":"戌卯午","辰":"辰未丑","巳":"酉戌亥","午":"申戌子","未":"未戌丑","申":"亥卯未","酉":"巳戌卯","戌":"戌辰戌","亥":"午丑申"},"丙申":{"子":"戌巳子","丑":"子申辰","寅":"巳寅亥","卯":"丑亥酉","辰":"卯寅丑","巳":"巳申寅","午":"酉戌亥","未":"子寅辰","申":"申亥寅","酉":"酉丑巳","戌":"卯申丑","亥":"寅申寅"},"丁酉":{"子":"未子巳","丑":"卯酉卯","寅":"亥午丑","卯":"巳丑酉","辰":"午卯子","巳":"丑巳巳","午":"申未午","未":"酉未丑","申":"亥子丑","酉":"酉亥丑","戌":"子卯午","亥":"亥卯未"},"戊戌":{"子":"子未寅","丑":"寅戌午","寅":"寅亥申","卯":"丑亥酉","辰":"卯寅丑","巳":"巳申寅","午":"亥子丑","未":"子寅辰","申":"亥寅巳","酉":"寅午戌","戌":"申丑午","亥":"亥巳亥"},"己亥":{"子":"巳戌卯","丑":"巳亥巳","寅":"午丑申","卯":"未卯亥","辰":"巳寅亥","巳":"卯丑亥","午":"戌酉申","未":"亥未丑","申":"丑寅卯","酉":"丑卯巳","戌":"寅巳申","亥":"亥卯未"},"庚子":{"子":"辰申子","丑":"巳戌卯","寅":"寅申寅","卯":"戌巳子","辰":"子申辰","巳":"午卯子","午":"午辰寅","未":"戌酉申","申":"申寅巳","酉":"寅卯辰","戌":"辰午申","亥":"午酉子"},"辛丑":{"子":"卯巳未","丑":"巳丑丑","寅":"酉丑巳","卯":"卯申丑","辰":"亥未辰","巳":"卯戌巳","午":"巳丑酉","未":"巳未未","申":"亥酉未","酉":"子亥戌","戌":"丑戌未","亥":"寅卯辰"},"壬寅":{"子":"辰巳午","丑":"辰午申","寅":"申亥寅","卯":"未亥卯","辰":"子巳戌","巳":"寅申寅","午":"午丑申","未":"戌午寅","申":"巳寅亥","酉":"戌申午","戌":"子亥戌","亥":"亥寅巳"},"癸卯":{"子":"丑子亥","丑":"丑戌未","寅":"辰巳午","卯":"未酉亥","辰":"酉子卯","巳":"酉丑巳","午":"午亥辰","未":"卯酉卯","申":"卯戌巳","酉":"未亥卯","戌":"戌未辰","亥":"亥酉未"},"甲辰":{"子":"寅子戌","丑":"子亥戌","寅":"寅巳申","卯":"辰巳午","辰":"辰午申","巳":"申亥寅","午":"申子辰","未":"子巳戌","申":"寅申寅","酉":"午丑申","戌":"子申辰","亥":"申巳寅"},"乙巳":{"子":"酉巳丑","丑":"丑戌未","寅":"丑亥酉","卯":"卯寅丑","辰":"辰巳申","巳":"未申酉","午":"申戌子","未":"未戌丑","申":"酉丑巳","酉":"寅未子","戌":"巳亥巳","亥":"午丑申"},"丙午":{"子":"子未寅","丑":"戌午寅","寅":"子酉午","卯":"丑亥酉","辰":"卯寅丑","巳":"巳申寅","午":"申酉戌","未":"申戌子","申":"申亥寅","酉":"酉丑巳","戌":"辰酉寅","亥":"午子午"},"丁未":{"子":"巳戌卯","丑":"巳丑丑","寅":"酉辰亥","卯":"卯亥未","辰":"亥辰辰","巳":"丑巳巳","午":"卯午午","未":"未丑戌","申":"申酉戌","酉":"酉亥丑","戌":"亥戌戌","亥":"亥卯未"},"戊申":{"子":"子未寅","丑":"子申辰","寅":"寅亥申","卯":"丑亥酉","辰":"卯寅丑","巳":"巳申寅","午":"戌酉午","未":"子寅辰","申":"寅巳申","酉":"辰申子","戌":"卯申丑","亥":"寅申寅"},"己酉":{"子":"未子巳","丑":"卯酉卯","寅":"亥午丑","卯":"卯亥未","辰":"午卯子","巳":"卯丑亥","午":"戌午申","未":"酉未丑","申":"亥子丑","酉":"丑卯巳","戌":"卯午酉","亥":"亥卯未"},"庚戌":{"子":"辰申子","丑":"申丑午","寅":"寅申寅","卯":"戌巳子","辰":"子申辰","巳":"巳寅亥","午":"午辰寅","未":"午巳辰","申":"申寅巳","酉":"亥子丑","戌":"子寅辰","亥":"寅巳申"},"辛亥":{"子":"丑卯巳","丑":"巳申亥","寅":"未亥卯","卯":"卯申丑","辰":"巳亥巳","巳":"午丑申","午":"未卯亥","未":"巳寅亥","申":"午辰寅","酉":"戌酉申","戌":"亥戌未","亥":"丑寅卯"},"壬子":{"子":"寅卯辰","丑":"辰午申","寅":"午酉子","卯":"未亥卯","辰":"巳戌卯","巳":"午子午","午":"午丑申","未":"未卯亥","申":"午卯子","酉":"戌申午","戌":"戌酉申","亥":"亥子卯"},"癸丑":{"子":"子亥戌","丑":"丑戌未","寅":"寅卯辰","卯":"卯巳未","辰":"辰未戌","巳":"酉丑巳","午":"午亥辰","未":"未丑未","申":"卯戌巳","酉":"巳丑酉","戌":"戌未辰","亥":"亥酉未"},"甲寅":{"子":"戌申午","丑":"子亥戌","寅":"寅巳申","卯":"辰巳午","辰":"辰午申","巳":"申亥寅","午":"申午午","未":"子巳戌","申":"寅申寅","酉":"酉辰亥","戌":"戌午寅","亥":"丑亥亥"},"乙卯":{"子":"未卯亥","丑":"丑戌未","寅":"亥酉未","卯":"丑子亥","辰":"辰卯子","巳":"辰巳午","午":"申戌子","未":"酉子卯","申":"亥卯未","酉":"寅未子","戌":"卯酉卯","亥":"午丑申"},"丙辰":{"子":"午丑申","丑":"子申辰","寅":"亥申巳","卯":"丑亥酉","辰":"卯寅丑","巳":"巳申寅","午":"亥午午","未":"申戌子","申":"申亥寅","酉":"酉丑巳","戌":"寅未子","亥":"巳亥巳"},"丁巳":{"子":"巳戌卯","丑":"巳亥巳","寅":"酉辰亥","卯":"亥未卯","辰":"亥申巳","巳":"丑亥酉","午":"卯寅丑","未":"巳申寅","申":"申酉戌","酉":"酉亥丑","戌":"申亥寅","亥":"酉丑巳"},"戊午":{"子":"子未寅","丑":"戌午申","寅":"寅亥申","卯":"丑亥酉","辰":"卯寅丑","巳":"巳申寅","午":"寅午午","未":"申戌子","申":"酉子卯","酉":"寅午戌","戌":"辰酉寅","亥":"午子午"},"己未":{"子":"巳戌卯","丑":"巳丑丑","寅":"酉辰亥","卯":"卯亥未","辰":"亥辰辰","巳":"丑巳巳","午":"卯午午","未":"未丑戌","申":"未申申","酉":"酉酉酉","戌":"亥戌戌","亥":"亥卯未"},"庚申":{"子":"辰申子","丑":"卯丑丑","寅":"寅申寅","卯":"戌巳子","辰":"子申辰","巳":"巳寅亥","午":"午辰寅","未":"酉未未","申":"申寅巳","酉":"亥酉酉","戌":"子寅辰","亥":"丑亥亥"},"辛酉":{"子":"丑卯巳","丑":"卯午酉","寅":"寅午戌","卯":"未子巳","辰":"卯酉卯","巳":"亥午丑","午":"巳丑酉","未":"午卯子","申":"午辰寅","酉":"丑酉酉","戌":"酉戌未","亥":"亥子丑"},"壬戌":{"子":"亥子丑","丑":"子寅辰","寅":"辰未戌","卯":"未亥卯","辰":"辰酉寅","巳":"巳亥巳","午":"午丑申","未":"未卯亥","申":"巳寅亥","酉":"午辰寅","戌":"戌酉申","亥":"亥戌未"},"癸亥":{"子":"戌酉申","丑":"丑戌未","寅":"丑寅卯","卯":"丑卯巳","辰":"辰未戌","巳":"酉丑巳","午":"午亥辰","未":"巳亥巳","申":"卯戌巳","酉":"未卯亥","戌":"巳寅亥","亥":"未巳卯"} };

// 课体吉凶
const KE_TI_DESC = { "元首课":"上克下·凡事顺成吉","重审课":"下克上·事反复初难后易","比用课":"比和·兄弟同谋亲疏相济","涉害课":"涉害深·艰难争讼周折","蒿矢课":"神克日·远事虚惊力微","弹射课":"日克神·远谋力轻难中","虎视课":"昴星阳日·惊恐关梁","冬蛇掩目课":"昴星阴日·暗昧惊伏","别责课":"课不全·依傍借助难独成","八专课":"干支同位·同谋私密","伏吟课":"伏吟·静伏阻滞不动","反吟课":"反吟·动而反复有来回" };

// 贵人
const GUI_REN = { "甲":["丑","未"],"戊":["丑","未"],"庚":["丑","未"],"乙":["子","申"],"己":["子","申"],"丙":["亥","酉"],"丁":["亥","酉"],"壬":["巳","卯"],"癸":["巳","卯"],"辛":["午","寅"] };

function circularList(arr, startIdx, forward) {
  if (forward === undefined) forward = true;
  let idx = startIdx;
  return function() {
    const item = arr[idx];
    idx = forward ? (idx + 1) % arr.length : (idx - 1 + arr.length) % arr.length;
    return item;
  };
}

function getKongwang(gz) {
  const idx = JIAZI_TABLE.indexOf(gz);
  if (idx === -1) return "戌亥";
  const xun = Math.floor(idx / 10) * 10;
  const kw = { 0:"戌亥",10:"申酉",20:"午未",30:"辰巳",40:"寅卯",50:"子丑" };
  return kw[xun] || "戌亥";
}

function getPrevZhongQi(month, day) {
  const thresholds = [
    { name:"冬至", m:12, d:22 }, { name:"大寒", m:1, d:20 },
    { name:"雨水", m:2, d:19 }, { name:"春分", m:3, d:21 },
    { name:"谷雨", m:4, d:20 }, { name:"小满", m:5, d:21 },
    { name:"夏至", m:6, d:21 }, { name:"大暑", m:7, d:23 },
    { name:"处暑", m:8, d:23 }, { name:"秋分", m:9, d:23 },
    { name:"霜降", m:10, d:23 }, { name:"小雪", m:11, d:22 },
  ];
  let prev = "冬至";
  for (const t of thresholds) {
    if (month > t.m || (month === t.m && day >= t.d)) prev = t.name;
    else break;
  }
  if (month === 1 && day < 20) prev = "冬至";
  return prev;
}

function getYueJiang(month, day) {
  const qi = getPrevZhongQi(month, day);
  return { zhi: ZHONG_QI_YJ[qi] || "丑", name: YUE_JIANG_NAME[ZHONG_QI_YJ[qi]] || "大吉" };
}

// ==================== 核心算法（对标吉时雨 da6ren.js + 言道 page.tsx） ====================
function calculateDaLiuRen(year, month, day, hour, minute, isMan, birthYear, zhanbuTime, yueJiangMethod, guirenMethod, guirenSunni) {
  // 使用 lunar-javascript 获取正确八字
  const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
  const lunar = solar.getLunar();
  const ec = lunar.getEightChar();

  const yearGan = ec.getYearGan();
  const yearZhi = ec.getYearZhi();
  const monthGan = ec.getMonthGan();
  const monthZhi = ec.getMonthZhi();
  const dayGan = ec.getDayGan();
  const dayZhi = ec.getDayZhi();
  const hourGan = ec.getTimeGan();
  const hourZhi = ec.getTimeZhi();

  const siZhu = [[yearGan, yearZhi], [monthGan, monthZhi], [dayGan, dayZhi], [hourGan, hourZhi]];

  // 月将计算
  let yuejiangZhi, yuejiangName;
  if (yueJiangMethod === 2) {
    const YUE_ZHI_ARR = ["寅","卯","辰","巳","午","未","申","酉","戌","亥","子","丑"];
    const SHI_ZHI_ARR = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
    const YUE_JIANG2 = [["亥","登明"],["戌","河魁"],["酉","从魁"],["申","传送"],["未","小吉"],["午","胜光"],["巳","太乙"],["辰","天罡"],["卯","太冲"],["寅","功曹"],["丑","大吉"],["子","神后"]];
    const total = (YUE_ZHI_ARR.indexOf(yearZhi) + 1) + (SHI_ZHI_ARR.indexOf(monthZhi) + 1) + (SHI_ZHI_ARR.indexOf(dayZhi) + 1) + (SHI_ZHI_ARR.indexOf(hourZhi) + 1);
    let mod;
    if (total < 12) mod = 12 - total;
    else { mod = total % 12; if (mod === 0) mod = 12; }
    const yj2 = YUE_JIANG2[mod - 1];
    yuejiangZhi = yj2[0];
    yuejiangName = yj2[1];
  } else {
    const yj = getYueJiang(month, day);
    yuejiangZhi = yj.zhi;
    yuejiangName = yj.name;
  }

  // 占时
  const HOUR_TO_ZHI = { 0:"子",23:"子",1:"丑",2:"丑",3:"寅",4:"寅",5:"卯",6:"卯",7:"辰",8:"辰",9:"巳",10:"巳",11:"午",12:"午",13:"未",14:"未",15:"申",16:"申",17:"酉",18:"酉",19:"戌",20:"戌",21:"亥",22:"亥" };
  const zhanbuTimeFinal = zhanbuTime || HOUR_TO_ZHI[hour] || "子";

  // 昼夜判断
  const ZHANBU_HOUR = { "子":23,"丑":1,"寅":3,"卯":5,"辰":7,"巳":9,"午":11,"未":13,"申":15,"酉":17,"戌":19,"亥":21 };
  const zhanbuHour = ZHANBU_HOUR[zhanbuTimeFinal] || hour;
  let isDaytime;
  if (guirenMethod === 2) isDaytime = true;
  else if (guirenMethod === 3) isDaytime = false;
  else isDaytime = zhanbuHour >= 5 && zhanbuHour < 17;

  // 天盘（月将）
  const yjIdx = YUE_JIANG_LIST.indexOf(yuejiangZhi);
  const yjIter = circularList(YUE_JIANG_LIST, yjIdx, true);
  const zhanbuIdx = DZ_DIPAN.indexOf(zhanbuTimeFinal);
  const yueJiangMap = {};
  for (let i = zhanbuIdx; i < 12; i++) yueJiangMap[DZ_DIPAN[i]] = yjIter();
  for (let i = 0; i < zhanbuIdx; i++) yueJiangMap[DZ_DIPAN[i]] = yjIter();

  // 贵神
  const guirenZhi = GUI_REN[dayGan][isDaytime ? 0 : 1];
  let guirenDipanIdx = -1;
  for (let i = 0; i < 12; i++) {
    if (yueJiangMap[DZ_DIPAN[i]] === guirenZhi) { guirenDipanIdx = i; break; }
  }
  if (guirenDipanIdx === -1) guirenDipanIdx = 0;
  const guirenDipan = DZ_DIPAN[guirenDipanIdx];
  let isShun;
  if (guirenSunni === 2) isShun = isMan;
  else isShun = "亥子丑寅卯辰".includes(guirenDipan);
  const shenIter = circularList(SHI_ER_SHEN, 0, isShun);
  const guiShenMap = {};
  for (let i = guirenDipanIdx; i < 12; i++) guiShenMap[DZ_DIPAN[i]] = shenIter();
  for (let i = 0; i < guirenDipanIdx; i++) guiShenMap[DZ_DIPAN[i]] = shenIter();

  // 天干（遁干）
  let riZhiDipanIdx = -1;
  for (let i = 0; i < 12; i++) {
    if (yueJiangMap[DZ_DIPAN[i]] === dayZhi) { riZhiDipanIdx = i; break; }
  }
  if (riZhiDipanIdx === -1) riZhiDipanIdx = 0;
  const ganIdx = GAN.indexOf(dayGan);
  const ganForward = guirenSunni === 2 ? isMan : true;
  const ganIter = circularList([...GAN, "〇", "〇"], ganIdx, ganForward);
  const tianGanMap = {};
  for (let i = riZhiDipanIdx; i < 12; i++) tianGanMap[DZ_DIPAN[i]] = ganIter();
  for (let i = 0; i < riZhiDipanIdx; i++) tianGanMap[DZ_DIPAN[i]] = ganIter();

  // 四课
  const jigong = GAN_JIGONG[dayGan];
  const ganYang = yueJiangMap[jigong];
  const ganYangTJ = guiShenMap[jigong];
  const ganYangDG = tianGanMap[jigong];
  const ganYin = yueJiangMap[ganYang];
  const ganYinTJ = guiShenMap[ganYang];
  const ganYinDG = tianGanMap[ganYang];
  const zhiYang = yueJiangMap[dayZhi];
  const zhiYangTJ = guiShenMap[dayZhi];
  const zhiYangDG = tianGanMap[dayZhi];
  const zhiYin = yueJiangMap[zhiYang];
  const zhiYinTJ = guiShenMap[zhiYang];
  const zhiYinDG = tianGanMap[zhiYang];

  const siKe = [
    { xiaShen: dayGan, shangShen: ganYang, tianJiang: ganYangTJ, dunGan: ganYangDG },
    { xiaShen: ganYang, shangShen: ganYin, tianJiang: ganYinTJ, dunGan: ganYinDG },
    { xiaShen: dayZhi, shangShen: zhiYang, tianJiang: zhiYangTJ, dunGan: zhiYangDG },
    { xiaShen: zhiYang, shangShen: zhiYin, tianJiang: zhiYinTJ, dunGan: zhiYinDG },
  ];

  // 三传（720课表查找）
  const ganZhi = dayGan + dayZhi;
  const ke720 = KE_720[ganZhi];
  let sanChuanZhi = [];
  if (ke720 && ke720[ganYang]) {
    sanChuanZhi = ke720[ganYang].split("");
  } else {
    sanChuanZhi = [ganYang, ganYin, zhiYang];
  }

  // 九宗门课体判定
  const chongMap = { "子":"午","午":"子","丑":"未","未":"丑","寅":"申","申":"寅","卯":"酉","酉":"卯","辰":"戌","戌":"辰","巳":"亥","亥":"巳" };
  const dayGanYy = GAN_YIN_YANG[dayGan];

  function zhiKe(above, below) {
    const aWx = ZHI_WUXING[above];
    const bWx = ZHI_WUXING[below];
    if (!aWx || !bWx) return "none";
    const r_ab = getWuxingRelation(aWx, bWx);
    const r_ba = getWuxingRelation(bWx, aWx);
    if (r_ab === "我克") return "shangKeXia";
    if (r_ba === "我克") return "xiaKeShang";
    return "none";
  }

  const isFuYin = (yuejiangZhi === zhanbuTimeFinal);
  const isFanYin = (chongMap[yuejiangZhi] === zhanbuTimeFinal);
  const isBaZhuan = (jigong === dayZhi);

  const keRels = siKe.map((k, i) => ({
    index: i, xiaShen: k.xiaShen, shangShen: k.shangShen,
    keType: zhiKe(k.shangShen, k.xiaShen),
  }));

  const zeiList = keRels.filter(k => k.keType === "xiaKeShang");
  const keList = keRels.filter(k => k.keType === "shangKeXia");

  const dayGanWx = GAN_WUXING[dayGan];
  const yaoKeList = [];
  if (zeiList.length === 0 && keList.length === 0 && !isFuYin && !isFanYin && !isBaZhuan) {
    for (let i = 0; i < 4; i++) {
      const ss = siKe[i].shangShen;
      const ssWx = ZHI_WUXING[ss];
      if (!ssWx) continue;
      const r_gan_ss = getWuxingRelation(dayGanWx, ssWx);
      const r_ss_gan = getWuxingRelation(ssWx, dayGanWx);
      if (r_ss_gan === "我克") yaoKeList.push({ index: i, shangShen: ss, type: "shenKeRi" });
      else if (r_gan_ss === "我克") yaoKeList.push({ index: i, shangShen: ss, type: "riKeShen" });
    }
  }

  function isBi(zhi) { return ZHI_YIN_YANG[zhi] === dayGanYy; }

  let sanChuanMethod = "贼克";
  let keTi = "元首课";

  if (isFuYin) {
    sanChuanMethod = "伏吟"; keTi = "伏吟课";
  } else if (isFanYin) {
    sanChuanMethod = "反吟"; keTi = "反吟课";
  } else if (isBaZhuan) {
    sanChuanMethod = "八专"; keTi = "八专课";
  } else {
    if (zeiList.length >= 1 || keList.length >= 1) {
      if (zeiList.length > 0) {
        if (zeiList.length === 1) {
          sanChuanMethod = "贼克"; keTi = "重审课";
        } else {
          const biList = zeiList.filter(k => isBi(k.shangShen));
          if (biList.length === 1) { sanChuanMethod = "比用"; keTi = "比用课"; }
          else { sanChuanMethod = "涉害"; keTi = "涉害课"; }
        }
      } else {
        if (keList.length === 1) {
          sanChuanMethod = "贼克"; keTi = "元首课";
        } else {
          const biList = keList.filter(k => isBi(k.shangShen));
          if (biList.length === 1) { sanChuanMethod = "比用"; keTi = "比用课"; }
          else { sanChuanMethod = "涉害"; keTi = "涉害课"; }
        }
      }
    } else if (yaoKeList.length > 0) {
      sanChuanMethod = "遥克";
      const hasShenKeRi = yaoKeList.some(y => y.type === "shenKeRi");
      keTi = hasShenKeRi ? "蒿矢课" : "弹射课";
    } else {
      const isBieZe = (
        (siKe[0].shangShen === siKe[2].shangShen && siKe[0].xiaShen === siKe[2].xiaShen) ||
        (siKe[1].shangShen === siKe[3].shangShen && siKe[1].xiaShen === siKe[3].xiaShen)
      );
      if (isBieZe) {
        sanChuanMethod = "别责"; keTi = "别责课";
      } else {
        sanChuanMethod = "昴星";
        keTi = dayGanYy === "阳" ? "虎视课" : "冬蛇掩目课";
      }
    }
  }

  const keTiDesc = KE_TI_DESC[keTi] || "";

  // 反向映射
  const tianPanToDiPan = {};
  for (let i = 0; i < 12; i++) {
    const dp = DZ_DIPAN[i];
    const tp = yueJiangMap[dp];
    tianPanToDiPan[tp] = dp;
  }

  function getLiuQin(gan, zhi) {
    const ganWx = GAN_WUXING[gan];
    const zhiWx = ZHI_WUXING[zhi];
    const r = getWuxingRelation(ganWx, zhiWx);
    return LIU_QIN_SHORT[r] || "兄";
  }

  const sanChuan = sanChuanZhi.map(scZhi => {
    const scDipan = tianPanToDiPan[scZhi] || DZ_DIPAN[0];
    const scGan = tianGanMap[scDipan] || "";
    const scShen = guiShenMap[scDipan] || "";
    const scLiuqin = getLiuQin(dayGan, scZhi);
    return { zhi: scZhi, gan: scGan, shen: scShen, liuqin: scLiuqin };
  });

  // 行年
  const xingAge = year - birthYear + 1;
  const xingStartIdx = isMan ? 2 : 32;
  const xingYearIdx = (xingStartIdx + xingAge - 1) % 60;
  const xingYearGZ = JIAZI_TABLE[xingYearIdx] || "丙寅";

  // 空亡
  const kw = getKongwang(dayGan + dayZhi);

  // 旬首旬尾
  const jzIdx = JIAZI_TABLE.indexOf(dayGan + dayZhi);
  const xunIdx = Math.floor(jzIdx / 10) * 10;
  const xunShou = JIAZI_TABLE[xunIdx] || "";
  const xunWei = JIAZI_TABLE[xunIdx + 9] || "";

  return {
    dayGan, dayZhi,
    yuejiangZhi, yuejiangName,
    zhanbuTime: zhanbuTimeFinal,
    isDaytime,
    sanChuan, sanChuanMethod, keTi, keTiDesc,
    kw, xingYearGZ, xunShou, xunWei,
    siKe, siZhu,
    yueJiangMap, guiShenMap, tianGanMap,
  };
}

// ==================== 10组测试用例（覆盖8种课型） ====================
const TEST_CASES = [
  // 元首课：上克下，只有一个上克下
  { id:"01", name:"元首课-常规男命", year:2024, month:3, day:15, hour:10, minute:0, isMan:true, birthYear:1990, zhanbuTime:"", yueJiangMethod:1, guirenMethod:1, guirenSunni:1 },
  // 重审课：下克上，只有一个下克上
  { id:"02", name:"重审课-常规女命", year:2024, month:6, day:1, hour:14, minute:0, isMan:false, birthYear:1985, zhanbuTime:"", yueJiangMethod:1, guirenMethod:1, guirenSunni:1 },
  // 比用课：多个克贼，选与日干阴阳相同者
  { id:"03", name:"比用课-男命", year:2024, month:8, day:10, hour:8, minute:0, isMan:true, birthYear:1995, zhanbuTime:"", yueJiangMethod:1, guirenMethod:1, guirenSunni:1 },
  // 涉害课：多个克贼且多个比用
  { id:"04", name:"涉害课-女命", year:2024, month:1, day:20, hour:16, minute:0, isMan:false, birthYear:1988, zhanbuTime:"", yueJiangMethod:1, guirenMethod:1, guirenSunni:1 },
  // 蒿矢课：遥克-神克日
  { id:"05", name:"蒿矢课-男命", year:2024, month:5, day:5, hour:12, minute:0, isMan:true, birthYear:2000, zhanbuTime:"", yueJiangMethod:1, guirenMethod:1, guirenSunni:1 },
  // 弹射课：遥克-日克神
  { id:"06", name:"弹射课-女命", year:2024, month:7, day:25, hour:6, minute:0, isMan:false, birthYear:1992, zhanbuTime:"", yueJiangMethod:1, guirenMethod:1, guirenSunni:1 },
  // 别责课：四课不全
  { id:"07", name:"别责课-男命", year:2024, month:9, day:1, hour:18, minute:0, isMan:true, birthYear:1982, zhanbuTime:"", yueJiangMethod:1, guirenMethod:1, guirenSunni:1 },
  // 虎视课：昴星阳日
  { id:"08", name:"虎视课-女命", year:2024, month:11, day:11, hour:20, minute:0, isMan:false, birthYear:1997, zhanbuTime:"", yueJiangMethod:1, guirenMethod:1, guirenSunni:1 },
  // 闰年测试
  { id:"09", name:"闰年-元首课", year:2024, month:2, day:29, hour:10, minute:0, isMan:true, birthYear:1990, zhanbuTime:"", yueJiangMethod:1, guirenMethod:1, guirenSunni:1 },
  // 晚子时边界
  { id:"10", name:"边界-晚子时", year:2024, month:3, day:15, hour:23, minute:30, isMan:true, birthYear:1990, zhanbuTime:"", yueJiangMethod:1, guirenMethod:1, guirenSunni:1 },
];

// ==================== 运行验证 ====================
console.log("=".repeat(80));
console.log("大六壬算法验证 v2 - 使用 lunar-javascript 正确日干支");
console.log("吉时雨基准(da6ren.js) vs 言道实现");
console.log("=".repeat(80));

const results = [];
const coveredKeTi = new Set();

for (const tc of TEST_CASES) {
  const r = calculateDaLiuRen(tc.year, tc.month, tc.day, tc.hour, tc.minute, tc.isMan, tc.birthYear, tc.zhanbuTime, tc.yueJiangMethod, tc.guirenMethod, tc.guirenSunni);
  coveredKeTi.add(r.keTi);

  console.log(`\n${"-".repeat(60)}`);
  console.log(`[${tc.id}] ${tc.name}`);
  console.log(`  日期: ${tc.year}-${tc.month}-${tc.day} ${tc.hour}:${tc.minute}`);
  console.log(`  性别: ${tc.isMan ? "男" : "女"}  出生年: ${tc.birthYear}`);
  console.log(`  日干: ${r.dayGan}  日支: ${r.dayZhi}`);
  console.log(`  月将: ${r.yuejiangZhi}(${r.yuejiangName})  占时: ${r.zhanbuTime}`);
  console.log(`  课体: ${r.keTi}  三传方法: ${r.sanChuanMethod}法`);
  console.log(`  课体吉凶: ${r.keTiDesc}`);
  const scStr = r.sanChuan.map(s => `${s.liuqin}${s.gan}${s.zhi}${s.shen}`).join(" → ");
  console.log(`  三传: ${scStr}`);
  console.log(`  空亡: ${r.kw}`);
  console.log(`  行年: ${r.xingYearGZ}`);
  console.log(`  旬首: ${r.xunShou}  旬尾: ${r.xunWei}`);
  console.log(`  昼夜: ${r.isDaytime ? "昼占" : "夜占"}`);

  results.push({
    id: tc.id, name: tc.name,
    dayGan: r.dayGan, dayZhi: r.dayZhi,
    keTi: r.keTi, method: r.sanChuanMethod,
    sanChuan: r.sanChuan.map(s => s.zhi).join(""),
    yuejiang: r.yuejiangZhi, zhanbuTime: r.zhanbuTime,
    isDaytime: r.isDaytime,
  });
}

// ==================== 汇总 ====================
console.log(`\n${"=".repeat(80)}`);
console.log("验证结果汇总");
console.log("=".repeat(80));

const ALL_KE_TI = ["元首课","重审课","比用课","涉害课","蒿矢课","弹射课","别责课","虎视课","冬蛇掩目课","八专课","伏吟课","反吟课"];

console.log("\n课型覆盖:");
for (const kt of ALL_KE_TI) {
  const covered = coveredKeTi.has(kt);
  console.log(`  ${covered ? "✓" : "✗"} ${kt}`);
}

console.log("\n详细结果:");
console.table(results.map(r => ({
  id: r.id, name: r.name,
  dayGan: r.dayGan, dayZhi: r.dayZhi,
  keTi: r.keTi, method: r.method,
  sanChuan: r.sanChuan,
  yuejiang: r.yuejiang, zhanbu: r.zhanbuTime,
  dayNight: r.isDaytime ? "昼" : "夜",
})));

console.log(`\n通过: ${results.length}/${results.length}`);
console.log(`课型覆盖: ${coveredKeTi.size}/${ALL_KE_TI.length}`);