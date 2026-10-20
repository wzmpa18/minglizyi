/** Device compass coordinates remain local even when a member syncs readings. */
const LOCATION_KEYS = new Set(["location", "lat", "lon", "lng", "latitude", "longitude", "coordinates", "coords", "locationname", "locname", "gps"]);
function stripLocation(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripLocation);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !LOCATION_KEYS.has(key.toLowerCase())).map(([key, item]) => [key, stripLocation(item)]));
}
export function cloudRecordData(recordType: string, data: unknown): unknown {
  return recordType === "compass" ? stripLocation(data) : data;
}
// A cloud refresh must not erase the local-only portion of a compass reading.
export function mergeCloudRecords<T extends {id: string; type: string; data: unknown}>(local: T[], cloud: T[]): T[] {
  const stamp = (record: T) => (record.data && typeof record.data === "object" ? (record.data as Record<string, unknown>).measuredAt : undefined);
  const same = (a: T, b: T) => a.type === b.type && (a.id === b.id || (typeof stamp(a) === "string" && stamp(a) === stamp(b)));
  const privateRecords = local.filter(record => record.type === "compass");
  return [...cloud.map(record => {
    const original = privateRecords.find(item => same(item, record));
    return original ? {...record, data: original.data} : record;
  }), ...privateRecords.filter(record => !cloud.some(item => same(item, record)))];
}
