import { useId, useMemo, useState } from 'react';

import ArrowLink from '@/components/common/ArrowLink';
import { useLoadPosts } from '@/hooks/useLoadPosts';
import { useMyPhotos } from '@/hooks/useMyPhotos';
import { usePostStore } from '@/stores/postStore';
import { formatDateRange } from '@/utils/formatDateRange';
import {
  formatAnniversary,
  formatOnThisDayLead,
  formatOnThisDayTitle,
  formatYearsAgo,
  selectThumbPhotos,
} from '@/utils/onThisDay';
import { getStopPath } from '@/utils/stopPath';
import { getOneLiner, selectPostsOfStop } from '@/utils/tripStops';

import OnThisDayPhoto from './OnThisDayPhoto';

const PAGER_BUTTON_CLASS =
  'px-1 text-muted hover:text-ink disabled:cursor-default disabled:text-dim';

/**
 * 00b 한 장면이에요. 왼쪽에 지점의 대표 사진, 오른쪽에 그 해 이맘때의 글과 작은 사진 넷이 있어요(피그마 00b).
 *
 * 호출: OnThisDay가 그릴 장면이 하나 이상일 때만 그려요.
 * <OnThisDayScene journey={journey} items={items} />
 *
 * 의도:
 *  - 처음에는 가장 최근 해(items[0])를 보여 줘요. 걸리는 해가 둘 이상이면 [다른 해 같은 날 ← →]로 바꿔요.
 *    ←는 더 오래된 해, →는 더 최근 해예요. 끝에 닿으면 그쪽 화살표는 눌리지 않아요.
 *  - 고른 해는 번호가 아니라 "몇 년 전"으로 기억해요. 사진을 더 올려 Journey가 다시 계산되어 목록이 바뀌어도
 *    보던 해를 그대로 보여 주고, 그 해가 없어지면 가장 최근 해로 돌아가요.
 *  - 한 줄 글은 03 도시 블록과 같은 규칙이에요(첫 글 본문, 비면 제목). 글이 없거나 아직 못 받았으면 그 줄을 빼요.
 *  - 링크는 글을 다 받았는데 이 지점 글이 없으면 [그날의 기록 보기 →]예요(#243). 03이 글 없는 지점에 [글 보기]를
 *    안 보여 주는 것과 맞췄어요. 링크를 빼면 그 챕터 · 여행으로 갈 길이 없어져서 글자만 바꿔요.
 *    받는 중이거나 못 받았으면 글이 있을 수도 있어서 [그날의 글 보기 →] 그대로예요.
 *  - 작은 사진은 넓은 창에서 96px 네 장(피그마)이고, 창이 좁아 글 칸이 408px보다 좁아지면 칸에 맞춰 같이 줄어요.
 *    96px로 고정하면 좁은 창에서 화면 옆으로 나가요.
 *  - 피그마는 제목과 한 줄 글을 Playfair로 썼지만 도시 이름과 글이 한글이라, 03 도시 이름처럼 본문 글꼴로 써요.
 *
 * @param {object} props
 * @param {import('@/types').Journey} props.journey
 * @param {import('@/utils/onThisDay').OnThisDayItem[]} props.items 최근 해부터. 하나 이상이에요
 */
export default function OnThisDayScene({ journey, items }) {
  const titleId = useId();
  const [pickedYearsAgo, setPickedYearsAgo] = useState(null);
  const { photos } = useMyPhotos();
  const postsByDate = usePostStore((state) => state.byDate);
  const postsStatus = usePostStore((state) => state.status);

  useLoadPosts();

  const pickedIndex = items.findIndex((item) => item.yearsAgo === pickedYearsAgo);
  const index = pickedIndex === -1 ? 0 : pickedIndex;
  const item = items[index];
  const { stop } = item;

  const posts = useMemo(() => Object.values(postsByDate), [postsByDate]);
  const stopPosts = useMemo(
    () => selectPostsOfStop(journey, posts, stop.id),
    [journey, posts, stop.id],
  );
  const oneLiner = getOneLiner(stopPosts);
  const linkLabel =
    postsStatus === 'ready' && stopPosts.length === 0 ? '그날의 기록 보기' : '그날의 글 보기';
  const thumbs = useMemo(() => selectThumbPhotos(stop, photos), [stop, photos]);

  const older = items[index + 1];
  const newer = items[index - 1];

  return (
    <section aria-labelledby={titleId} className="px-16">
      <div className="mx-auto grid max-w-300 grid-cols-2 gap-20 border-t border-line py-25">
        <OnThisDayPhoto fileKey={stop.coverFileKey} size="full" className="aspect-56/62 w-full" />

        <div className="flex min-w-0 flex-col items-start gap-5 pt-12.5">
          <div className="flex items-center gap-3">
            <p className="font-serif text-sm font-bold text-muted">
              {formatYearsAgo(item.yearsAgo)}
            </p>
            <p className="bg-accent/10 px-3 py-1 text-2xs font-medium text-accent">
              {formatAnniversary(item)}
            </p>
          </div>
          <h2 id={titleId} className="text-8xl font-bold tracking-[-0.02em] break-keep text-ink">
            {formatOnThisDayTitle(stop)}
          </h2>
          <p className="text-3xl font-bold break-keep text-ink">{formatOnThisDayLead(item)}</p>
          <div aria-hidden="true" className="h-px w-full bg-line" />
          {oneLiner && (
            <p className="line-clamp-2 text-2xl leading-[1.6] text-body">{`“ ${oneLiner} ”`}</p>
          )}
          <p className="flex gap-2 text-md leading-body-md text-muted">
            <span>{formatDateRange(stop.from, stop.to)}</span>
            <span aria-hidden="true">·</span>
            <span>{stop.days}일</span>
            <span aria-hidden="true">·</span>
            <span>사진 {stop.photoCount}장</span>
          </p>
          {thumbs.length > 0 && (
            <ul className="grid w-full max-w-102 grid-cols-4 gap-2">
              {thumbs.map((photo) => (
                <li key={photo.id}>
                  <OnThisDayPhoto
                    fileKey={photo.fileKey}
                    size="thumb"
                    className="aspect-square w-full"
                  />
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center gap-6">
            <ArrowLink to={getStopPath(stop)} className="gap-1 text-lg">
              {linkLabel}
            </ArrowLink>
            {items.length > 1 && (
              <div className="flex items-center gap-1 text-md leading-body-md text-muted">
                <span className="mr-1">다른 해 같은 날</span>
                <button
                  type="button"
                  onClick={() => setPickedYearsAgo(older.yearsAgo)}
                  disabled={!older}
                  aria-label="더 오래된 해 보기"
                  className={PAGER_BUTTON_CLASS}
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => setPickedYearsAgo(newer.yearsAgo)}
                  disabled={!newer}
                  aria-label="더 최근 해 보기"
                  className={PAGER_BUTTON_CLASS}
                >
                  →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
