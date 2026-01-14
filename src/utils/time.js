import { ref } from 'vue';

const debugOffset = ref(0);

export function useTimeSync() {
  const syncTime = async () => {
    console.log('Using local system time.');
  };

  const getServerTime = () => Date.now() + debugOffset.value;

  const setDebugOffset = (offsetMs) => {
    debugOffset.value = offsetMs;
    console.log(`Debug offset set to: ${offsetMs}ms`);
  };

  return {
    syncTime,
    getServerTime,
    setDebugOffset,
    isSynced: ref(true)
  };
}
