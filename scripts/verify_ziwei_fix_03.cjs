const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
(async()=>{
 const out=path.resolve('.codex-delivery/ziwei-fix-03');
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const results=[];
 for (const [w,h] of [[360,800],[390,844],[412,915]]) {
  const page=await browser.newPage({viewport:{width:w,height:h},deviceScaleFactor:1});
  await page.goto('http://localhost:3013/yixue/ziwei',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>localStorage.clear());
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('[data-testid="date-picker-submit"]')||document.querySelector('[data-testid="ziwei-palace-grid"]'),null,{timeout:60000});
  if(await page.getByTestId('date-picker-submit').count()===0) await page.evaluate(()=>window.dispatchEvent(new Event('yixue-edit')));
  await page.getByTestId('date-picker-submit').waitFor({timeout:60000}); await page.waitForTimeout(1500);
  // 专项命例：男，1982-07-15 12时，起运3岁，明确覆盖用户举例的23-32岁大运。
  await page.getByTestId('birth-year').selectOption('1982');
  await page.getByTestId('birth-month').selectOption('7');
  await page.getByTestId('birth-day').selectOption('15');
  await page.getByTestId('birth-hour').selectOption('12');
  if(w===360){
    const p=page.getByTestId('birth-region-province');
    const labels=await p.locator('option').allTextContents();
    const target=labels.find(x=>x.includes('广东'))||labels[Math.min(5,labels.length-1)];
    await p.selectOption({label:target});
    await page.getByTestId('birth-longitude').fill('113.2644');
  }
  await page.getByTestId('date-picker-submit').click();
  await page.getByTestId('ziwei-palace-grid').waitFor({timeout:30000});
  const beforeText=(await page.getByTestId('ziwei-palace-grid').innerText()).replace(/\s+/g,' ').trim();
  const decades=page.locator('[data-testid^="ziwei-decade-"][data-start-age]');
  const count=await decades.count();
  const decadeChecks=[];
  for(let i=0;i<count;i++){
    const start=Number(await decades.nth(i).getAttribute('data-start-age'));
    const end=Number(await decades.nth(i).getAttribute('data-end-age'));
    await decades.nth(i).click();
    const row=page.locator('[data-testid^="ziwei-flow-year-"][data-age]');
    await row.first().waitFor();
    const ages=await row.evaluateAll(nodes=>nodes.map(n=>Number(n.getAttribute('data-age'))));
    const active=await row.first().getAttribute('aria-selected');
    if(ages.length!==10 || ages[0]!==start || ages[9]!==end || active!=='true') {
      throw new Error(`大运逐柱联动失败 ${w}: index=${i}, range=${start}-${end}, ages=${ages.join(',')}, selected=${active}`);
    }
    decadeChecks.push({index:i,start,end,first:ages[0],last:ages[9],selected:active});
  }
  let targetIndex=Math.min(3,count-1);
  for(let i=0;i<count;i++){ if(Number(await decades.nth(i).getAttribute('data-start-age'))===23){targetIndex=i;break;} }
  const startAge=Number(await decades.nth(targetIndex).getAttribute('data-start-age'));
  await decades.nth(targetIndex).click();
  const first=page.getByTestId('ziwei-flow-year-0');
  await first.waitFor();
  const firstAge=Number(await first.getAttribute('data-age'));
  const firstYear=Number(await first.getAttribute('data-year'));
  const selected=await first.getAttribute('aria-selected');
  if(firstAge!==startAge||selected!=='true') throw new Error(`联动失败 ${w}: decade=${startAge}, flow=${firstAge}, selected=${selected}`);
  const alternate=targetIndex===0?1:0;
  await decades.nth(alternate).click(); await decades.nth(targetIndex).click();
  if(Number(await first.getAttribute('data-age'))!==startAge || await first.getAttribute('aria-selected')!=='true') throw new Error(`往返联动失败 ${w}`);
  await page.getByTestId('ziwei-flow-month-0').click();
  await page.getByTestId('ziwei-flow-day-0').click();
  await page.getByTestId('ziwei-flow-hour-0').click();
  await page.getByTestId('ziwei-view-sanhe').click();
  await page.getByTestId('ziwei-view-feixing').click();
  const grid=page.getByTestId('ziwei-palace-grid');
  await grid.scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(out,`after-${w}x${h}.png`),fullPage:false});
  const gridBox=await grid.boundingBox();
  const viewBox=await page.getByTestId('ziwei-view-feixing').boundingBox();
  const records=await page.evaluate(()=>JSON.parse(localStorage.getItem('paipan_records_v1')||'[]'));
  if(w===360){
    if(!records.length) throw new Error('未登录本地记录未保存');
    const bi=records[0].input?.birthInput||{}; const savedResultSnapshot=JSON.stringify(records[0].result);
    if(!bi.birthPlace||!bi.birthLocation||Math.abs(Number(bi.longitude)-113.2644)>0.001||bi.timezone!=='Asia/Shanghai') throw new Error('历史出生地字段不完整 '+JSON.stringify(bi));
    // 同工具导入：先打开表单，再从记录抽屉恢复结果和地点。
    await page.evaluate(()=>window.dispatchEvent(new Event('yixue-edit')));
    await page.getByText('排盘记录 / 导入').click();
    await page.getByText('导入此人资料').first().click();
    await page.getByTestId('ziwei-palace-grid').waitFor();
    const recordsAfter=await page.evaluate(()=>JSON.parse(localStorage.getItem('paipan_records_v1')||'[]'));
    if(JSON.stringify(recordsAfter[0].result)!==savedResultSnapshot) throw new Error('恢复后结果快照被改写');
    await page.evaluate(()=>window.dispatchEvent(new Event('yixue-edit')));
    await page.getByTestId('birth-longitude').waitFor();
    const restoredLng=Number(await page.getByTestId('birth-longitude').inputValue());
    results.push({viewport:`${w}x${h}`,startAge,firstAge,firstYear,selected,decadeChecks,recordFields:Object.keys(bi).sort(),roundTripResultSnapshotEqual:true,restoredLongitude:restoredLng,gridBox,viewBox});
  } else results.push({viewport:`${w}x${h}`,startAge,firstAge,firstYear,selected,decadeChecks,gridBox,viewBox});
  await page.close();
 }
 fs.writeFileSync(path.join(out,'web-e2e-results.json'),JSON.stringify(results,null,2));
 console.log(JSON.stringify(results,null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
