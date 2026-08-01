#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
中医工具函数包
从 tcm-cli 项目提取的核心工具函数
提供性味匹配、方剂组成拆解查询、经络查询等功能

来源: tcm-cli (https://github.com/tcm-cli)
协议: MIT License
Copyright (c) 2026 TCM-CLI Contributors

免责声明: 本工具函数仅供中医学习研究，不构成医疗建议。
"""

from __future__ import annotations
import json
import os
import re
from typing import Dict, List, Optional, Any, Tuple


# ============================================================
# 数据加载
# ============================================================

# 获取数据文件路径
_DATA_DIR = os.path.dirname(os.path.abspath(__file__))


def _load_json(filename: str) -> dict:
    """加载JSON数据文件"""
    path = os.path.join(_DATA_DIR, filename)
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}


# 延迟加载数据
_herb_db = None
_formula_db = None
_meridian_db = None


def _get_herb_db() -> dict:
    global _herb_db
    if _herb_db is None:
        data = _load_json('中药数据库.json')
        _herb_db = {h['name']: h for h in data.get('herbs', [])}
    return _herb_db


def _get_formula_db() -> dict:
    global _formula_db
    if _formula_db is None:
        data = _load_json('方剂数据库.json')
        _formula_db = {f['name']: f for f in data.get('formulas', [])}
    return _formula_db


def _get_meridian_db() -> dict:
    global _meridian_db
    if _meridian_db is None:
        data = _load_json('经络穴位数据库.json')
        _meridian_db = data
    return _meridian_db


# ============================================================
# 中药性味匹配工具
# ============================================================

def search_herb(query: str) -> Optional[Dict[str, Any]]:
    """
    搜索中药，支持中文名、拼音、别名搜索

    Args:
        query: 搜索关键词 (中药名/拼音/别名)

    Returns:
        匹配的中药信息字典，未找到返回None
    """
    db = _get_herb_db()
    query_lower = query.lower().strip()

    # 精确匹配名称
    if query in db:
        return db[query]

    # 拼音匹配
    for name, herb in db.items():
        if query_lower == herb.get('pinyin', '').lower():
            return herb

    # 别名匹配
    for name, herb in db.items():
        aliases = herb.get('alias', [])
        for alias in aliases:
            if query_lower == alias.lower():
                return herb

    # 模糊匹配
    for name, herb in db.items():
        if query_lower in name.lower() or name.lower() in query_lower:
            return herb

    return None


def match_herb_by_nature(nature: str) -> List[Dict[str, Any]]:
    """
    按性味匹配中药

    Args:
        nature: 性味关键词，如 "温"、"寒"、"辛"、"甘"、"苦" 等

    Returns:
        匹配的中药列表
    """
    db = _get_herb_db()
    results = []
    for name, herb in db.items():
        herb_nature = herb.get('nature', '')
        if nature in herb_nature:
            results.append({
                'name': name,
                'pinyin': herb.get('pinyin', ''),
                'nature': herb_nature,
                'meridian': herb.get('meridian', ''),
                'efficacy': herb.get('efficacy', ''),
            })
    return results


def match_herb_by_meridian(meridian: str) -> List[Dict[str, Any]]:
    """
    按归经匹配中药

    Args:
        meridian: 经络名称，如 "肺经"、"肝经"、"心经" 等

    Returns:
        归入该经络的中药列表
    """
    db = _get_herb_db()
    results = []
    for name, herb in db.items():
        herb_meridian = herb.get('meridian', '')
        if meridian in herb_meridian:
            results.append({
                'name': name,
                'pinyin': herb.get('pinyin', ''),
                'nature': herb.get('nature', ''),
                'meridian': herb_meridian,
                'efficacy': herb.get('efficacy', ''),
            })
    return results


def classify_herb_properties(herb_name: str) -> Dict[str, Any]:
    """
    分类查询中药的四气五味归经属性

    Args:
        herb_name: 中药名称

    Returns:
        包含 nature, flavor, meridian, category 的字典
    """
    herb = search_herb(herb_name)
    if not herb:
        return {'status': 'not_found', 'message': f'中药"{herb_name}"未找到'}
    return {
        'status': 'found',
        'name': herb['name'],
        'nature': herb.get('nature', ''),
        'meridian': herb.get('meridian', ''),
        'efficacy': herb.get('efficacy', ''),
        'category': herb.get('source', ''),
    }


# ============================================================
# 方剂组成拆解查询工具
# ============================================================

def search_formula(query: str) -> Optional[Dict[str, Any]]:
    """
    搜索方剂，支持中文名、拼音、别名

    Args:
        query: 搜索关键词

    Returns:
        匹配的方剂信息字典
    """
    db = _get_formula_db()
    query_lower = query.lower().strip()

    if query in db:
        return db[query]

    for name, formula in db.items():
        if query_lower == formula.get('pinyin', '').lower():
            return formula
        aliases = formula.get('alias', [])
        for alias in aliases:
            if query_lower == alias.lower():
                return formula

    for name, formula in db.items():
        if query_lower in name.lower() or name.lower() in query_lower:
            return formula

    return None


def analyze_formula_composition(formula_name: str) -> Dict[str, Any]:
    """
    拆解分析方剂组成 (君臣佐使)

    Args:
        formula_name: 方剂名称

    Returns:
        方剂组成分析结果，包含每味药的剂量、角色、炮制
    """
    formula = search_formula(formula_name)
    if not formula:
        return {'status': 'not_found', 'message': f'方剂"{formula_name}"未找到'}

    composition = formula.get('composition', [])
    # 按君臣佐使分类
    categories = {'君': [], '臣': [], '佐': [], '使': []}
    for herb in composition:
        role = herb.get('role', '')
        if role in categories:
            categories[role].append(herb)

    return {
        'status': 'found',
        'name': formula['name'],
        'source': formula.get('source', ''),
        'efficacy': formula.get('efficacy', ''),
        'composition_by_role': categories,
        'total_herbs': len(composition),
        'classic_text': formula.get('classic_text', ''),
        'classic_source': formula.get('classic_source', ''),
        'classic_usage': formula.get('classic_usage', ''),
    }


def search_formulas_by_herb(herb_name: str) -> List[Dict[str, Any]]:
    """
    查询包含某味中药的所有方剂

    Args:
        herb_name: 中药名称

    Returns:
        包含该中药的方剂列表
    """
    db = _get_formula_db()
    results = []
    for name, formula in db.items():
        composition = formula.get('composition', [])
        for herb in composition:
            if herb.get('herb', '') == herb_name:
                results.append({
                    'name': name,
                    'pinyin': formula.get('pinyin', ''),
                    'efficacy': formula.get('efficacy', ''),
                    'herb_role': herb.get('role', ''),
                    'herb_dosage': herb.get('dosage', ''),
                    'source': formula.get('source', ''),
                })
                break
    return results


def search_formulas_by_category(category: str) -> List[Dict[str, Any]]:
    """
    按分类查询方剂

    Args:
        category: 方剂分类关键词，如 "解表"、"补益"、"清热" 等

    Returns:
        匹配的方剂列表
    """
    db = _get_formula_db()
    results = []
    for name, formula in db.items():
        formula_category = formula.get('category', '')
        if category in formula_category:
            results.append({
                'name': name,
                'pinyin': formula.get('pinyin', ''),
                'category': formula_category,
                'efficacy': formula.get('efficacy', ''),
                'source': formula.get('source', ''),
            })
    return results


# ============================================================
# 经络查询工具
# ============================================================

def search_meridian(query: str) -> Optional[Dict[str, Any]]:
    """
    查询经络信息

    Args:
        query: 经络名称 (中文或英文)

    Returns:
        经络信息字典
    """
    db = _get_meridian_db()
    meridians = db.get('meridians', [])
    query_lower = query.lower().strip()

    for m in meridians:
        if query_lower in m['name'].lower() or query_lower in m['english'].lower():
            return m
    return None


def search_acupoint(query: str) -> Optional[Dict[str, Any]]:
    """
    查询穴位信息

    Args:
        query: 穴位名称 (中文), 拼音, 或编码

    Returns:
        穴位信息字典
    """
    db = _get_meridian_db()
    acupoints = db.get('acupoints', [])
    query_lower = query.lower().strip()

    for a in acupoints:
        if (query_lower == a['name'].lower() or
            query_lower == a['pinyin'].lower() or
            query_lower == a['code'].lower()):
            return a
    return None


def list_acupoints_by_meridian(meridian_name: str) -> List[Dict[str, Any]]:
    """
    按经络查询所有穴位

    Args:
        meridian_name: 经络名称

    Returns:
        该经络的穴位列表
    """
    db = _get_meridian_db()
    acupoints = db.get('acupoints', [])
    results = []
    for a in acupoints:
        if meridian_name in a['meridian']:
            results.append(a)
    return results


def get_meridian_by_element(element: str) -> List[Dict[str, Any]]:
    """
    按五行属性查询经络

    Args:
        element: 五行属性，如 "木"、"火"、"土"、"金"、"水"

    Returns:
        匹配的经络列表
    """
    db = _get_meridian_db()
    meridians = db.get('meridians', [])
    results = []
    for m in meridians:
        if element in m['element']:
            results.append(m)
    return results


# ============================================================
# 综合查询工具
# ============================================================

def analyze_herb_formula_relationship(herb_name: str) -> Dict[str, Any]:
    """
    综合分析中药与方剂的关系

    Args:
        herb_name: 中药名称

    Returns:
        该中药的详细信息及包含它的方剂列表
    """
    herb = search_herb(herb_name)
    if not herb:
        return {'status': 'not_found', 'message': f'中药"{herb_name}"未找到'}

    formulas = search_formulas_by_herb(herb_name)

    return {
        'status': 'found',
        'herb': {
            'name': herb['name'],
            'pinyin': herb.get('pinyin', ''),
            'nature': herb.get('nature', ''),
            'meridian': herb.get('meridian', ''),
            'efficacy': herb.get('efficacy', ''),
        },
        'related_formulas': formulas,
        'formula_count': len(formulas),
    }


def search_all(query: str) -> Dict[str, Any]:
    """
    全文搜索中药和方剂

    Args:
        query: 搜索关键词

    Returns:
        匹配的中药和方剂列表
    """
    # 搜索中药
    herb = search_herb(query)
    herb_results = []
    if herb:
        herb_results.append({
            'name': herb['name'],
            'pinyin': herb.get('pinyin', ''),
            'nature': herb.get('nature', ''),
            'efficacy': herb.get('efficacy', ''),
        })

    # 搜索方剂
    formula = search_formula(query)
    formula_results = []
    if formula:
        formula_results.append({
            'name': formula['name'],
            'pinyin': formula.get('pinyin', ''),
            'efficacy': formula.get('efficacy', ''),
            'source': formula.get('source', ''),
        })

    return {
        'query': query,
        'herbs': herb_results,
        'formulas': formula_results,
        'total_matches': len(herb_results) + len(formula_results),
    }


if __name__ == '__main__':
    # 简单测试
    print("=== 中医工具函数包测试 ===")
    print()

    # 测试中药搜索
    result = search_herb('桂枝')
    if result:
        print(f"桂枝: {result['nature']}, {result['meridian']}")
        print(f"  功效: {result['efficacy']}")

    # 测试性味匹配
    warm_herbs = match_herb_by_nature('温')
    print(f"\n温性中药: {len(warm_herbs)} 味")
    if warm_herbs:
        print(f"  例: {warm_herbs[0]['name']} - {warm_herbs[0]['nature']}")

    # 测试方剂搜索
    formula = search_formula('桂枝汤')
    if formula:
        print(f"\n桂枝汤: {formula['efficacy']}")
        print(f"  出处: {formula['source']}")

    # 测试方剂组成拆解
    analysis = analyze_formula_composition('桂枝汤')
    if analysis['status'] == 'found':
        print(f"\n桂枝汤组成分析:")
        for role, herbs in analysis['composition_by_role'].items():
            if herbs:
                for h in herbs:
                    print(f"  {role}: {h['herb']} ({h['dosage']})")

    # 测试归经匹配
    lung_herbs = match_herb_by_meridian('肺经')
    print(f"\n归肺经中药: {len(lung_herbs)} 味")

    print("\n测试完成!")
