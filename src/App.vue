<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { useTimeSync } from './utils/time';
import { useConfig } from './hooks/useConfig';
import { getNextBirthday, getBirthdayStats, getZonedDate } from './utils/birthday';
import { 
  differenceInSeconds, 
  differenceInHours, 
  isSameDay, 
  format,
  startOfDay,
  endOfDay
} from 'date-fns';
import { Solar, Lunar } from 'lunar-javascript';
import confetti from 'canvas-confetti';
import ConfigModal from './components/ConfigModal.vue';

const { syncTime, getServerTime, setDebugOffset } = useTimeSync();
const { config, loadConfig, generateShareUrl } = useConfig();

const currentTime = ref(Date.now());
const showConfig = ref(false);
const toastMsg = ref('');

// 定时器更新当前时间
let timer;
onMounted(async () => {
  loadConfig();
  await syncTime();
  timer = setInterval(() => {
    currentTime.value = getServerTime();
  }, 1000);

  // 暴露调试接口
  window.__debug_birthday = () => {
    if (!targetBirthday.value) {
      console.error('请先配置生日信息');
      return;
    }
    // 计算目标生日时间戳 - 当前时间戳 - 10秒
    const targetTs = targetBirthday.value.getTime();
    const nowTs = Date.now();
    const offset = targetTs - nowTs - 10000;
    setDebugOffset(offset);
    console.log('已跳转到生日倒计时 10 秒前');
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

// 计算时间差（秒）
const diffSeconds = computed(() => {
  if (!targetBirthday.value) return 0;
  // 如果是今天，diff 可能是负数或 0
  return differenceInSeconds(targetBirthday.value, currentTime.value);
});

// 界面状态判断
const status = computed(() => {
  if (!config.value.name) return 'empty';
  
  const nowZoned = getZonedDate(currentTime.value);
  const target = targetBirthday.value;
  
  // 1. 是否是当天 (生日当天)
  let isBirthdayToday = false;
  if (config.value.type === 'solar') {
    isBirthdayToday = nowZoned.getMonth() + 1 === config.value.month && nowZoned.getDate() === config.value.day;
  } else {
    const lunarNow = Lunar.fromDate(nowZoned);
    isBirthdayToday = lunarNow.getMonth() === config.value.month && lunarNow.getDay() === config.value.day;
  }

  if (isBirthdayToday) {
    triggerConfetti();
    return 'birthday';
  }

  // 2. 刚刚过去 (24小时内)
  // 逻辑：如果“上一个生日”在 24 小时内
  // 这里简化处理：如果 diffSeconds 很大（接近一年），说明刚过
  const secondsInYear = 365 * 24 * 3600;
  if (diffSeconds.value > secondsInYear - 24 * 3600) {
    return 'just_passed';
  }

  // 3. 倒计时 A (< 1小时)
  if (diffSeconds.value > 0 && diffSeconds.value < 3600) {
    return 'countdown_a';
  }

  // 4. 倒计时 B (< 24小时)
  if (diffSeconds.value > 0 && diffSeconds.value < 86400) {
    return 'countdown_b';
  }

  // 5. 平时状态
  return 'normal';
});

// 格式化倒计时
const countdownText = computed(() => {
  const s = diffSeconds.value;
  if (s <= 0) return '';
  
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;

  if (status.value === 'countdown_a') {
    return `${String(minutes).padStart(2, '0')} : ${String(seconds).padStart(2, '0')}`;
  }
  if (status.value === 'countdown_b') {
    return `${String(hours).padStart(2, '0')} : ${String(minutes).padStart(2, '0')} : ${String(seconds).padStart(2, '0')}`;
  }
  return `${days}天 ${String(hours).padStart(2, '0')}时 ${String(minutes).padStart(2, '0')}分 ${String(seconds).padStart(2, '0')}秒`;
});

// 附加信息
const extraInfo = computed(() => {
  const nowZoned = getZonedDate(currentTime.value);
  const lunar = Lunar.fromDate(nowZoned);
  return {
    weekday: ['日', '一', '二', '三', '四', '五', '六'][nowZoned.getDay()],
    lunar: `农历 ${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`
  };
});

const stats = computed(() => getBirthdayStats(config.value, currentTime.value));

const triggerConfetti = () => {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#FFD1DC', '#B3E5FC', '#FFFFFF']
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

const saveConfig = (newConfig) => {
  config.value = newConfig;
};
</script>

<template>
  <div class="container">
    <button class="settings-btn" @click="showConfig = true">⚙️</button>
    
    <main v-if="status === 'empty'">
      <h1>🎂 生日快乐</h1>
      <p>点击右上角齿轮配置你的生日</p>
    </main>

    <main v-else-if="status === 'birthday'">
      <div class="birthday-card">
        <h1>🎉 生日快乐，{{ config.name }}！</h1>
        <p class="wish">愿你所得皆所愿，所行皆坦途。</p>
        <div v-if="stats" class="stats">
          这是你来到这个世界的第 <span class="highlight">{{ stats.daysAlive }}</span> 天
          <br />
          祝你 <span class="highlight">{{ stats.age }}</span> 岁生日快乐！
        </div>
      </div>
    </main>

    <main v-else>
      <div class="user-greeting">你好，{{ config.name }}</div>
      
      <div class="countdown-container">
        <div class="label">距离下一个生日还有</div>
        <div class="timer tabular-nums">{{ countdownText }}</div>
      </div>

      <div class="info-footer">
        <span>星期{{ extraInfo.weekday }}</span>
        <span class="divider">|</span>
        <span>{{ extraInfo.lunar }}</span>
      </div>

      <div v-if="status === 'just_passed'" class="passed-msg">
        生日刚刚过去，期待下一次相遇 ✨
      </div>
    </main>

    <div class="actions-footer">
      <button @click="share">分享配置</button>
    </div>

    <ConfigModal 
      :show="showConfig" 
      :config="config" 
      @close="showConfig = false" 
      @save="saveConfig" 
    />

    <Transition name="fade">
      <div v-if="toastMsg" class="toast">{{ toastMsg }}</div>
    </Transition>
  </div>
</template>

<style scoped>
.container {
  min-height: 80vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
}

.settings-btn {
  position: fixed;
  top: 20px;
  right: 20px;
  font-size: 1.5rem;
  background: none;
  border: none;
  padding: 10px;
}

.user-greeting {
  font-size: 1.2rem;
  margin-bottom: 2rem;
  opacity: 0.8;
}

.countdown-container .label {
  font-size: 1rem;
  margin-bottom: 1rem;
  color: #666;
}

.timer {
  font-size: 3.5rem;
  font-weight: bold;
  color: #2c3e50;
  text-shadow: 0 2px 10px rgba(0,0,0,0.05);
}

.info-footer {
  margin-top: 2rem;
  font-size: 0.9rem;
  color: #888;
}
.divider {
  margin: 0 10px;
}

.birthday-card h1 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}
.wish {
  font-size: 1.2rem;
  margin-bottom: 2rem;
}
.highlight {
  font-weight: bold;
  color: #ff6b81;
  font-size: 1.4rem;
}

.actions-footer {
  margin-top: 4rem;
}

.toast {
  position: fixed;
  bottom: 50px;
  background: rgba(0,0,0,0.7);
  color: white;
  padding: 10px 20px;
  border-radius: 20px;
  font-size: 0.9rem;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

@media (max-width: 600px) {
  .timer {
    font-size: 2rem;
  }
}
</style>
