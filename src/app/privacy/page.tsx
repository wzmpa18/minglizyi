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

export default function PrivacyPage() {
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
      <BrandHeader title="隐私政策" showBack />

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
            言道国学（以下简称&ldquo;本平台&rdquo;）非常重视用户隐私保护。本《隐私政策》旨在向您说明本平台如何收集、使用、存储和保护您的个人信息。请您在使用本平台服务之前，仔细阅读并充分理解本政策的全部内容。当您注册、登录或以任何方式使用本平台服务时，即视为您已同意本政策所述的信息处理方式。
          </p>
        </div>

        {/* 1. 信息收集范围 */}
        <Section index={1} title="信息收集范围">
          <P>
            本平台仅收集为提供服务所必需的最少量个人信息，具体包括：
          </P>
          <ul style={{ margin: "0 0 10px", padding: 0 }}>
            <Li>
              <strong>手机号码：</strong>用于账号注册、登录验证和安全保护。本平台通过发送短信验证码的方式验证手机号的真实性，不收集与账号功能无关的通讯录信息。
            </Li>
            <Li>
              <strong>电子邮箱：</strong>用于账号绑定、密码找回和重要通知。本平台通过发送邮件验证码的方式验证邮箱的真实性。
            </Li>
            <Li>
              <strong>昵称与头像：</strong>用于用户在平台内的个人资料展示，可由用户自行设置和修改。
            </Li>
            <Li>
              <strong>设备信息：</strong>包括设备型号、操作系统版本、浏览器类型等，用于服务兼容性适配和安全风控。
            </Li>
            <Li>
              <strong>日志信息：</strong>包括访问时间、访问页面、操作记录等，用于服务优化和安全审计。
            </Li>
          </ul>
          <P>
            <strong>特别说明：</strong>本平台<strong>不收集</strong>用户的身份证号、银行卡号、生物识别信息（如指纹、面部特征）等敏感个人信息，除非法律法规另有要求。
          </P>
        </Section>

        {/* 2. 信息使用方式 */}
        <Section index={2} title="信息使用方式">
          <P>本平台收集的个人信息将仅用于以下目的：</P>
          <ul style={{ margin: "0 0 10px", padding: 0 }}>
            <Li>提供账号注册、登录、密码找回等身份验证服务；</Li>
            <Li>提供个性化的学习体验，包括排盘记录保存、收藏管理、学习进度跟踪等；</Li>
            <Li>向用户发送服务通知、系统公告、安全提醒等重要信息；</Li>
            <Li>进行服务运营数据分析，持续优化产品功能和服务质量；</Li>
            <Li>进行安全风控，识别和防范恶意注册、刷量、欺诈等异常行为；</Li>
            <Li>处理用户反馈和客服请求，解决用户遇到的问题；</Li>
            <Li>遵守法律法规的要求，配合监管部门的合法调查。</Li>
          </ul>
          <P>
            本平台承诺，不会将您的个人信息用于本政策未载明的其他用途。如需变更使用目的，将再次征求您的同意。
          </P>
        </Section>

        {/* 3. 信息存储与保护 */}
        <Section index={3} title="信息存储与保护">
          <P>
            3.1 <strong>存储地点：</strong>您的个人信息存储在中华人民共和国境内的服务器上，不会跨境传输。
          </P>
          <P>
            3.2 <strong>存储期限：</strong>您的个人信息将在您使用本平台服务期间持续保存。在您通过应用内自助流程注销账号后，本平台将即时删除或匿名化处理您的个人信息，法律法规另有规定的除外。
          </P>
          <P>
            3.3 <strong>安全措施：</strong>本平台采取以下技术和措施保护您的信息安全：
          </P>
          <ul style={{ margin: "0 0 10px", padding: 0 }}>
            <Li>使用HTTPS加密传输协议，确保数据传输过程中的安全；</Li>
            <Li>对敏感信息（如手机号、密码）进行加密存储，不以明文形式保存；</Li>
            <Li>实施访问权限控制，仅授权人员可在必要范围内访问用户信息；</Li>
            <Li>建立安全审计机制，定期检查和评估信息安全状况；</Li>
            <Li>制定数据安全应急预案，在发生安全事件时及时采取补救措施。</Li>
          </ul>
          <P>
            3.4 <strong>安全事件响应：</strong>如发生个人信息泄露等安全事件，本平台将在72小时内启动应急预案，采取补救措施，并通过系统通知、站内信等方式及时告知受影响的用户。
          </P>
          <P>
            3.5 请注意，尽管本平台采取了合理的安全措施，但在互联网环境中不存在绝对的安全。用户也应注意保护自身账号安全，不在公共设备上保存登录状态，不向他人透露账号密码。
          </P>
        </Section>

        {/* 4. 第三方共享说明 */}
        <Section index={4} title="第三方共享说明">
          <P>
            4.1 <strong>不向第三方共享：</strong>本平台郑重承诺，<strong>未经您单独同意，不会将您的个人信息（包括手机号、邮箱等）泄露、出售或共享给任何第三方。</strong>
          </P>
          <P>
            4.2 <strong>受委托处理：</strong>为提供服务所必需，本平台可能委托第三方服务提供商处理部分业务，例如：
          </P>
          <ul style={{ margin: "0 0 10px", padding: 0 }}>
            <Li>短信验证码服务提供商（仅用于发送验证码，不存储手机号）；</Li>
            <Li>邮件服务提供商（仅用于发送邮件，不存储邮箱地址）；</Li>
            <Li>云服务器提供商（提供数据存储和计算服务，受保密协议约束）。</Li>
          </ul>
          <P>
            上述第三方服务提供商均签署了严格的保密协议，仅能在为本平台提供服务的范围内使用相关信息，且不得用于其他目的。
          </P>
          <P>
            4.3 <strong>法定披露：</strong>在以下情形下，本平台可能依法向有关机关披露个人信息，无需事先征得您的同意：
          </P>
          <ul style={{ margin: "0 0 10px", padding: 0 }}>
            <Li>与国家安全、国防安全相关的；</Li>
            <Li>与公共安全、公共卫生、重大公共利益相关的；</Li>
            <Li>与刑事侦查、起诉、审判和判决执行等相关的；</Li>
            <Li>法律法规规定的其他情形。</Li>
          </ul>
        </Section>

        {/* 5. 用户信息管理权 */}
        <Section index={5} title="用户信息管理权">
          <P>您对您的个人信息享有以下权利：</P>
          <ul style={{ margin: "0 0 10px", padding: 0 }}>
            <Li>
              <strong>查询与访问：</strong>您可在&ldquo;个人中心&rdquo;页面查看您的账号信息、昵称、头像等个人资料。
            </Li>
            <Li>
              <strong>更正与修改：</strong>您可随时修改您的昵称、头像等个人资料信息。如发现信息有误，可联系客服协助更正。
            </Li>
            <Li>
              <strong>删除：</strong>您可删除您在平台内产生的排盘记录、收藏内容等数据。您也可通过应用内自助注销功能删除您的账号及个人信息（见下方&ldquo;账号注销&rdquo;）。
            </Li>
            <Li>
              <strong>撤回同意：</strong>您可随时通过关闭相关功能或退出登录的方式撤回对本平台处理个人信息的授权。撤回同意后，本平台将停止相应的信息处理活动，但不影响撤回前已进行的处理。
            </Li>
            <Li>
              <strong>账号注销：</strong>您有权随时注销您的账号。您可通过 <strong>&ldquo;我的&rdquo;→&ldquo;设置&rdquo;→&ldquo;账号与安全&rdquo;→&ldquo;注销账号&rdquo;</strong> 在应用内自助完成注销，无需联系客服。注销确认后即时生效：您的手机号、邮箱等个人身份信息将被删除或匿名化，账号将无法再登录，您的排盘记录、评分等关联数据将被删除。注销操作不可恢复，请在注销前自行备份需要保留的数据。
            </Li>
            <Li>
              <strong>数据导出：</strong>您有权获取您的个人信息副本。如需导出个人数据，请联系本平台客服。
            </Li>
          </ul>
          <P>
            为保障安全，在您行使上述权利时，本平台可能需要验证您的身份。本平台将在收到您的请求后15个工作日内予以回复。
          </P>
        </Section>

        {/* 6. 本地存储数据说明 */}
        <Section index={6} title="本地存储数据说明">
          <P>
            为提供更流畅的用户体验，本平台会在您的设备本地（浏览器 localStorage）中存储部分数据，具体包括：
          </P>
          <ul style={{ margin: "0 0 10px", padding: 0 }}>
            <Li>
              <strong>登录状态信息：</strong>包括登录令牌（Token）、用户ID、用户昵称等，用于保持登录状态和快速识别用户身份。您可通过&ldquo;退出登录&rdquo;功能清除该信息。
            </Li>
            <Li>
              <strong>功能缓存数据：</strong>包括排盘结果缓存、页面缓存等，用于提升页面加载速度和离线使用体验。
            </Li>
            <Li>
              <strong>用户偏好设置：</strong>包括主题配色、隐私开关（是否允许被搜索、是否允许附近展示）、通知开关等个性化设置。
            </Li>
            <Li>
              <strong>学习进度数据：</strong>包括收藏的典籍、答题记录、错题本等，用于学习进度的本地保存和同步。
            </Li>
          </ul>
          <P>
            <strong>数据清除方式：</strong>
          </P>
          <ul style={{ margin: "0 0 10px", padding: 0 }}>
            <Li>您可通过&ldquo;退出登录&rdquo;功能清除登录状态信息；</Li>
            <Li>您可通过浏览器设置清除站点数据，这将清除本平台存储的所有本地数据；</Li>
            <Li>卸载应用或清除浏览器缓存将同时清除本地存储的数据。</Li>
          </ul>
          <P>
            本地存储的数据不会自动上传至服务器，除非您主动进行云同步操作。您可随时清除本地数据，不影响您的账号安全。
          </P>
        </Section>

        {/* 未成年人保护 */}
        <Section index={7} title="未成年人保护">
          <P>
            7.1 本平台主要面向成年人提供传统文化学习服务。如您是未满18周岁的未成年人，请在监护人的陪同下阅读本政策，并在取得监护人同意后使用本平台服务。
          </P>
          <P>
            7.2 本平台不会主动收集未成年人的个人信息。如发现在未取得监护人同意的情况下收集了未成年人的个人信息，本平台将尽快删除相关信息。
          </P>
          <P>
            7.3 监护人有权拒绝本平台对其被监护人个人信息的处理，有权要求更正或删除相关信息。
          </P>
        </Section>

        {/* 政策更新 */}
        <Section index={8} title="隐私政策更新">
          <P>
            8.1 本平台可能不时更新本《隐私政策》。更新后的政策将在本平台页面上发布，并通过系统通知等方式告知用户。
          </P>
          <P>
            8.2 对于重大变更（如信息收集范围扩大、使用目的变更等），本平台将在政策生效前30天通过显著方式告知用户，并在用户再次登录时要求确认同意。
          </P>
          <P>
            8.3 如您不同意更新后的隐私政策，您有权停止使用本平台服务。如您在政策更新后继续使用本平台服务，即视为您同意更新后的政策。
          </P>
        </Section>

        {/* 知识产权声明 */}
        <Section index={9} title="知识产权声明">
          <P>
            9.1 本平台业务代码、页面交互与解读文案均为独立完成，传统典籍内容整理自公共领域资料。
          </P>
          <P>
            9.2 平台内工具与解读内容仅供文化娱乐参考，不构成任何专业建议。
          </P>
          <P>
            9.3 如对内容来源有异议，可通过客服邮箱联系我们，平台将及时核查并第一时间处理。
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
            如您对本隐私政策有任何疑问、意见或建议，或需行使您的个人信息管理权，可通过以下方式联系我们：
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
