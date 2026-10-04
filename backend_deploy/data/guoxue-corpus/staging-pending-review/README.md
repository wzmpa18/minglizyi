# 国学资料接入区

本目录与资料原始库、APP静态资源及生产数据库分离。接入批次集中放在此处，由导入脚本按明确批次读取。

## 当前批次状态

- `staging-pending-review/corpus_import_batch_001.json`：30条内容，导入批次候选；不是发布许可。
- `staging-pending-review/external-candidates/tcm-qa-datasets/`：新增805道中医问答题外部候选数据，保留上游 Apache-2.0 LICENSE/README；`IMPORT_VALIDATION.json` 已检出773道格式通过、32道需处理、4个重复指纹。上游题目原始来源未说明，当前仅进入后台待复核导入链路，不是APP可见题库。
- 版权状态：`needs_review` 29条，`public_domain` 1条。
- 本批全部仅允许进入后台待审核队列；当前没有任何一条因此自动成为用户可见内容。
- 2026-10-03检查：批次读取错误0；字符数范围1,371至389,319。单凭索引标记或“古籍”名称不确认使用权、完整性或医学质量。

## 后续维护约定

1. 原始资料、索引和来源文件继续留在资料库，保持 `md_path` / `source_locator` 有效；接入批次和已验收副本集中在本目录。
2. 批次每条须单独标注 `rights_status`、`completeness_status`、`quality_status`、`approval_status`；未核通过前保持 `pending_review`，禁止对外发布。
3. 外部数据还要核实上游数据本身的权利来源，不可仅凭仓库LICENSE认定题目/图片等第三方内容均可再许可。只有权利、完整性、质量审核通过且后台页面真实验收后，才可迁入 `approved/` 并标记 `approved_for_app`。不得把 `publish=true`、`public_domain` 或“发布就绪候选”单独当作发布许可。
4. 导入程序始终使用幂等批次、待审状态；不覆盖现有内容，不触碰支付、排盘算法和线上用户数据。
