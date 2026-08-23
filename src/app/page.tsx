"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Solar, Lunar } from "lunar-javascript";
import IcpFooter from "@/components/IcpFooter";
import AnnouncementBar from "@/components/AnnouncementBar";

const BRAND = "#7B2FBE";

const GAN_WX: Record<string, string> = {
  "甲":"#00a879","乙":"#00a879","丙":"#ed4d49","丁":"#ed4d49","戊":"#a64b00","己":"#a64b00",
  "庚":"#ffa500","辛":"#ffa500","壬":"#0074e4","癸":"#0074e4",
};
const ZHI_WX: Record<string, string> = {
  "子":"#0074e4","亥":"#0074e4","寅":"#00a879","卯":"#00a879","巳":"#ed4d49","午":"#ed4d49",
  "申":"#ffa500","酉":"#ffa500","辰":"#a64b00","戌":"#a64b00","丑":"#a64b00","未":"#a64b00",
};
const WUXING_MAP: Record<string,string> = {
  "甲":"木","乙":"木","丙":"火","丁":"火","戊":"土","己":"土","庚":"金","辛":"金","壬":"水","癸":"水",
  "子":"水","丑":"土","寅":"木","卯":"木","辰":"土","巳":"火","午":"火","未":"土","申":"金","酉":"金","戌":"土","亥":"水",
};
const GAN_HE: Record<string,string> = {"甲":"己","己":"甲","乙":"庚","庚":"乙","丙":"辛","辛":"丙","丁":"壬","壬":"丁","戊":"癸","癸":"戊"};
const ZHI_CHONG: Record<string,string> = {"子":"午","午":"子","丑":"未","未":"丑","寅":"申","申":"寅","卯":"酉","酉":"卯","辰":"戌","戌":"辰","巳":"亥","亥":"巳"};

