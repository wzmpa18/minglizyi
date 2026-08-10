"use client";

import { useState, useCallback, useEffect } from "react";
import {
  getUserClassification,
  getCategoryConfig,
  getClassificationStats,
  getCategoryDisplay,
  USER_CATEGORIES,
  type ClassificationInfo,
  type ClassificationStats,
  type CategoryConfig,
} from "@/lib/userService";
import { getAdminToken } from "@/lib/adminService";

/**
 * v20.0 用户分类体系 - 前端展示组件
 *
 * 功能区域：
 * 1. 我的分类：展示当前用户的分类标签（主分类、分类数量、分配方式、更新时间）
 *    每个分类显示图标、名称、子分类、自动/手动标记、分配时间
 * 2. 分类体系：展示 5 大主类（国学爱好者、专业从业者、社区贡献者、付费会员、合作伙伴）
 *    及其子分类，便于用户了解完整分类体系
 * 3. 分类统计：展示各分类的全局统计信息（仅管理员可见，无权限时给出提示）
 *
 * 合规声明：用户分类仅用于提供更精准的服务体验，不涉及敏感个人信息，
 *           分类结果由系统根据使用行为自动评估，管理员可手动调整。
 */

// --- 主题色 ---
const BRAND = "#7B2FBE";
const BRAND_LIGHT = "#9B5ECF";
const BRAND_BG = "#f3edf7";

// --- 时间格式化 ---
function formatTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "—";
  }
}

// --- 组件 Props ---
interface UserClassificationPanelProps {
  show: boolean;
  onClose: () => void;
}

type TabType = "mine" | "system" | "stats";

