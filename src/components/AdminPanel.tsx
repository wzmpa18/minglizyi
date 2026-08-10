"use client";

import { useState, useCallback, useEffect, type CSSProperties } from "react";
import {
  // 类型
  type AdInfo,
  type AdPositionConfig,
  type AdStatsItem,
  type TrainingItem,
  type ReportItem,
  // Token 管理
  getAdminToken,
  clearAdminToken,
  isAdminLoggedIn,
  // 登录
  adminLogin,
  // 广告
  getAds,
  updateAd,
  toggleAd,
  getAdStats,
  // 培训
  listTraining,
  createTraining,
  approveTraining,
  rejectTraining,
  setTrainingCommission,
  // 举报
  listReports,
  handleReport,
  // 用户
  banUser,
  unbanUser,
  // 敏感词
  listSensitiveWords,
  addSensitiveWord,
  removeSensitiveWord,
  // 师父置顶 / 违规扣分
  togglePinMaster,
  applyViolation,
} from "@/lib/adminService";

/**
 * v19.9 后台运营管控面板
 *
 * 功能：
 * 1. 管理员登录（token 存 sessionStorage，由 adminService 管理）
 * 2. 广告位管理：首页 / 发现页 / 工具结果页 3 个广告位
 * 3. 培训招生管理：创建、审批、拒绝、设置分成（0-50%）
 * 4. 举报管理：通过 / 拒绝，违规可扣分
 * 5. 用户管理：封禁 / 解封、违规扣分、师父置顶
 * 6. 敏感词管理：增删
 *
 * 紫色系主题：#7B2FBE / #9B5ECF / #f3edf7
 */

interface AdminPanelProps {
  show: boolean;
  onClose: () => void;
}

type AdminTab = "ads" | "training" | "reports" | "users" | "sensitive";

// --- 默认广告位定义 ---
const DEFAULT_AD_POSITIONS: { key: string; label: string; desc: string }[] = [
  { key: "home", label: "首页", desc: "应用首页顶部广告位" },
  { key: "discover", label: "发现页", desc: "发现页信息流广告位" },
  { key: "tool_result", label: "工具结果页", desc: "工具计算结果页底部广告位" },
];

// --- 主题色 ---
const THEME = {
  primary: "#7B2FBE",
  secondary: "#9B5ECF",
  bg: "#f3edf7",
  bgLight: "#faf6fd",
  border: "#e8dcf2",
  textMain: "#2a1a35",
  textSub: "#6b5a78",
};

// --- 通用样式 ---
const inputStyle: CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  border: `1px solid ${THEME.border}`,
  borderRadius: 8,
  fontSize: 14,
  outline: "none",
  backgroundColor: "#fff",
  boxSizing: "border-box",
  color: THEME.textMain,
  transition: "border-color 0.2s",
};

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: THEME.textSub,
  marginBottom: 4,
};

const btnPrimary: CSSProperties = {
  padding: "8px 16px",
  border: "none",
  borderRadius: 8,
  backgroundColor: THEME.primary,
  color: "#fff",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  transition: "opacity 0.2s",
};