// 地母经
const DIMUJING: Record<string,{shi:string;ji:string}> = {
  "甲子":{shi:"太岁甲子年，水潦损田畴。蚕姑虽即喜，耕夫不免愁。",ji:"桑柘无人采，高低禾稻收。春夏多淹浸，秋冬少滴流。"},
  "乙丑":{shi:"太岁乙丑年，春瘟害万民。偏伤于鲁楚，多损魏燕人。",ji:"高田宜早种，晚禾成八分。蚕娘争斗走，茎叶乱纷纷。"},
  "丙寅":{shi:"太岁丙寅年，虫兽沿林走。疾疫多忧煎，燕子居山岩。",ji:"牛羊宿高荒，鱼虾入庭户。春夏雨淋漓，秋冬井泉枯。"},
  "丁卯":{shi:"太岁丁卯年，犹米得时丰。门门多喜悦，户户皆张弓。",ji:"春雨贵如金，夏旱苗不浓。秋来有成熟，冬雪兆年丰。"},
  "戊辰":{shi:"太岁戊辰年，禾苗虫横起。人民多疾病，六畜忧多死。",ji:"龙头出角年，水旱伤淮楚。低田莫多种，秋季防雨水。"},
  "己巳":{shi:"太岁己巳年，鱼游在道路。燕雀泣高堂，耕夫愁失度。",ji:"春霖多风雨，夏季雨少遇。桑麻五谷熟，人民喜相聚。"},
  "庚午":{shi:"太岁庚午年，春夏天大旱。耕夫俱废业，织女无心看。",ji:"早禾收一半，晚禾场上满。六畜多灾瘴，人民饥馑半。"},
  "辛未":{shi:"太岁辛未年，高下尽可怜。春来多雨水，早种得团圆。",ji:"浸种宜晚下，虫蝗不犯天。桑叶枝头贵，蚕娘无本钱。"},
  "壬申":{shi:"太岁壬申年，春秋多浸溺。高下也无偏，中夏甘泉少。",ji:"豆麦半岐然，桑柘叶皆空。耕夫与蚕妇，相见无欢喜。"},
  "癸酉":{shi:"太岁癸酉年，人民亦快活。雨水在三春，阴冻花实落。",ji:"蚕娘走不停，争忙蚕共箔。早禾莫嫌迟，晚禾收成错。"},
  "甲戌":{shi:"太岁甲戌年，早禾有蝗虫。吴越民多病，齐鲁豆麦丰。",ji:"春夏水漂流，秋冬少滴水。桑叶无定价，蚕丝被箱笼。"},
  "乙亥":{shi:"太岁乙亥年，高下总无偏。鲁卫多豆麦，淮吴好水田。",ji:"春雨满丘园，夏暑毒气相。秋来有收成，冬雪保安宁。"},
  "丙子":{shi:"太岁丙子年，春秋雨连绵。桑叶无人要，天虫少得全。",ji:"四路少人走，鱼鳖入清泉。低田禾没水，高乡半熟田。"},
  "丁丑":{shi:"太岁丁丑年，高下物得全。春夏匀雨水，秋冬乐丰年。",ji:"农夫不费力，阿婆喜万千。六畜多兴旺，人民自在眠。"},
  "戊寅":{shi:"太岁戊寅年，禾苗被虫伤。春来雨滴滴，夏日旱非常。",ji:"早禾无好实，晚稻有余粮。桑叶初生贱，后贵胜寻常。"},
  "己卯":{shi:"太岁己卯年，犁田多快活。春来多雨水，种植还逢渴。",ji:"蚕娘喜逢年，绢帛收万疋。鱼羊入市井，鸡鸭遍阡陌。"},
  "庚辰":{shi:"太岁庚辰年，燕楚多灾瘴。耕种不及时，牛羊难饲养。",ji:"夏月水长流，秋来禾稼旺。人民虽无灾，四季防疾恙。"},
  "辛巳":{shi:"太岁辛巳年，蛇虫不出土。燕赵好桑麻，吴越禾半熟。",ji:"春风吹送雨，夏旱苗难绿。秋禾收一半，冬日有霜雪。"},
  "壬午":{shi:"太岁壬午年，水旱不调匀。春种无多实，高乡少得全。",ji:"夏秋雨水频，低田禾半存。六畜多灾瘴，人民防疾缠。"},
  "癸未":{shi:"太岁癸未年，高下尽堪怜。一井百家共，三尺少甘泉。",ji:"豆麦无多实，桑叶贵如钱。春夏多雨雹，秋冬少水泉。"},
  "甲申":{shi:"太岁甲申年，高低定可忧。春来风雨恶，夏旱豆麦收。",ji:"早禾收一半，晚禾枉费求。蚕娘双泪落，樵客也须愁。"},
  "乙酉":{shi:"太岁乙酉年，有水与相连。春种逢甲子，夏雨满丘田。",ji:"高乡七分熟，低地水行船。桑柘贵中卖，丝棉满箱箧。"},
  "丙戌":{shi:"太岁丙戌年，夏秋井泉竭。人民多疾病，六畜休多说。",ji:"豆麦益三分，晚禾收八月。春夏水匀调，秋冬断涓滴。"},
  "丁亥":{shi:"太岁丁亥年，人民食不缺。春夏秋冬吉，百种全无缺。",ji:"丝绵皆成熟，谷米丰仓库。六畜尽兴旺，百姓皆乐业。"},
  "戊子":{shi:"太岁戊子年，灾疫横秋冬。燕楚多瘟瘴，齐鲁豆麦丰。",ji:"春夏雨水多，秋来收一半。蚕娘无利钱，蚕少丝绵短。"},
  "己丑":{shi:"太岁己丑年，高低得成穗。燕鲁好田蚕，吴楚多瘟瘴。",ji:"耕夫多快活，禾苗十里香。桑麻处处有，遍地是金银。"},
  "庚寅":{shi:"太岁庚寅年，人物事风流。麻麦虽然秀，禾农早收休。",ji:"多逢三伏旱，水涝在三秋。冬季防冰冻，牛羊少自由。"},
  "辛卯":{shi:"太岁辛卯年，高下却堪怜。鲁卫桑柘少，吴楚麦豆全。",ji:"春旱四十日，夏雨满平田。秋来七分熟，冬暖少冰坚。"},
  "壬辰":{shi:"太岁壬辰年，天虫少得全。春夏多雨水，耕种防湿田。",ji:"高乡禾稻熟，低地被水淹。人民无大灾，六畜保安然。"},
  "癸巳":{shi:"太岁癸巳年，人民半忧喜。夏雨赤地流，春秋雨水细。",ji:"蚕娘走满路，少叶多焦虑。禾稻高田熟，低乡得五分。"},
  "甲午":{shi:"太岁甲午年，春蚕长不全。耕夫多懊恼，蚕妇有愁煎。",ji:"春月雨多逢，夏炎火灼天。秋收禾稻好，五谷庆丰年。"},
  "乙未":{shi:"太岁乙未年，五谷皆和穗。燕卫少田蚕，吴楚多灾晦。",ji:"春夏水匀调，秋来收大半。六畜多灾瘴，人民防疾累。"},
  "丙申":{shi:"太岁丙申年，高下浪涛洪。春夏遭淹没，秋冬又不通。",ji:"豆麦无多实，桑柘枉费工。鱼游行道里，人民似转蓬。"},
  "丁酉":{shi:"太岁丁酉年，高低徒种作。三夏旱千里，九秋少雨脚。",ji:"蚕娘无喜色，蚕少丝绵薄。早禾一半收，晚稻随风落。"},
  "戊戌":{shi:"太岁戊戌年，耕夫渐渐愁。高下多亢旱，早晚只七分收。",ji:"桑叶初生贱，后贵似金珠。燕齐多瘟疫，吴楚禾稻熟。"},
  "己亥":{shi:"太岁己亥年，人民少横起。四季雨均调，五谷收全穗。",ji:"桑叶贱如泥，蚕娘多不喜。六畜遍山岗，人人皆欢喜。"},
  "庚子":{shi:"太岁庚子年，人民多暴卒。春夏水淹流，秋冬多饥渴。",ji:"高田犹及半，晚稻无可割。秦淮足流荡，吴越多灾殁。"},
  "辛丑":{shi:"太岁辛丑年，疾病稍纷纷。吴越桑麻好，荆楚米麦臻。",ji:"春夏均甘雨，秋冬得十分。桑叶枝上空，天蚕无可食。"},
  "壬寅":{shi:"太岁壬寅年，高低尽得丰。春夏承甘润，秋冬处处通。",ji:"蚕桑熟吴地，谷麦益江东。桑叶不堪贵，天蚕只半工。"},
  "癸卯":{shi:"太岁癸卯年，高低半忧喜。春夏雨雹多，秋来缺雨水。",ji:"燕赵好桑麻，吴越多禾美。人民多疫病，六畜多灾否。"},
  "甲辰":{shi:"太岁甲辰年，稻麻一半空。春夏遭淹没，秋冬粮不丰。",ji:"桑叶贵如银，天蚕损几重。人民饥冻苦，畜产亦遭凶。"},
  "乙巳":{shi:"太岁乙巳年，高下禾苗翠。春夏多漂流，秋冬五谷丰。",ji:"吴楚民多乐，燕赵少灾凶。蚕娘虽不遂，桑麻满路中。"},
  "丙午":{shi:"太岁丙午年，春夏多洪水。吴楚民有灾，燕赵禾麻美。",ji:"秋冬雨连绵，晚稻半枯死。人民有灾疫，畜产亦半毁。"},
  "丁未":{shi:"太岁丁未年，六畜多灾迍。秋冬无滴水，春夏雨均匀。",ji:"高乡人获福，低地禾稻成。桑麻皆茂盛，处处见歌声。"},
  "戊申":{shi:"太岁戊申年，百姓有灾迍。五谷皆有秀，早晚只半成。",ji:"春旱夏多水，蚕娘少喜惊。桑叶初生贵，后贱如草薪。"},
  "己酉":{shi:"太岁己酉年，人民不自在。四季雨匀调，五谷无妨碍。",ji:"桑叶虽然贵，得丝还债倍。六畜多兴旺，老少无灾晦。"},
  "庚戌":{shi:"太岁庚戌年，夏秋防旱灾。人民有疾病，六畜半成衰。",ji:"春夏雨水足，晚禾七分灾。燕赵桑麻好，吴楚米麦来。"},
  "辛亥":{shi:"太岁辛亥年，人民不愁钱。春夏多甘雨，秋冬乐丰年。",ji:"蚕娘笑哈哈，丝绵有万千。六畜皆兴旺，百姓高枕眠。"},
  "壬子":{shi:"太岁壬子年，旱涸是秋天。五谷虫伤损，六畜疫气缠。",ji:"春雨水均调，夏月雨连绵。秋来多晴朗，冬冷雪满天。"},
  "癸丑":{shi:"太岁癸丑年，人民喜得全。五谷熟高低，六畜遍山川。",ji:"春夏多雨水，秋冬无大愆。桑柘时时有，丝绵户户积。"},
  "甲寅":{shi:"太岁甲寅年，人民遭疫气。蚕娘走无路，桑叶无讨处。",ji:"春夏水横流，秋冬少滴泉。豆麦皆成熟，人民苦向前。"},
  "乙卯":{shi:"太岁乙卯年，五谷有盈余。春夏雨水匀，秋冬乐安居。",ji:"秦燕麦不收，吴楚禾黍熟。桑叶虽然贵，得丝偿其值。"},
  "丙辰":{shi:"太岁丙辰年，春来雨水润。豆麦乏齐燕，田蚕好吴郑。",ji:"夏月多炎热，秋来雨满庭。六畜多灾瘴，人民保安宁。"},
  "丁巳":{shi:"太岁丁巳年，丰熟足财钱。春夏均雨水，秋冬广收田。",ji:"桑叶贱如泥，蚕娘有万千。六畜多兴旺，人民乐自然。"},
  "戊午":{shi:"太岁戊午年，高低全不收。人民多灾疫，六畜满山邱。",ji:"春夏旱如火，秋来水横流。早禾收一半，晚稻枉费求。"},
  "己未":{shi:"太岁己未年，蚕娘笑连连。春夏多雨水，五谷熟平川。",ji:"桑叶枝头满，丝绵换酒钱。六畜兴旺甚，人民快乐年。"},
  "庚申":{shi:"太岁庚申年，民富是前缘。春夏雨均调，秋冬倍有收。",ji:"桑柘满青山，蚕娘有万千。四时无大灾，百姓乐陶然。"},
  "辛酉":{shi:"太岁辛酉年，人民有灾厄。六畜多瘟瘴，田蚕半得失。",ji:"夏秋亢旱时，秋冬雨少及。人民少安宁，高低多怨泣。"},
  "壬戌":{shi:"太岁壬戌年，百姓不周全。春夏水长流，秋冬贫病缠。",ji:"高田禾半收，低地被水淹。桑叶无定价，丝绵不值钱。"},
  "癸亥":{shi:"太岁癸亥年，人民被水灾。秋冬井泉溢，春夏雨绵绵。",ji:"低田禾没水，高地收十分。蚕娘双泪落，桑空人无眠。"},
};