export default function UserClassificationPanel({
  show,
  onClose,
}: UserClassificationPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("mine");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  // 我的分类数据
  const [classificationInfo, setClassificationInfo] =
    useState<ClassificationInfo | null>(null);
  // 分类配置
  const [categoryConfig, setCategoryConfig] =
    useState<Record<string, CategoryConfig> | null>(null);
  // 分类统计
  const [stats, setStats] = useState<ClassificationStats | null>(null);
  // 是否拥有查看统计的权限（管理员 token）
  const [hasStatsPermission, setHasStatsPermission] = useState<boolean>(true);

  // 显示提示
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }, []);

  // 锁定 body 滚动
  useEffect(() => {
    document.body.style.overflow = show ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [show]);

  // 加载我的分类与分类配置
  const loadData = useCallback(async () => {
    setLoading(true);
    const [info, config] = await Promise.all([
      getUserClassification(),
      getCategoryConfig(),
    ]);
    setClassificationInfo(info);
    setCategoryConfig(config);
    setLoading(false);
  }, []);

  // 显示时首次加载数据
  useEffect(() => {
    if (show && !classificationInfo) {
      loadData();
    }
  }, [show]); // eslint-disable-line react-hooks/exhaustive-deps

  // 加载分类统计（需要管理员 token）
  const loadStats = useCallback(async () => {
    const token = getAdminToken();
    if (!token) {
      setHasStatsPermission(false);
      setStats(null);
      return;
    }
    setHasStatsPermission(true);
    setLoading(true);
    const result = await getClassificationStats(token);
    setStats(result);
    setLoading(false);
    if (result) {
      showToast("已加载分类统计");
    } else {
      showToast("加载统计失败，请稍后重试");
    }
  }, [showToast]);

  // 切换到统计 Tab 时自动加载
  useEffect(() => {
    if (show && activeTab === "stats" && stats === null && hasStatsPermission) {
      loadStats();
    }
  }, [activeTab, show]); // eslint-disable-line react-hooks/exhaustive-deps

  // 当 show 为 false 时不渲染
  if (!show) return null;

  // 分类配置（接口失败时回退到本地常量）
  const config: Record<string, CategoryConfig> = categoryConfig || USER_CATEGORIES;

  // 我的分类：主分类展示
  const primaryCatKey = classificationInfo?.primaryCategory;
  const primaryCat = primaryCatKey ? config[primaryCatKey] : null;

  // 我的分类：统计卡片
  const summaryCards =
    classificationInfo != null
      ? [
          {
            label: "主分类",
            value: primaryCat ? `${primaryCat.icon} ${primaryCat.name}` : "未设置",
            color: primaryCat?.color || BRAND,
            span: 2,
          },
          {
            label: "分类数量",
            value: String(classificationInfo.classifications.length),
            color: BRAND,
            span: 1,
          },
          {
            label: "分配方式",
            value: classificationInfo.manuallySet ? "手动" : "自动",
            color: classificationInfo.manuallySet ? "#e67e22" : "#27ae60",
            span: 1,
          },
          {
            label: "更新时间",
            value: formatTime(classificationInfo.lastUpdated),
            color: "#7f8c8d",
            span: 2,
          },
        ]
      : [];

  // 全部分类列表（5 大主类）
  const allCategories = Object.entries(config);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      {/* 遮罩层 */}
      <div
        onClick={onClose}
        style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.45)" }}
      />

      {/* 主面板 */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "420px",
          maxHeight: "88vh",
          backgroundColor: "#fff",
          borderTopLeftRadius: "16px",
          borderTopRightRadius: "16px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* 头部 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            flexShrink: 0,
            background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_LIGHT} 100%)`,
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#fff" }}>
            🏷️ 用户分类
          </h3>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "none",
              backgroundColor: "rgba(255,255,255,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: 16,
              color: "#fff",
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab 切换 */}
        <div
          style={{
            display: "flex",
            padding: "8px 12px",
            gap: 8,
            flexShrink: 0,
            borderBottom: "1px solid #f0f0f0",
            backgroundColor: BRAND_BG,
          }}
        >
          {(
            [
              { key: "mine", label: "我的分类" },
              { key: "system", label: "分类体系" },
              { key: "stats", label: "分类统计" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                padding: "8px 0",
                border: "none",
                borderRadius: 8,
                backgroundColor: activeTab === tab.key ? BRAND : "#fff",
                color: activeTab === tab.key ? "#fff" : BRAND,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 内容区域 */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px 16px",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {/* 加载状态（首次加载） */}
          {loading && !classificationInfo && activeTab === "mine" && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#999", fontSize: 13 }}>
              加载中...
            </div>
          )}

          {/* ==================== 我的分类 Tab ==================== */}
          {activeTab === "mine" && (
            <>
              {/* 空状态：未登录或无分类数据 */}
              {!loading && !classificationInfo && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "50px 20px",
                    color: "#bbb",
                    fontSize: 13,
                  }}
                >
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🗂️</div>
                  <div style={{ marginBottom: 6, color: "#999", fontSize: 14 }}>
                    暂无分类信息
                  </div>
                  <div style={{ fontSize: 12 }}>
                    登录并使用相关功能后，系统将自动为您分配分类标签
                  </div>
                  <button
                    onClick={loadData}
                    style={{
                      marginTop: 16,
                      padding: "8px 20px",
                      border: `1px solid ${BRAND}`,
                      borderRadius: 8,
                      backgroundColor: "#fff",
                      color: BRAND,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    🔄 重新加载
                  </button>
                </div>
              )}

              {/* 有分类数据 */}
              {classificationInfo && (
                <>
                  {/* 统计概览卡片 */}
                  <div style={{ marginBottom: 16 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#1a1a1a",
                        marginBottom: 10,
                      }}
                    >
                      分类概览
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 8,
                      }}
                    >
                      {summaryCards.map((card, i) => (
                        <div
                          key={i}
                          style={{
                            backgroundColor: BRAND_BG,
                            borderRadius: 10,
                            padding: "12px",
                            gridColumn: card.span === 2 ? "1 / -1" : "auto",
                          }}
                        >
                          <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>
                            {card.label}
                          </div>
                          <div
                            style={{
                              fontSize: card.span === 2 ? 16 : 18,
                              fontWeight: 700,
                              color: card.color,
                            }}
                          >
                            {card.value}
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* 分类说明 */}
                    <div
                      style={{
                        marginTop: 8,
                        padding: "8px 10px",
                        backgroundColor: "#fff8e1",
                        borderRadius: 8,
                        fontSize: 11,
                        color: "#e65100",
                        lineHeight: 1.6,
                      }}
                    >
                      💡 系统会根据您的使用行为自动评估分类，管理员也可手动调整
                    </div>
                  </div>

                  {/* 我的分类标签列表 */}
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 10,
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>
                        我的分类标签
                      </div>
                      <button
                        onClick={loadData}
                        style={{
                          border: "none",
                          backgroundColor: "transparent",
                          color: BRAND,
                          fontSize: 12,
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        🔄 刷新
                      </button>
                    </div>

                    {classificationInfo.classifications.length === 0 ? (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "30px 0",
                          color: "#ccc",
                          fontSize: 13,
                        }}
                      >
                        暂无分类标签
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {classificationInfo.classifications.map((c, idx) => {
                          const display = getCategoryDisplay(
                            c.category,
                            c.subcategory
                          );
                          return (
                            <div
                              key={`${c.category}-${c.subcategory}-${idx}`}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "10px 12px",
                                backgroundColor: "#fafafa",
                                borderRadius: 8,
                                border: "1px solid #f0f0f0",
                              }}
                            >
                              <div
                                style={{
                                  flex: 1,
                                  minWidth: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 10,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: 26,
                                    width: 40,
                                    height: 40,
                                    flexShrink: 0,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    borderRadius: 10,
                                    backgroundColor: `${display.color}15`,
                                  }}
                                >
                                  {display.categoryIcon}
                                </span>
                                <div style={{ minWidth: 0 }}>
                                  <div
                                    style={{
                                      fontSize: 14,
                                      fontWeight: 600,
                                      color: "#1a1a1a",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 6,
                                    }}
                                  >
                                    {display.categoryName}
                                    {primaryCatKey === c.category && (
                                      <span
                                        style={{
                                          fontSize: 10,
                                          padding: "1px 6px",
                                          borderRadius: 4,
                                          color: "#fff",
                                          backgroundColor: display.color,
                                        }}
                                      >
                                        主
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                                    {display.subcategoryIcon} {display.subcategoryName}
                                  </div>
                                </div>
                              </div>
                              <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 8 }}>
                                <span
                                  style={{
                                    display: "inline-block",
                                    padding: "2px 8px",
                                    borderRadius: 4,
                                    fontSize: 10,
                                    fontWeight: 600,
                                    color: "#fff",
                                    backgroundColor: c.autoAssigned ? "#27ae60" : "#e67e22",
                                  }}
                                >
                                  {c.autoAssigned ? "自动" : "手动"}
                                </span>
                                <div style={{ fontSize: 11, color: "#bbb", marginTop: 4 }}>
                                  {formatTime(c.assignedAt)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {/* ==================== 分类体系 Tab ==================== */}
          {activeTab === "system" && (
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#1a1a1a",
                  marginBottom: 12,
                }}
              >
                五大主分类体系
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {allCategories.map(([catKey, cat]) => (
                  <div
                    key={catKey}
                    style={{
                      borderRadius: 12,
                      overflow: "hidden",
                      border: `1px solid ${cat.color}33`,
                    }}
                  >
                    {/* 分类头部 */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "12px",
                        backgroundColor: `${cat.color}10`,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 24,
                          width: 44,
                          height: 44,
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 12,
                          backgroundColor: "#fff",
                        }}
                      >
                        {cat.icon}
                      </span>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>
                          {cat.name}
                        </div>
                        <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>
                          {Object.keys(cat.subcategories).length} 个子分类
                        </div>
                      </div>
                      <span
                        style={{
                          marginLeft: "auto",
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          backgroundColor: cat.color,
                          flexShrink: 0,
                        }}
                      />
                    </div>
                    {/* 子分类列表 */}
                    <div
                      style={{
                        padding: "8px 12px 12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        backgroundColor: "#fff",
                      }}
                    >
                      {Object.entries(cat.subcategories).map(([subKey, sub]) => (
                        <div
                          key={subKey}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "8px 10px",
                            backgroundColor: "#fafafa",
                            borderRadius: 8,
                          }}
                        >
                          <span style={{ fontSize: 16 }}>{sub.icon}</span>
                          <span style={{ fontSize: 13, color: "#333" }}>{sub.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================== 分类统计 Tab ==================== */}
          {activeTab === "stats" && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>
                  分类统计信息
                </div>
                {hasStatsPermission && (
                  <button
                    onClick={loadStats}
                    style={{
                      border: "none",
                      backgroundColor: "transparent",
                      color: BRAND,
                      fontSize: 12,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    🔄 刷新
                  </button>
                )}
              </div>

              {/* 加载中 */}
              {loading && !stats && hasStatsPermission && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 0",
                    color: "#999",
                    fontSize: 13,
                  }}
                >
                  加载中...
                </div>
              )}

              {/* 无权限提示 */}
              {!hasStatsPermission && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "50px 20px",
                    color: "#bbb",
                    fontSize: 13,
                  }}
                >
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
                  <div style={{ marginBottom: 6, color: "#999", fontSize: 14 }}>
                    暂无查看权限
                  </div>
                  <div style={{ fontSize: 12 }}>
                    全局分类统计仅对管理员开放，请先登录管理员账号
                  </div>
                </div>
              )}

              {/* 空状态：有权限但无数据 */}
              {hasStatsPermission && !loading && !stats && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 0",
                    color: "#ccc",
                    fontSize: 13,
                  }}
                >
                  暂无统计数据
                </div>
              )}

              {/* 统计数据展示 */}
              {stats && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {Object.entries(stats).map(([catKey, catStat]) => {
                    const catCfg = config[catKey];
                    return (
                      <div
                        key={catKey}
                        style={{
                          borderRadius: 12,
                          padding: "12px",
                          backgroundColor: BRAND_BG,
                          border: `1px solid ${(catCfg?.color || BRAND)}22`,
                        }}
                      >
                        {/* 分类汇总 */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: 10,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <span style={{ fontSize: 22 }}>{catStat.icon || catCfg?.icon}</span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>
                              {catStat.name || catCfg?.name}
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: 18,
                              fontWeight: 700,
                              color: catCfg?.color || BRAND,
                            }}
                          >
                            {catStat.total}
                          </span>
                        </div>
                        {/* 子分类统计 */}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr 1fr",
                            gap: 6,
                          }}
                        >
                          {Object.entries(catStat.subcategories).map(([subKey, subStat]) => (
                            <div
                              key={subKey}
                              style={{
                                textAlign: "center",
                                padding: "8px 4px",
                                backgroundColor: "#fff",
                                borderRadius: 8,
                              }}
                            >
                              <div style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>
                                {subStat.name}
                              </div>
                              <div
                                style={{
                                  fontSize: 16,
                                  fontWeight: 700,
                                  color: "#1a1a1a",
                                }}
                              >
                                {subStat.count}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部合规免责声明 */}
        <div
          style={{
            padding: "10px 16px",
            backgroundColor: "#fff8e1",
            fontSize: 11,
            color: "#e65100",
            textAlign: "center",
            flexShrink: 0,
            borderTop: "1px solid #ffe0b2",
            lineHeight: 1.5,
          }}
        >
          ⚠️ 用户分类仅用于提供更精准的服务体验，不涉及敏感个人信息；分类结果由系统自动评估，管理员可手动调整
        </div>

        {/* Toast 提示 */}
        {toast && (
          <div
            style={{
              position: "absolute",
              bottom: 50,
              left: "50%",
              transform: "translateX(-50%)",
              padding: "8px 16px",
              backgroundColor: "rgba(0,0,0,0.8)",
              color: "#fff",
              borderRadius: 8,
              fontSize: 13,
              whiteSpace: "nowrap",
              zIndex: 10000,
            }}
          >
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
