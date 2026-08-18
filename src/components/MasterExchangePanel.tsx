"use client";

import { useState, useCallback, useEffect } from "react";
import {
  getMasterList,
  getHelpList,
  createHelp,
  createReply,
  submitRating,
  reportContent,
  formatTime,
  getLevelConfig,
  renderStars,
  DISCLAIMER_TEXT,
  getRanking,
  STAR_LEVELS_DESC,
  POINTS_RULES_DESC,
  type MasterInfo,
  type HelpRequest,
  type RankingItem,
} from "@/lib/masterService";
import StarRatingDisplay from "./StarRatingDisplay";
import StarRatingExplanation from "./StarRatingExplanation";
import PointsExplanation from "./PointsExplanation";
import {
  RANKING_COMPLIANCE_TIP,
  RATING_SUBMIT_COMPLIANCE_TIP,
  POINTS_EARN_RULES,
  POINTS_DEDUCT_RULES,
  POINTS_LEVELS,
} from "@/lib/dualTrackService";

/**
 * v19.8: 同道师父交流面板
 *
 * 功能：
 * 1. 推荐师父列表 - 展示擅长该领域的高评分师父
 * 2. 求助广场 - 查看公开求助、提交解答
 * 3. 我要求助 - 发起求助（免费/随喜积分）
 * 4. 评分评价 - 1-5星三维度评分（专业度/耐心度/准确度）
 * 5. 举报功能 - 违规内容举报
 *
 * 合规声明：仅为同好学习交流，平台不对解答内容负责
 */

interface MasterExchangePanelProps {
  show: boolean;
  toolName: string;
  onClose: () => void;
}

type TabType = "masters" | "requests" | "ask" | "ranking";

