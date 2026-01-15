<script setup>
import { ref, onMounted, computed, onUnmounted, watch } from 'vue';
import { useTimeSync } from './utils/time';
import { useConfig } from './hooks/useConfig';
import { getNextBirthday, getLastBirthday, getBirthdayStats, getZonedDate } from './utils/birthday';
import { 
  differenceInSeconds,
  differenceInDays,
  isSameDay,
  format,
} from 'date-fns';
import { Lunar } from 'lunar-javascript';
import confetti from 'canvas-confetti';
import ConfigModal from './components/ConfigModal.vue';

const { syncTime, getServerTime, setDebugOffset } = useTimeSync();
const { config, loadConfig, generateShareUrl } = useConfig();

const currentTime = ref(Date.now());
const showConfig = ref(false);
const toastMsg = ref('');
const aiWish = ref(null);
const isFetchingWish = ref(false);

// 兜底文案
const FALLBACK_WISHES = {
  general: {
    greeting: "嘿 [昵称]，生日快乐！",
    content: "愿你像清晨的微风一样自在，在浅蓝色的天空下，遇见属于你的粉色奇迹。祝你新的一岁，万事顺遂w。",
    short_wish: "愿生活如诗，岁月如歌。",
    vibe_tag: "治愈"
  },
  no_year: {
    greeting: "致 [昵称]：生日快乐w",
    content: "不必计算岁月的长度，只需在意生活的温度。愿你的每一个日子，都像粉色云朵般轻盈柔软。",
    short_wish: "岁岁常欢愉，年年皆胜意。",
    vibe_tag: "轻盈"
  },
  with_age: {
    greeting: "[昵称]，[年龄]岁快乐！",
    content: "这是你来到这个世界的第 [天数] 天。愿你依然保持那份纯粹与好奇，在未来的日子里，继续闪闪发光吧。",
    short_wish: "保持热爱，奔赴山海。",
    vibe_tag: "星辰"
  }
};

// 定时器更新当前时间
let timer;
onMounted(async () => {
  loadConfig();
  await syncTime();
  timer = setInterval(() => {
    currentTime.value = getServerTime();
    checkAndFetchWish();
  }, 1000);

  // 初始化时，如果是生日当天，立即尝试获取
  if (status.value === 'birthday') {
    checkAndFetchWish();
  }

  // 暴露调试接口
  window.__debug_birthday = () => {
    if (!targetBirthday.value) return console.error('请先配置生日信息');
    const offset = targetBirthday.value.getTime() - Date.now() - 10000;
    setDebugOffset(offset);
    console.log('已跳转到生日倒计时 10 秒前');
  };

  window.__debug_api_trigger = () => {
    if (!targetBirthday.value) return console.error('请先配置生日信息');
    const offset = targetBirthday.value.getTime() - Date.now() - 62000;
    setDebugOffset(offset);
    console.log('已跳转到生日倒计时 1 分 02 秒前 (模拟 API 触发)');
  };
});

onUnmounted(() => {
  clearInterval(timer);
});

// 核心逻辑：计算目标生日
const targetBirthday = computed(() => {
  if (!config.value.month || !config.value.day) return null;
  return getNextBirthday(config.value, currentTime.value);
});

const lastBirthday = computed(() => {
  if (!config.value.month || !config.value.day) return null;
  return getLastBirthday(config.value, currentTime.value);
});

const diffSeconds = computed(() => {
  if (!targetBirthday.value) return 0;
  return differenceInSeconds(targetBirthday.value, currentTime.value);
});

const stats = computed(() => getBirthdayStats(config.value, currentTime.value));

