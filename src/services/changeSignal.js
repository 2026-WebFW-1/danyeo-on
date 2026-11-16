/**
 * 기억해 둔 서버 데이터가 바뀌었다고 알리는 신호예요. 훅이 useSyncExternalStore로 구독해요.
 * 서비스가 기억을 지운 뒤 notify를 부르면 version이 올라가고, 그 version을 의존성에 둔 훅이 다시 읽어요.
 *
 * const journeyChanged = createChangeSignal();
 * const version = useSyncExternalStore(journeyChanged.subscribe, journeyChanged.getVersion);
 *
 * @returns {{
 *   subscribe: (listener: () => void) => () => void,
 *   getVersion: () => number,
 *   notify: () => void,
 * }}
 */
export function createChangeSignal() {
  let version = 0;
  const listeners = new Set();
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getVersion: () => version,
    notify() {
      version += 1;
      listeners.forEach((listener) => listener());
    },
  };
}
