<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from '@/i18n';

import ToolLayout from '@/components/ToolLayout.vue';
import { ui } from '@/lib/ui';

const { t, locale } = useI18n();

const salary = ref('');
const workDays = ref('25');
const workHours = ref('9');
const overtimeHours = ref('');

function num(raw: string) {
  const v = parseFloat(raw);
  return Number.isFinite(v) ? v : NaN;
}

function formatRp(n: number) {
  if (!Number.isFinite(n)) return '—';
  const loc = locale.value === 'id' ? 'id-ID' : 'en-US';
  return 'Rp ' + Math.round(n).toLocaleString(loc);
}

const result = computed(() => {
  const s = num(salary.value);
  const days = num(workDays.value);
  const hours = num(workHours.value);
  const ot = num(overtimeHours.value);
  if (!(s > 0) || !(days > 0) || !(hours > 0) || !(ot >= 0)) {
    return {
      ready: false,
      hourly: '—',
      overtime: '—',
      total: '—',
      note: t('overtime.fillNote'),
    };
  }
  const hourlyWage = s / (days * hours);
  const overtimePay = ot * hourlyWage;
  return {
    ready: true,
    hourly: formatRp(hourlyWage),
    overtime: formatRp(overtimePay),
    total: formatRp(s + overtimePay),
    note: t('overtime.formula'),
  };
});
</script>

<template>
  <ToolLayout :title="t('tools.overtime.title')" :description="t('overtime.lead')">
    <section :class="[ui.panel, 'reveal']">
      <p :class="ui.panelTitle">{{ t('common.input') }}</p>
      <div :class="ui.card">
        <div class="grid" :class="ui.formAuto">
          <div>
            <label :class="ui.label" for="salary">{{ t('overtime.salary') }}</label>
            <input id="salary" v-model="salary" type="number" min="0" step="1000" placeholder="5000000" :class="ui.input" />
            <p :class="ui.hint">{{ t('overtime.salaryHint') }}</p>
          </div>
          <div>
            <label :class="ui.label" for="workDays">{{ t('overtime.workDays') }}</label>
            <input id="workDays" v-model="workDays" type="number" min="1" step="1" :class="ui.input" />
            <p :class="ui.hint">{{ t('overtime.workDaysHint') }}</p>
          </div>
          <div>
            <label :class="ui.label" for="workHours">{{ t('overtime.workHours') }}</label>
            <input id="workHours" v-model="workHours" type="number" min="0.5" step="0.5" :class="ui.input" />
            <p :class="ui.hint">{{ t('overtime.workHoursHint') }}</p>
          </div>
          <div>
            <label :class="ui.label" for="overtimeHours">{{ t('overtime.overtimeHours') }}</label>
            <input id="overtimeHours" v-model="overtimeHours" type="number" min="0" step="0.5" placeholder="0" :class="ui.input" />
            <p :class="ui.hint">{{ t('overtime.overtimeHoursHint') }}</p>
          </div>
        </div>
      </div>
    </section>

    <section :class="[ui.panel, 'reveal']">
      <p :class="ui.panelTitle">{{ t('common.result') }}</p>
      <div :class="ui.card">
        <div :class="ui.resultList">
          <div :class="ui.resultRow">
            <span :class="ui.resultLabel">{{ t('overtime.hourly') }}</span>
            <span :class="ui.resultValue">{{ result.hourly }}</span>
          </div>
          <div :class="ui.resultRow">
            <span :class="ui.resultLabel">{{ t('overtime.overtimeTotal') }}</span>
            <span :class="ui.resultValue">{{ result.overtime }}</span>
          </div>
          <div :class="ui.resultRow">
            <span :class="ui.resultLabel">{{ t('overtime.salaryPlus') }}</span>
            <span :class="[ui.resultValue, ui.resultTotal]">{{ result.total }}</span>
          </div>
        </div>
        <p :class="ui.note">{{ result.note }}</p>
      </div>
    </section>
  </ToolLayout>
</template>