// 检查并获取 AI 祝福
const checkAndFetchWish = async () => {
  if (status.value === 'empty' || isFetchingWish.value) return;
  
  // 情况 1: 生日前 1 分钟内 (60秒)
  // 情况 2: 已经是生日当天且没有 aiWish
  const isNearBirthday = diffSeconds.value <= 60 && diffSeconds.value > 0;
  const isBirthdayNow = status.value === 'birthday';

  if (isNearBirthday || (isBirthdayNow && !aiWish.value)) {
    const cacheKey = `wish_${config.value.name}_${config.value.celebrateType || config.value.type}_${config.value.inputType || config.value.type}_${config.value.year}_${config.value.month}_${config.value.day}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
      aiWish.value = JSON.parse(cached);
      return;
    }

    await fetchAIWish(cacheKey);
  }
};

const fetchAIWish = async (cacheKey) => {
  isFetchingWish.value = true;
  try {
    const response = await fetch('/api/validateWish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: config.value.name,
        type: config.value.celebrateType || config.value.type,
        inputType: config.value.inputType || config.value.type,
        date: `${config.value.month}-${config.value.day}`,
        hasYear: !!config.value.year,
        year: config.value.year,
        age: stats.value?.age,
        daysAlive: stats.value?.daysAlive
      })
    });
    
    if (!response.ok) throw new Error('API request failed');
    const data = await response.json();
    
    if (data.status === 'success') {
      aiWish.value = data.result;
      localStorage.setItem(cacheKey, JSON.stringify(data.result));
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('AI Wish Error:', error);
    aiWish.value = getFallbackWish();
  } finally {
    isFetchingWish.value = false;
  }
};

const getFallbackWish = () => {
  let template;
  if (config.value.year) {
    template = { ...FALLBACK_WISHES.with_age };
    template.greeting = template.greeting.replace('[年龄]', stats.value.age);
    template.content = template.content.replace('[天数]', stats.value.daysAlive);
  } else {
    template = { ...FALLBACK_WISHES.no_year };
  }
  
  template.greeting = template.greeting.replace('[昵称]', config.value.name);
  template.content = template.content.replace('[昵称]', config.value.name);
  return template;
};

// 监听配置变更，清除当前内存中的祝福，并尝试重新获取（如果是生日当天）
watch(config, () => {
  aiWish.value = null;
  // 如果修改后正好是生日，立即触发获取
  setTimeout(() => {
    if (status.value === 'birthday' || (diffSeconds.value <= 60 && diffSeconds.value > 0)) {
      checkAndFetchWish();
    }
  }, 0);
}, { deep: true });

const status = computed(() => {
  if (!config.value.name) return 'empty';
  if (!targetBirthday.value) return 'empty';
  const nowZoned = getZonedDate(currentTime.value);
  
  const isBirthdayToday = isSameDay(nowZoned, targetBirthday.value);

  if (isBirthdayToday) {
    triggerConfetti();
    return 'birthday';
  }

  const secondsInYear = 365 * 24 * 3600;
  if (diffSeconds.value > secondsInYear - 24 * 3600) return 'just_passed';
  if (diffSeconds.value > 0 && diffSeconds.value < 3600) return 'countdown_a';
  if (diffSeconds.value > 0 && diffSeconds.value < 86400) return 'countdown_b';
  return 'normal';
});

const countdownText = computed(() => {
  const s = diffSeconds.value;
  if (s <= 0) return '';
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;

  if (status.value === 'countdown_a') return `${String(minutes).padStart(2, '0')} : ${String(seconds).padStart(2, '0')}`;
  if (status.value === 'countdown_b') return `${String(hours).padStart(2, '0')} : ${String(minutes).padStart(2, '0')} : ${String(seconds).padStart(2, '0')}`;
  return `${days}天 ${String(hours).padStart(2, '0')}时 ${String(minutes).padStart(2, '0')}分 ${String(seconds).padStart(2, '0')}秒`;
});

const passedDays = computed(() => {
  if (!lastBirthday.value) return 0;
  return differenceInDays(getZonedDate(currentTime.value), lastBirthday.value);
});

const extraInfo = computed(() => {
  const nowZoned = getZonedDate(currentTime.value);
  const lunar = Lunar.fromDate(nowZoned);
  return {
    date: format(nowZoned, 'yyyy年MM月dd日'),
    weekday: ['日', '一', '二', '三', '四', '五', '六'][nowZoned.getDay()],
    lunar: `农历 ${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`
  };
});

const triggerConfetti = () => {
  confetti({ 
    particleCount: 150, 
    spread: 80, 
    origin: { y: 0.6 }, 
    colors: ['#FFD1DC', '#B3E5FC', '#FFEB3B', '#4CAF50', '#FF9800', '#E91E63', '#9C27B0'] 
  });
};

const share = async () => {
  const url = generateShareUrl();
  try {
    await navigator.clipboard.writeText(url);
    showToast('链接已复制到剪贴板');
  } catch (err) {
    showToast('复制失败，请手动复制浏览器地址');
  }
};

const showToast = (msg) => {
  toastMsg.value = msg;
  setTimeout(() => toastMsg.value = '', 3000);
};

const saveConfig = (newConfig) => { config.value = newConfig; };
</script>

<template>
  <div class="container">
    <header class="page-header">
      <div class="current-date">{{ extraInfo.date }} 星期{{ extraInfo.weekday }}</div>
      <div class="current-lunar">{{ extraInfo.lunar }}</div>
    </header>

    <button class="settings-btn" @click="showConfig = true">⚙️</button>
    
    <main v-if="status === 'empty'">
      <h1>🎂 生日快乐</h1>
      <p>点击右上角齿轮配置你的生日</p>
    </main>

    <main v-else-if="status === 'birthday'">
      <div class="birthday-card">
        <template v-if="aiWish">
          <div class="vibe-tag">{{ aiWish.vibe_tag }}</div>
          <h1>{{ aiWish.greeting }}</h1>
          <p class="wish">{{ aiWish.content }}</p>
          
          <div v-if="stats" class="stats-mini">
            这是你来到这个世界的第 <span class="highlight-small">{{ stats.daysAlive }}</span> 天
            <span v-if="config.year">，{{ stats.age }} 岁生日快乐！</span>
          </div>

          <div class="short-wish">{{ aiWish.short_wish }}</div>
        </template>
        <template v-else>
          <h1>🎉 生日快乐，{{ config.name }}！</h1>
          <p class="wish-center">愿你所得皆所愿，所行皆坦途。</p>
          <div v-if="stats" class="stats">
            这是你来到这个世界的第 <span class="highlight">{{ stats.daysAlive }}</span> 天
            <br />
            祝你 <span class="highlight">{{ stats.age }}</span> 岁生日快乐！
          </div>
        </template>
      </div>
    </main>

    <main v-else>
      <div class="user-greeting">你好，{{ config.name }}</div>
      <div class="countdown-container">
        <div class="label">距离下一个生日还有</div>
        <div class="timer tabular-nums">{{ countdownText }}</div>
      </div>
      <div class="passed-info" v-if="status === 'normal'">
        距上个生日已过 <span class="highlight-small">{{ passedDays }}</span> 天
      </div>
      <div class="info-footer">
        <span>星期{{ extraInfo.weekday }}</span>
        <span class="divider">|</span>
        <span>{{ extraInfo.lunar }}</span>
      </div>
      <div v-if="status === 'just_passed'" class="passed-msg">生日刚刚过去，期待下一次相遇 ✨</div>
    </main>

    <div class="actions-footer">
      <button @click="share">分享配置</button>
    </div>

    <footer class="page-footer">
      <a href="https://github.com/senzi/birth-day" target="_blank" rel="noopener noreferrer">GitHub</a>
      <span class="footer-divider">|</span>
      <span>MIT · Vibecoding</span>
    </footer>

    <ConfigModal :show="showConfig" :config="config" @close="showConfig = false" @save="saveConfig" />
    <Transition name="fade">
      <div v-if="toastMsg" class="toast">{{ toastMsg }}</div>
    </Transition>
  </div>
</template>

<style scoped>
.container { min-height: 80vh; display: flex; flex-direction: column; justify-content: center; align-items: center; position: relative; padding-top: 60px; }
.page-header { position: absolute; top: 20px; left: 20px; text-align: left; color: #666; font-size: 0.9rem; line-height: 1.4; }
.current-date { font-weight: 500; }
.current-lunar { opacity: 0.8; }
.settings-btn { position: fixed; top: 20px; right: 20px; font-size: 1.5rem; background: none; border: none; padding: 10px; z-index: 10; }
.user-greeting { font-size: 1.2rem; margin-bottom: 2rem; opacity: 0.8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 90vw; }
.countdown-container .label { font-size: 1rem; margin-bottom: 1rem; color: #666; }
.timer { font-size: 3.5rem; font-weight: bold; color: #2c3e50; text-shadow: 0 2px 10px rgba(0,0,0,0.05); white-space: nowrap; }
.info-footer { margin-top: 2rem; font-size: 0.9rem; color: #888; }
.divider { margin: 0 10px; }
.birthday-card { max-width: 500px; padding: 2rem; }
.vibe-tag { display: inline-block; padding: 4px 12px; background: rgba(255, 255, 255, 0.5); border-radius: 20px; font-size: 0.8rem; margin-bottom: 1rem; color: #888; }
.birthday-card h1 { font-size: 2.2rem; margin-bottom: 1.5rem; color: #2c3e50; }
.wish { font-size: 1.1rem; line-height: 1.8; margin-bottom: 1.5rem; color: #444; text-align: left; }
.wish-center { font-size: 1.1rem; line-height: 1.8; margin-bottom: 2rem; color: #444; text-align: center; }
.stats-mini { font-size: 0.9rem; color: #888; margin-bottom: 1.5rem; text-align: left; border-left: 3px solid #ffd1dc; padding-left: 1rem; }
.short-wish { font-style: italic; color: #666; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 1rem; text-align: center; }
.highlight { font-weight: bold; color: #ff6b81; font-size: 1.4rem; }
.highlight-small { font-weight: bold; color: #ff6b81; }
.passed-info { margin-top: 1rem; font-size: 0.9rem; color: #888; }
.actions-footer { margin-top: 4rem; }
.page-footer { margin-top: 2rem; font-size: 0.8rem; color: #aaa; display: flex; align-items: center; gap: 10px; }
.page-footer a { color: #aaa; text-decoration: none; transition: color 0.3s; }
.page-footer a:hover { color: #888; }
.footer-divider { opacity: 0.3; }
.toast { position: fixed; bottom: 50px; background: rgba(0,0,0,0.7); color: white; padding: 10px 20px; border-radius: 20px; font-size: 0.9rem; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.5s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
@media (max-width: 600px) { 
  .timer { font-size: 8vw; } 
  .user-greeting { font-size: 1rem; }
  .birthday-card h1 { font-size: 1.8rem; } 
}
</style>
