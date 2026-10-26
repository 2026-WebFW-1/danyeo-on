import { cn } from '@/utils/cn';

const NAV_ITEMS = [
  { key: 'home', label: 'Home', href: '/' },
  { key: 'map', label: 'Map', href: '/map' },
  { key: 'places', label: 'Places', href: '/places' },
  { key: 'passport', label: 'Passport', href: '/passport' },
];

/**
 * 모든 화면 위에 붙는 검정 Nav
 *
 * 책임: 로고, 페이지 메뉴, 언어·메뉴 버튼을 그리고 지금 페이지 메뉴만 흰색으로 둡니다.
 *
 * 호출: App이 화면 위에 그립니다. 지금 페이지가 메뉴에 없으면(사진 올리기 등) current를 비웁니다.
 * <Nav current="map" />
 *
 * 의도: 모바일(lg 미만)은 가운데 메뉴와 KR을 숨기고 로고와 [메뉴]만 둡니다.
 *
 * 주의할 것들:
 *  - 라우터가 아직 없어서 메뉴는 주소만 바꾸는 a 링크입니다. 라우터가 생기면 Link로 바꿉니다.
 *  - KR과 [메뉴]는 아직 누르면 아무 일도 없습니다. 펼쳐지는 화면 디자인이 없습니다.
 *
 * 피그마: PC https://www.figma.com/design/gwBUdHoYY9mr6JtNbvCsxY/danyeo-on?node-id=241-5
 *        모바일 https://www.figma.com/design/gwBUdHoYY9mr6JtNbvCsxY/danyeo-on?node-id=375-14
 */
export default function Nav({ current }) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between bg-nav px-4 lg:h-14 lg:px-16">
      {/* Playfair는 글자 꼬리(y, J)가 길어서 상자를 가운데 둬도 글자가 2px쯤 아래로 보입니다. 그만큼 올립니다. */}
      <a href="/" className="-translate-y-0.5 font-serif text-xl font-bold text-white">
        My Journey
      </a>

      <nav className="hidden gap-8 lg:flex">
        {NAV_ITEMS.map((item) => (
          <a
            key={item.key}
            href={item.href}
            aria-current={item.key === current ? 'page' : undefined}
            className={cn('text-md font-medium text-dim', item.key === current && 'text-white')}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <div className="flex items-center gap-7">
        <span className="hidden text-md text-white lg:inline">KR</span>
        <button
          type="button"
          className="flex items-center gap-2 border border-white/35 px-3 py-2 text-sm font-medium text-white"
        >
          메뉴 <span aria-hidden="true">☰</span>
        </button>
      </div>
    </header>
  );
}
