<template>
  <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <h3>配置生日信息</h3>
      <div class="form-group">
        <label>称呼</label>
        <input v-model="localConfig.name" placeholder="怎么称呼你？" />
      </div>
      
      <div class="form-group">
        <label>过生日方式</label>
        <div class="radio-group">
          <label><input type="radio" v-model="localConfig.celebrateType" value="solar" /> 新历</label>
          <label><input type="radio" v-model="localConfig.celebrateType" value="lunar" /> 农历</label>
        </div>
      </div>

      <div class="form-group">
        <label>生日填写类型</label>
        <div class="radio-group">
          <label><input type="radio" v-model="localConfig.inputType" value="solar" /> 新历</label>
          <label><input type="radio" v-model="localConfig.inputType" value="lunar" /> 农历</label>
        </div>
      </div>

      <div class="form-group">
        <label>出生年份 ({{ isYearRequired ? '必填' : '选填' }})</label>
        <input type="number" v-model.number="localConfig.year" placeholder="如 1995" />
        <div v-if="isYearRequired && !localConfig.year" class="hint">
          过农历生日但填写新历生日时，需要出生年份用于换算。
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>{{ localConfig.inputType === 'lunar' ? '农历月份' : '月' }}</label>
          <select v-model.number="localConfig.month">
            <option v-for="m in 12" :key="m" :value="m">
              {{ localConfig.inputType === 'lunar' ? LUNAR_MONTHS[m-1] : m + '月' }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>{{ localConfig.inputType === 'lunar' ? '农历日期' : '日' }}</label>
          <select v-model.number="localConfig.day">
            <option v-for="d in (localConfig.inputType === 'lunar' ? 30 : 31)" :key="d" :value="d">
              {{ localConfig.inputType === 'lunar' ? LUNAR_DAYS[d-1] : d + '日' }}
            </option>
          </select>
        </div>
      </div>

      <div class="actions">
        <button :disabled="isYearRequired && !localConfig.year" @click="save">保存</button>
        <button @click="$emit('close')">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';

const LUNAR_MONTHS = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];
const LUNAR_DAYS = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'
];

const props = defineProps({
  show: Boolean,
  config: Object
});

const emit = defineEmits(['close', 'save']);

const localConfig = ref({
  celebrateType: 'solar',
  inputType: 'solar',
  ...props.config
});

watch(() => props.config, (newVal) => {
  localConfig.value = {
    celebrateType: 'solar',
    inputType: 'solar',
    ...newVal
  };
}, { deep: true });

const isYearRequired = computed(() => {
  return localConfig.value.celebrateType === 'lunar' && localConfig.value.inputType === 'solar';
});

const save = () => {
  if (isYearRequired.value && !localConfig.value.year) return;
  emit('save', { ...localConfig.value });
  emit('close');
};
</script>

<style scoped>
.form-group {
  margin-bottom: 1rem;
  text-align: left;
}
.form-group label {
  display: block;
  font-size: 0.9rem;
  margin-bottom: 0.3rem;
  color: #666;
}
input, select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-sizing: border-box;
}
.form-row {
  display: flex;
  gap: 1rem;
}
.form-row .form-group {
  flex: 1;
}
.radio-group {
  display: flex;
  gap: 1rem;
}
.actions {
  margin-top: 1.5rem;
  display: flex;
  gap: 1rem;
}
.actions button {
  flex: 1;
}
.actions button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.hint {
  margin-top: 0.4rem;
  font-size: 0.8rem;
  color: #c06c5a;
}
</style>
