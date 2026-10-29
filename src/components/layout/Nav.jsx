import { Link, NavLink } from 'react-router';

import { cn } from '@/utils/cn';

const HOME_PATH = '/';

const NAV_ITEMS = [
  { key: 'home', label: 'Home', to: HOME_PATH },
  { key: 'map', label: 'Map', to: '/map' },
  { key: 'places', label: 'Places', to: '/places' },
  { key: 'passport', label: 'Passport', to: '/passport' },
];

/**
 * 모든 화면 위에 붙는 검정 Nav
 *
 * 책임: 로고, 페이지 메뉴, 언어·메뉴 버튼을 그리고 지금 페이지 메뉴만 흰색으로 둡니다.
 *
 * 호출: AppLayout이 모든 페이지 위에 그립니다. 받는 값은 없습니다.
 * <Nav />
 *
 * 의도:
 *  - 지금 메뉴는 NavLink가 주소를 보고 정합니다(aria-current="page"도 붙여 줍니다).
 *    주소가 메뉴에 없으면(/upload 등) 어느 메뉴도 흰색이 되지 않습니다.
 *  - 모바일(lg 미만)은 가운데 메뉴와 KR을 숨기고 로고와 [메뉴]만 둡니다.
 *
 * 주의할 것들:
 *  - Home만 end를 붙입니다. 안 붙이면 모든 주소가 /로 시작해서 Home이 늘 흰색입니다.
 *    나머지는 하위 주소(/places/…)에서도 그 메뉴가 흰색으로 남게 end를 붙이지 않습니다.
 *  - KR과 [메뉴]는 아직 누르면 아무 일도 없습니다. 펼쳐지는 화면 디자인이 없습니다.
 *
 * 피그마: PC https://www.figma.com/design/gwBUdHoYY9mr6JtNbvCsxY/danyeo-on?node-id=241-5
 *        모바일 https://www.figma.com/design/gwBUdHoYY9mr6JtNbvCsxY/danyeo-on?node-id=375-14
 */
export default function Nav() {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between bg-nav px-4 lg:h-14 lg:px-16">
      {/* Playfair는 글자 꼬리(y, J)가 길어서 상자를 가운데 둬도 글자가 2px쯤 아래로 보입니다. 그만큼 올립니다. */}
      <Link to={HOME_PATH} className="-translate-y-0.5 font-serif text-xl font-bold text-white">
        My Journey
      </Link>

      <nav className="hidden gap-8 lg:flex">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.key}
            to={item.to}
            end={item.to === HOME_PATH}
            className={({ isActive }) =>
              cn('text-md font-medium text-dim', isActive && 'text-white')
            }
          >
            {item.label}
          </NavLink>
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