const JIEQI_YANGSHENG: Record<string,{yun:string;qi:string;advice:string[]}> = {
  "立春":{yun:"初之气",qi:"厥阴风木",advice:["宜早睡早起，舒展筋骨","食辛甘发散之品，忌酸收","注意春捂，防风寒感冒","情志调畅，忌怒"]},
  "雨水":{yun:"初之气",qi:"厥阴风木",advice:["健脾祛湿，食山药薏米","防寒湿，注意保暖","宜舒缓运动，忌大汗","调养脾胃，少生冷"]},
  "惊蛰":{yun:"初之气",qi:"厥阴风木",advice:["养肝疏肝，食青色蔬菜","春雷动，宜早起运动","多食梨润肺防燥","防流感，注意通风"]},
  "春分":{yun:"二之气",qi:"少阴君火",advice:["阴阳平衡，忌偏寒偏热","食时令春菜，如香椿、春笋","宜踏青户外活动","调和情志，心态平和"]},
  "清明":{yun:"二之气",qi:"少阴君火",advice:["清肝明目，食菊花茶","踏青郊游，舒畅气机","饮食清淡，忌发物","防过敏性疾病"]},
  "谷雨":{yun:"二之气",qi:"少阴君火",advice:["健脾祛湿，食茯苓薏米","赏牡丹怡情养性","采茶饮茶，清利头目","防湿邪，忌久居湿地"]},
  "立夏":{yun:"三之气",qi:"少阳相火",advice:["养心安神，午休小憩","食苦味清心，如苦瓜、莲子","忌大汗淋漓，耗伤心阳","情志愉悦，忌大喜大悲"]},
  "小满":{yun:"三之气",qi:"少阳相火",advice:["清热利湿，食冬瓜丝瓜","防皮肤病，注意清洁","饮食清淡，忌油腻厚味","防暑热，多饮温水"]},
  "芒种":{yun:"三之气",qi:"少阳相火",advice:["防暑湿，食绿豆薏米","宜午休，养心血","衣衫勤换，防痱子湿疹","忌贪凉饮冷"]},
  "夏至":{yun:"四之气",qi:"太阴湿土",advice:["阳极阴生，养阴护阳","食酸味生津，如乌梅、山楂","午休养心，忌烈日暴晒","忌过度贪凉，空调适度"]},
  "小暑":{yun:"四之气",qi:"太阴湿土",advice:["清热解暑，食西瓜荷叶","防中暑，减少午后外出","心静自然凉，调息静心","饮食卫生，防肠道疾病"]},
  "大暑":{yun:"四之气",qi:"太阴湿土",advice:["大暑最热，防暑湿并重","食冬瓜薏米汤清热祛湿","冬病夏治三伏贴","忌大汗后立即冲凉"]},
  "立秋":{yun:"五之气",qi:"阳明燥金",advice:["立秋贴秋膘，润燥滋阴","食银耳百合润肺防燥","早睡早起，收敛神气","忌悲忧伤肺，心态平和"]},
  "处暑":{yun:"五之气",qi:"阳明燥金",advice:["秋燥渐起，多食梨蜂蜜","早晚添衣防秋凉","宜秋游登高，舒畅肺气","忌辛辣刺激，防秋燥"]},
  "白露":{yun:"五之气",qi:"阳明燥金",advice:["白露勿露身，注意保暖","滋阴润肺，食藕、梨、山药","防秋燥咳嗽，多饮水","收敛神气，勿剧烈运动"]},
  "秋分":{yun:"六之气",qi:"太阳寒水",advice:["阴阳平衡，润燥防寒并重","食芝麻核桃滋阴","早睡早起，与鸡俱兴","防秋燥伤津"]},
  "寒露":{yun:"六之气",qi:"太阳寒水",advice:["寒露脚不露，注意足部保暖","润肺生津，食柿子、栗子","宜散步缓行，忌大汗","防感冒，注意添衣"]},
  "霜降":{yun:"六之气",qi:"太阳寒水",advice:["霜降进补，食羊肉牛肉","防秋郁，多晒太阳","护脾胃，忌生冷硬食","防咳嗽哮喘，注意保暖"]},
  "立冬":{yun:"初之气",qi:"厥阴风木（来岁）",advice:["立冬补冬，食温补之品","早睡晚起，待日光而作","护阳气，注意背部保暖","情志安宁，忌烦扰"]},
  "小雪":{yun:"初之气",qi:"厥阴风木（来岁）",advice:["温补养肾，食黑色食物（黑豆、黑芝麻）","宜室内运动，忌剧烈出汗","多晒太阳，防抑郁情绪","防感冒，勤通风"]},
  "大雪":{yun:"初之气",qi:"厥阴风木（来岁）",advice:["大雪进补，食羊肉火锅","保暖防寒，护头护足","早卧晚起，保证睡眠","忌过量饮酒御寒"]},
  "冬至":{yun:"二之气",qi:"少阴君火（来岁）",advice:["冬至一阳生，护阳养阴","食饺子/汤圆，团圆温补","冬至灸关元，补阳气","忌房事过度，耗伤元气"]},
  "小寒":{yun:"二之气",qi:"少阴君火（来岁）",advice:["小寒大寒，防寒保暖","食腊八粥，温补脾胃","室内适度运动，通经络","防心脑血管疾病，忌骤冷骤热"]},
  "大寒":{yun:"二之气",qi:"少阴君火（来岁）",advice:["大寒守岁，辞旧迎新","温补收尾，食糯米饭/八宝饭","防风御寒，迎新年","为春生发做准备，忌大寒伤阳"]},
};
const DEFAULT_YS = {yun:"四之气",qi:"太阴湿土",advice:["饮食清淡，忌油腻生冷","早睡早起，适度运动","情志调畅，心态平和","根据气温及时增减衣物"]};

