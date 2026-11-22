import { useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';

import { PHOTO_SORT_PATH } from '@/constants/photoSort';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/utils/cn';

const HOME_PATH = '/';
const UPLOAD_PATH = '/upload';
const MENU_ITEM_CLASS = 'block w-full px-4 py-2.5 text-left text-md text-ink hover:bg-line';

const NAV_ITEMS = [
  { key: 'home', label: 'Home', to: HOME_PATH },
  { key: 'map', label: 'Map', to: '/map' },
  // 02 챕터(/chapter/…)는 03 전체 기록에서 열리는 화면이라 Places 아래로 봅니다(피그마 02 프레임에서도 Places가 흰색입니다).
  { key: 'places', label: 'Places', to: '/places', alsoActiveOn: ['/chapter'] },
  { key: 'passport', label: 'Passport', to: '/passport' },
];

// 주소가 이 경로이거나 그 아래(/chapter/…)인지 봅니다. /chapters처럼 앞부분만 같은 주소는 아닙니다.
function isUnder(pathname, path) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

/**
 * 모든 화면 위에 붙는 검정 Nav
 *
 * 책임: 로고, 페이지 메뉴, [편집 모드], KR, [메뉴]를 그리고 지금 페이지 메뉴만 흰색으로 둡니다.
 * [메뉴]를 누르면 로그인한 사람 이름 · 사진 올리기 · 사진 정리 · [로그아웃]을 흰 상자로 펼칩니다(#199).
 *
 * 호출: AppLayout이 모든 페이지 위에 그립니다. 받는 값은 없습니다.
 * <Nav />
 *
 * 의도:
 *  - 지금 메뉴는 NavLink가 주소를 보고 정합니다(aria-current="page"도 붙여 줍니다).
 *    주소가 메뉴에 없으면(/upload 등) 어느 메뉴도 흰색이 되지 않습니다.
 *  - 02 챕터(/chapter/…)는 03에서 열리는 화면이라 Places도 흰색으로 둡니다(alsoActiveOn). 이때는 02가 열려 있는 것이지
 *    03이 열려 있는 게 아니라서 aria-current는 붙이지 않습니다. Places를 누르면 03으로 갑니다.
 *
 * 주의할 것들:
 *  - Home만 end를 붙입니다. 안 붙이면 모든 주소가 /로 시작해서 Home이 늘 흰색입니다.
 *    나머지는 하위 주소(/places/…)에서도 그 메뉴가 흰색으로 남게 end를 붙이지 않습니다.
 *  - KR은 다국어가 없어서 누를 수 없는 글자로 둡니다. 피그마에 있어서 지우지 않았습니다.
 *  - 펼친 [메뉴]는 피그마에 디자인이 없어서 01 고치기 패널(LegModePanel)과 같은 흰 상자로 둡니다.
 *    [로그아웃]은 피그마에 자리가 없어 이 안에 둡니다(기능 정의서 L105). 사진 올리기는 00·01 화면 안에서만
 *    들어갈 수 있어서 어느 화면에서나 가게 넣었습니다.
 *  - [메뉴]는 다시 누르기, Esc, 바깥 누르기, 다른 화면으로 가기로 닫힙니다. Esc로 닫으면 포커스를 [메뉴]로 돌려요.
 *    연 화면의 주소를 기억해서, 주소가 바뀌면 effect 없이 닫힌 것으로 봅니다(뒤로·앞으로 가기 포함).
 *  - 메뉴가 열려 있는 동안의 Esc는 메뉴만 닫습니다. 뒤에 열린 01 고치기 패널·Lightbox는 그대로예요.
 *  - 펼친 상자는 링크·버튼 목록이라 ARIA menu 역할을 쓰지 않습니다. 쓰면 화살표 키로 움직이는 것까지 약속해야 해요.
 *  - [로그아웃]은 스토어의 signOut()만 부릅니다. /login으로 보내는 건 RequireAuth가 합니다(이유는 RequireAuth 주석).
 *  - [편집 모드]는 07 사진 정리로 가요. 피그마 07에서 [메뉴] 왼쪽에 흰색으로 있어서, 페이지 메뉴처럼
 *    07에 있을 때만 흰색으로 둡니다. 페이지 메뉴(Home ~ Passport)가 아니라서 가운데 줄에 넣지 않았습니다.
 *
 * 피그마: https://www.figma.com/design/gwBUdHoYY9mr6JtNbvCsxY/danyeo-on?node-id=241-5
 */
export default function Nav() {
  const userName = useAuthStore((state) => state.user?.name);
  const signOut = useAuthStore((state) => state.signOut);
  const { pathname } = useLocation();
  const panelId = useId();
  const menuRef = useRef(null);
  const menuButtonRef = useRef(null);
  // 연 화면의 주소예요. 다른 화면으로 가면 지금 주소와 달라져서 닫혀요.
  const [openedPath, setOpenedPath] = useState(null);
  // 뒤로·앞으로처럼 메뉴를 거치지 않고 주소가 바뀌어도, 연 화면에 돌아왔을 때 다시 열려 있지 않게 비워요.
  if (openedPath !== null && openedPath !== pathname) setOpenedPath(null);
  const isMenuOpen = openedPath === pathname;

  const closeMenu = () => setOpenedPath(null);

  useEffect(() => {
    if (!isMenuOpen) return undefined;
    const closeOnOutside = (event) => {
      if (!menuRef.current?.contains(event.target)) setOpenedPath(null);
    };
    // useEscape 대신 먼저 받는(capture) 감시를 달고 Esc를 여기서 멈춰요. 안 그러면 뒤에 열린 01 고치기 패널이나
    // Lightbox의 Esc 감시도 같이 불려, 메뉴만 닫으려던 Esc에 고치던 내용까지 버려져요.
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return;
      event.stopImmediatePropagation();
      setOpenedPath(null);
      menuButtonRef.current?.focus();
    };
    document.addEventListener('pointerdown', closeOnOutside);
    window.addEventListener('keydown', closeOnEscape, { capture: true });
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      window.removeEventListener('keydown', closeOnEscape, { capture: true });
    };
  }, [isMenuOpen]);

  const handleSignOut = () => {
    closeMenu();
    signOut();
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between bg-nav px-16">
      {/* Playfair는 글자 꼬리(y, J)가 길어서 상자를 가운데 둬도 글자가 2px쯤 아래로 보입니다. 그만큼 올립니다. */}
      <Link to={HOME_PATH} className="-translate-y-0.5 font-serif text-xl font-bold text-white">
        My Journey
      </Link>

      <nav className="flex gap-8">
        {NAV_ITEMS.map((item) => {
          const isChildPage = item.alsoActiveOn?.some((path) => isUnder(pathname, path)) ?? false;

          return (
            <NavLink
              key={item.key}
              to={item.to}
              end={item.to === HOME_PATH}
              className={({ isActive }) =>
                cn('text-md font-medium text-dim', (isActive || isChildPage) && 'text-white')
              }
            >
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="flex items-center gap-7">
        <NavLink
          to={PHOTO_SORT_PATH}
          className={({ isActive }) => cn('text-md font-medium text-dim', isActive && 'text-white')}
        >
          편집 모드
        </NavLink>
        <span className="text-md text-white">KR</span>
        <div ref={menuRef} className="relative">
          <button
            ref={menuButtonRef}
            type="button"
            aria-expanded={isMenuOpen}
            aria-controls={panelId}
            onClick={() => setOpenedPath(isMenuOpen ? null : pathname)}
            className="flex items-center gap-2 border border-white/35 px-3 py-2 text-sm font-medium text-white"
          >
            메뉴 <span aria-hidden="true">☰</span>
          </button>
          {isMenuOpen && (
            <ul
              id={panelId}
              className="absolute top-full right-0 z-50 mt-2 w-48 border border-line bg-white py-1 shadow-[0px_8px_24px_0px_rgba(0,0,0,0.07)]"
            >
              {userName && <li className="px-4 py-2.5 text-sm text-dim">{userName}</li>}
              <li>
                <Link to={UPLOAD_PATH} onClick={closeMenu} className={MENU_ITEM_CLASS}>
                  사진 올리기
                </Link>
              </li>
              <li>
                <Link to={PHOTO_SORT_PATH} onClick={closeMenu} className={MENU_ITEM_CLASS}>
                  사진 정리
                </Link>
              </li>
              <li className="border-t border-line">
                <button type="button" onClick={handleSignOut} className={MENU_ITEM_CLASS}>
                  로그아웃
                </button>
              </li>
            </ul>
          )}
        </div>
      </div>
    </header>
  );
}
