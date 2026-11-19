import { useCallback, useRef, useState } from 'react';

import { canEditLegMode } from '@/utils/legMode';
import { applyZoom, IDENTITY_ZOOM, unscaleAt } from '@/utils/mapZoom';
import { calcLegPoint, mapProjection } from '@/utils/routeMap';

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
 *  - Esc나 고르기로 메뉴를 닫으면 연 라벨로 포커스를 돌려줘요. 메뉴가 사라지면 포커스가 문서 처음으로 빠져서
 *    키보드로는 지도에서 하던 자리를 잃어요. 메뉴 밖을 눌러 닫을 땐 누른 곳으로 가니 그대로 둬요.
 *  - 지도를 확대하면(#184) 라벨과 메뉴를 구간 가운데를 중심으로 다시 줄여요. 그래서 크기와
 *    구간에서 떨어진 거리는 화면에서 그대로이고, 자리만 구간을 따라가요.
 *    라벨 자리(rect)는 확대하지 않은 지도에서 한 번 정한 값이라, 확대해서 생긴 빈자리로 숨긴 라벨을 다시 꺼내지는 않아요.
 *
 * @param {object} props
 * @param {{ leg: import('@/types').Leg, rect: import('@/utils/legLabels').MapRect }[]} props.labels 지금 보이는 라벨
 * @param {boolean} props.isEditing 이동 수단 고치기 모드
 * @param {(leg: import('@/types').Leg, mode: import('@/types').Leg['mode']) => void} [props.onChangeMode]
 *   메뉴에서 고르면 불러요. 초안에만 담겨요(useLegModeDraft)
 * @param {import('@/utils/mapZoom').MapZoom} [props.zoom] RouteMap의 확대 상태
 */
export default function LegLabelLayer({ labels, isEditing, onChangeMode, zoom = IDENTITY_ZOOM }) {
  const [openLegId, setOpenLegId] = useState(null);
  // 구간 ID → 누를 수 있는 라벨 버튼
  const triggersRef = useRef(new Map());
  const openLabel = labels.find(({ leg }) => leg.id === openLegId);

  // 재생 중에는 매 프레임 다시 그려서, 메뉴가 바깥 클릭 리스너를 다시 달지 않게 같은 함수를 넘겨요.
  const handleCloseMenu = useCallback(() => setOpenLegId(null), []);

  const handleDismissMenu = () => {
    triggersRef.current.get(openLegId)?.focus();
    setOpenLegId(null);
  };

  const setTrigger = (legId, node) => {
    if (node) triggersRef.current.set(legId, node);
    else triggersRef.current.delete(legId);
  };

  const handleToggleMenu = (legId) => {
    setOpenLegId((id) => (id === legId ? null : legId));
  };

  const unscaleAtLeg = (leg) => {
    const [x, y] = mapProjection(calcLegPoint(leg, 0.5));
    return unscaleAt(zoom.k, x, y);
  };

  // 메뉴가 화면 아래로 넘치는지는 확대한 화면에서의 라벨 아래 끝으로 봐요.
  const calcScreenBottom = ({ leg, rect }) => {
    const anchor = mapProjection(calcLegPoint(leg, 0.5));
    return applyZoom(zoom, anchor)[1] + (rect.bottom - anchor[1]);
  };

  return (
    <>
      {labels.map(({ leg, rect }) => {
        const isEditable = isEditing && onChangeMode !== undefined && canEditLegMode(leg);
        return (
          <g key={leg.id} transform={unscaleAtLeg(leg)}>
            <LegLabel
              leg={leg}
              rect={rect}
              isOpen={leg.id === openLegId}
              isDimmed={isEditing && !isEditable}
              onOpen={isEditable ? () => handleToggleMenu(leg.id) : undefined}
              ref={isEditable ? (node) => setTrigger(leg.id, node) : undefined}
            />
          </g>
        );
      })}

      {isEditing && onChangeMode && openLabel && (
        <g key={openLabel.leg.id} transform={unscaleAtLeg(openLabel.leg)}>
          <LegModeMenu
            leg={openLabel.leg}
            rect={openLabel.rect}
            screenBottom={calcScreenBottom(openLabel)}
            onSelect={onChangeMode}
            onClose={handleCloseMenu}
            onDismiss={handleDismissMenu}
          />
        </g>
      )}
    </>
  );
}