function BaguaIcon(){return(<svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="14" stroke="white" strokeWidth="1.5" fill="none"/><path d="M16 2a14 14 0 0 1 0 28" stroke="white" strokeWidth="1.5" fill="white" fillOpacity="0.15"/><path d="M16 2a14 14 0 0 0 0 28" stroke="white" strokeWidth="1.5" fill="none"/><circle cx="16" cy="9" r="4" fill="white" fillOpacity="0.9"/><circle cx="16" cy="23" r="4" fill="none" stroke="white" strokeWidth="1.5"/><circle cx="16" cy="9" r="1.5" fill={BRAND}/><circle cx="16" cy="23" r="1.5" fill="white"/></svg>)}
function MedicineIcon(){return(<svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect x="5" y="10" width="22" height="18" rx="3" stroke={BRAND} strokeWidth="2" fill="none"/><rect x="12" y="3" width="8" height="9" rx="1.5" stroke={BRAND} strokeWidth="2" fill="none"/><line x1="16" y1="16" x2="16" y2="24" stroke={BRAND} strokeWidth="2" strokeLinecap="round"/><line x1="12" y1="20" x2="20" y2="20" stroke={BRAND} strokeWidth="2" strokeLinecap="round"/></svg>)}

// v25.0.47_20: 四柱采用白底红字高对比设计（用户要求：必须一眼看清年月日时）
function Pillar({label,ganzhi}:{label:string;ganzhi:string}){
  const g=ganzhi[0]||"";const z=ganzhi[1]||"";
  return(
    <div className="flex flex-col items-center justify-center px-2 py-1" style={{backgroundColor:"#ffffff",borderRadius:"8px",minWidth:"56px"}}>
      <span className="text-[10px] font-semibold" style={{color:"#333333"}}>{label}</span>
      <span className="text-base font-bold leading-tight" style={{color:"#C62828"}}>{g}</span>
      <span className="text-base font-bold leading-tight" style={{color:"#C62828"}}>{z}</span>
    </div>
  );
}

