/**
 * P7-弹窗统一-01：全站统一弹窗组件库
 * 页面禁止自行编写弹窗，一律从本库引用：
 * - ConfirmDialog：删除、退出、放弃编辑、结束考试（居中确认）
 * - SelectorDialog：考试类型、日期、筛选等选择（居中，禁止贴底部）
 * - PaymentDialog：付费和权益确认（底部面板，支付中防误关）
 * - BottomSheet：用户主动点击的轻量菜单（底部）
 * - Toast / showToast：成功、失败、轻提示（全局轻提示，不阻断）
 */
export { ConfirmDialog } from "./ConfirmDialog";
export { SelectorDialog } from "./SelectorDialog";
export type { SelectorOption } from "./SelectorDialog";
export { PaymentDialog } from "./PaymentDialog";
export { BottomSheet } from "./BottomSheet";
export { ToastHost, showToast } from "./Toast";
export type { ToastType } from "./Toast";