export default function MasterExchangePanel({ show, toolName, onClose }: MasterExchangePanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("masters");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 师父列表
  const [masters, setMasters] = useState<MasterInfo[]>([]);
  const [masterTotal, setMasterTotal] = useState(0);

  // 求助列表
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [helpTotal, setHelpTotal] = useState(0);

  // 求助表单
  const [askTitle, setAskTitle] = useState("");
  const [askContent, setAskContent] = useState("");
  const [askIsPaid, setAskIsPaid] = useState(false);
  const [askReward, setAskReward] = useState(10);

  // 解答表单
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  // 评分表单 - v20.2: 三维度（交流体验、响应效率、沟通态度）
  const [ratingFor, setRatingFor] = useState<string | null>(null);
  const [rateCommunication, setRateCommunication] = useState(5);
  const [rateResponsiveness, setRateResponsiveness] = useState(5);
  const [rateAttitude, setRateAttitude] = useState(5);
  const [rateComment, setRateComment] = useState("");
  const [rateAnonymous, setRateAnonymous] = useState(false);

  // 举报
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");

  // 提示
  const [toast, setToast] = useState("");

  // v19.9: 排行榜
  const [rankingList, setRankingList] = useState<RankingItem[]>([]);
  const [rankingTotal, setRankingTotal] = useState(0);
  const [showRules, setShowRules] = useState(false);

  // 锁定body滚动
  useEffect(() => {
    document.body.style.overflow = show ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [show]);

  // 加载师父列表
  const loadMasters = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getMasterList(toolName);
      // 兜底：确保 masters 始终为数组，total 始终为数字
      setMasters(Array.isArray(result?.masters) ? result.masters : []);
      setMasterTotal(typeof result?.total === "number" ? result.total : 0);
    } catch {
      setMasters([]);
      setMasterTotal(0);
    } finally {
      setLoading(false);
    }
  }, [toolName]);

  // 加载求助列表
  const loadHelpRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getHelpList(toolName, "all");
      setHelpRequests(Array.isArray(result?.requests) ? result.requests : []);
      setHelpTotal(typeof result?.total === "number" ? result.total : 0);
    } catch {
      setHelpRequests([]);
      setHelpTotal(0);
    } finally {
      setLoading(false);
    }
  }, [toolName]);

  // v19.9: 加载排行榜
  const loadRanking = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getRanking(toolName);
      setRankingList(Array.isArray(result?.ranking) ? result.ranking : []);
      setRankingTotal(typeof result?.total === "number" ? result.total : 0);
    } catch {
      setRankingList([]);
      setRankingTotal(0);
    } finally {
      setLoading(false);
    }
  }, [toolName]);

  // 切换Tab时加载数据
  useEffect(() => {
    if (!show) return;
    if (activeTab === "masters" && masters.length === 0) {
      loadMasters();
    } else if (activeTab === "requests" && helpRequests.length === 0) {
      loadHelpRequests();
    } else if (activeTab === "ranking" && rankingList.length === 0) {
      loadRanking();
    }
  }, [show, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // 显示提示
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }, []);

  // 提交求助
  const handleSubmitHelp = useCallback(async () => {
    if (!askTitle.trim() || !askContent.trim()) {
      showToast("请填写标题和内容");
      return;
    }
    setLoading(true);
    const result = await createHelp(toolName, askTitle.trim(), askContent.trim(), askIsPaid, askReward);
    setLoading(false);
    if (result.success) {
      showToast("求助发布成功！");
      setAskTitle("");
      setAskContent("");
      setAskIsPaid(false);
      setAskReward(10);
      setActiveTab("requests");
      loadHelpRequests();
    } else {
      showToast(result.error || "发布失败，请重试");
    }
  }, [toolName, askTitle, askContent, askIsPaid, askReward, showToast, loadHelpRequests]);

  // 提交解答
  const handleSubmitReply = useCallback(async (helpId: string) => {
    if (!replyContent.trim()) {
      showToast("请输入解答内容");
      return;
    }
    setLoading(true);
    const result = await createReply(helpId, replyContent.trim());
    setLoading(false);
    if (result.success) {
      showToast("解答提交成功！");
      setReplyContent("");
      setReplyingTo(null);
      loadHelpRequests();
    } else {
      showToast(result.error || "提交失败，请重试");
    }
  }, [replyContent, showToast, loadHelpRequests]);

  // 提交评分 - v20.2: 三维度（交流体验、响应效率、沟通态度）
  const handleSubmitRating = useCallback(async (replyId: string) => {
    setLoading(true);
    const result = await submitRating(
      replyId,
      { professional: rateCommunication, patience: rateResponsiveness, accuracy: rateAttitude },
      rateComment.trim(),
      rateAnonymous
    );
    setLoading(false);
    if (result.success) {
      showToast("评分提交成功，感谢您的评价！");
      setRatingFor(null);
      setRateCommunication(5);
      setRateResponsiveness(5);
      setRateAttitude(5);
      setRateComment("");
      setRateAnonymous(false);
      loadHelpRequests();
    } else {
      showToast(result.error || "评分失败，请重试");
    }
  }, [rateCommunication, rateResponsiveness, rateAttitude, rateComment, rateAnonymous, showToast, loadHelpRequests]);

  // 提交举报
  const handleSubmitReport = useCallback(async (targetType: "reply" | "rating" | "help", targetId: string) => {
    if (!reportReason.trim()) {
      showToast("请填写举报理由");
      return;
    }
    const result = await reportContent(targetType, targetId, reportReason.trim());
    if (result.success) {
      showToast("举报已提交，平台将在24小时内处理");
      setReportingId(null);
      setReportReason("");
    } else {
      showToast(result.error || "举报失败，请重试");
    }
  }, [reportReason, showToast]);

  if (!show) return null;

  // 星级选择器
  const StarSelector = ({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
      <span style={{ fontSize: 13, color: "#666", width: 60 }}>{label}</span>
      <div style={{ display: "flex", gap: 4 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            onClick={() => onChange(n)}
            style={{
              border: "none",
              background: "none",
              fontSize: 22,
              cursor: "pointer",
              color: n <= value ? "#f39c12" : "#ddd",
              padding: 0,
              lineHeight: 1,
            }}
          >
            ★
          </button>
        ))}
      </div>
      <span style={{ fontSize: 12, color: "#999" }}>{value}星</span>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.4)" }} />
      <div style={{
        position: "relative",
        width: "100%",
        maxWidth: "380px",
        maxHeight: "80vh",
        backgroundColor: "#fff",
        borderRadius: "16px",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* 头部 */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          borderBottom: "1px solid #f0f0f0",
          flexShrink: 0,
        }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1a1a1a" }}>
            🏮 同道师父交流 · {toolName}
          </h3>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: "50%", border: "none",
            backgroundColor: "#f5f5f5", display: "flex", alignItems: "center",
            justifyContent: "center", cursor: "pointer", fontSize: 16,
          }}>✕</button>
        </div>

        {/* 合规提示 */}
        <div style={{
          padding: "8px 16px",
          backgroundColor: "#fff8e1",
          fontSize: 11,
          color: "#e65100",
          textAlign: "center",
          flexShrink: 0,
        }}>
          {DISCLAIMER_TEXT}
        </div>

        {/* Tab切换 */}
        <div style={{
          display: "flex",
          padding: "8px 12px",
          gap: 8,
          flexShrink: 0,
          borderBottom: "1px solid #f0f0f0",
        }}>
          {([
            { key: "masters", label: "推荐师父" },
            { key: "ranking", label: "排行榜" },
            { key: "requests", label: "求助广场" },
            { key: "ask", label: "我要求助" },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                padding: "8px 0",
                border: "none",
                borderRadius: 8,
                backgroundColor: activeTab === tab.key ? "#7B2FBE" : "#f5f0fa",
                color: activeTab === tab.key ? "#fff" : "#7B2FBE",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 内容区域 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>

          {/* 推荐师父列表 */}
          {activeTab === "masters" && (
            <div>
              {loading && masters.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#999", fontSize: 14 }}>加载中...</div>
              ) : masters.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#999", fontSize: 14 }}>
                  暂无师父入驻，快来成为第一位吧！
                  <br />
                  <span style={{ fontSize: 12, color: "#bbb" }}>点击「我要求助」发起第一个交流话题</span>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 12, color: "#999", marginBottom: 12 }}>共 {masterTotal} 位师父</div>
                  {masters.map(master => {
                    const levelCfg = getLevelConfig(master.level ?? 1);
                    return (
                      <div key={master.userId} style={{
                        display: "flex",
                        gap: 12,
                        padding: 12,
                        marginBottom: 8,
                        borderRadius: 10,
                        border: "1px solid #f0f0f0",
                        backgroundColor: "#fafafa",
                      }}>
                        {/* 头像 */}
                        <div style={{
                          width: 44, height: 44, borderRadius: "50%",
                          backgroundColor: levelCfg.color,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 20, flexShrink: 0, color: "#fff",
                        }}>
                          {master.avatar || levelCfg.icon}
                        </div>
                        {/* 信息 */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: "#333" }}>{master.nickname ?? "匿名同好"}</span>
                            <span style={{
                              fontSize: 10, padding: "1px 6px", borderRadius: 4,
                              backgroundColor: levelCfg.color, color: "#fff", fontWeight: 600,
                            }}>
                              {levelCfg.icon} {levelCfg.title}
                            </span>
                          </div>
                          {/* v20.2: 星级与积分独立显示 */}
                          <div style={{ marginTop: 4 }}>
                            <StarRatingDisplay
                              starRating={Number(master.avgRating) || 0}
                              starRatingCount={typeof master.replyCount === "number" ? master.replyCount : undefined}
                              showPoints={true}
                              points={Number(master.points) || 0}
                              size="small"
                            />
                          </div>
                          <div style={{ fontSize: 12, color: "#666", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {master.bio ?? ""}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {/* v19.9: 排行榜 */}
          {activeTab === "ranking" && (
            <div>
              {/* v20.2: 排行榜合规提示 */}
              <div style={{
                marginBottom: 12, padding: "8px 12px", borderRadius: 8,
                backgroundColor: "#fff8e1", border: "1px solid #ffe082",
                fontSize: 11, color: "#e65100", lineHeight: 1.5, textAlign: "center",
              }}>
                {RANKING_COMPLIANCE_TIP}
              </div>

              {/* 积分规则说明按钮 */}
              <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#999" }}>共 {rankingTotal} 位同好上榜</span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "#999" }}>星级</span>
                  <StarRatingExplanation />
                  <span style={{ fontSize: 11, color: "#999", marginLeft: 4 }}>积分</span>
                  <PointsExplanation />
                  <button
                    onClick={() => setShowRules(!showRules)}
                    style={{
                      padding: "4px 10px", borderRadius: 12, border: "1px solid #e0d4ed",
                      backgroundColor: "#f9f5fc", color: "#7B2FBE", fontSize: 11, cursor: "pointer", marginLeft: 4,
                    }}
                  >
                    {showRules ? "收起规则" : "查看规则"}
                  </button>
                </div>
              </div>

              {/* 积分规则说明面板 */}
              {showRules && (
                <div style={{
                  marginBottom: 12, padding: 12, borderRadius: 8,
                  backgroundColor: "#f9f5fc", border: "1px solid #e0d4ed",
                }}>
                  {/* v20.2: 积分获取规则 */}
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#27ae60", marginBottom: 8 }}>积分获取规则</div>
                  {POINTS_EARN_RULES.map((rule, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#666", marginBottom: 4 }}>
                      <span>{rule.desc}</span>
                      <span style={{ color: "#27ae60", fontWeight: 600 }}>+{rule.amount}分</span>
                    </div>
                  ))}
                  {/* v20.2: 积分扣除规则 */}
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#e74c3c", marginTop: 8, marginBottom: 4 }}>积分扣除规则</div>
                  {POINTS_DEDUCT_RULES.map((rule, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#666", marginBottom: 4 }}>
                      <span>{rule.desc}</span>
                      <span style={{ color: "#e74c3c", fontWeight: 600 }}>
                        {rule.amountRange
                          ? `${rule.amountRange[0]}~${rule.amountRange[1]}分`
                          : `${rule.amount}分`}
                      </span>
                    </div>
                  ))}
                  {/* v20.2: 积分等级 */}
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#7B2FBE", marginTop: 8, marginBottom: 4 }}>积分等级</div>
                  {POINTS_LEVELS.map(lv => (
                    <div key={lv.level} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#666", marginBottom: 4 }}>
                      <span>{lv.icon} {lv.title}</span>
                      <span>≥{lv.minPoints}分</span>
                    </div>
                  ))}
                </div>
              )}

              {/* 排行榜列表 */}
              {loading && rankingList.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#999", fontSize: 14 }}>加载中...</div>
              ) : rankingList.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#999", fontSize: 14 }}>
                  暂无排行数据，快来成为第一位上榜同好吧！
                </div>
              ) : (
                <>
                  {rankingList.map((item, idx) => {
                    const isPinned = item.isPinned ?? false;
                    const levelColor = item.levelColor || "#95a5a6";
                    const levelIcon = item.levelIcon || "🌱";
                    const levelTitle = item.levelTitle || "入门同好";
                    return (
                    <div key={item.userId} style={{
                      display: "flex", alignItems: "center", gap: 10, padding: 10, marginBottom: 8,
                      borderRadius: 8, backgroundColor: isPinned ? "#fff8e1" : "#fff",
                      border: `1px solid ${isPinned ? "#ffe082" : "#f0f0f0"}`,
                    }}>
                      {/* 排名 */}
                      <div style={{
                        width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 14, fontWeight: 700,
                        backgroundColor: idx === 0 ? "#ffd700" : idx === 1 ? "#c0c0c0" : idx === 2 ? "#cd7f32" : "#f0f0f0",
                        color: idx < 3 ? "#fff" : "#999",
                      }}>
                        {isPinned ? "📌" : idx + 1}
                      </div>

                      {/* 头像 */}
                      <div style={{
                        width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                        backgroundColor: levelColor, color: "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                      }}>
                        {levelIcon}
                      </div>

                      {/* 信息 - v20.2: 星级与积分独立显示 */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "#333" }}>{item.nickname ?? "匿名同好"}</span>
                          <span style={{
                            fontSize: 10, padding: "1px 6px", borderRadius: 4,
                            backgroundColor: levelColor, color: "#fff", fontWeight: 600,
                          }}>
                            {levelTitle}
                          </span>
                        </div>
                        {/* v20.2: 星级与积分拆分展示 */}
                        <div style={{ marginTop: 4 }}>
                          <StarRatingDisplay
                            starRating={Number(item.avgRating) || 0}
                            starRatingCount={typeof item.replyCount === "number" ? item.replyCount : undefined}
                            showPoints={true}
                            points={Number(item.totalPoints) || 0}
                            size="small"
                          />
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {/* 求助广场 */}
          {activeTab === "requests" && (
            <div>
              {loading && helpRequests.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#999", fontSize: 14 }}>加载中...</div>
              ) : helpRequests.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#999", fontSize: 14 }}>
                  暂无求助，点击「我要求助」发起交流
                </div>
              ) : (
                helpRequests.map(req => (
                  <div key={req.id} style={{
                    padding: 12, marginBottom: 12, borderRadius: 10,
                    border: "1px solid #f0f0f0", backgroundColor: "#fff",
                  }}>
                    {/* 求助标题 */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#333" }}>{req.title}</span>
                      {req.isPaid && (
                        <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, backgroundColor: "#e74c3c", color: "#fff" }}>
                          随喜 {req.reward}积分
                        </span>
                      )}
                      <span style={{
                        fontSize: 10, padding: "1px 6px", borderRadius: 4,
                        backgroundColor: req.status === "open" ? "#e8f5e9" : req.status === "answered" ? "#e3f2fd" : "#f5f5f5",
                        color: req.status === "open" ? "#27ae60" : req.status === "answered" ? "#1976d2" : "#999",
                      }}>
                        {req.status === "open" ? "待解答" : req.status === "answered" ? "已解答" : "已关闭"}
                      </span>
                    </div>
                    {/* 求助内容 */}
                    <div style={{ fontSize: 13, color: "#666", marginBottom: 6, lineHeight: 1.5 }}>
                      {req.content}
                    </div>
                    <div style={{ fontSize: 11, color: "#bbb", marginBottom: 8 }}>
                      {req.nickname} · {formatTime(req.createdAt)}
                    </div>

                    {/* 解答列表 */}
                    {req.replies && req.replies.length > 0 && (
                      <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 8, marginTop: 8 }}>
                        {req.replies.map(reply => (
                          <div key={reply.id} style={{ marginBottom: 10, paddingLeft: 8, borderLeft: "2px solid #e0d4ed" }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#7B2FBE", marginBottom: 4 }}>
                              {reply.masterNickname} {reply.isPaid && "· 随喜解答"}
                            </div>
                            <div style={{ fontSize: 13, color: "#555", lineHeight: 1.5 }}>{reply.content}</div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                              <span style={{ fontSize: 11, color: "#bbb" }}>{formatTime(reply.createdAt)}</span>
                              <div style={{ display: "flex", gap: 8 }}>
                                {!reply.rated && (
                                  <button
                                    onClick={() => setRatingFor(ratingFor === reply.id ? null : reply.id)}
                                    style={{ border: "none", background: "none", fontSize: 11, color: "#7B2FBE", cursor: "pointer" }}
                                  >
                                    评分
                                  </button>
                                )}
                                {reply.rated && reply.rating && (
                                  <span style={{ fontSize: 11, color: "#f39c12" }}>
                                    {renderStars((reply.rating.professional + reply.rating.patience + reply.rating.accuracy) / 3)} {((reply.rating.professional + reply.rating.patience + reply.rating.accuracy) / 3).toFixed(1)}
                                  </span>
                                )}
                                <button
                                  onClick={() => setReportingId(reportingId === reply.id ? null : reply.id)}
                                  style={{ border: "none", background: "none", fontSize: 11, color: "#e74c3c", cursor: "pointer" }}
                                >
                                  举报
                                </button>
                              </div>
                            </div>

                            {/* 评分表单 */}
                            {ratingFor === reply.id && (
                              <div style={{ marginTop: 8, padding: 10, backgroundColor: "#faf8fc", borderRadius: 8 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "#333" }}>请为本次交流评分</div>
                                <StarSelector label="交流体验" value={rateCommunication} onChange={setRateCommunication} />
                                <StarSelector label="响应效率" value={rateResponsiveness} onChange={setRateResponsiveness} />
                                <StarSelector label="沟通态度" value={rateAttitude} onChange={setRateAttitude} />
                                <textarea
                                  value={rateComment}
                                  onChange={e => setRateComment(e.target.value)}
                                  placeholder="评价留言（可选）"
                                  maxLength={500}
                                  style={{
                                    width: "100%", minHeight: 60, padding: 8, borderRadius: 6,
                                    border: "1px solid #e0d4ed", fontSize: 13, resize: "vertical",
                                    boxSizing: "border-box", marginBottom: 8,
                                  }}
                                />
                                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#666", marginBottom: 8 }}>
                                  <input
                                    type="checkbox"
                                    checked={rateAnonymous}
                                    onChange={e => setRateAnonymous(e.target.checked)}
                                  />
                                  匿名评价
                                </label>
                                {/* v20.2: 评价提交页合规提示 */}
                                <div style={{
                                  padding: "6px 8px", marginBottom: 8, borderRadius: 6,
                                  backgroundColor: "#fff8e1", border: "1px solid #ffe082",
                                  fontSize: 10, color: "#e65100", lineHeight: 1.4,
                                }}>
                                  {RATING_SUBMIT_COMPLIANCE_TIP}
                                </div>
                                <button
                                  onClick={() => handleSubmitRating(reply.id)}
                                  disabled={loading}
                                  style={{
                                    width: "100%", padding: "8px 0", borderRadius: 8, border: "none",
                                    backgroundColor: loading ? "#ccc" : "#7B2FBE", color: "#fff",
                                    fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
                                  }}
                                >
                                  {loading ? "提交中..." : "提交评分"}
                                </button>
                              </div>
                            )}

                            {/* 举报表单 */}
                            {reportingId === reply.id && (
                              <div style={{ marginTop: 8, padding: 10, backgroundColor: "#fff5f5", borderRadius: 8 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#e74c3c" }}>举报此解答</div>
                                <textarea
                                  value={reportReason}
                                  onChange={e => setReportReason(e.target.value)}
                                  placeholder="请说明举报理由"
                                  maxLength={500}
                                  style={{
                                    width: "100%", minHeight: 50, padding: 8, borderRadius: 6,
                                    border: "1px solid #fed7d7", fontSize: 13, resize: "vertical",
                                    boxSizing: "border-box", marginBottom: 8,
                                  }}
                                />
                                <div style={{ display: "flex", gap: 8 }}>
                                  <button
                                    onClick={() => { setReportingId(null); setReportReason(""); }}
                                    style={{ flex: 1, padding: "6px 0", borderRadius: 6, border: "1px solid #ddd", backgroundColor: "#fff", fontSize: 12, cursor: "pointer" }}
                                  >
                                    取消
                                  </button>
                                  <button
                                    onClick={() => handleSubmitReport("reply", reply.id)}
                                    style={{ flex: 1, padding: "6px 0", borderRadius: 6, border: "none", backgroundColor: "#e74c3c", color: "#fff", fontSize: 12, cursor: "pointer" }}
                                  >
                                    提交举报
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 回复按钮 */}
                    {req.status !== "closed" && (
                      <div style={{ marginTop: 8 }}>
                        {replyingTo === req.id ? (
                          <div>
                            <textarea
                              value={replyContent}
                              onChange={e => setReplyContent(e.target.value)}
                              placeholder="请输入您的解答（仅为学习交流，不构成人生决策建议）"
                              maxLength={3000}
                              style={{
                                width: "100%", minHeight: 80, padding: 10, borderRadius: 8,
                                border: "1px solid #e0d4ed", fontSize: 13, resize: "vertical",
                                boxSizing: "border-box", marginBottom: 8,
                              }}
                            />
                            <div style={{ display: "flex", gap: 8 }}>
                              <button
                                onClick={() => { setReplyingTo(null); setReplyContent(""); }}
                                style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "1px solid #ddd", backgroundColor: "#fff", fontSize: 13, cursor: "pointer" }}
                              >
                                取消
                              </button>
                              <button
                                onClick={() => handleSubmitReply(req.id)}
                                disabled={loading}
                                style={{
                                  flex: 1, padding: "8px 0", borderRadius: 8, border: "none",
                                  backgroundColor: loading ? "#ccc" : "#7B2FBE", color: "#fff",
                                  fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
                                }}
                              >
                                {loading ? "提交中..." : "提交解答"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setReplyingTo(req.id)}
                            style={{
                              padding: "6px 16px", borderRadius: 6, border: "1px solid #7B2FBE",
                              backgroundColor: "#fff", color: "#7B2FBE", fontSize: 12, cursor: "pointer",
                            }}
                          >
                            我来解答
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* 我要求助 */}
          {activeTab === "ask" && (
            <div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 6 }}>
                  标题 <span style={{ color: "#e74c3c" }}>*</span>
                </label>
                <input
                  type="text"
                  value={askTitle}
                  onChange={e => setAskTitle(e.target.value)}
                  placeholder="简要描述您想交流的问题"
                  maxLength={100}
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 8,
                    border: "1px solid #e0d4ed", fontSize: 14, boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 6 }}>
                  详细描述 <span style={{ color: "#e74c3c" }}>*</span>
                </label>
                <textarea
                  value={askContent}
                  onChange={e => setAskContent(e.target.value)}
                  placeholder="请详细描述您的问题，便于同好们交流解答。内容仅为学习交流用途，不构成人生决策建议。"
                  maxLength={2000}
                  style={{
                    width: "100%", minHeight: 120, padding: 10, borderRadius: 8,
                    border: "1px solid #e0d4ed", fontSize: 13, resize: "vertical",
                    boxSizing: "border-box",
                  }}
                />
                <div style={{ fontSize: 11, color: "#bbb", textAlign: "right", marginTop: 4 }}>
                  {askContent.length}/2000
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#333" }}>
                  <input
                    type="checkbox"
                    checked={askIsPaid}
                    onChange={e => setAskIsPaid(e.target.checked)}
                  />
                  随喜积分（感谢解答者的热心帮助）
                </label>
                {askIsPaid && (
                  <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, color: "#666" }}>随喜积分：</span>
                    <input
                      type="number"
                      value={askReward}
                      onChange={e => setAskReward(Math.max(1, parseInt(e.target.value) || 0))}
                      min={1}
                      max={999}
                      style={{
                        width: 80, padding: "6px 8px", borderRadius: 6,
                        border: "1px solid #e0d4ed", fontSize: 14, textAlign: "center",
                      }}
                    />
                    <span style={{ fontSize: 12, color: "#999" }}>积分（从您的积分余额扣除）</span>
                  </div>
                )}
              </div>

              <div style={{
                padding: 10, borderRadius: 8, backgroundColor: "#fff8e1",
                fontSize: 12, color: "#e65100", marginBottom: 12, lineHeight: 1.5,
              }}>
                温馨提示：本板块仅为传统文化学习交流，内容仅代表用户个人观点，不构成任何人生决策建议。禁止发布医疗、投资、违法等内容。
              </div>

              <button
                onClick={handleSubmitHelp}
                disabled={loading}
                style={{
                  width: "100%", padding: "12px 0", borderRadius: 8, border: "none",
                  backgroundColor: loading ? "#ccc" : "#7B2FBE", color: "#fff",
                  fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "发布中..." : "发布求助"}
              </button>
            </div>
          )}
        </div>

        {/* 底部提示 */}
        <div style={{
          padding: "8px 16px",
          borderTop: "1px solid #f0f0f0",
          fontSize: 11,
          color: "#bbb",
          textAlign: "center",
          flexShrink: 0,
        }}>
          仅为同好学习交流 · 平台不对解答内容负责
        </div>

        {/* Toast提示 */}
        {toast && (
          <div style={{
            position: "absolute",
            bottom: 60,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "8px 20px",
            borderRadius: 20,
            backgroundColor: "rgba(0,0,0,0.8)",
            color: "#fff",
            fontSize: 13,
            zIndex: 100,
            whiteSpace: "nowrap",
          }}>
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
