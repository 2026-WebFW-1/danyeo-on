import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import edge from '@/data/fixtures/edge.journey.json';
import seojin from '@/data/fixtures/seojin.journey.json';
import seojinSeed from '@/data/seed/seojin.json';
import PlacesView from '@/pages/PlacesPage/PlacesView';
import { selectCityBlocks } from '@/utils/cityBlocks';
import { selectJourneyTotals } from '@/utils/journeyTotals';
import { selectTripPage } from '@/utils/tripPager';
import { getDaysBetweenTrips } from '@/utils/tripStops';
import { selectTripStats, selectTrips } from '@/utils/trips';

let container;
let root;
let onSelectTrip;

/** 여행 이름으로 PlacesView에 넘길 값을 실제 계산 함수로 만들어요. */
function propsFor(journey, tripName, { posts = [], photos = [] } = {}) {
  const trips = selectTrips(journey);
  const tripId = trips.find((trip) => trip.name === tripName).id;
  const { current, prev, next } = selectTripPage(trips, tripId);

  return {
    totals: selectJourneyTotals(journey),
    trips,
    current,
    prev,
    next,
    stats: selectTripStats(journey, tripId),
    blocks: selectCityBlocks(journey, tripId, posts, photos),
    daysUntilNext: getDaysBetweenTrips(journey, tripId),
    onSelectTrip,
  };
}

async function render(props) {
  await act(async () =>
    root.render(
      <MemoryRouter>
        <PlacesView {...props} />
      </MemoryRouter>,
    ),
  );
}

async function click(element) {
  await act(async () => element.click());
}

const text = () => container.textContent;
const tabs = () => [...container.querySelectorAll('nav[aria-label="여행 고르기"] button')];
const blocks = () => [...container.querySelectorAll('section[aria-label="도시별 기록"] ol > li')];
const findButton = (name) =>
  [...container.querySelectorAll('button')].find((button) => button.textContent.includes(name));
const findLink = (name) =>
  [...container.querySelectorAll('a')].find((link) => link.textContent.includes(name));

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  root = createRoot(container);
  onSelectTrip = vi.fn();
});

afterEach(async () => {
  await act(async () => root.unmount());
});

describe('PlacesView 머리와 탭', () => {
  test('PLACES · JOURNEY · 큰 제목과 한 줄 요약을 보여 줘요', async () => {
    await render(propsFor(seojin, '밴쿠버 · 밴프'));

    expect(container.querySelector('h1').textContent).toBe('JOURNEY');
    expect(text()).toContain('PLACES');
    expect(container.querySelector('header p.font-serif').textContent).toBe('ON-THE ROAD');
    expect(text()).toMatch(
      /\d{4}년 \d{1,2}월부터 19곳, 14번의 여행\. 여행 하나를 골라 따라가 보세요\./,
    );
  });

  test('여행마다 탭이 하나씩 있고, 고른 여행의 탭만 현재(aria-current)예요', async () => {
    await render(propsFor(seojin, '밴쿠버 · 밴프'));

    expect(tabs()).toHaveLength(14);
    const current = tabs().filter((tab) => tab.getAttribute('aria-current') === 'true');
    expect(current).toHaveLength(1);
    expect(current[0].textContent).toBe('08밴쿠버 · 밴프');
  });

  test('탭을 누르면 그 여행의 id로 onSelectTrip을 불러요', async () => {
    const props = propsFor(seojin, '밴쿠버 · 밴프');
    await render(props);

    await click(tabs()[0]);

    expect(onSelectTrip).toHaveBeenCalledWith(props.trips[0].id);
  });

  test('newTripIds에 든 여행의 탭에는 NEW 칩이 붙어요', async () => {
    const props = propsFor(seojin, '밴쿠버 · 밴프');
    await render({ ...props, newTripIds: [props.trips[2].id] });

    expect(tabs()[2].textContent).toContain('NEW');
    expect(tabs()[3].textContent).not.toContain('NEW');
  });
});

