const { astro } = require('iztro');

// Known dates to verify day pillar formula
const dates = [
  { year: 1990, month: 5, day: 15 },
  { year: 1990, month: 1, day: 1 },
  { year: 1985, month: 3, day: 20 },
  { year: 1995, month: 11, day: 8 },
  { year: 2000, month: 1, day: 1 },
  { year: 1984, month: 2, day: 4 },
  { year: 2024, month: 3, day: 15 },
];

for (const d of dates) {
  const a = astro.bySolar(`${d.year}-${d.month}-${d.day}`, 0, '男', true, 'zh-CN');
  const dayGZ = a.chineseDate.split(' ')[2];
  
  // Compute using the formula
  const yearTail = d.year % 100;
  let base = (yearTail + 3) * 5 + 55 + Math.floor((yearTail - 1) / 4);
  base = base % 60;
  if (base < 0) base += 60;
  
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if ((d.year % 4 === 0 && d.year % 100 !== 0) || (d.year % 400 === 0)) {
    daysInMonth[1] = 29;
  }
  let dayOfYear = 0;
  for (let m = 0; m < d.month - 1; m++) {
    dayOfYear += daysInMonth[m];
  }
  dayOfYear += d.day;
  
  const JIAZI = [];
  const GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  const ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  for (let i = 0; i < 60; i++) {
    JIAZI.push(GAN[i % 10] + ZHI[i % 12]);
  }
  
  const dayIdx = (base + dayOfYear) % 60;
  const computed = JIAZI[dayIdx < 0 ? dayIdx + 60 : dayIdx];
  
  // Also try base-1 (offset by -1)
  const dayIdx2 = (base - 1 + dayOfYear) % 60;
  const computed2 = JIAZI[dayIdx2 < 0 ? dayIdx2 + 60 : dayIdx2];
  
  // Also try dayOfYear-1
  const dayIdx3 = (base + dayOfYear - 1) % 60;
  const computed3 = JIAZI[dayIdx3 < 0 ? dayIdx3 + 60 : dayIdx3];
  
  const match = computed === dayGZ;
  console.log(`${d.year}-${d.month}-${d.day}: iztro=${dayGZ}, formula=${computed}(${match?'✓':'✗'}), base-1=${computed2}(${computed2===dayGZ?'✓':'✗'}), dayOfYear-1=${computed3}(${computed3===dayGZ?'✓':'✗'})`);
}
