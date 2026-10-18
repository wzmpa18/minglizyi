import test from "node:test";
import assert from "node:assert/strict";
import { calculateStudySky, calculateYunqiStudy, chinaTimeInput, parseChinaTime, skyDiagramPoint, yunqiPhaseAt } from "../src/lib/astronomyStudy";

test("civil input is explicit UTC+8, validates calendar dates and preserves the moment", () => {
  assert.equal(parseChinaTime("2026-10-18T15:30").toISOString(), "2026-10-18T07:30:00.000Z");
  assert.equal(chinaTimeInput(new Date("2026-01-01T20:00Z")), "2026-01-02T04:00");
  assert.throws(() => parseChinaTime("2026-02-30T12:00"));
  assert.throws(() => parseChinaTime("2026-10-18T24:00"));
  assert.throws(() => calculateStudySky(new Date(), 91, 0));
  for (const year of ['0001', '0099', '1054', '1900', '3000']) {
    const input = `${year}-07-04T12:00`;
    assert.equal(chinaTimeInput(parseChinaTime(input)), input);
  }
  assert.throws(() => parseChinaTime('0000-01-01T00:00'));
  assert.throws(() => parseChinaTime('3001-01-01T00:00'));
});

test("sky projection preserves looking-up cardinal directions and hides below-horizon points", () => {
  assert.deepEqual(skyDiagramPoint(0, 0), { x: 180, y: 40 });
  assert.equal(skyDiagramPoint(90, 0).x, 40);
  assert.equal(skyDiagramPoint(180, 0).y, 320);
  assert.equal(skyDiagramPoint(270, 0).x, 320);
  assert.deepEqual(skyDiagramPoint(20, 90), { x: 180, y: 180 });
  assert.throws(() => skyDiagramPoint(90, -1));
});

test("real ephemerides respond to time/location and return no invented polar rise event", () => {
  const noon = calculateStudySky(new Date("2026-06-21T04:00Z"), 39.9, 116.4);
  const night = calculateStudySky(new Date("2026-06-21T16:00Z"), 39.9, 116.4);
  assert.ok(noon.bodies[0].altitude > 65);
  assert.ok(noon.sunLongitude > 89 && noon.sunLongitude < 91);
  assert.ok(night.bodies[0].altitude < 0);
  assert.equal(noon.bodies.length, 9);
  assert.ok(noon.bodies.every(b => Number.isFinite(b.altitude) && b.azimuth >= 0 && b.azimuth < 360));
  const polar = calculateStudySky(new Date("2026-06-21T04:00Z"), 89, 0);
  assert.equal(polar.events[0].rise, null); assert.equal(polar.events[0].set, null);
  // Total-solar-eclipse date is an independent known near-new-moon sanity case.
  const eclipse = calculateStudySky(new Date("2024-04-08T18:00Z"), 0, 0);
  assert.ok(eclipse.bodies[1].illuminated < 0.001);
  for (const year of ['0001', '0099', '1054', '3000']) {
    const historical = calculateStudySky(parseChinaTime(`${year}-07-04T12:00`), 39.9, 116.4);
    assert.ok(historical.bodies.every(body => Number.isFinite(body.altitude) && Number.isFinite(body.ra)), year);
    assert.ok(historical.sunLongitude >= 0 && historical.sunLongitude < 360);
  }
});

test("yunqi annual mappings repeat in 60 years and guest third/sixth positions stay aligned", () => {
  for (let year = 1960; year < 2020; year++) {
    const study = calculateYunqiStudy(year);
    assert.equal(study.phases[2].guestQi, study.siTian);
    assert.equal(study.phases[5].guestQi, study.zaiQuan);
    const next = calculateYunqiStudy(year + 60);
    assert.equal(study.ganzhi, next.ganzhi); assert.equal(study.annualMovement, next.annualMovement);
  }
  const study = calculateYunqiStudy(2026);
  assert.equal(study.ganzhi, "丙午"); assert.equal(study.annualMovement, "水运太过");
  assert.equal(study.siTian, "少阴君火"); assert.equal(study.zaiQuan, "阳明燥金");
  assert.deepEqual(study.phases.map(p => p.guestQi), ["太阳寒水", "厥阴风木", "少阴君火", "太阴湿土", "少阳相火", "阳明燥金"]);
});

test("six solar-term periods cover Dahan-to-Dahan with exact inclusive/exclusive boundaries", () => {
  const study = calculateYunqiStudy(2026);
  for (const [index, phase] of study.phases.entries()) {
    assert.ok(phase.end > phase.start);
    assert.equal(yunqiPhaseAt(study, phase.start), index);
    assert.equal(yunqiPhaseAt(study, new Date(phase.end.getTime() - 1)), index);
    if (index < 5) assert.equal(phase.end.getTime(), study.phases[index + 1].start.getTime());
  }
  assert.equal(yunqiPhaseAt(study, new Date(study.phases[0].start.getTime() - 1)), -1);
  assert.equal(yunqiPhaseAt(study, study.phases[5].end), -1);
  assert.throws(() => calculateYunqiStudy(2100));
});