function Collapse({title,children,defaultOpen=false,titleColor}:{title:string;children:React.ReactNode;defaultOpen?:boolean;titleColor?:string}){
  const[open,setOpen]=useState(defaultOpen);
  return(<div className="mb-2 overflow-hidden rounded-xl bg-gray-50"><button onClick={()=>setOpen(!open)} className="flex w-full items-center justify-between px-3 py-2.5 text-left"><span className="text-sm font-semibold" style={{color:titleColor||"#333"}}>{title}</span><span className="text-gray-400 text-sm transition-transform" style={{transform:open?"rotate(180deg)":"none"}}>▼</span></button>{open&&<div className="px-3 pb-3">{children}</div>}</div>);
}

function getWXRelation(dayWx:string,otherWx:string):string{
  if(dayWx===otherWx)return"比和";
  const s:Record<string,string>={"木":"火","火":"土","土":"金","金":"水","水":"木"};
  const k:Record<string,string>={"木":"土","土":"水","水":"火","火":"金","金":"木"};
  if(s[dayWx]===otherWx)return"我生(泄气)";
  if(s[otherWx]===dayWx)return"生我(得助)";
  if(k[dayWx]===otherWx)return"我克(旺财)";
  if(k[otherWx]===dayWx)return"克我(压力)";
  return"";
}

function getBaziAdvice(baziGan:string|null,baziZhi:string|null,dayGan:string,dayZhi:string){
  if(!baziGan)return{wuxing:"",chonghe:"",advice:["设置八字可获得个性化养生出行建议"]};
  const myWx=WUXING_MAP[baziGan]||"";
  const tGW=WUXING_MAP[dayGan]||"";
  const tZW=WUXING_MAP[dayZhi]||"";
  const rel=getWXRelation(myWx,tGW);
  const he=GAN_HE[baziGan]===dayGan?"天干五合":"";
  const chong=baziZhi&&ZHI_CHONG[baziZhi]===dayZhi?"地支相冲，诸事谨慎":"";
  const advice:string[]=[];
  const wxA:Record<string,string[]>={
    "木":["有利方位：东方","有利颜色：青色绿色","宜食：酸味食物、绿叶蔬菜","适合：出行、谈判、开拓"],
    "火":["有利方位：南方","有利颜色：红色紫色","宜食：苦味食物、红豆","适合：社交、演讲、创意"],
    "土":["有利方位：中央/本地","有利颜色：黄色棕色","宜食：甘味食物、根茎类","适合：守成、置业、稳定事务"],
    "金":["有利方位：西方","有利颜色：白色金色","宜食：辛味食物、白色食物","适合：决策、理财、修整"],
    "水":["有利方位：北方","有利颜色：黑色蓝色","宜食：咸味食物、水产","适合：智慧类工作、流动事务"],
  };
  if(rel==="比和")advice.push("今日五行比和，行事顺利，适合主动出击");
  else if(rel==="我生(泄气)")advice.push("今日泄气，宜稳守不宜冒进，保存实力");
  else if(rel==="生我(得助)")advice.push("今日得助，贵人运旺，适合求助合作");
  else if(rel==="我克(旺财)")advice.push("今日旺财，适合理财、谈生意、求财");
  else if(rel==="克我(压力)")advice.push("今日压力较大，宜低调行事，避免冲突");
  if(he)advice.push(`${he}，利合作、人际、感情`);
  if(chong)advice.push(chong);
  if(wxA[myWx])advice.push(...wxA[myWx].slice(0,2));
  return{wuxing:`日干${baziGan}(${myWx}) vs 今日${dayGan}${dayZhi}(${tGW}/${tZW})：${rel}`,chonghe:[he,chong].filter(Boolean).join(" · ")||"无特殊冲合",advice};
}

