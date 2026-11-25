import { useRef, useState } from 'react';
import { Link } from 'react-router';

import { useCorrections } from '@/hooks/useCorrections';
import { cn } from '@/utils/cn';
import { selectHomeCandidates } from '@/utils/homePicker';

import HomeBadge from './HomeBadge';
import HomePicker from './HomePicker';
import { SECTION_CLASS } from './sectionClass';

const OUTLINE_BUTTON_CLASS =
  'border border-ink bg-white px-5 py-3 text-md font-bold text-ink disabled:border-line disabled:bg-line disabled:text-dim';

/**
 * 05 집 칸이에요. 지금 집과 그 집이 어떻게 정해졌는지 보여 주고, 내 도시 중에서 집을 다시 고르게 해요.
 *
 * 책임: 닫힌 줄, 펼침 여부, 저장(home 보정 추가 · 삭제)과 그 진행 · 실패 안내를 맡아요. 목록은 HomePicker가 그려요.
 * 호출: PassportView가 통계 줄과 입국 스탬프 사이에, 여행이 없을 때는 안내 위에 그려요.
 * <HomeSection journey={journey} />
 *
 * 의도:
 *  - 펼침 여부 · 저장 단계는 이 칸에서만 써서 지역 상태예요. 보정과 Journey는 기존 스토어(useCorrections)가 들고,
 *    저장하면 스토어가 Journey를 다시 계산해서 05의 다른 영역도 따라 바뀌어요.
 *  - 저장 단계: saving(보정을 보내는 중) → refreshing(저장됨, Journey 계산은 journeyStatus를 봐요) / saveFailed.
 *    보정 저장이 실패하면 [다시 시도]가 같은 저장을 다시 하고, 보정은 저장됐는데 계산이 실패하면 계산만 다시 해요.
 *  - 직접 지정한 집은 home 보정이 하나가 아닐 수 있어서(마지막 것만 효력이 있어요) 되돌릴 때는 전부 지워요.
 *  - 집을 모르면(journey.home이 null) 사진을 올리라고 안내하고, 고를 도시가 있으면 [집 고르기]도 둬요.
 *
 * @param {object} props
 * @param {import('@/types').Journey | null} props.journey
 * @param {string} [props.className] 위 여백 등 놓을 자리
 */
export default function HomeSection({ journey, className }) {
  const { corrections, status, add, removeMany, journeyStatus, refreshJourney } = useCorrections();
  const [isOpen, setIsOpen] = useState(false);
  const [phase, setPhase] = useState('idle');
  // 보정 저장이 실패했을 때 [다시 시도]가 다시 할 일이에요. 렌더에 안 쓰는 값이라 ref예요.
  const retryRef = useRef(null);

  const home = journey?.home ?? null;
  const isPinned = home?.source === 'user';
  const hasTrips = (journey?.trips.length ?? 0) > 0;
  const canPick = home !== null || selectHomeCandidates(journey).length > 0;

  const isBusy = phase === 'saving' || (phase === 'refreshing' && journeyStatus === 'building');
  const isFailed = phase === 'saveFailed' || (phase === 'refreshing' && journeyStatus === 'failed');

  const run = async (action) => {
    retryRef.current = action;
    setIsOpen(false);
    setPhase('saving');
    try {
      await action();
      setPhase('refreshing');
    } catch (error) {
      console.error(error);
      setPhase('saveFailed');
    }
  };

  const handleConfirm = (candidate) =>
    run(() => add({ type: 'home', photoIds: [candidate.photoId] }));

  const handleRevert = () => {
    const ids = corrections.filter((item) => item.type === 'home').map((item) => item.id);
    return run(() => removeMany(ids));
  };

  const handleRetry = () => {
    if (phase === 'saveFailed') return run(retryRef.current);
    return refreshJourney();
  };

  let description;
  if (isBusy) {
    description = (
      <p role="status" className="text-md text-muted">
        여행을 정리하는 중…
      </p>
    );
  } else if (isFailed) {
    description = (
      <p role="alert" className="text-md text-accent">
        집을 바꾸지 못했어요. 잠시 뒤 다시 시도해 주세요.
      </p>
    );
  } else if (!home) {
    description = (
      <p className="text-md text-muted">
        {hasTrips
          ? '집에서 찍은 사진을 한 장 올려 주세요. 위치 정보가 있는 사진이어야 해요.'
          : '사진을 올리면 집을 고를 수 있어요. 집에서 찍은 사진도 한 장 올려 주세요.'}
      </p>
    );
  } else {
    description = (
      <p className="text-md text-muted">
        {isPinned
          ? '여행마다 집에서 나가 집으로 돌아오는 것으로 동선을 그려요.'
          : '사진이 가장 많이 찍힌 곳을 집으로 봤어요. 다르면 직접 고를 수 있어요.'}
      </p>
    );
  }

  const toggleButton = (label) => (
    <button
      type="button"
      aria-expanded={isOpen}
      aria-controls="passport-home-picker"
      disabled={isBusy}
      onClick={() => setIsOpen((prev) => !prev)}
      className={OUTLINE_BUTTON_CLASS}
    >
      {isOpen ? '닫기' : label}
    </button>
  );

  let actions;
  if (isFailed) {
    actions = (
      <button type="button" onClick={handleRetry} className={OUTLINE_BUTTON_CLASS}>
        다시 시도
      </button>
    );
  } else if (!home) {
    actions = (
      <>
        {canPick && toggleButton('집 고르기')}
        {!isOpen && (
          <Link to="/upload" className={OUTLINE_BUTTON_CLASS}>
            사진 올리기
          </Link>
        )}
      </>
    );
  } else {
    actions = (
      <>
        {isPinned && (
          <button
            type="button"
            disabled={isBusy || status !== 'ready'}
            onClick={handleRevert}
            className="text-md text-muted underline disabled:text-dim"
          >
            자동으로 되돌리기
          </button>
        )}
        {toggleButton('집 바꾸기')}
      </>
    );
  }

  return (
    <section aria-labelledby="passport-home" className={cn(SECTION_CLASS, className)}>
      <div className="border-b border-line py-12">
        <div className="flex items-start">
          <div className="flex w-65 shrink-0 flex-col gap-1">
            <p className="font-serif text-md font-bold text-muted">HOME</p>
            <h2 id="passport-home" className="text-3xl font-bold text-ink">
              집
            </h2>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-center gap-3">
              {home ? (
                <>
                  <p className="text-3xl font-bold text-ink">{home.city}</p>
                  <HomeBadge isStrong={isPinned}>
                    {isPinned ? '직접 지정한 집' : '자동으로 잡은 집'}
                  </HomeBadge>
                </>
              ) : (
                <p className="text-3xl font-bold text-dim">아직 집을 몰라요</p>
              )}
            </div>
            {description}
          </div>
          <div className="flex shrink-0 items-center gap-6">{actions}</div>
        </div>
        {isOpen && (
          <div id="passport-home-picker">
            <HomePicker journey={journey} onConfirm={handleConfirm} />
          </div>
        )}
      </div>
    </section>
  );
}
