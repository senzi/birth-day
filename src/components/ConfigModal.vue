<template>
  <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <h3>配置生日信息</h3>
      <div class="form-group">
        <label>称呼</label>
        <input v-model="localConfig.name" placeholder="怎么称呼你？" />
      </div>
      
      <div class="form-group">
        <label>生日类型</label>
        <div class="radio-group">
          <label><input type="radio" v-model="localConfig.type" value="solar" /> 公历</label>
          <label><input type="radio" v-model="localConfig.type" value="lunar" /> 农历</label>
        </div>
      </div>

      <div class="form-group">
        <label>出生年份 (选填)</label>
        <input type="number" v-model.number="localConfig.year" placeholder="如 1995" />
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>{{ localConfig.type === 'lunar' ? '农历月份' : '月' }}</label>
          <select v-model.number="localConfig.month">
            <option v-for="m in 12" :key="m" :value="m">
              {{ localConfig.type === 'lunar' ? LUNAR_MONTHS[m-1] : m + '月' }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>{{ localConfig.type === 'lunar' ? '农历日期' : '日' }}</label>
          <select v-model.number="localConfig.day">
            <option v-for="d in (localConfig.type === 'lunar' ? 30 : 31)" :key="d" :value="d">
              {{ localConfig.type === 'lunar' ? LUNAR_DAYS[d-1] : d + '日' }}
            </option>
          </select>
        </div>
      </div>

      <div class="actions">
        <button @click="save">保存</button>
        <button @click="$emit('close')">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

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

const localConfig = ref({ ...props.config });

watch(() => props.config, (newVal) => {
  localConfig.value = { ...newVal };
}, { deep: true });

const save = () => {
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
</style>