export default function HomePage(){
  const[showBaziInput,setShowBaziInput]=useState(false);
  const[userDayGan,setUserDayGan]=useState<string|null>(null);
  const[userDayZhi,setUserDayZhi]=useState<string|null>(null);
  const[mounted,setMounted]=useState(false);

  useEffect(()=>{setMounted(true);try{const s=localStorage.getItem("yandao_user_bazi");if(s){const o=JSON.parse(s);setUserDayGan(o.dayGan||null);setUserDayZhi(o.dayZhi||null);}}catch{}},[]);

  const today=useMemo(()=>{
    const now=mounted?new Date():new Date(2026,0,1,12,0,0);
    const solar=Solar.fromDate(now);
    const lunar=solar.getLunar();
    const weekNames=["星期日","星期一","星期二","星期三","星期四","星期五","星期六"];
    const y=solar.getYear(),m=solar.getMonth(),d=solar.getDay();
    const week=weekNames[now.getDay()];
    const yearGZ=lunar.getYearInGanZhi(),monthGZ=lunar.getMonthInGanZhi(),dayGZ=lunar.getDayInGanZhi(),timeGZ=lunar.getTimeInGanZhi();
    const dayGan=dayGZ[0],dayZhi=dayGZ[1];
    const yi=(lunar.getDayYi()as string[])||[];
    const ji=(lunar.getDayJi()as string[])||[];
    const chong=(lunar.getDayChongDesc()as string)||"";
    const sha=(lunar.getDaySha()as string)||"";
    const jianxing=(lunar.getZhiXing()as string)||"";
    const tsType=(lunar.getDayTianShenType()as string)||"";
    const ts=(lunar.getDayTianShen()as string)||"";
    const nayin=(lunar.getDayNaYin()as string)||"";
    const pzg=(lunar.getPengZuGan()as string)||"";
    const pzz=(lunar.getPengZuZhi()as string)||"";
    const tx=(lunar.getDayPositionTai()as string)||"";
    const xx=(lunar.getXiu()as string)+(lunar.getZheng()as string)+(lunar.getAnimal()as string);
    const js=(lunar.getDayJiShen()as string[])||[];
    const xs=(lunar.getDayXiongSha()as string[])||[];
    const xshen=(lunar.getDayPositionXiDesc()as string)||"";
    const cshen=(lunar.getDayPositionCaiDesc()as string)||"";
    const fshen=(lunar.getDayPositionFuDesc()as string)||"";
    const jq=(lunar.getJieQi()as string)||"";
    let cJQ=jq;let prevJQ:any=null;let nextJQ:any=null;
    try{const p=lunar.getPrevJieQi()as any;const n=lunar.getNextJieQi()as any;
      if(!cJQ&&p)cJQ=String(p.getName());
      if(p){const ps=p.getSolar();const pd=new Date(ps.getYear(),ps.getMonth()-1,ps.getDay());prevJQ={name:String(p.getName()),day:Math.max(0,Math.floor((now.getTime()-pd.getTime())/(864e5)))};}
      if(n){const ns=n.getSolar();const nd=new Date(ns.getYear(),ns.getMonth()-1,ns.getDay());nextJQ={name:String(n.getName()),day:Math.max(1,Math.floor((nd.getTime()-now.getTime())/(864e5)))};}
    }catch(e){}
    const ys=JIEQI_YANGSHENG[cJQ]||DEFAULT_YS;
    const dm=DIMUJING[yearGZ]||{shi:"岁在"+yearGZ,ji:"四时有序，万物有时"};
    const festivals=[...(solar.getFestivals()as string[]||[]),...(lunar.getFestivals()as string[]||[])];
    const ba=getBaziAdvice(userDayGan,userDayZhi,dayGan,dayZhi);
    return{gongli:`${y}年${m}月${d}日 ${week}`,nongli:`农历${lunar.getMonthInChinese()}月${lunar.getDayInChinese()} ${lunar.getYearShengXiao()}年`,festivals,
      pillars:[{label:"年",ganzhi:yearGZ},{label:"月",ganzhi:monthGZ},{label:"日",ganzhi:dayGZ},{label:"时",ganzhi:timeGZ}],
      yi,ji,chong,sha,jianxing,tianshenType:tsType,tianshen:ts,nayin,pengzuGan:pzg,pengzuZhi:pzz,taiXin:tx,xingxiu:xx,jiShen:js,xiongSha:xs,
      xiShen:xshen,caiShen:cshen,fuShen:fshen,jieqi:cJQ,prevJQ,nextJQ,yangsheng:ys,dimu:dm,baziAdvice:ba,dayGan,dayZhi};
  },[userDayGan,mounted]);

  const saveBazi=(gan:string,zhi:string)=>{setUserDayGan(gan);setUserDayZhi(zhi);localStorage.setItem("yandao_user_bazi",JSON.stringify({dayGan:gan,dayZhi:zhi}));setShowBaziInput(false);};

  return(
    <div className="mx-auto min-h-screen w-full" style={{maxWidth:"420px",backgroundColor:"#f5f5f5"}}>
      {/* 顶部品牌区 */}
      <div className="flex items-center justify-between px-4 py-3 bg-white">
        <div className="flex items-center gap-2"><div><span className="font-bold" style={{fontSize:"24px",color:BRAND}}>言道</span><div style={{fontSize:"10px",fontWeight:"normal",opacity:0.65,lineHeight:"1.4",color:BRAND}}>yandao.vip 分享下载有礼</div></div></div>
      </div>

      {/* 官方公告栏（永久功能：升级/维护通知，未登录可见） */}
      <AnnouncementBar />

      {/* 双大按钮 */}
      <div className="mt-3 flex gap-3 px-3">
        <Link href="/yixue" className="flex flex-1 flex-col items-center justify-center rounded-2xl text-white shadow-lg" style={{height:"100px",background:`linear-gradient(135deg,${BRAND} 0%,#9B5ECF 100%)`,borderRadius:"16px"}}>
          <BaguaIcon/><span className="mt-1 text-base font-bold">易学排盘</span>
        </Link>
        <Link href="/zhongyi" className="flex flex-1 flex-col items-center justify-center rounded-2xl shadow-md" style={{height:"100px",backgroundColor:"#EDE4F7",borderRadius:"16px",color:BRAND}}>
          <MedicineIcon/><span className="mt-1 text-base font-bold">中医学习</span>
        </Link>
      </div>

      {/* 言道学堂入口（v25.0.44：三板块配色区分——上紫/中绿/下深蓝，传统文化色系） */}
      <Link href="/academy" className="mx-3 mt-3 flex items-center gap-3 rounded-2xl px-4 py-3 text-white shadow-md active:opacity-90" style={{background:"linear-gradient(135deg,#1E6B45 0%,#31996A 100%)"}}>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-lg">🎓</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">言道学堂</p>
          <p className="text-[10px] opacity-80">AI 知识工厂 · 学习考级 · 电子证书认证</p>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </Link>

      <p className="mt-2 text-center text-xs text-gray-400">传统文化学习与研究 · 仅供学习参考</p>

      {/* 黄历区（在按钮下方） */}
      <div className="mx-3 mt-4 rounded-2xl overflow-hidden bg-white">
        {/* 黄历头（v25.0.44：深蓝渐变，与上方紫/绿板块区分，白字高对比） */}
        <div className="px-4 py-3 text-white" style={{background:"linear-gradient(135deg,#1B3A68 0%,#2D5CA0 100%)"}}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xl font-bold">{today.gongli}</div>
              <div className="mt-0.5 text-sm opacity-90">{today.nongli}</div>
              {today.festivals.length>0&&<div className="mt-1 text-xs opacity-80">🎉 {today.festivals.join(" · ")}</div>}
            </div>
            {today.jieqi&&(<div className="rounded-lg bg-white/20 px-2 py-1 text-center"><div className="text-[10px] opacity-80">节气</div><div className="text-sm font-bold">{today.jieqi}</div></div>)}
          </div>
          <div className="mt-3 flex justify-around gap-2 rounded-xl bg-white/15 py-2">{today.pillars.map(p=><Pillar key={p.label} label={p.label} ganzhi={p.ganzhi}/>)}</div>
        </div>

        {/* 基础信息 */}
        <div className="px-3 py-3">
          <div className="rounded-xl bg-gray-50 p-3 text-xs leading-relaxed text-gray-700">
            <div className="grid grid-cols-2 gap-y-1">
              <div><span className="text-gray-500">冲煞：</span>{today.chong} {today.sha}</div>
              <div><span className="text-gray-500">建星：</span>{today.jianxing}</div>
              <div><span className="text-gray-500">值日：</span>{today.tianshenType}{today.tianshen}</div>
              <div><span className="text-gray-500">纳音：</span>{today.nayin}</div>
              <div><span className="text-gray-500">胎神：</span>{today.taiXin}</div>
              <div><span className="text-gray-500">星宿：</span>{today.xingxiu}</div>
              <div><span className="text-gray-500">喜神：</span>{today.xiShen}</div>
              <div><span className="text-gray-500">财神：</span>{today.caiShen}</div>
              <div className="col-span-2"><span className="text-gray-500">彭祖：</span>{today.pengzuGan} {today.pengzuZhi}</div>
              <div className="col-span-2"><span className="text-gray-500">福神：</span>{today.fuShen}</div>
            </div>
          </div>

          <Collapse title="吉神宜趋 / 凶煞宜忌">
            <div className="mb-2"><div className="mb-1 text-xs font-semibold" style={{color:"#00a879"}}>吉神宜趋</div><div className="flex flex-wrap gap-1">{today.jiShen.slice(0,15).map((s,i)=><span key={i} className="rounded px-1.5 py-0.5 text-[11px]" style={{backgroundColor:"#e6f7f0",color:"#00a879"}}>{s}</span>)}</div></div>
            <div><div className="mb-1 text-xs font-semibold" style={{color:"#ed4d49"}}>凶煞宜忌</div><div className="flex flex-wrap gap-1">{today.xiongSha.slice(0,15).map((s,i)=><span key={i} className="rounded px-1.5 py-0.5 text-[11px]" style={{backgroundColor:"#fde8e8",color:"#ed4d49"}}>{s}</span>)}</div></div>
          </Collapse>

          <Collapse title="节气与物候">
            <div className="text-xs text-gray-700 space-y-1">
              <div>当前节气：<span className="font-semibold" style={{color:BRAND}}>{today.jieqi}</span></div>
              {today.prevJQ&&<div>上一节气：{today.prevJQ.name}（{today.prevJQ.day}天前）</div>}
              {today.nextJQ&&<div>下一节气：{today.nextJQ.name}（{today.nextJQ.day}天后）</div>}
            </div>
          </Collapse>

          {/* 五运六气养生（默认展开） */}
          <div className="mb-2 overflow-hidden rounded-xl" style={{backgroundColor:"#f0faf5"}}>
            <div className="flex items-center justify-between px-3 py-2.5"><span className="text-sm font-semibold" style={{color:"#00a879"}}>五运六气·节令养生</span></div>
            <div className="px-3 pb-3 text-xs text-gray-700">
              <div className="mb-2 flex gap-2">
                <span className="rounded px-2 py-0.5" style={{backgroundColor:"#e6f7f0",color:"#00a879"}}>{today.yangsheng.yun}</span>
                <span className="rounded px-2 py-0.5" style={{backgroundColor:"#e6f7f0",color:"#00a879"}}>{today.yangsheng.qi}</span>
              </div>
              <div className="space-y-1">{today.yangsheng.advice.map((a,i)=><div key={i} className="flex items-start gap-1"><span style={{color:"#00a879"}}>•</span><span>{a}</span></div>)}</div>
            </div>
          </div>

          {/* 八字个性化建议 */}
          <Collapse title="今日个性化建议" defaultOpen={!!userDayGan} titleColor={BRAND}>
            {userDayGan?(
              <div className="text-xs text-gray-700">
                <div className="mb-2 rounded-lg p-2" style={{backgroundColor:"#f5f0fa"}}>
                  <div className="font-semibold" style={{color:BRAND}}>您的八字日干：{userDayGan}{userDayZhi}</div>
                  <div className="mt-0.5 text-[11px] text-gray-500">{today.baziAdvice.wuxing}</div>
                  {today.baziAdvice.chonghe&&<div className="text-[11px]" style={{color:"#ed4d49"}}>{today.baziAdvice.chonghe}</div>}
                </div>
                <div className="space-y-1">{today.baziAdvice.advice.map((a,i)=><div key={i} className="flex items-start gap-1"><span style={{color:BRAND}}>▸</span><span>{a}</span></div>)}</div>
                <button onClick={()=>setShowBaziInput(true)} className="mt-2 text-[11px] underline" style={{color:BRAND}}>重新设置八字</button>
              </div>
            ):(
              <div className="text-xs text-gray-500">
                <div className="mb-2">设置您的八字日干，可获得今日个性化养生、出行、求财建议</div>
                <button onClick={()=>setShowBaziInput(true)} className="rounded-lg px-3 py-1.5 text-white text-xs" style={{backgroundColor:BRAND}}>设置我的八字</button>
              </div>
            )}
          </Collapse>

          <Collapse title="地母经" titleColor={BRAND}>
            <div className="text-xs leading-6 text-gray-700" style={{fontFamily:"serif"}}>
              <div className="mb-1 font-semibold" style={{color:BRAND}}>▶ {today.pillars[0].ganzhi}年诗</div>
              <div className="pl-3">{today.dimu.shi}</div>
              <div className="pl-3">{today.dimu.ji}</div>
              <div className="mt-2 text-[10px] text-gray-400">地母经年占预测农事收成与年景，仅供参考</div>
            </div>
          </Collapse>

          {/* 宜忌放最底 */}
          <div className="rounded-xl p-3" style={{backgroundColor:"#fafafa"}}>
            <div className="mb-2 flex flex-wrap gap-1.5">
              <span className="rounded px-1.5 py-0.5 text-xs font-bold text-white" style={{backgroundColor:"#00a879"}}>宜</span>
              {today.yi.length>0?today.yi.map((y,i)=><span key={i} className="rounded px-1.5 py-0.5 text-xs" style={{backgroundColor:"#e6f7f0",color:"#00a879"}}>{y}</span>):<span className="text-xs text-gray-400">诸事不宜</span>}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded px-1.5 py-0.5 text-xs font-bold text-white" style={{backgroundColor:"#ed4d49"}}>忌</span>
              {today.ji.length>0?today.ji.map((j,i)=><span key={i} className="rounded px-1.5 py-0.5 text-xs" style={{backgroundColor:"#fde8e8",color:"#ed4d49"}}>{j}</span>):<span className="text-xs text-gray-400">无</span>}
            </div>
          </div>

          <IcpFooter />
        </div>
      </div>

      {/* 八字输入弹窗 */}
      {showBaziInput&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={()=>setShowBaziInput(false)}>
          <div className="w-[320px] rounded-2xl bg-white p-4" onClick={e=>e.stopPropagation()}>
            <div className="mb-3 text-center text-base font-bold" style={{color:BRAND}}>设置您的八字日干</div>
            <div className="mb-2 text-xs text-gray-500">请选择您的出生日天干地支（可从八字排盘结果获取）</div>
            <div className="mb-2">
              <div className="text-xs text-gray-600 mb-1">日干（日主）</div>
              <div className="grid grid-cols-5 gap-1">
                {Object.keys(GAN_WX).map(g=>(
                  <button key={g} onClick={()=>{const z=prompt("请输入日支（子丑寅卯辰巳午未申酉戌亥）：")||"子";if(ZHI_WX[z])saveBazi(g,z);else alert("无效地支");}} className="rounded py-1 text-sm font-bold text-white" style={{backgroundColor:GAN_WX[g]}}>{g}</button>
                ))}
              </div>
            </div>
            <button onClick={()=>setShowBaziInput(false)} className="mt-2 w-full rounded-lg py-2 text-sm text-gray-500 hover:bg-gray-100">取消</button>
          </div>
        </div>
      )}

      {/* 合规提示 */}
<div style={{fontSize:"12px",color:"#999",textAlign:"center",padding:"12px 16px"}}>
  {"本APP内容仅供传统文化研究参考，不构成医疗建议。如有身体不适，请及时就医。"}
</div>

{/* 底部安全区 */}
      <div style={{height:"72px",paddingBottom:"env(safe-area-inset-bottom)"}}/>
    </div>
  );
}
