"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { BrandHeader } from "@/components/shared";

const BRAND = "#7B2FBE";

/** 协议条款区块 */
function Section({ index, title, children }: { index: number; title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: "#333",
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 24,
            height: 24,
            borderRadius: "50%",
            backgroundColor: BRAND,
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            marginRight: 8,
            flexShrink: 0,
          }}
        >
          {index}
        </span>
        {title}
      </h2>
      <div style={{ fontSize: 14, color: "#555", lineHeight: 1.8, paddingLeft: 32 }}>
        {children}
      </div>
    </section>
  );
}

/** 段落 */
function P({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: "0 0 10px" }}>{children}</p>;
}

/** 列表项 */
function Li({ children }: { children: React.ReactNode }) {
  return (
    <li style={{ marginBottom: 6, listStyleType: "disc", marginLeft: 20 }}>
      {children}
    </li>
  );
}

export default function AgreementPage() {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  return (
    <div
      style={{
        maxWidth: "420px",
        margin: "0 auto",
        minHeight: "100vh",
        backgroundColor: "#fff",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* 紫色头部 */}
      <BrandHeader title="用户协议" showBack />

      {/* 可滚动内容区 */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px 20px 16px",
          backgroundColor: "#fff",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* 更新日期 */}
        <div
          style={{
            fontSize: 12,
            color: "#999",
            textAlign: "right",
            marginBottom: 16,
          }}
        >
          最近更新日期：2025年1月1日
        </div>

        {/* 引言 */}
        <div
          style={{
            backgroundColor: "#f9f5fd",
            borderRadius: 12,
            padding: "16px",
            marginBottom: 24,
            border: `1px solid ${BRAND}22`,
          }}
        >
          <p
            style={{
              fontSize: 14,
              color: "#555",
              lineHeight: 1.8,
              margin: 0,
            }}
          >
            欢迎您使用言道国学（以下简称&ldquo;本平台&rdquo;）。请您在使用本平台服务之前，仔细阅读并充分理解本《用户协议》（以下简称&ldquo;本协议&rdquo;）的全部内容。当您注册、登录或以任何方式使用本平台服务时，即视为您已阅读并同意接受本协议的全部条款。如您不同意本协议的任何内容，请停止使用本平台服务。
          </p>
        </div>

        {/* 1. 服务条款 */}
        <Section index={1} title="服务条款">
          <P>
            1.1 本平台是一款以中华传统文化（包括但不限于中医、八字、紫微斗数、奇门遁甲、六爻、风水等）为核心内容的学习参考工具，旨在为用户提供传统文化知识的展示、学习与交流服务。
          </P>
          <P>
            1.2 <strong>重要提示：</strong>本平台提供的所有内容（包括但不限于排盘结果、解读分析、知识文章、AI对话等）均基于传统文化典籍和算法模型自动生成，<strong>仅供文化学习与学术研究参考，不构成任何医疗诊断、命理预测、投资理财、婚恋决策或其他重大生活决策的建议或依据。</strong>
          </P>
          <P>
            1.3 本平台不提供医疗诊断服务。涉及中医相关的内容仅为传统医学知识的学习与展示，不替代专业医师的诊断与治疗。如您有健康问题，请及时咨询持有合法执业资格的医疗机构和专业医师。
          </P>
          <P>
            1.4 本平台不提供命理预测或占卜服务。所有命理相关内容均为传统文化形式的学术展示，不应作为人生决策的依据。用户应对自身行为和决策承担完全责任。
          </P>
          <P>
            1.5 本平台保留在法律法规允许的范围内随时变更、中断或终止部分或全部服务的权利，届时将以页面公告、系统通知等方式告知用户。
          </P>
        </Section>

        {/* 2. 用户行为规范 */}
        <Section index={2} title="用户行为规范">
          <P>用户在使用本平台服务时，应遵守以下行为规范：</P>
          <ul style={{ margin: "0 0 10px", padding: 0 }}>
            <Li>遵守中华人民共和国相关法律法规，包括但不限于《网络安全法》《个人信息保护法》《数据安全法》等；</Li>
            <Li>不得利用本平台从事任何违法违规活动，包括但不限于传播淫秽色情、暴力恐怖、封建迷信等不良信息；</Li>
            <Li>不得发布、传输侵害他人合法权益的内容，包括侵犯他人知识产权、隐私权、名誉权等；</Li>
            <Li>不得对本平台进行恶意攻击、侵入、干扰，包括但不限于尝试破解系统安全措施、使用自动化脚本批量获取数据等；</Li>
            <Li>不得冒用他人身份注册账号，不得将账号转让、出借或出售给第三方使用；</Li>
            <Li>不得利用本平台提供的AI功能生成虚假信息、误导性内容或用于诈骗等非法目的；</Li>
            <Li>不得以任何方式干扰本平台正常运营，包括但不限于刷量、恶意评价、骚扰其他用户等；</Li>
            <Li>不得将本平台内容用于商业用途（个人学习除外），如需商业使用需事先取得书面授权。</Li>
          </ul>
          <P>
            如用户违反上述行为规范，本平台有权视情节轻重采取警告、限制功能、封禁账号等措施，并保留追究法律责任的权利。
          </P>
        </Section>

        {/* 3. 知识产权声明 */}
        <Section index={3} title="知识产权声明">
          <P>
            3.1 本平台的软件代码、界面设计、图标、文字内容、数据库结构、算法模型等知识产权均归本平台运营方所有，受中华人民共和国著作权法及相关知识产权法律法规保护。
          </P>
          <P>
            3.2 本平台引用的传统文化典籍内容（如《黄帝内经》《易经》《滴天髓》等）属于公共领域作品，但本平台对这些内容的整理、编排、注释、翻译等独创性表达享有著作权。
          </P>
          <P>
            3.3 用户在本平台发布的内容（包括但不限于评论、笔记、分享等），用户享有著作权，但用户在发布时即授予本平台在全球范围内免费的、非独占的、可转授权的使用许可，包括复制、展示、传播、改编等权利，用于本平台服务的提供与改进。
          </P>
          <P>
            3.4 未经本平台书面许可，任何单位和个人不得以任何方式复制、转载、摘编、传播、展示本平台享有知识产权的内容，不得对本平台进行反向工程、反编译或以其他方式尝试获取源代码。
          </P>
          <P>
            3.5 本平台使用的第三方开源组件、库文件等，其知识产权归各自所有者所有，并遵循相应的开源许可协议。
          </P>
        </Section>

        {/* 4. 免责条款 */}
        <Section index={4} title="免责条款">
          <P>
            4.1 <strong>内容免责：</strong>本平台所有内容均基于传统文化典籍和算法模型自动生成或由用户贡献，本平台不对内容的准确性、完整性、可靠性、时效性作出任何明示或暗示的保证。用户应自行判断内容的可靠性，并承担使用内容的风险。
          </P>
          <P>
            4.2 <strong>决策免责：</strong>用户基于本平台内容作出的任何决策（包括但不限于医疗、婚恋、投资、择日等）及其产生的后果，均由用户自行承担，本平台不承担任何责任。
          </P>
          <P>
            4.3 <strong>服务中断免责：</strong>因系统维护、升级、网络故障、不可抗力（包括但不限于自然灾害、政策变化、法律法规变更等）导致的服务中断或数据丢失，本平台不承担责任，但会尽快恢复服务。
          </P>
          <P>
            4.4 <strong>第三方链接免责：</strong>本平台可能包含指向第三方网站或服务的链接，本平台不对第三方内容的安全性和可靠性负责。用户访问第三方链接所造成的任何损失，由用户自行承担。
          </P>
          <P>
            4.5 <strong>用户内容免责：</strong>对于用户在本平台发布的内容，本平台不负有事先审查的义务。但如发现违规内容，本平台有权在接到投诉或自行发现后予以删除或屏蔽。
          </P>
          <P>
            4.6 <strong>非医疗建议特别声明：</strong>本平台提供的中医相关内容仅为传统医学文化知识的学术展示，绝非医疗诊断或治疗建议。任何关于疾病诊断、治疗、用药的问题，请务必咨询专业医师。
          </P>
        </Section>

        {/* 5. 账号规则 */}
        <Section index={5} title="账号规则">
          <P>
            5.1 用户可通过手机号验证码注册本平台账号。注册时请提供真实、准确、完整的信息，如信息发生变化请及时更新。
          </P>
          <P>
            5.2 用户应妥善保管账号及密码，因账号密码泄露导致的损失由用户自行承担。如发现账号被盗或存在安全风险，请立即联系本平台客服。
          </P>
          <P>
            5.3 每个手机号仅可注册一个账号。账号仅限本人使用，不得转让、出借或出售。
          </P>
          <P>
            5.4 用户账号长期未登录（超过12个月）的，本平台有权回收该账号及相关数据。
          </P>
          <P>
            5.5 如用户违反本协议或相关法律法规，本平台有权限制、冻结或注销用户账号，并有权删除相关数据。
          </P>
          <P>
            5.6 用户可随时通过&ldquo;退出登录&rdquo;功能清除当前设备的登录状态。如需注销账号，请联系本平台客服处理。
          </P>
        </Section>

        {/* 6. 服务变更与终止 */}
        <Section index={6} title="服务变更与终止">
          <P>
            6.1 本平台有权根据业务发展需要，随时变更、增加或减少服务内容、功能模块，届时将通过页面公告、系统通知等方式告知用户。
          </P>
          <P>
            6.2 本平台有权对服务进行升级、维护，届时可能导致服务暂时中断，本平台将尽量提前通知用户并缩短中断时间。
          </P>
          <P>
            6.3 出现以下情形之一时，本平台有权随时终止向用户提供服务：
          </P>
          <ul style={{ margin: "0 0 10px", padding: 0 }}>
            <Li>用户违反本协议约定或相关法律法规；</Li>
            <Li>用户账号存在安全风险或被用于非法用途；</Li>
            <Li>用户长期未使用本平台服务；</Li>
            <Li>因法律法规变更或政策要求，本平台无法继续提供服务；</Li>
            <Li>本平台决定停止运营。</Li>
          </ul>
          <P>
            6.4 服务终止后，本平台将在合理期限内为用户保留必要的数据备份，但不对数据丢失承担责任。用户应在收到终止通知后及时导出个人数据。
          </P>
          <P>
            6.5 本协议的终止不影响用户在终止前应承担的义务和责任。
          </P>
        </Section>

        {/* 法律适用与争议解决 */}
        <Section index={7} title="法律适用与争议解决">
          <P>
            7.1 本协议的订立、执行和解释均适用中华人民共和国法律。
          </P>
          <P>
            7.2 因本协议或使用本平台服务产生的争议，双方应首先协商解决；协商不成的，任何一方均可向本平台运营方所在地有管辖权的人民法院提起诉讼。
          </P>
        </Section>

        {/* 联系方式 */}
        <div
          style={{
            marginTop: 12,
            padding: "16px",
            backgroundColor: "#f9f5fd",
            borderRadius: 12,
            border: `1px solid ${BRAND}22`,
          }}
        >
          <p style={{ fontSize: 14, color: "#555", lineHeight: 1.8, margin: 0 }}>
            如您对本协议有任何疑问，可通过以下方式联系我们：
          </p>
          <p style={{ fontSize: 14, color: BRAND, marginTop: 8, marginBottom: 0, fontWeight: 600 }}>
            客服邮箱：support@yandao.vip
          </p>
        </div>

        {/* 版权声明 */}
        <div
          style={{
            marginTop: 24,
            textAlign: "center",
            fontSize: 12,
            color: "#bbb",
            lineHeight: 1.6,
          }}
        >
          <p style={{ margin: 0 }}>&copy; 2025 言道国学 版权所有</p>
        </div>
      </div>

      {/* 底部导航返回按钮 */}
      <div
        style={{
          padding: "12px 20px",
          backgroundColor: "#fff",
          borderTop: "1px solid #f0f0f0",
          flexShrink: 0,
        }}
      >
        <button
          onClick={handleBack}
          style={{
            width: "100%",
            height: 44,
            backgroundColor: BRAND,
            color: "#fff",
            border: "none",
            borderRadius: 10,
            fontSize: 16,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          返回
        </button>
      </div>

      <div className="page-bottom-nav-safe" aria-hidden="true" />
    </div>
  );
}
