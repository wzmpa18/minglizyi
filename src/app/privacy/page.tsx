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

export function PrivacyPolicyDocument({ onBack }: { onBack?: () => void } = {}) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) onBack();
    else router.back();
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
      <BrandHeader title="隐私政策" showBack onBack={onBack} />

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
          最近更新日期：2026年10月19日
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
            言道国学由东莞言道科技有限公司开发并运营（以下简称&ldquo;本平台&rdquo;）。本平台非常重视用户隐私保护。本《隐私政策》旨在向您说明本平台如何收集、使用、存储和保护您的个人信息。请您在使用本平台服务之前，仔细阅读并充分理解本政策的全部内容。我们按您主动选择的功能和授权范围处理必要信息，不将单纯浏览、注册或使用其他功能视为同意处理全部个人信息。涉及敏感信息、公开匹配、指定分享或第三方AI外发时，另行明确告知和取得相应授权；本机人生记录无需注册或购买会员。
          </p>
        </div>

        {/* 1. 信息收集范围 */}
        <Section index={11} title="学习交流、同辰雅集与私人日历（2026年10月新增）">
          <P>工具与穴位学习交流只接收您主动提交的文字，每条最多500个用户可见字符，不自动附带私人命盘、出生资料、定位或AI报告。公开留言先审核后展示，支持本人删除、举报、屏蔽及申诉。文字交流可能使用既有内容安全服务自动审核，异常、不确定、规则冲突或收到举报时先隔离，不自动放行；可通过用户反馈申请复核。</P>
          <P>同辰雅集仅向18岁以上成年人提供。默认不参加搜索；只有本人主动填写并分别同意匹配精度后，才处理生日、时辰或四柱条件。系统不会导入客户档案、亲友生日或历史排盘。选择同年同月同日、同时辰等精确条件，其他匹配者仍可能推知相关信息，不能保证匿名。</P>
          <P>同辰计算后不留存原始出生日期、钟点与时区，仅保存受服务端密钥保护的匹配索引、所选精度、昵称关联、兴趣、同意版本与时间。索引仍作为个人信息保护，不将其当成可靠匿名化。搜索仅供登录用户有限查询，不公开生日索引、不批量导出；公开卡片不返回完整出生资料、真实姓名、手机号或地点。</P>
          <P>交流须先发送请求并由对方明确同意。可拒绝、解除、举报或屏蔽。退出后立即移除搜索资料并撤回未决请求；已有好友可单独解除。封禁或注销账号不再出现在结果中。处理举报所必需的记录按既有安全治理期限保留，不用于营销或诊疗。</P>
          <P>日历生日与日程默认保存在您的本机账号空间，与同辰资料库独立；不默认读取通讯录或系统全部日历。您可修改、删除或导出本人记事。农历闰月、缺日与2月29日按您保存的选项处理，修改或删除时取消旧的本地系统提醒。云同步沿用既有独立授权和权益。</P>
          <P>桌面组件使用同源历法快照，不含出生八字和私人记事详情。锁屏通知默认只显示“有一项安排”。系统通知、精确闹钟以及充电屏保均由您主动设置；拒绝不影响普通日历。系统权限、关机、强行停止和省电策略会影响送达。前台时钟保持亮屏须主动开启，离开即释放，不替换系统安全锁屏。</P>
          <P>界面语言和主题偏好存于本机，不改变排算规则。文化学习内容与私人日程分开，不根据出生资料自动诊断、开药或发送灾祸提醒。您可在发现→同辰雅集退出，在各讨论区删除留言，在日历→记事提醒管理本机数据，或通过我的→用户反馈联系我们。</P>
        </Section>

        <section id="third-party-astronomy" style={{marginBottom:24,padding:16,border:'1px solid #ddd',borderRadius:12,fontSize:14,lineHeight:1.8,color:'#444'}}><h2 style={{fontWeight:700}}>天文馆数据来源与开源许可</h2><P>天文馆采用Astronomy Engine 2.1.19（MIT许可）计算日月行星；恒星目录由David Nash / Astronexus及HYG贡献者提供，本应用使用HYG v4.1亮于6.5等的8920颗子集，经过筛选与格式转换，按CC BY-SA 4.0提供。恒星目录的岁差转换没有外推自行，远古和未来星图只作学习示意。</P><P><a href="https://yandaoguoxue.yandao.vip/guide/astronomy/">官网天文馆使用与坐标说明</a>；<a href="https://github.com/cosinekitty/astronomy/tree/v2.1.19/source/js" target="_blank" rel="noopener noreferrer">Astronomy Engine固定版本与MIT许可</a>；<a href="https://github.com/astronexus/HYG-Database/tree/c7f7f883fe678cc7680169a50ccd7dcc49b060ce" target="_blank" rel="noopener noreferrer">HYG原始来源</a>；<a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0许可</a>。上述来源链接供核对权利与技术说明，不需要前往代码仓库才能使用天文馆。</P></section>
        <section style={{marginBottom:24,padding:16,border:'1px solid #ddd',borderRadius:12,fontSize:14,lineHeight:1.8,color:'#444'}}><h2 style={{fontWeight:700}}>人生记录、活盘副本与离线识字</h2><P>人生记录中的日记、健康原件、外部点评、OCR核对版和搜索索引默认属于本机私人档案，不自动上传平台、不进入找人库、公共审核、广告或模型训练。每个独立档案使用本人保管的密码和恢复密钥；退出社交账号或会员到期不删除原件，不收取读取、删除和导出自己的本地资料的费用。浏览器清站点数据、系统回收、卸载或设备故障可能丢失本机资料，必须自行维护有效备份。</P><P>Android使用随包提供的Tesseract离线中文模型，iOS使用系统Apple Vision；Web当前没有已验证的离线识字路径，会明确提示手动核对，不回退平台识字或云AI。识字仅为草稿，不保证医生手写、小数点、药名、否定词或左右侧准确；未核对内容不自动创建用药计划。私人档案的端侧大模型与安全供应商直连能力未配置时明确标为不支持，不发送平台AI代理。</P><P>本人主动分享活盘时，只向指定且同意交流的接收人发送预览确认的独立副本。共享服务保存获准副本、权限和交流文字，不接收人生原库；共享副本和私信可按治理要求处理，HTTPS不等于端到端加密。姓名、日期和地点的移除不保证无法从星位或四柱推断身份。留档、导出、再转发和外部AI处理分别授权；撤销停止后续访问，无法收回他人已获准保存的副本或截图。</P><P>同校仅使用成年人本人主动填写并单独同意的学校标签，属于自填信息，不代表学籍或官方认证；不从健康原件获取医院，不开放病种、病房、住院日期或同就诊找人。好友、同辰匹配不自动取得读取人生记录、健康资料或全部排盘的权限。</P><P>备份包由本人设置独立密码，选择保存到文件、自己的云盘或电脑。平台不自动代存私有原库，不承诺所有云盘支持后台同步；系统保存请求不等于云端备份或换机恢复成功。恢复先核验并进入独立档案，旧提醒需重新确认。主动选择其他平台服务或第三方阅读器时，以当次告知与本人选择为准。</P><a href="/legal/life-ocr/sources.json">离线识字引擎与模型来源、许可索引</a></section>
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
              <strong>用户ID：</strong>系统为您的账号分配的唯一标识，用于登录状态维护、排盘记录与学习数据归档。用户ID本身不含姓名、证件号等直接身份信息。
            </Li>
            <Li>
              <strong>用户聊天内容：</strong>为提供社群交流、帖子评论与举报处理服务，您在平台内主动发布的聊天与动态内容会被存储。您可自行删除；平台依据法律法规与社区规范对违规内容进行管理。
            </Li>
            <Li>
              <strong>昵称与头像：</strong>用于用户在平台内的个人资料展示，可由用户自行设置和修改。
            </Li>
            <Li>
              <strong>设备信息：</strong>包括设备型号、操作系统版本、浏览器类型等，用于服务兼容性适配和安全风控。本平台不收集设备识别码（如IDFA、IDFV、IMEI）用于广告追踪。
            </Li>
            <Li>
              <strong>日志信息：</strong>包括访问时间、访问页面、操作记录等产品交互数据，用于服务优化和安全审计。
            </Li>
            <Li>
              <strong>天文馆与罗盘临时位置信息：</strong>仅当您主动点击“定位”用于天文馆观星、罗盘测量、真太阳时换算等功能时，应用才会向系统申请使用期间的位置权限，临时读取设备经纬度（用于本机天空方向、磁偏角与真太阳时计算）。拒绝定位后仍可手动选择城市或输入经纬度。该位置数据<strong>仅在您的设备本地临时使用，不上传服务器、不存储、不与您的账号关联</strong>；关闭功能或退出应用后即失效。
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
            <Li>本平台不进行个性化广告推荐，也不发送商业营销推送；通知开关可在“我的→通用设置”中随时关闭。</Li>
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

        <section id="research-learning" className="my-5 rounded-xl border p-4"><h2 className="font-semibold">同证研习与同辰人生：另行主动参加的学习交流</h2><P>症状按钮、自述与本机人生记录不会自动公开或按疾病建立找人库。参加前分别确认成年、敏感信息推断风险和可见范围；出生日期仅用于本次应用层年龄校验，不写入研习表。交流仅对已登录且主动参加的成年人开放；同辰人生还需当前有效的同辰加入状态，不代表用户彼此有同一出生条件。</P><P>前台使用本区域稳定化名，后台仍关联经验证的账号以受理审核、举报与反骚扰。发帖只接收本人逐字段确认的文字和固定原文卡编号，不接收人生原库、健康附件或原始出生资料。片段可能推断健康或出生信息，不保证匿名无法识别本人；请勿写姓名、电话、医院、具体日期、精确年龄、位置或可照用的剂量、针刺与复位步骤。个人经历和人生片段均未独立核实，不能当作诊断、医嘱或匹配承诺。</P><P>发表前会明确征求允许其他参加者保存带出处的本机摘录；不自动授权再公开转发。本人删除或退出研习域时，对应片段撤下并清除本应用研习正文/结构化副本，保留最小的处置编号及操作审计、受限账号化名映射用于反骚扰；他人此前获准保存的本机摘录或截图无法远程收回。本机保存摘录不等于医学核实或医嘱，加入日历必须本人另行核对时间。好友关系、同症状或同辰标签均不取得私人库访问权。</P><P>经典卡是既有古籍来源版本的原文检索索引，标注完整章节、字符位置、作者和版本；未逐字完成影印本及医学专业校核，不冒充真实临床医案或现代证据。此页模拟辨证改为本机原文规则对照，不把自述发送AI生成专属处方。新的AI公开资料整理暂不开放。公开文字的机器审核使用腾讯云混元Hy3（TokenHub）：只有在提交前单独同意后，才将拟公开的正文及显示化名传给该服务进行内容安全分类，不附带账号编号、联系方式、私人健康原件、出生盘或位置，不用于个体诊疗，也不扣用户AI点数。拒绝该授权不会上传机器审核；旧客户端未取得本版授权的投稿保持隔离。内置规则和模型判定都不能保证识别全部风险；不确定、超时、预算耗尽、规则冲突或举报先隔离。使用限制和供应商处理规则见其隐私说明；平台未开通独立TMS/WAF，不将普通模型等同专项内容安全认证。</P><a className="underline" href="https://intl.cloud.tencent.com/zh/document/product/1300/78952" target="_blank" rel="noopener noreferrer">腾讯云TokenHub隐私说明</a></section>

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
            8.3 新增同辰匹配等个人信息处理目的需要您主动、分别确认，不以继续使用旧功能代替同意。不同意加入时，您仍可使用原有不依赖该资料的功能。您可以随时撤回公开同辰资料。
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

        {/* 应用权限说明 */}
        <Section index={10} title="应用权限说明">
          <P>
            安卓客户端（APK）申请的系统权限及用途如下，本应用不申请任何与功能无关的多余权限：
          </P>
          <ul>
            <Li><strong>网络访问（INTERNET）：</strong>用于登录、内容加载与在线服务通信，为应用运行必需权限；</Li>
            <Li><strong>网络状态（ACCESS_NETWORK_STATE）：</strong>用于检测网络连接状态，保障断网提示与请求重试体验；</Li>
            <Li><strong>定位（ACCESS_COARSE_LOCATION / ACCESS_FINE_LOCATION）：</strong>只在您主动定位天文馆、罗盘等工具时使用，允许近似位置或手动选点，不申请后台定位。</Li>
            <Li><strong>通知（POST_NOTIFICATIONS）：</strong>仅在您主动启用生日、日程提醒时申请；拒绝不影响本机记事。</Li>
            <Li><strong>精确闹钟（SCHEDULE_EXACT_ALARM）：</strong>仅在您确需准点日程时进入系统设置主动授权。无权限使用可能延迟的系统调度，不要求关闭设备安全措施。</Li>
            <Li><strong>开机完成（RECEIVE_BOOT_COMPLETED）：</strong>用于恢复已由您创建的本机提醒与组件刷新，不在开机时启动网页常驻轮询。</Li>
            <Li><strong>存储：</strong>本应用不申请读取整个共享存储、通讯录或系统全部日历；离线内容与日历快照使用应用私有目录。导出或设置壁纸须由您主动操作系统流程。</Li>
          </ul>
          <P>
            本应用不读取通讯录、短信或通话记录。天文馆等功能仅在您主动点击定位时申请使用期间的位置权限，系统可能提供近似位置；经纬度仅在设备本地临时计算，不上传服务器，不后台跟踪。八字断事笔记的文字和所选图片仅保存在本机私有数据区，不随云端命盘同步，清理缓存不会自动删除；卸载应用、清除应用数据或更换设备可能丢失。选择头像、上传学习资料、保存图片等其他功能按实际需要由系统单独提示，其用途与本机笔记分开。
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
          <p style={{ margin: 0 }}>&copy; 2026 言道国学 版权所有</p>
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

export default function PrivacyPage() {
  return <PrivacyPolicyDocument />;
}