describe('PlacesView 여행 요약', () => {
  test('TRIP 번호와 이름, 숫자 넷을 보여 줘요', async () => {
    const props = propsFor(seojin, '밴쿠버 · 밴프');
    await render(props);

    expect(container.querySelector('h2').textContent).toBe('밴쿠버 · 밴프');
    expect(text()).toContain('TRIP 08');
    const values = [...container.querySelectorAll('dl dd')].map((dd) => dd.textContent);
    expect(values).toEqual(['60일', '2', '17,111km', '9']);
  });

  test('[지도로 보기]는 /map?trip=<여행 id>로, 챕터가 있으면 [챕터 열기]가 그 슬러그로 가요', async () => {
    const props = propsFor(seojin, '밴쿠버 · 밴프');
    await render(props);

    expect(findLink('지도로 보기').getAttribute('href')).toBe(`/map?trip=${props.current.id}`);
    const chapterLinks = [...container.querySelectorAll('a')].filter((link) =>
      link.textContent.includes('챕터 열기'),
    );
    // 여행 머리 하나 + 밴쿠버 블록 하나
    expect(chapterLinks).toHaveLength(2);
    chapterLinks.forEach((link) =>
      expect(decodeURIComponent(link.getAttribute('href'))).toBe('/chapter/밴쿠버-2025'),
    );
  });

  test('챕터가 없는 여행에는 [챕터 열기]가 없어요', async () => {
    await render(propsFor(seojin, '방콕 · 다낭'));

    expect(findLink('챕터 열기')).toBeUndefined();
    expect(findLink('지도로 보기')).toBeDefined();
  });
});

