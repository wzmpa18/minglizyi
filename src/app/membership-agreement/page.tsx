"use client";

import React from "react";
import { BrandHeader } from "@/components/shared";

const BRAND = "#7B2FBE";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 22 }}>
      <h2 style={{ margin: "0 0 8px", fontSize: 17, color: "#2D1A3E" }}>{title}</h2>
      <div style={{ fontSize: 14, lineHeight: 1.85, color: "#555" }}>{children}</div>
    </section>
  );
}

export default function MembershipAgreementPage() {
  return (
    <div style={{ maxWidth: 420, margin: "0 auto", minHeight: "100vh", background: "#fff" }}>
      <BrandHeader title="会员服务协议" showBack />
      <main style={{ padding: "22px 20px 36px" }}>
        <h1 style={{ margin: "0 0 8px", fontSize: 22, color: "#2D1A3E" }}>言道国学会员服务协议</h1>
        <p style={{ margin: "0 0 24px", fontSize: 13, color: "#777" }}>更新及生效日期：2026年10月12日</p>

        <Section title="一、协议主体与适用范围">
          <p>本协议由您与东莞言道科技有限公司共同订立，适用于言道国学会员服务。请在购买前阅读并确认同意本协议；未成年人应在监护人指导下使用和购买。</p>
        </Section>
        <Section title="二、会员套餐与权益">
          <p>会员套餐、价格、有效期和具体权益以购买页面实时展示为准。不同套餐可能包含学习内容、离线资料、排盘辅助和一定数量的 AI 解读权益。权益仅限购买账号本人使用，不得转让、出租或用于违法用途。</p>
        </Section>
        <Section title="三、购买、支付与生效">
          <p>本应用会员均为用户主动发起的单次购买，不设置自动续费。您确认套餐和金额后，通过页面所示支付渠道付款。支付成功并收到支付平台回调后，系统自动发放权益；到账可能存在短暂延迟，请勿重复付款。</p>
          <p>如已付款但权益未到账，请在“我的－帮助与反馈”提交订单号，平台将核对支付记录并补发对应权益。</p>
        </Section>
        <Section title="四、退款与订单处理">
          <p>退款按法律法规、支付平台规则以及数字内容实际使用情况处理。订单异常、重复扣款或其他符合退款条件的情形，可通过应用内帮助与反馈申请核查。退款完成后，相应会员权益将被收回。</p>
        </Section>
        <Section title="五、内容与 AI 服务说明">
          <p>传统文化、易学及健康学习内容仅供学习研究和文化交流，不构成医疗诊断、投资或其他专业决策建议。AI 内容由模型生成，可能存在局限，请结合经典原文和实际情况审慎参考。平台可因安全、合规、网络或上游服务原因维护相关功能。</p>
        </Section>
        <Section title="六、账号与使用规则">
          <p>请妥善保管账号和验证信息。不得利用会员服务实施违法活动、批量抓取、破解、转售权益或干扰平台运行。发现异常使用时，平台可采取风险验证、暂停相关功能等必要措施，并依法保存处理记录。</p>
        </Section>
        <Section title="七、协议更新与联系方式">
          <p>因法律政策或服务调整需要更新协议时，平台会通过应用内公告或页面提示重要变化。您可在购买前再次查看最新协议。</p>
          <p>运营主体：东莞言道科技有限公司<br />客服邮箱：support@yandao.vip</p>
        </Section>

        <button
          onClick={() => history.back()}
          style={{ width: "100%", height: 44, border: 0, borderRadius: 12, background: BRAND, color: "#fff", fontSize: 16, fontWeight: 700 }}
        >
          已阅读，返回会员中心
        </button>
      </main>
    </div>
  );
}
