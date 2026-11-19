import { useCallback, useState } from 'react';

import { canEditLegMode } from '@/utils/legMode';

import LegLabel from './LegLabel';
import LegModeMenu from './LegModeMenu';

/**
 * 01 지도의 구간 라벨들과, 고치기 모드에서 라벨을 누르면 여는 이동 수단 메뉴
 *
 * 호출: RouteMap. <svg> 안에서만 쓸 수 있습니다.
 *
 * 의도:
 *  - 평소에는 라벨이 글자일 뿐이고 누를 수 없어요. 지도는 여행을 보는 화면이라 고치는 입구를 늘 띄우지 않아요.
 *  - isEditing이면 고칠 수 있는 라벨(canEditLegMode)만 눌러서 메뉴를 열고, 고칠 수 없는 라벨은 흐리게 둬요.
 *  - 어느 메뉴가 열렸는지는 라벨과 메뉴만 봐서 여기 둡니다. 고치기를 끝내면 RouteMap이 key를 바꿔 닫아요.
 *  - 메뉴는 다른 라벨 위에 보이게 라벨들 뒤에 그려요.
 *  - 타임라인을 앞으로 끌어 라벨이 사라지면 메뉴도 같이 안 보여요.
 *
 * @param {object} props
 * @param {{ leg: import('@/types').Leg, rect: import('@/utils/legLabels').MapRect }[]} props.labels 지금 보이는 라벨
 * @param {boolean} props.isEditing 이동 수단 고치기 모드
 */
export default function LegLabelLayer({ labels, isEditing }) {
  const [openLegId, setOpenLegId] = useState(null);
  const openLabel = labels.find(({ leg }) => leg.id === openLegId);

  // 재생 중에는 매 프레임 다시 그려서, 메뉴가 바깥 클릭 리스너를 다시 달지 않게 같은 함수를 넘겨요.
  const handleCloseMenu = useCallback(() => setOpenLegId(null), []);

  const handleSaved = (savedLeg) => {
    setOpenLegId((id) => (id === savedLeg.id ? null : id));
  };

  const handleToggleMenu = (legId) => {
    setOpenLegId((id) => (id === legId ? null : legId));
  };

  return (
    <>
      {labels.map(({ leg, rect }) => {
        const isEditable = isEditing && canEditLegMode(leg);
        return (
          <LegLabel
            key={leg.id}
            leg={leg}
            rect={rect}
            isOpen={leg.id === openLegId}
            isDimmed={isEditing && !isEditable}
            onOpen={isEditable ? () => handleToggleMenu(leg.id) : undefined}
          />
        );
      })}

      {isEditing && openLabel && (
        <LegModeMenu
          key={openLabel.leg.id}
          leg={openLabel.leg}
          rect={openLabel.rect}
          onSaved={handleSaved}
          onClose={handleCloseMenu}
        />
      )}
    </>
  );
}