describe('PlacesView 도시 블록', () => {
  test('지점마다 블록이 있고 도시 · 나라 · 날짜 · 일수와 사진 수 · 이동 라벨이 있어요', async () => {
    await render(propsFor(seojin, '밴쿠버 · 밴프', seojinSeed));

    const [vancouver, banff] = blocks();
    expect(blocks()).toHaveLength(2);
    expect(vancouver.querySelector('h3').textContent).toBe('밴쿠버');
    expect(vancouver.textContent).toContain('Canada');
    expect(vancouver.textContent).toContain('2025.06.28 — 08.23');
    expect(vancouver.textContent).toContain('57일');
    expect(vancouver.textContent).toContain('사진 6장');
    expect(vancouver.textContent).toContain('비행 · 8,162km');
    expect(banff.querySelector('h3').textContent).toBe('밴프');
    expect(banff.textContent).toContain('차 · 552km');
  });

  test('글이 있는 지점은 한 줄 글을 보여 줘요', async () => {
    const props = propsFor(seojin, '밴쿠버 · 밴프', seojinSeed);
    await render(props);

    expect(blocks()[0].textContent).toContain(props.blocks[0].oneLiner.slice(0, 12));
  });

  test('챕터가 아닌 지점은 [글 보기 →]가 그 자리에서 글을 펼치고 접어요', async () => {
    await render(propsFor(seojin, '밴쿠버 · 밴프', seojinSeed));
    const banff = blocks()[1];
    const toggle = [...banff.querySelectorAll('button')].find((b) =>
      b.textContent.includes('글 보기'),
    );

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(banff.querySelector('ul[id]')).toBeNull();

    await click(toggle);

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.textContent).toContain('글 접기');
    expect(banff.querySelector('ul[id]').textContent).toContain('모레인 호수');

    await click(toggle);

    expect(banff.querySelector('ul[id]')).toBeNull();
  });

  test('글이 없고 챕터도 아닌 지점에는 글 링크가 없어요', async () => {
    await render(propsFor(seojin, '방콕 · 다낭'));

    expect(findButton('글 보기')).toBeUndefined();
  });

  test('사진을 누르면 크게 보기가 열리고 Esc로 닫혀요', async () => {
    await render(propsFor(seojin, '밴쿠버 · 밴프', seojinSeed));

    await click(container.querySelector('button[aria-label="밴쿠버 사진 크게 보기"]'));

    expect(container.querySelector('[role="dialog"]')).not.toBeNull();

    await act(async () =>
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
    );

    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  test('지점의 사진이 여럿이면 크게 보기에서 넘길 수 있어요(밴쿠버 6장)', async () => {
    await render(propsFor(seojin, '밴쿠버 · 밴프', seojinSeed));

    await click(container.querySelector('button[aria-label="밴쿠버 사진 크게 보기"]'));

    expect(container.querySelector('button[aria-label="다음 사진"]')).not.toBeNull();
  });
});

describe('PlacesView 접기', () => {
  const toronto = '토론토 · 나이아가라 폴스 · 뉴욕';

  test('4곳째부터는 접어서 한 줄로 보여 줘요', async () => {
    await render(propsFor(edge, toronto));

    const headings = [...container.querySelectorAll('h3')].map((h) => h.textContent);
    expect(headings).toHaveLength(3);
    const pill = findButton('펼치기');
    expect(pill.textContent).toContain('04');
    expect(pill.textContent).toContain('뉴욕');
    expect(pill.textContent).toMatch(/\d{4}\.\d{2}\.\d{2} · 4일/);
    expect(pill.textContent).toContain('+ 펼치기');
  });

  test('줄을 누르면 나머지가 모두 펼쳐지고 줄은 사라져요', async () => {
    await render(propsFor(edge, toronto));

    await click(findButton('펼치기'));

    expect([...container.querySelectorAll('h3')].map((h) => h.textContent)).toHaveLength(4);
    expect(findButton('펼치기')).toBeUndefined();
  });

  test('접힌 곳이 둘 이상이면 몇 곳인지 적어요', async () => {
    const props = propsFor(edge, toronto);
    const extra = {
      ...props.blocks[3],
      stop: { ...props.blocks[3].stop, id: 'extra', city: '보스턴' },
      no: '05',
    };
    await render({ ...props, blocks: [...props.blocks, extra] });

    expect(findButton('펼치기').textContent).toContain('+ 2곳 펼치기');
  });

  test('3곳 이하면 접는 줄이 없어요', async () => {
    await render(propsFor(seojin, '졸업 여행'));

    expect(findButton('펼치기')).toBeUndefined();
    expect(container.querySelectorAll('h3')).toHaveLength(3);
  });

  test('여행을 바꾸면 펼친 상태가 처음으로 돌아가요', async () => {
    const first = propsFor(edge, toronto);
    await render(first);
    await click(findButton('펼치기'));
    expect(container.querySelectorAll('h3')).toHaveLength(4);

    const other = propsFor(edge, toronto);
    await render({ ...other, current: { ...other.current, id: 'other-trip' } });

    expect(container.querySelectorAll('h3')).toHaveLength(3);
  });
});

describe('PlacesView 이전 · 다음 여행', () => {
  test('앞뒤 여행 이름과 다음 여행까지 남은 날을 보여 줘요', async () => {
    const props = propsFor(seojin, '밴쿠버 · 밴프');
    await render(props);

    expect(findButton('PREV').textContent).toContain('07 부산 · 경주');
    expect(findButton('NEXT TRIP').textContent).toContain('09 오사카');
    expect(text()).toMatch(/— \d+일 뒤 —/);
  });

  test('누르면 그 여행으로 바꿔요', async () => {
    const props = propsFor(seojin, '밴쿠버 · 밴프');
    await render(props);

    await click(findButton('PREV'));
    await click(findButton('NEXT TRIP'));

    expect(onSelectTrip).toHaveBeenNthCalledWith(1, props.prev.id);
    expect(onSelectTrip).toHaveBeenNthCalledWith(2, props.next.id);
  });

  test('마지막 여행은 NEXT도 "N일 뒤"도 없어요', async () => {
    await render(propsFor(seojin, '이스탄불'));

    expect(findButton('NEXT TRIP')).toBeUndefined();
    expect(findButton('PREV')).toBeDefined();
    expect(text()).not.toMatch(/일 뒤/);
  });

  test('첫 여행은 PREV가 없어요', async () => {
    await render(propsFor(seojin, '방콕 · 다낭'));

    expect(findButton('PREV')).toBeUndefined();
    expect(findButton('NEXT TRIP')).toBeDefined();
  });
});

describe('PlacesView 여행이 없을 때', () => {
  test('머리 없이 안내만 보여 주고 [사진 올리기]는 /upload로 가요', async () => {
    await render({
      totals: selectJourneyTotals(null),
      trips: [],
      current: null,
      prev: null,
      next: null,
      stats: null,
      blocks: [],
      daysUntilNext: null,
      onSelectTrip,
    });

    expect(text()).toContain('아직 여행이 없어요');
    expect(findLink('사진 올리기').getAttribute('href')).toBe('/upload');
    expect(container.querySelector('nav[aria-label="여행 고르기"]')).toBeNull();
    expect(container.querySelector('header')).toBeNull();
  });
});
