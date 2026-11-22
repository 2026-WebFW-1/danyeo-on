// OurAirports의 공항 목록에서 대형 · 중형 공항 좌표만 골라 src/data/airports.json을 만들어요.
// 07 사진 정리가 경유 후보(공항 근처에 잠깐 머문 지점)를 찾을 때 써요(#197).
//
// 실행: node scripts/buildAirports.mjs
// 원본: https://ourairports.com/data/ (퍼블릭 도메인)
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const SOURCE_URL = 'https://davidmegginson.github.io/ourairports-data/airports.csv';
const OUTPUT_PATH = path.resolve(import.meta.dirname, '../src/data/airports.json');
const AIRPORT_TYPES = new Set(['large_airport', 'medium_airport']);
// 소수 3자리는 약 100m예요. 3km 안인지만 보면 돼서 충분하고, 파일이 작아져요.
const COORDINATE_DIGITS = 3;

/** 따옴표 안의 쉼표 · 줄바꿈 · ""를 지키면서 CSV를 줄과 칸으로 나눠요. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let isQuoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (isQuoted) {
      if (char !== '"') cell += char;
      else if (text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else isQuoted = false;
    } else if (char === '"') isQuoted = true;
    else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (char !== '\r') cell += char;
  }
  if (cell || row.length > 0) rows.push([...row, cell]);
  return rows;
}

const response = await fetch(SOURCE_URL);
if (!response.ok) throw new Error(`공항 목록을 받지 못했어요: HTTP ${response.status}`);

const [header, ...rows] = parseCsv(await response.text());
const column = (name) => header.indexOf(name);
const [typeAt, latAt, lngAt] = [column('type'), column('latitude_deg'), column('longitude_deg')];
const round = (value) => Number(Number(value).toFixed(COORDINATE_DIGITS));

const airports = rows
  .filter((row) => AIRPORT_TYPES.has(row[typeAt]))
  .map((row) => [round(row[latAt]), round(row[lngAt])])
  .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng))
  // 원본 순서가 바뀌어도 파일이 덜 바뀌게 좌표 순서로 적어요.
  .sort(([aLat, aLng], [bLat, bLng]) => aLat - bLat || aLng - bLng);

// 한 줄로 적어요. [위도, 경도, 위도, 경도, …]처럼 이어 붙여야 괄호만큼 작아져요.
await writeFile(OUTPUT_PATH, `${JSON.stringify(airports.flat())}\n`);
console.log(`공항 ${airports.length}곳을 ${path.relative(process.cwd(), OUTPUT_PATH)}에 적었어요.`);