const btnSecondary: CSSProperties = {
  padding: "8px 16px",
  border: `1px solid ${THEME.border}`,
  borderRadius: 8,
  backgroundColor: "#fff",
  color: THEME.primary,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const btnDanger: CSSProperties = {
  padding: "6px 12px",
  border: "none",
  borderRadius: 8,
  backgroundColor: "#fce4ec",
  color: "#c62828",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

const btnSuccess: CSSProperties = {
  padding: "6px 12px",
  border: "none",
  borderRadius: 8,
  backgroundColor: "#e8f5e9",
  color: "#2e7d32",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

const cardStyle: CSSProperties = {
  backgroundColor: THEME.bgLight,
  border: `1px solid ${THEME.border}`,
  borderRadius: 12,
  padding: 14,
  marginBottom: 12,
};

// --- 状态文案映射 ---
const trainingStatusMap: Record<string, { text: string; color: string; bg: string }> = {
  pending: { text: "待审批", color: "#e65100", bg: "#fff3e0" },
  approved: { text: "已通过", color: "#2e7d32", bg: "#e8f5e9" },
  rejected: { text: "已拒绝", color: "#c62828", bg: "#fce4ec" },
  offline: { text: "已下架", color: "#616161", bg: "#f5f5f5" },
};

const reportStatusMap: Record<string, { text: string; color: string; bg: string }> = {
  pending: { text: "待处理", color: "#e65100", bg: "#fff3e0" },
  approved: { text: "已通过", color: "#2e7d32", bg: "#e8f5e9" },
  rejected: { text: "已拒绝", color: "#c62828", bg: "#fce4ec" },
};

const reportTypeMap: Record<string, string> = {
  reply: "解答",
  rating: "评价",
  help: "求助",
};

// --- 时间格式化 ---
function formatTime(s: string): string {
  if (!s) return "-";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminPanel({ show, onClose }: AdminPanelProps) {
  // --- 登录状态 ---
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginUser, setLoginUser] = useState("");
  const [loginPwd, setLoginPwd] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // --- Tab / 通用 ---
  const [activeTab, setActiveTab] = useState<AdminTab>("ads");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  // --- 广告 ---
  const [ads, setAds] = useState<Record<string, AdInfo>>({});
  const [positions, setPositions] = useState<Record<string, AdPositionConfig>>({});
  const [adStats, setAdStats] = useState<Record<string, AdStatsItem>>({});
  const [adEdits, setAdEdits] = useState<
    Record<string, { title: string; imageUrl: string; linkUrl: string; enabled: boolean }>
  >({});

  // --- 培训 ---
  const [trainingList, setTrainingList] = useState<TrainingItem[]>([]);
  const [trainingTotal, setTrainingTotal] = useState(0);
  const [trainingStatusFilter, setTrainingStatusFilter] = useState("all");
  const [showCreateTraining, setShowCreateTraining] = useState(false);
  const [newTraining, setNewTraining] = useState({
    title: "",
    description: "",
    imageUrl: "",
    price: 0,
    teacherId: "",
    commissionRate: 20,
  });
  const [rejectingTrainingId, setRejectingTrainingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [commissionTrainingId, setCommissionTrainingId] = useState<string | null>(null);
  const [commissionValue, setCommissionValue] = useState(20);

  // --- 举报 ---
  const [reportList, setReportList] = useState<ReportItem[]>([]);
  const [reportTotal, setReportTotal] = useState(0);
  const [reportStatusFilter, setReportStatusFilter] = useState("pending");
  const [handlingReportId, setHandlingReportId] = useState<string | null>(null);
  const [reportNote, setReportNote] = useState("");
  const [reportViolationPoints, setReportViolationPoints] = useState(0);

  // --- 用户：封禁 ---
  const [banUserId, setBanUserId] = useState("");
  const [banReason, setBanReason] = useState("");
  const [banDays, setBanDays] = useState(7);

  // --- 用户：解封 ---
  const [unbanUserId, setUnbanUserId] = useState("");

  // --- 用户：违规扣分 ---
  const [violationUserId, setViolationUserId] = useState("");
  const [violationPoints, setViolationPoints] = useState(5);
  const [violationReason, setViolationReason] = useState("");

  // --- 用户：师父置顶 ---
  const [pinUserId, setPinUserId] = useState("");

  // --- 敏感词 ---
  const [sensitiveWords, setSensitiveWords] = useState<string[]>([]);
  const [newSensitiveWord, setNewSensitiveWord] = useState("");

  // --- body 滚动锁定 ---
  useEffect(() => {
    document.body.style.overflow = show ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [show]);

  // --- 初始化登录状态 ---
  useEffect(() => {
    if (show) {
      setLoggedIn(isAdminLoggedIn());
    }
  }, [show]);

  // --- Toast ---
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }, []);

  // ============ 登录 / 登出 ============

  const handleLogin = useCallback(async () => {
    if (!loginUser.trim() || !loginPwd.trim()) {
      showToast("请输入用户名和密码");
      return;
    }
    setLoginLoading(true);
    const result = await adminLogin(loginUser.trim(), loginPwd.trim());
    setLoginLoading(false);
    if (result.success && result.token) {
      setLoggedIn(true);
      showToast("登录成功");
      setActiveTab("ads");
    } else {
      showToast(result.error || "登录失败");
    }
  }, [loginUser, loginPwd, showToast]);

  const handleLogout = useCallback(() => {
    clearAdminToken();
    setLoggedIn(false);
    setLoginUser("");
    setLoginPwd("");
    // 清空已加载数据
    setAds({});
    setPositions({});
    setAdStats({});
    setAdEdits({});
    setTrainingList([]);
    setReportList([]);
    setSensitiveWords([]);
    showToast("已退出登录");
  }, [showToast]);

  // ============ 广告管理 ============

  const loadAds = useCallback(async () => {
    const t = getAdminToken();
    if (!t) {
      showToast("请先登录");
      return;
    }
    setLoading(true);
    const result = await getAds(t);
    setLoading(false);
    if (result) {
      setAds(result.ads);
      setPositions(result.positions);
      // 初始化编辑表单（合并默认位与接口返回）
      const edits: Record<string, { title: string; imageUrl: string; linkUrl: string; enabled: boolean }> = {};
      DEFAULT_AD_POSITIONS.forEach((p) => {
        const ad = result.ads[p.key];
        edits[p.key] = {
          title: ad?.title ?? "",
          imageUrl: ad?.imageUrl ?? "",
          linkUrl: ad?.linkUrl ?? "",
          enabled: ad?.enabled ?? false,
        };
      });
      Object.keys(result.ads).forEach((k) => {
        if (!edits[k]) {
          const ad = result.ads[k];
          edits[k] = { title: ad.title, imageUrl: ad.imageUrl, linkUrl: ad.linkUrl, enabled: ad.enabled };
        }
      });
      setAdEdits(edits);
    } else {
      showToast("加载广告失败");
    }
  }, [showToast]);

  const loadAdStats = useCallback(async () => {
    const t = getAdminToken();
    if (!t) return;
    const stats = await getAdStats(t);
    if (stats) setAdStats(stats);
  }, []);

  const updateAdEdit = useCallback(
    (position: string, field: "title" | "imageUrl" | "linkUrl" | "enabled", value: string | boolean) => {
      setAdEdits((prev) => {
        const cur = prev[position] || { title: "", imageUrl: "", linkUrl: "", enabled: false };
        return { ...prev, [position]: { ...cur, [field]: value } };
      });
    },
    []
  );

  const handleUpdateAd = useCallback(
    async (position: string) => {
      const t = getAdminToken();
      if (!t) {
        showToast("请先登录");
        return;
      }
      const edit = adEdits[position];
      if (!edit) return;
      if (!edit.imageUrl.trim()) {
        showToast("请填写广告图片URL");
        return;
      }
      setLoading(true);
      const result = await updateAd(t, position, {
        title: edit.title.trim(),
        imageUrl: edit.imageUrl.trim(),
        linkUrl: edit.linkUrl.trim(),
        enabled: edit.enabled,
      });
      setLoading(false);
      if (result.success) {
        showToast("广告已更新");
        loadAds();
        loadAdStats();
      } else {
        showToast(result.error || "更新失败");
      }
    },
    [adEdits, showToast, loadAds, loadAdStats]
  );

  const handleToggleAd = useCallback(
    async (position: string) => {
      const t = getAdminToken();
      if (!t) {
        showToast("请先登录");
        return;
      }
      const result = await toggleAd(t, position);
      if (result.success) {
        showToast(result.enabled ? "广告已启用" : "广告已停用");
        loadAds();
      } else {
        showToast(result.error || "操作失败");
      }
    },
    [showToast, loadAds]
  );

  // ============ 培训管理 ============

  const loadTraining = useCallback(async () => {
    const t = getAdminToken();
    if (!t) {
      showToast("请先登录");
      return;
    }
    setLoading(true);
    const result = await listTraining(t, trainingStatusFilter);
    setLoading(false);
    if (result) {
      setTrainingList(result.training);
      setTrainingTotal(result.total);
    } else {
      showToast("加载培训列表失败");
    }
  }, [trainingStatusFilter, showToast]);

  const handleCreateTraining = useCallback(async () => {
    const t = getAdminToken();
    if (!t) {
      showToast("请先登录");
      return;
    }
    if (!newTraining.title.trim() || !newTraining.description.trim()) {
      showToast("请填写标题和描述");
      return;
    }
    if (newTraining.commissionRate < 0 || newTraining.commissionRate > 50) {
      showToast("分成比例需在 0-50% 之间");
      return;
    }
    if (newTraining.price < 0) {
      showToast("价格不能为负数");
      return;
    }
    setLoading(true);
    const result = await createTraining(t, {
      title: newTraining.title.trim(),
      description: newTraining.description.trim(),
      imageUrl: newTraining.imageUrl.trim(),
      price: newTraining.price,
      teacherId: newTraining.teacherId.trim(),
      commissionRate: newTraining.commissionRate,
    });
    setLoading(false);
    if (result.success) {
      showToast("培训创建成功");
      setNewTraining({ title: "", description: "", imageUrl: "", price: 0, teacherId: "", commissionRate: 20 });
      setShowCreateTraining(false);
      loadTraining();
    } else {
      showToast(result.error || "创建失败");
    }
  }, [newTraining, showToast, loadTraining]);

  const handleApproveTraining = useCallback(
    async (trainingId: string) => {
      const t = getAdminToken();
      if (!t) {
        showToast("请先登录");
        return;
      }
      setLoading(true);
      const result = await approveTraining(t, trainingId);
      setLoading(false);
      if (result.success) {
        showToast("培训已审批通过");
        loadTraining();
      } else {
        showToast(result.error || "审批失败");
      }
    },
    [showToast, loadTraining]
  );

  const handleRejectTraining = useCallback(async () => {
    const t = getAdminToken();
    if (!t) {
      showToast("请先登录");
      return;
    }
    if (!rejectingTrainingId) return;
    if (!rejectReason.trim()) {
      showToast("请填写拒绝理由");
      return;
    }
    setLoading(true);
    const result = await rejectTraining(t, rejectingTrainingId, rejectReason.trim());
    setLoading(false);
    if (result.success) {
      showToast("已拒绝培训");
      setRejectingTrainingId(null);
      setRejectReason("");
      loadTraining();
    } else {
      showToast(result.error || "操作失败");
    }
  }, [rejectingTrainingId, rejectReason, showToast, loadTraining]);

  const handleSetCommission = useCallback(async () => {
    const t = getAdminToken();
    if (!t) {
      showToast("请先登录");
      return;
    }
    if (!commissionTrainingId) return;
    if (commissionValue < 0 || commissionValue > 50) {
      showToast("分成比例需在 0-50% 之间");
      return;
    }
    setLoading(true);
    const result = await setTrainingCommission(t, commissionTrainingId, commissionValue);
    setLoading(false);
    if (result.success) {
      showToast(`分成已设置为 ${commissionValue}%`);
      setCommissionTrainingId(null);
      loadTraining();
    } else {
      showToast(result.error || "设置失败");
    }
  }, [commissionTrainingId, commissionValue, showToast, loadTraining]);

  // ============ 举报管理 ============

  const loadReports = useCallback(async () => {
    const t = getAdminToken();
    if (!t) {
      showToast("请先登录");
      return;
    }
    setLoading(true);
    const result = await listReports(t, reportStatusFilter);
    setLoading(false);
    if (result) {
      setReportList(result.reports);
      setReportTotal(result.total);
    } else {
      showToast("加载举报列表失败");
    }
  }, [reportStatusFilter, showToast]);

  const handleReportAction = useCallback(
    async (action: "approved" | "rejected") => {
      const t = getAdminToken();
      if (!t) {
        showToast("请先登录");
        return;
      }
      if (!handlingReportId) return;
      setLoading(true);
      const result = await handleReport(
        t,
        handlingReportId,
        action,
        reportNote.trim(),
        action === "approved" ? reportViolationPoints : undefined
      );
      setLoading(false);
      if (result.success) {
        showToast(action === "approved" ? "举报已通过处理" : "举报已拒绝");
        setHandlingReportId(null);
        setReportNote("");
        setReportViolationPoints(0);
        loadReports();
      } else {
        showToast(result.error || "处理失败");
      }
    },
    [handlingReportId, reportNote, reportViolationPoints, showToast, loadReports]
  );

  // ============ 用户管理 ============

  const handleBanUser = useCallback(async () => {
    const t = getAdminToken();
    if (!t) {
      showToast("请先登录");
      return;
    }
    if (!banUserId.trim()) {
      showToast("请输入用户ID");
      return;
    }
    if (!banReason.trim()) {
      showToast("请输入封禁原因");
      return;
    }
    setLoading(true);
    const result = await banUser(t, banUserId.trim(), banReason.trim(), banDays);
    setLoading(false);
    if (result.success) {
      showToast(banDays > 0 ? `用户已封禁 ${banDays} 天` : "用户已永久封禁");
      setBanUserId("");
      setBanReason("");
      setBanDays(7);
    } else {
      showToast(result.error || "封禁失败");
    }
  }, [banUserId, banReason, banDays, showToast]);

  const handleUnbanUser = useCallback(async () => {
    const t = getAdminToken();
    if (!t) {
      showToast("请先登录");
      return;
    }
    if (!unbanUserId.trim()) {
      showToast("请输入用户ID");
      return;
    }
    setLoading(true);
    const result = await unbanUser(t, unbanUserId.trim());
    setLoading(false);
    if (result.success) {
      showToast("用户已解封");
      setUnbanUserId("");
    } else {
      showToast(result.error || "解封失败");
    }
  }, [unbanUserId, showToast]);

  const handleApplyViolation = useCallback(async () => {
    const t = getAdminToken();
    if (!t) {
      showToast("请先登录");
      return;
    }
    if (!violationUserId.trim()) {
      showToast("请输入用户ID");
      return;
    }
    if (!violationReason.trim()) {
      showToast("请输入扣分原因");
      return;
    }
    if (violationPoints <= 0) {
      showToast("扣分需大于0");
      return;
    }
    setLoading(true);
    const result = await applyViolation(t, violationUserId.trim(), violationPoints, violationReason.trim());
    setLoading(false);
    if (result.success) {
      showToast(`已扣除 ${result.deductedPoints ?? violationPoints} 分`);
      setViolationUserId("");
      setViolationPoints(5);
      setViolationReason("");
    } else {
      showToast(result.error || "扣分失败");
    }
  }, [violationUserId, violationPoints, violationReason, showToast]);

  const handleTogglePinMaster = useCallback(async () => {
    const t = getAdminToken();
    if (!t) {
      showToast("请先登录");
      return;
    }
    if (!pinUserId.trim()) {
      showToast("请输入用户ID");
      return;
    }
    setLoading(true);
    const result = await togglePinMaster(t, pinUserId.trim());
    setLoading(false);
    if (result.success) {
      showToast(result.pinned ? "师父已置顶" : "师父已取消置顶");
      setPinUserId("");
    } else {
      showToast(result.error || "操作失败");
    }
  }, [pinUserId, showToast]);

  // ============ 敏感词管理 ============

  const loadSensitiveWords = useCallback(async () => {
    const t = getAdminToken();
    if (!t) {
      showToast("请先登录");
      return;
    }
    setLoading(true);
    const words = await listSensitiveWords(t);
    setLoading(false);
    setSensitiveWords(words);
  }, [showToast]);

  const handleAddSensitiveWord = useCallback(async () => {
    const t = getAdminToken();
    if (!t) {
      showToast("请先登录");
      return;
    }
    if (!newSensitiveWord.trim()) {
      showToast("请输入敏感词");
      return;
    }
    setLoading(true);
    const result = await addSensitiveWord(t, newSensitiveWord.trim());
    setLoading(false);
    if (result.success) {
      showToast("敏感词已添加");
      setNewSensitiveWord("");
      loadSensitiveWords();
    } else {
      showToast(result.error || "添加失败");
    }
  }, [newSensitiveWord, showToast, loadSensitiveWords]);

  const handleRemoveSensitiveWord = useCallback(
    async (word: string) => {
      const t = getAdminToken();
      if (!t) {
        showToast("请先登录");
        return;
      }
      setLoading(true);
      const result = await removeSensitiveWord(t, word);
      setLoading(false);
      if (result.success) {
        showToast("敏感词已删除");
        loadSensitiveWords();
      } else {
        showToast(result.error || "删除失败");
      }
    },
    [showToast, loadSensitiveWords]
  );

  // --- Tab 切换 / 筛选变化时自动加载 ---
  useEffect(() => {
    if (!show || !loggedIn) return;
    if (activeTab === "ads") {
      loadAds();
      loadAdStats();
    } else if (activeTab === "training") {
      loadTraining();
    } else if (activeTab === "reports") {
      loadReports();
    } else if (activeTab === "sensitive") {
      loadSensitiveWords();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, loggedIn, activeTab, trainingStatusFilter, reportStatusFilter]);

  // --- 合并广告位列表（默认 + 接口返回） ---
  const mergedPositions = (() => {
    const list = DEFAULT_AD_POSITIONS.map((p) => ({ key: p.key, label: p.label, desc: p.desc }));
    Object.keys(positions).forEach((k) => {
      if (!list.find((p) => p.key === k)) {
        list.push({ key: k, label: positions[k].name || k, desc: positions[k].description || "" });
      }
    });
    Object.keys(ads).forEach((k) => {
      if (!list.find((p) => p.key === k)) {
        list.push({ key: k, label: k, desc: "" });
      }
    });
    return list;
  })();

  // --- 不渲染 ---
  if (!show) return null;

  // ============ 渲染 ============

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      {/* 遮罩 */}
      <div onClick={onClose} style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.45)" }} />

      {/* 面板 */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 760,
          maxHeight: "90vh",
          backgroundColor: "#fff",
          borderRadius: 16,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 12px 40px rgba(123,47,190,0.25)",
        }}
      >
        {/* 头部 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            backgroundColor: THEME.primary,
            color: "#fff",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>🛡️</span>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>v19.9 后台运营管控</h3>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {loggedIn && (
              <button
                onClick={handleLogout}
                style={{
                  padding: "5px 12px",
                  border: "1px solid rgba(255,255,255,0.6)",
                  borderRadius: 8,
                  backgroundColor: "transparent",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                退出登录
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                border: "none",
                backgroundColor: "rgba(255,255,255,0.2)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: 15,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* 未登录：登录表单 */}
        {!loggedIn ? (
          <div style={{ padding: 32, backgroundColor: THEME.bg }}>
            <div
              style={{
                backgroundColor: "#fff",
                borderRadius: 14,
                padding: 28,
                maxWidth: 380,
                margin: "0 auto",
                border: `1px solid ${THEME.border}`,
              }}
            >
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>🔐</div>
                <h2 style={{ margin: 0, fontSize: 18, color: THEME.primary, fontWeight: 700 }}>管理员登录</h2>
                <p style={{ margin: "6px 0 0", fontSize: 12, color: THEME.textSub }}>
                  请输入管理员账号密码以进入后台
                </p>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>用户名</label>
                <input
                  type="text"
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value)}
                  placeholder="请输入管理员用户名"
                  style={inputStyle}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleLogin();
                  }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>密码</label>
                <input
                  type="password"
                  value={loginPwd}
                  onChange={(e) => setLoginPwd(e.target.value)}
                  placeholder="请输入密码"
                  style={inputStyle}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleLogin();
                  }}
                />
              </div>

              <button
                onClick={handleLogin}
                disabled={loginLoading}
                style={{
                  ...btnPrimary,
                  width: "100%",
                  padding: "11px",
                  fontSize: 14,
                  opacity: loginLoading ? 0.6 : 1,
                  cursor: loginLoading ? "not-allowed" : "pointer",
                }}
              >
                {loginLoading ? "登录中..." : "登录"}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Tab 切换 */}
            <div
              style={{
                display: "flex",
                padding: "10px 12px",
                gap: 6,
                backgroundColor: THEME.bg,
                flexShrink: 0,
                borderBottom: `1px solid ${THEME.border}`,
              }}
            >
              {(
                [
                  { key: "ads", label: "广告管理" },
                  { key: "training", label: "培训管理" },
                  { key: "reports", label: "举报管理" },
                  { key: "users", label: "用户管理" },
                  { key: "sensitive", label: "敏感词" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    flex: 1,
                    padding: "9px 4px",
                    border: "none",
                    borderRadius: 8,
                    backgroundColor: activeTab === tab.key ? THEME.primary : "transparent",
                    color: activeTab === tab.key ? "#fff" : THEME.textSub,
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

            {/* 内容区 */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: 16,
                backgroundColor: THEME.bg,
              }}
            >
              {loading && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "6px 0",
                    fontSize: 12,
                    color: THEME.secondary,
                  }}
                >
                  处理中...
                </div>
              )}

              {/* ============ 广告管理 ============ */}
              {activeTab === "ads" && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <span style={{ fontSize: 13, color: THEME.textSub }}>
                      共 {mergedPositions.length} 个广告位
                    </span>
                    <button onClick={loadAds} style={{ ...btnSecondary, padding: "5px 12px" }}>
                      刷新
                    </button>
                  </div>

                  {mergedPositions.map((p) => {
                    const edit = adEdits[p.key];
                    const stat = adStats[p.key];
                    const enabled = edit?.enabled ?? ads[p.key]?.enabled ?? false;
                    return (
                      <div key={p.key} style={cardStyle}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 10,
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: 700, color: THEME.primary, fontSize: 14 }}>
                              {p.label}
                            </span>
                            <span style={{ marginLeft: 8, fontSize: 11, color: THEME.textSub }}>
                              {p.desc}
                            </span>
                          </div>
                          <span
                            style={{
                              padding: "2px 10px",
                              borderRadius: 12,
                              fontSize: 11,
                              fontWeight: 600,
                              backgroundColor: enabled ? "#e8f5e9" : "#fce4ec",
                              color: enabled ? "#2e7d32" : "#c62828",
                            }}
                          >
                            {enabled ? "启用中" : "已停用"}
                          </span>
                        </div>

                        {/* 广告图片预览 */}
                        {edit?.imageUrl ? (
                          <img
                            src={edit.imageUrl}
                            alt="广告预览"
                            style={{
                              width: "100%",
                              height: 100,
                              objectFit: "cover",
                              borderRadius: 8,
                              marginBottom: 10,
                              backgroundColor: THEME.bg,
                            }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : null}

                        <div style={{ marginBottom: 8 }}>
                          <label style={labelStyle}>广告标题</label>
                          <input
                            type="text"
                            value={edit?.title ?? ""}
                            onChange={(e) => updateAdEdit(p.key, "title", e.target.value)}
                            placeholder="如：限时优惠"
                            style={inputStyle}
                          />
                        </div>

                        <div style={{ marginBottom: 8 }}>
                          <label style={labelStyle}>图片URL</label>
                          <input
                            type="text"
                            value={edit?.imageUrl ?? ""}
                            onChange={(e) => updateAdEdit(p.key, "imageUrl", e.target.value)}
                            placeholder="https://..."
                            style={inputStyle}
                          />
                        </div>

                        <div style={{ marginBottom: 10 }}>
                          <label style={labelStyle}>跳转链接</label>
                          <input
                            type="text"
                            value={edit?.linkUrl ?? ""}
                            onChange={(e) => updateAdEdit(p.key, "linkUrl", e.target.value)}
                            placeholder="https://..."
                            style={inputStyle}
                          />
                        </div>

                        {/* 统计 */}
                        {stat && (
                          <div
                            style={{
                              display: "flex",
                              gap: 12,
                              fontSize: 11,
                              color: THEME.textSub,
                              marginBottom: 10,
                              padding: "6px 10px",
                              backgroundColor: THEME.bg,
                              borderRadius: 8,
                            }}
                          >
                            <span>曝光：{stat.impressions}</span>
                            <span>点击：{stat.clicks}</span>
                            <span>CTR：{stat.ctr.toFixed(2)}%</span>
                          </div>
                        )}

                        <div style={{ display: "flex", gap: 8 }}>
                          <label
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              fontSize: 13,
                              cursor: "pointer",
                              color: THEME.textMain,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={enabled}
                              onChange={(e) => {
                                updateAdEdit(p.key, "enabled", e.target.checked);
                                handleToggleAd(p.key);
                              }}
                            />
                            启用此广告
                          </label>
                          <div style={{ flex: 1 }} />
                          <button
                            onClick={() => handleUpdateAd(p.key)}
                            disabled={loading}
                            style={{
                              ...btnPrimary,
                              opacity: loading ? 0.6 : 1,
                              cursor: loading ? "not-allowed" : "pointer",
                            }}
                          >
                            保存
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ============ 培训管理 ============ */}
              {activeTab === "training" && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 12,
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {(
                        [
                          { key: "all", label: "全部" },
                          { key: "pending", label: "待审批" },
                          { key: "approved", label: "已通过" },
                          { key: "rejected", label: "已拒绝" },
                          { key: "offline", label: "已下架" },
                        ] as const
                      ).map((f) => (
                        <button
                          key={f.key}
                          onClick={() => setTrainingStatusFilter(f.key)}
                          style={{
                            padding: "5px 12px",
                            borderRadius: 8,
                            backgroundColor:
                              trainingStatusFilter === f.key ? THEME.primary : "#fff",
                            color: trainingStatusFilter === f.key ? "#fff" : THEME.textSub,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            border: `1px solid ${THEME.border}`,
                          }}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setShowCreateTraining((v) => !v)}
                      style={{ ...btnPrimary, padding: "6px 14px" }}
                    >
                      {showCreateTraining ? "收起" : "+ 创建培训"}
                    </button>
                  </div>

                  <span style={{ fontSize: 12, color: THEME.textSub, display: "block", marginBottom: 12 }}>
                    共 {trainingTotal} 条记录
                  </span>

                  {/* 创建培训表单 */}
                  {showCreateTraining && (
                    <div style={cardStyle}>
                      <h4 style={{ margin: "0 0 12px", fontSize: 14, color: THEME.primary }}>
                        创建新培训
                      </h4>
                      <div style={{ marginBottom: 8 }}>
                        <label style={labelStyle}>标题</label>
                        <input
                          type="text"
                          value={newTraining.title}
                          onChange={(e) => setNewTraining({ ...newTraining, title: e.target.value })}
                          placeholder="培训标题"
                          style={inputStyle}
                        />
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <label style={labelStyle}>描述</label>
                        <textarea
                          value={newTraining.description}
                          onChange={(e) =>
                            setNewTraining({ ...newTraining, description: e.target.value })
                          }
                          placeholder="培训内容描述"
                          style={{ ...inputStyle, minHeight: 64, resize: "vertical" }}
                        />
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <label style={labelStyle}>封面图URL（可选）</label>
                        <input
                          type="text"
                          value={newTraining.imageUrl}
                          onChange={(e) =>
                            setNewTraining({ ...newTraining, imageUrl: e.target.value })
                          }
                          placeholder="https://..."
                          style={inputStyle}
                        />
                      </div>
                      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                        <div style={{ flex: 1 }}>
                          <label style={labelStyle}>价格（元）</label>
                          <input
                            type="number"
                            value={newTraining.price}
                            min={0}
                            onChange={(e) =>
                              setNewTraining({ ...newTraining, price: Number(e.target.value) })
                            }
                            style={inputStyle}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={labelStyle}>讲师ID（可选）</label>
                          <input
                            type="text"
                            value={newTraining.teacherId}
                            onChange={(e) =>
                              setNewTraining({ ...newTraining, teacherId: e.target.value })
                            }
                            placeholder="讲师用户ID"
                            style={inputStyle}
                          />
                        </div>
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <label style={labelStyle}>
                          分成比例：{newTraining.commissionRate}%（0-50%）
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={50}
                          value={newTraining.commissionRate}
                          onChange={(e) =>
                            setNewTraining({
                              ...newTraining,
                              commissionRate: Number(e.target.value),
                            })
                          }
                          style={{ width: "100%", accentColor: THEME.primary }}
                        />
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={handleCreateTraining}
                          disabled={loading}
                          style={{
                            ...btnPrimary,
                            opacity: loading ? 0.6 : 1,
                            cursor: loading ? "not-allowed" : "pointer",
                          }}
                        >
                          确认创建
                        </button>
                        <button onClick={() => setShowCreateTraining(false)} style={btnSecondary}>
                          取消
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 培训列表 */}
                  {trainingList.length === 0 ? (
                    <div
                      style={{
                        textAlign: "center",
                        padding: 32,
                        color: THEME.textSub,
                        fontSize: 13,
                      }}
                    >
                      暂无培训记录
                    </div>
                  ) : (
                    trainingList.map((t) => {
                      const sm = trainingStatusMap[t.status] || {
                        text: t.status,
                        color: "#616161",
                        bg: "#f5f5f5",
                      };
                      return (
                        <div key={t.id} style={cardStyle}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              marginBottom: 6,
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ fontWeight: 700, fontSize: 14, color: THEME.textMain }}>
                                {t.title}
                              </span>
                              <span
                                style={{
                                  marginLeft: 8,
                                  padding: "2px 8px",
                                  borderRadius: 10,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  backgroundColor: sm.bg,
                                  color: sm.color,
                                }}
                              >
                                {sm.text}
                              </span>
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: THEME.primary }}>
                              ¥{t.price}
                            </span>
                          </div>

                          <p
                            style={{
                              margin: "0 0 8px",
                              fontSize: 12,
                              color: THEME.textSub,
                              lineHeight: 1.5,
                            }}
                          >
                            {t.description}
                          </p>

                          <div
                            style={{
                              display: "flex",
                              gap: 12,
                              fontSize: 11,
                              color: THEME.textSub,
                              marginBottom: 8,
                            }}
                          >
                            <span>报名：{t.enrollCount}</span>
                            <span>分成：{t.commissionRate}%</span>
                            <span>讲师：{t.teacherId || "-"}</span>
                            <span>{formatTime(t.createdAt)}</span>
                          </div>

                          {t.status === "rejected" && t.rejectReason && (
                            <div
                              style={{
                                fontSize: 11,
                                color: "#c62828",
                                marginBottom: 8,
                                padding: "4px 8px",
                                backgroundColor: "#fce4ec",
                                borderRadius: 6,
                              }}
                            >
                              拒绝理由：{t.rejectReason}
                            </div>
                          )}

                          {/* 拒绝表单 */}
                          {rejectingTrainingId === t.id ? (
                            <div style={{ marginBottom: 8 }}>
                              <input
                                type="text"
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="请输入拒绝理由"
                                style={{ ...inputStyle, marginBottom: 8 }}
                              />
                              <div style={{ display: "flex", gap: 8 }}>
                                <button
                                  onClick={handleRejectTraining}
                                  disabled={loading}
                                  style={{
                                    ...btnDanger,
                                    opacity: loading ? 0.6 : 1,
                                    cursor: loading ? "not-allowed" : "pointer",
                                  }}
                                >
                                  确认拒绝
                                </button>
                                <button
                                  onClick={() => {
                                    setRejectingTrainingId(null);
                                    setRejectReason("");
                                  }}
                                  style={btnSecondary}
                                >
                                  取消
                                </button>
                              </div>
                            </div>
                          ) : null}

                          {/* 分成设置表单 */}
                          {commissionTrainingId === t.id ? (
                            <div style={{ marginBottom: 8 }}>
                              <label style={labelStyle}>分成比例：{commissionValue}%（0-50%）</label>
                              <input
                                type="range"
                                min={0}
                                max={50}
                                value={commissionValue}
                                onChange={(e) => setCommissionValue(Number(e.target.value))}
                                style={{ width: "100%", accentColor: THEME.primary, marginBottom: 8 }}
                              />
                              <div style={{ display: "flex", gap: 8 }}>
                                <button
                                  onClick={handleSetCommission}
                                  disabled={loading}
                                  style={{
                                    ...btnPrimary,
                                    padding: "6px 14px",
                                    opacity: loading ? 0.6 : 1,
                                    cursor: loading ? "not-allowed" : "pointer",
                                  }}
                                >
                                  保存分成
                                </button>
                                <button
                                  onClick={() => setCommissionTrainingId(null)}
                                  style={btnSecondary}
                                >
                                  取消
                                </button>
                              </div>
                            </div>
                          ) : null}

                          {/* 操作按钮 */}
                          {rejectingTrainingId !== t.id && commissionTrainingId !== t.id && (
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              {t.status === "pending" && (
                                <>
                                  <button
                                    onClick={() => handleApproveTraining(t.id)}
                                    disabled={loading}
                                    style={btnSuccess}
                                  >
                                    通过
                                  </button>
                                  <button
                                    onClick={() => {
                                      setRejectingTrainingId(t.id);
                                      setRejectReason("");
                                    }}
                                    style={btnDanger}
                                  >
                                    拒绝
                                  </button>
                                </>
                              )}
                              {t.status === "approved" && (
                                <button
                                  onClick={() => {
                                    setCommissionTrainingId(t.id);
                                    setCommissionValue(t.commissionRate);
                                  }}
                                  style={btnSecondary}
                                >
                                  修改分成
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* ============ 举报管理 ============ */}
              {activeTab === "reports" && (
                <div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                    {(
                      [
                        { key: "pending", label: "待处理" },
                        { key: "all", label: "全部" },
                        { key: "approved", label: "已通过" },
                        { key: "rejected", label: "已拒绝" },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setReportStatusFilter(f.key)}
                        style={{
                          padding: "5px 12px",
                          borderRadius: 8,
                          backgroundColor: reportStatusFilter === f.key ? THEME.primary : "#fff",
                          color: reportStatusFilter === f.key ? "#fff" : THEME.textSub,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          border: `1px solid ${THEME.border}`,
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <span style={{ fontSize: 12, color: THEME.textSub, display: "block", marginBottom: 12 }}>
                    共 {reportTotal} 条记录
                  </span>

                  {reportList.length === 0 ? (
                    <div
                      style={{
                        textAlign: "center",
                        padding: 32,
                        color: THEME.textSub,
                        fontSize: 13,
                      }}
                    >
                      暂无举报记录
                    </div>
                  ) : (
                    reportList.map((r) => {
                      const sm = reportStatusMap[r.status] || {
                        text: r.status,
                        color: "#616161",
                        bg: "#f5f5f5",
                      };
                      return (
                        <div key={r.id} style={cardStyle}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 6,
                            }}
                          >
                            <span style={{ fontSize: 12, color: THEME.textSub }}>
                              类型：
                              <span style={{ color: THEME.primary, fontWeight: 600 }}>
                                {reportTypeMap[r.targetType] || r.targetType}
                              </span>
                            </span>
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: 10,
                                fontSize: 11,
                                fontWeight: 600,
                                backgroundColor: sm.bg,
                                color: sm.color,
                              }}
                            >
                              {sm.text}
                            </span>
                          </div>

                          <p
                            style={{
                              margin: "0 0 6px",
                              fontSize: 13,
                              color: THEME.textMain,
                              lineHeight: 1.5,
                            }}
                          >
                            举报理由：{r.reason}
                          </p>

                          <div
                            style={{
                              display: "flex",
                              gap: 12,
                              fontSize: 11,
                              color: THEME.textSub,
                              marginBottom: 8,
                              flexWrap: "wrap",
                            }}
                          >
                            <span>举报人：{r.reporterId}</span>
                            <span>目标ID：{r.targetId}</span>
                            <span>{formatTime(r.createdAt)}</span>
                          </div>

                          {r.handleNote && (
                            <div
                              style={{
                                fontSize: 11,
                                color: THEME.textSub,
                                marginBottom: 8,
                                padding: "4px 8px",
                                backgroundColor: THEME.bg,
                                borderRadius: 6,
                              }}
                            >
                              处理备注：{r.handleNote}
                            </div>
                          )}

                          {/* 处理表单 */}
                          {handlingReportId === r.id ? (
                            <div style={{ marginTop: 8 }}>
                              <div style={{ marginBottom: 8 }}>
                                <label style={labelStyle}>处理备注</label>
                                <input
                                  type="text"
                                  value={reportNote}
                                  onChange={(e) => setReportNote(e.target.value)}
                                  placeholder="处理说明（可选）"
                                  style={inputStyle}
                                />
                              </div>
                              <div style={{ marginBottom: 10 }}>
                                <label style={labelStyle}>
                                  违规扣分（通过时生效）：{reportViolationPoints} 分
                                </label>
                                <input
                                  type="range"
                                  min={0}
                                  max={50}
                                  value={reportViolationPoints}
                                  onChange={(e) =>
                                    setReportViolationPoints(Number(e.target.value))
                                  }
                                  style={{ width: "100%", accentColor: THEME.primary }}
                                />
                              </div>
                              <div style={{ display: "flex", gap: 8 }}>
                                <button
                                  onClick={() => handleReportAction("approved")}
                                  disabled={loading}
                                  style={{
                                    ...btnSuccess,
                                    opacity: loading ? 0.6 : 1,
                                    cursor: loading ? "not-allowed" : "pointer",
                                  }}
                                >
                                  通过（{reportViolationPoints > 0 ? `扣${reportViolationPoints}分` : "不扣分"}）
                                </button>
                                <button
                                  onClick={() => handleReportAction("rejected")}
                                  disabled={loading}
                                  style={{
                                    ...btnDanger,
                                    opacity: loading ? 0.6 : 1,
                                    cursor: loading ? "not-allowed" : "pointer",
                                  }}
                                >
                                  拒绝
                                </button>
                                <button
                                  onClick={() => {
                                    setHandlingReportId(null);
                                    setReportNote("");
                                    setReportViolationPoints(0);
                                  }}
                                  style={btnSecondary}
                                >
                                  取消
                                </button>
                              </div>
                            </div>
                          ) : (
                            r.status === "pending" && (
                              <button
                                onClick={() => {
                                  setHandlingReportId(r.id);
                                  setReportNote("");
                                  setReportViolationPoints(0);
                                }}
                                style={{ ...btnPrimary, padding: "6px 14px" }}
                              >
                                处理举报
                              </button>
                            )
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* ============ 用户管理 ============ */}
              {activeTab === "users" && (
                <div>
                  {/* 封禁用户 */}
                  <div style={cardStyle}>
                    <h4 style={{ margin: "0 0 12px", fontSize: 14, color: THEME.primary }}>🚫 封禁用户</h4>
                    <div style={{ marginBottom: 8 }}>
                      <label style={labelStyle}>用户ID</label>
                      <input
                        type="text"
                        value={banUserId}
                        onChange={(e) => setBanUserId(e.target.value)}
                        placeholder="请输入用户ID"
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <label style={labelStyle}>封禁原因</label>
                      <input
                        type="text"
                        value={banReason}
                        onChange={(e) => setBanReason(e.target.value)}
                        placeholder="如：发布违规内容"
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <label style={labelStyle}>封禁天数（0 = 永久）</label>
                      <input
                        type="number"
                        value={banDays}
                        min={0}
                        onChange={(e) => setBanDays(Number(e.target.value))}
                        style={inputStyle}
                      />
                    </div>
                    <button
                      onClick={handleBanUser}
                      disabled={loading}
                      style={{
                        ...btnDanger,
                        padding: "8px 16px",
                        opacity: loading ? 0.6 : 1,
                        cursor: loading ? "not-allowed" : "pointer",
                      }}
                    >
                      确认封禁
                    </button>
                  </div>

                  {/* 解封用户 */}
                  <div style={cardStyle}>
                    <h4 style={{ margin: "0 0 12px", fontSize: 14, color: THEME.primary }}>✅ 解封用户</h4>
                    <div style={{ marginBottom: 12 }}>
                      <label style={labelStyle}>用户ID</label>
                      <input
                        type="text"
                        value={unbanUserId}
                        onChange={(e) => setUnbanUserId(e.target.value)}
                        placeholder="请输入用户ID"
                        style={inputStyle}
                      />
                    </div>
                    <button
                      onClick={handleUnbanUser}
                      disabled={loading}
                      style={{
                        ...btnSuccess,
                        padding: "8px 16px",
                        opacity: loading ? 0.6 : 1,
                        cursor: loading ? "not-allowed" : "pointer",
                      }}
                    >
                      确认解封
                    </button>
                  </div>

                  {/* 违规扣分 */}
                  <div style={cardStyle}>
                    <h4 style={{ margin: "0 0 12px", fontSize: 14, color: THEME.primary }}>⚠️ 违规扣分</h4>
                    <div style={{ marginBottom: 8 }}>
                      <label style={labelStyle}>用户ID</label>
                      <input
                        type="text"
                        value={violationUserId}
                        onChange={(e) => setViolationUserId(e.target.value)}
                        placeholder="请输入用户ID"
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <label style={labelStyle}>扣除分数</label>
                      <input
                        type="number"
                        value={violationPoints}
                        min={1}
                        onChange={(e) => setViolationPoints(Number(e.target.value))}
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <label style={labelStyle}>扣分原因</label>
                      <input
                        type="text"
                        value={violationReason}
                        onChange={(e) => setViolationReason(e.target.value)}
                        placeholder="如：恶意刷分"
                        style={inputStyle}
                      />
                    </div>
                    <button
                      onClick={handleApplyViolation}
                      disabled={loading}
                      style={{
                        ...btnPrimary,
                        opacity: loading ? 0.6 : 1,
                        cursor: loading ? "not-allowed" : "pointer",
                      }}
                    >
                      确认扣分
                    </button>
                  </div>

                  {/* 师父置顶 */}
                  <div style={cardStyle}>
                    <h4 style={{ margin: "0 0 12px", fontSize: 14, color: THEME.primary }}>📌 师父置顶</h4>
                    <p style={{ margin: "0 0 8px", fontSize: 11, color: THEME.textSub }}>
                      切换指定师父的置顶状态（置顶 / 取消置顶）
                    </p>
                    <div style={{ marginBottom: 12 }}>
                      <label style={labelStyle}>用户ID</label>
                      <input
                        type="text"
                        value={pinUserId}
                        onChange={(e) => setPinUserId(e.target.value)}
                        placeholder="请输入师父用户ID"
                        style={inputStyle}
                      />
                    </div>
                    <button
                      onClick={handleTogglePinMaster}
                      disabled={loading}
                      style={{
                        ...btnSecondary,
                        opacity: loading ? 0.6 : 1,
                        cursor: loading ? "not-allowed" : "pointer",
                      }}
                    >
                      切换置顶状态
                    </button>
                  </div>
                </div>
              )}

              {/* ============ 敏感词管理 ============ */}
              {activeTab === "sensitive" && (
                <div>
                  {/* 添加敏感词 */}
                  <div style={cardStyle}>
                    <h4 style={{ margin: "0 0 12px", fontSize: 14, color: THEME.primary }}>
                      ➕ 添加敏感词
                    </h4>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        type="text"
                        value={newSensitiveWord}
                        onChange={(e) => setNewSensitiveWord(e.target.value)}
                        placeholder="输入敏感词"
                        style={inputStyle}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddSensitiveWord();
                        }}
                      />
                      <button
                        onClick={handleAddSensitiveWord}
                        disabled={loading}
                        style={{
                          ...btnPrimary,
                          whiteSpace: "nowrap",
                          opacity: loading ? 0.6 : 1,
                          cursor: loading ? "not-allowed" : "pointer",
                        }}
                      >
                        添加
                      </button>
                    </div>
                  </div>

                  {/* 敏感词列表 */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <span style={{ fontSize: 13, color: THEME.textSub }}>
                      共 {sensitiveWords.length} 个敏感词
                    </span>
                    <button onClick={loadSensitiveWords} style={{ ...btnSecondary, padding: "5px 12px" }}>
                      刷新
                    </button>
                  </div>

                  {sensitiveWords.length === 0 ? (
                    <div
                      style={{
                        textAlign: "center",
                        padding: 32,
                        color: THEME.textSub,
                        fontSize: 13,
                      }}
                    >
                      暂无敏感词
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {sensitiveWords.map((w, i) => (
                        <span
                          key={`${w}-${i}`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "6px 10px 6px 12px",
                            backgroundColor: THEME.bgLight,
                            border: `1px solid ${THEME.border}`,
                            borderRadius: 16,
                            fontSize: 13,
                            color: THEME.textMain,
                          }}
                        >
                          {w}
                          <button
                            onClick={() => handleRemoveSensitiveWord(w)}
                            disabled={loading}
                            style={{
                              border: "none",
                              backgroundColor: "transparent",
                              color: "#c62828",
                              cursor: "pointer",
                              fontSize: 14,
                              lineHeight: 1,
                              padding: 0,
                              display: "flex",
                              alignItems: "center",
                            }}
                            title="删除"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Toast 提示 */}
        {toast && (
          <div
            style={{
              position: "absolute",
              bottom: 20,
              left: "50%",
              transform: "translateX(-50%)",
              backgroundColor: "rgba(42,26,53,0.92)",
              color: "#fff",
              padding: "9px 18px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 500,
              boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
              zIndex: 10,
              maxWidth: "80%",
              textAlign: "center",
            }}
          >
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
