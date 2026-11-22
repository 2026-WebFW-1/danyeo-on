import { MAX_POST_TAG_LENGTH } from '@/constants/post';
import { normalizeTags } from '@/utils/postForm';

/**
 * 글의 태그 칸
 *
 * 책임: 태그를 보여 주고, Enter나 쉼표로 넣고 ✕로 뺍니다. 값은 PostEditor가 들고 있습니다.
 *
 * 호출: PostEditor
 * <PostTagField tags={form.tags} text={tagText} isDisabled={!isReady} onTagsChange={...} onTextChange={setTagText} />
 *
 * 의도: 칸에 쓰는 중인 글자(text)도 PostEditor가 들고 있습니다. Enter를 안 눌렀어도 저장에 넣어야 해서요.
 *
 * 주의할 것들:
 *  - 쉼표는 onChange에서 봅니다. keydown으로 보면 붙여 넣은 "여름, 겨울"을 나누지 못해요.
 *
 * 피그마: https://www.figma.com/design/gwBUdHoYY9mr6JtNbvCsxY/danyeo-on?node-id=195-172
 */
export default function PostTagField({ tags, text, isDisabled, onTagsChange, onTextChange }) {
  const addTags = (items) => {
    onTagsChange(normalizeTags([...tags, ...items]));
    onTextChange('');
  };

  const handleChange = (event) => {
    const { value } = event.target;
    if (value.includes(',')) addTags(value.split(','));
    else onTextChange(value);
  };

  const handleKeyDown = (event) => {
    // 한글을 조합하는 중의 Enter는 조합을 끝내는 키예요. 여기서 넣으면 끝 글자가 따로 들어가요.
    if (event.key === 'Enter' && !event.nativeEvent.isComposing) addTags([text]);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex max-w-full items-center gap-2 border border-line px-3 py-1 text-sm font-normal break-all text-ink"
        >
          #{tag}
          <button
            type="button"
            aria-label={`${tag} 빼기`}
            disabled={isDisabled}
            onClick={() => onTagsChange(tags.filter((item) => item !== tag))}
            className="text-dim"
          >
            ✕
          </button>
        </span>
      ))}
      <input
        type="text"
        name="tag"
        aria-label="태그 추가"
        placeholder="+ 태그"
        maxLength={MAX_POST_TAG_LENGTH}
        disabled={isDisabled}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className="w-24 border border-line px-3 py-1 text-sm font-normal text-ink placeholder:text-dim disabled:opacity-60"
      />
    </div>
  );
}
