import { ref, watch, onMounted } from 'vue';

const STORAGE_KEY = 'birthday_config';

export function useConfig() {
  const config = ref({
    name: '',
    type: 'solar', // 'solar' | 'lunar'
    year: null,
    month: 1,
    day: 1
  });

  const loadConfig = () => {
    // 1. 尝试从 URL 加载
    const urlParams = new URLSearchParams(window.location.search);
    const dataParam = urlParams.get('data');
    if (dataParam) {
      try {
        // 解码 Base64 并还原中文字符
        const decodedStr = decodeURIComponent(Array.prototype.map.call(atob(dataParam), (c) => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        const decoded = JSON.parse(decodedStr);
        config.value = { ...config.value, ...decoded };
        saveToLocal(config.value); // 同步到本地
        return;
      } catch (e) {
        console.error('Failed to decode URL data', e);
      }
    }

    // 2. 尝试从 LocalStorage 加载
    const localData = localStorage.getItem(STORAGE_KEY);
    if (localData) {
      try {
        config.value = JSON.parse(localData);
      } catch (e) {
        console.error('Failed to parse local config', e);
      }
    }
  };

  const saveToLocal = (newConfig) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
  };

  const generateShareUrl = () => {
    // 使用 encodeURIComponent 处理中文字符，再转 Base64
    const jsonStr = JSON.stringify(config.value);
    const base64 = btoa(encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (match, p1) => {
      return String.fromCharCode('0x' + p1);
    }));
    const url = new URL(window.location.href);
    url.searchParams.set('data', base64);
    return url.toString();
  };

  watch(config, (newVal) => {
    saveToLocal(newVal);
  }, { deep: true });

  return {
    config,
    loadConfig,
    generateShareUrl
  };
}
