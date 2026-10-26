import Link from "next/link";
import {readFileSync} from "node:fs";
import path from "node:path";
const notices=[
 ["查看器代码：MIT完整许可","CODE-LICENSE.txt"],
 ["人体模型：CC BY 4.0完整许可","CC-BY-4.0.txt"],
 ["模型、经络与图片：署名和修改记录","ATTRIBUTION.md"],
 ["第三方通知","NOTICE"],
].map(([title,file])=>({title,text:readFileSync(path.join(process.cwd(),"public/licenses/tcm-3d",file),"utf8")}));
export default function AgreementsPage(){return <main style={{maxWidth:800,margin:"auto",padding:"24px 18px 100px",color:"#292524",background:"#faf8f4",minHeight:"100vh",lineHeight:1.8}}>
 <Link data-page-back="1" href="/profile/settings/">‹ 返回设置</Link><h1 style={{fontSize:24}}>协议与资料来源</h1>
 <section><h2 style={{fontSize:19}}>用户协议与隐私</h2><p><Link href="/agreement/">用户协议</Link>　<Link href="/privacy/">隐私政策</Link></p></section>
 <section><h2 style={{fontSize:19}}>开源软件、模型与图片</h2><p>模型采用BodyParts3D成人男性参考体，查看器分别保留Human Atlas与TCM 3D的代码许可。新增贴体衣物、操作与离线适配不改变原资产的许可。</p>
 {notices.map(row=><details key={row.title} style={{padding:12,marginBottom:10,border:"1px solid #ddd",borderRadius:8,background:"white"}}><summary>{row.title}</summary><pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere",fontFamily:"inherit",fontSize:12}}>{row.text}</pre></details>)}<Link href="/open-source/">查看模型与原始经络图片来源说明 →</Link></section>
 <section><h2 style={{fontSize:19}}>书籍与数据</h2><p>每部书、每段引文和图谱保留各自书名、底本、章节及来源；现代定位参考、古籍原文与编辑整理分别展示。代码许可证不代替书籍、照片或课程的使用范围。</p><p><Link href="/zhongyi/classic/">中医原典与版本</Link>　<Link href="/books/">易学典籍</Link></p></section>
 <section><h2 style={{fontSize:19}}>课程说明</h2><p>课程原稿、讲课整理、编辑摘记与个人笔记分别署名。每章“出处与版本”可以查原文件及行号；个人笔记独立保存，公共课库更新不覆盖个人内容。</p><Link href="/zhongyi/ni-study/">进入自学课程 →</Link></section>
 <p style={{fontSize:12,color:"#776b7a"}}>本页许可全文随安装包保存，可离线展开阅读。完整来源网站在各来源说明中列出，联网时可查看。</p>
 </main>;}
