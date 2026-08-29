/**
 * 生成工具（一次性）：从阿里云 DataV GeoAtlas 权威数据源拉取全国
 * 省-市-县 三级行政区划 + 区县中心经纬度，固化为 src/data/regions.ts。
 * 运行：node tmp/gen_regions.js
 * 数据源：https://geo.datav.aliyun.com/areas_v3/bound/{code}_full.json
 * 结构：province -> city -> district，每级 properties 含 center=[lng,lat]。
 */
const fs = require('fs');
const path = require('path');

const BASE = 'https://geo.datav.aliyun.com/areas_v3/bound/';
const OUT = path.join(__dirname, '..', 'src', 'data', 'regions.json');
const OUTFILE_TS = path.join(__dirname, '..', 'src', 'data', 'regions.ts');

let failed = []; // 记录拉取失败的节点

async function fetchJson(code) {
  const url = BASE + code + '_full.json';
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + url);
  return await res.json();
}

function round(v) {
  return Math.round(v * 10000) / 10000;
}

function centerOf(f) {
  const c = f.properties && f.properties.center;
  return c && Array.isArray(c) && c.length === 2 ? [round(c[0]), round(c[1])] : null;
}

async function main() {
  const country = await fetchJson('100000');
  const provinces = country.features;
  const out = [];

  // 省级行政区：只保留中国 34 + 台湾/港澳（Datav childrenNum 用于判断）
  const CHINA_SET = new Set(
    provinces.map((p) => p.properties.name).filter((n) => !n.includes('南海诸岛'))
  );

  const tasks = [];
  const RESULT = {}; // code -> { name, level, center, children:[] }
  const noChildrenProv = []; // 无下级数据的省级行政区（台/港/澳）

  // 第一步：抓省级 children
  for (const p of provinces) {
    if (!CHINA_SET.has(p.properties.name)) continue;
    const code = p.properties.adcode;
    tasks.push(
      (async () => {
        try {
          const d = await fetchJson(code);
          RESULT[code] = {
            name: p.properties.name,
            level: 'province',
            center: centerOf(p),
            childrenRaw: d.features,
          };
        } catch (e) {
          if (String(e.message).includes('404')) {
            noChildrenProv.push({ code, name: p.properties.name, center: centerOf(p) });
          } else {
            throw e;
          }
        }
      })()
    );
  }
  await Promise.all(tasks);

  // 第二步：抓市级 children（凡省级下有 childrenNum>0 且为 city 级别的子级）
  const cityTasks = [];
  for (const key of Object.keys(RESULT)) {
    const prov = RESULT[key];
    for (const c of (prov.childrenRaw || [])) {
      const pname = c.properties.name;
      const adcode = c.properties.adcode;
      const level = c.properties.level;
      const num = c.properties.childrenNum;
      if (level === 'city' && num > 0) {
        cityTasks.push(
          (async () => {
            try {
              const d = await fetchJson(adcode);
              RESULT[adcode] = { name: pname, level: 'city', center: centerOf(c), childrenRaw: d.features };
            } catch (e) { failed.push(pname); }
          })()
        );
      }
    }
  }
  await Promise.all(cityTasks);

  // 组装三级结构
  for (const key of Object.keys(RESULT)) {
    const prov = RESULT[key];
    if (prov.level !== 'province') continue;
    const provName = prov.name;
    const provEntry = {
      name: provName,
      lng: prov.center ? prov.center[0] : null,
      lat: prov.center ? prov.center[1] : null,
      cities: [],
    };

    for (const child of (prov.childrenRaw || [])) {
      const cname = child.properties.name;
      const clevel = child.properties.level;
      const cnum = child.properties.childrenNum;
      const ccenter = centerOf(child);

      if (clevel === 'district' || (clevel === 'city' && cnum === 0)) {
        // 直辖市辖区 或 省直辖县级单位：直接作为市（虚拟）下的县
        provEntry.cities.push({
          name: cname,
          lng: ccenter && ccenter[0],
          lat: ccenter && ccenter[1],
          districts: [{ name: cname, lng: ccenter && ccenter[0], lat: ccenter && ccenter[1] }],
        });
      } else if (clevel === 'city') {
        const cityRec = RESULT[child.properties.adcode];
        const districts = (cityRec && cityRec.childrenRaw || [])
          .filter((d) => d.properties.level === 'district')
          .map((d) => {
            const dc = centerOf(d);
            return { name: d.properties.name, lng: dc ? dc[0] : null, lat: dc ? dc[1] : null };
          });
        provEntry.cities.push({
          name: cname,
          lng: ccenter && ccenter[0],
          lat: ccenter && ccenter[1],
          districts: districts.length ? districts : [{ name: cname, lng: ccenter && ccenter[0], lat: ccenter && ccenter[1] }],
        });
      }
    }

    // 直辖市：把各区捏合成一个「市辖区」分组，三级联动更自然
    if (provEntry.cities.length === (prov.childrenRaw || []).length && (prov.childrenRaw || []).every((c) => c.properties.level === 'district')) {
      const flat = provEntry.cities.flatMap((c) => c.districts);
      provEntry.cities = [{ name: '市辖区', lng: provEntry.lng, lat: provEntry.lat, districts: flat }];
    }

    out.push(provEntry);
  }

  // 无下级数据的省级行政区（台/港/澳）：折叠为单个自治体
  for (const np of noChildrenProv) {
    out.push({
      name: np.name,
      lng: np.center && np.center[0],
      lat: np.center && np.center[1],
      cities: [{
        name: np.name,
        lng: np.center && np.center[0],
        lat: np.center && np.center[1],
        districts: [{ name: np.name, lng: np.center && np.center[0], lat: np.center && np.center[1] }],
      }],
    });
  }

  // 排序：按行政编码顺序已天然有序，直接输出
  const totalCounties = out.reduce((s, p) => s + p.cities.reduce((s2, c) => s2 + c.districts.length, 0), 0);

  fs.writeFileSync(OUT, JSON.stringify(out), 'utf-8');
  const ts = `// 由 tmp/gen_regions.js 自动生成 —— 数据源：阿里云 DataV GeoAtlas（国家统计局/高德行政区划）\n// 勿手改本文件；如需更新请运行 node tmp/gen_regions.js\n// 结构：省 -> 市 -> 县（district），lng/lat 为区县中心经纬度（GCJ-02 量级，对真太阳时影响 < 0.5 分钟）\n\nexport interface RegionDistrict { name: string; lng: number | null; lat: number | null; }\nexport interface RegionCity { name: string; lng: number | null; lat: number | null; districts: RegionDistrict[]; }\nexport interface RegionProvince { name: string; lng: number | null; lat: number | null; cities: RegionCity[]; }\n\nexport const REGIONS: RegionProvince[] = ${JSON.stringify(out)};\n\nexport const REGION_COUNT = { provinces: ${out.length}, counties: ${totalCounties} };\n`;
  fs.writeFileSync(OUTFILE_TS, ts, 'utf-8');

  console.log('provinces:', out.length, 'counties:', totalCounties);
  console.log('failed cities:', failed.length, failed.join(','));
  console.log('json size:', fs.statSync(OUT).size, 'bytes; ts size:', fs.statSync(OUTFILE_TS).size, 'bytes');
  // 抽样校验
  const bj = out.find((p) => p.name === '北京市');
  console.log('北京样例:', JSON.stringify(bj.cities.slice(0, 1)));
  console.log('河北样例:', JSON.stringify(out.find((p) => p.name === '河北省').cities.slice(0, 2)));
}

main().catch((e) => { console.error(e); process.exit(1); });