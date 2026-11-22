import { cn } from '@/utils/cn';

/**
 * 새 탭으로 여는 바깥 링크예요. 01 지도 구석의 OSM 표기와 출처 페이지의 라이선스 · 원본 링크가 같은 모양이에요.
 *
 * <ExternalLink href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</ExternalLink>
 *
 * @param {object} props
 * @param {string} props.href
 * @param {string} [props.className]
 * @param {import('react').ReactNode} props.children
 */
export default function ExternalLink({ href, className, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn('underline underline-offset-2 hover:text-accent', className)}
    >
      {children}
    </a>
  );
}
