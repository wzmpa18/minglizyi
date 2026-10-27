const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),Module=require('node:module'),ts=require('typescript');
test('offline knowledge lookup is labelled as local notes and does not make personal fortune claims',()=>{
 const file=fs.readFileSync('src/app/ai/page.tsx','utf8'),ast=ts.createSourceFile('page.tsx',file,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),parts=[];
 for(const node of ast.statements){if(ts.isVariableStatement(node)&&node.declarationList.declarations.some(d=>d.name.getText(ast)==='AI_RESPONSES'))parts.push(node.getText(ast));if(ts.isFunctionDeclaration(node)&&node.name?.text==='findAIResponse')parts.push(node.getText(ast));}
 const context=vm.createContext({});vm.runInContext(ts.transpileModule(parts.join('\n')+'\nglobalThis.lookup=findAIResponse;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
 assert.ok(context.lookup('八字是什么').includes('古人'));assert.ok(!context.lookup('八字是什么').includes('可以了解一个人的性格特征、运势走向'));assert.ok(!context.lookup('小六壬怎么用').includes('适合日常小事占卜'));assert.ok(context.lookup('小六壬怎么用').includes('分类用语'));assert.ok(!context.lookup('中医养生方法').includes('肝胆排毒'));assert.ok(context.lookup('未收录的检索词XYZ').includes('不调用联网AI模型'));
 assert.ok(file.includes('离线学习笔记 · 内置知识检索'));assert.ok(!file.includes('AI生成（深度合成）内容'));assert.ok(!file.includes('800 + Math.random()'));
});
test('all twelve palace and six category entries retain their lookup while explaining terminology instead of personal fate',()=>{
 const filename=path.resolve('src/lib/yizhang-interpretations.ts'),m=new Module(filename,module);m.filename=filename;m.paths=Module._nodeModulePaths(path.dirname(filename));m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);const q=m.exports;
 assert.equal(Object.keys(q.PALACE_DETAILS).length,12);assert.equal(Object.keys(q.LIUDAO_DETAILS).length,6);
 for(const zhi of '子丑寅卯辰巳午未申酉戌亥'){const result=q.getYizhangPalaceInterpretation(zhi);assert.equal(result.items.length,2);assert.ok(result.items.every(item=>item.content&&item.source.includes('非古籍原文')));assert.ok(!/命入.{0,12}(?:一生|天生)|宜从事|化解业障，方能|前世业障较重/.test(result.items.map(i=>i.content).join('\n')));}
 assert.equal(q.getYizhangPalaceInterpretation('unknown'),null);for(const name of Object.keys(q.LIUDAO_DETAILS))assert.ok(q.getYizhangLiudaoInterpretation(name).items[0].content.includes('文本'));
});
test('membership contact is next to the actual purchase action and agrees with the existing public policy',()=>{
 const page=fs.readFileSync('src/app/membership/page.tsx','utf8'),privacy=fs.readFileSync('src/app/privacy/page.tsx','utf8'),contact=page.indexOf('购买、到账或退款问题：客服邮箱'),pay=page.indexOf('onClick={() => void handlePay()}');assert.ok(contact>=0&&pay>contact&&pay-contact<700);assert.ok(page.includes('href="mailto:support@yandao.vip"'));assert.ok(page.slice(contact,pay).includes('href="/profile/feedback"'));assert.ok(privacy.includes('support@yandao.vip'));
});
