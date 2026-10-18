'use strict';
// Stable public tool identifiers. Never derive a discussion key from a private chart.
const STUDY_TOOL_IDS = ['bazi','ziwei','qimen','liuyao','meihua','daliuren','xiaoliuren','qizheng','hehun','yizhangjing','xuankong-feixing','taiyi-sanshi','compass','liji','luban','phone','carplate','zeri','jiemeng','jieqi','astro','tarot','shensha','ganzhi','kongwang','nayin','wuxing','chenggu','huangli','wannianli','name','qiming'];
module.exports = { STUDY_TOOL_IDS, STUDY_TOOL_TARGETS: STUDY_TOOL_IDS.map(id => `tool:${id}`) };
