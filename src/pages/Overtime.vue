<script setup lang="ts">
import { computed, ref } from 'vue';
import ToolLayout from '@/components/ToolLayout.vue';

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
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
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
      note: 'Isi gaji, hari kerja, total jam kerja, dan jam lembur untuk melihat hasil.',
    };
  }
  const hourlyWage = s / (days * hours);
  const overtimePay = ot * hourlyWage;
  return {
    ready: true,
    hourly: formatRp(hourlyWage),
    overtime: formatRp(overtimePay),
    total: formatRp(s + overtimePay),
    note: 'Upah per jam = Gaji ÷ (Hari kerja × Total jam kerja). Upah lembur = Jam lembur × Upah per jam.',
  };
});
</script>

<template>
  <ToolLayout
    title="Perhitungan Lembur"
    description="Hitung upah lembur berdasarkan gaji, hari kerja, jam kerja per hari, dan jam lembur."
  >
    <section class="panel reveal">
      <p class="panel-title">Input</p>
      <div class="card">
        <div class="form-grid">
          <div class="field">
            <label for="salary">Gaji</label>
            <input id="salary" v-model="salary" type="number" min="0" step="1000" placeholder="5000000" />
            <p class="hint">Gaji pokok per bulan (Rp)</p>
          </div>
          <div class="field">
            <label for="workDays">Hari kerja</label>
            <input id="workDays" v-model="workDays" type="number" min="1" step="1" />
            <p class="hint">Jumlah hari kerja dalam sebulan</p>
          </div>
          <div class="field">
            <label for="workHours">Total jam kerja</label>
            <input id="workHours" v-model="workHours" type="number" min="0.5" step="0.5" />
            <p class="hint">Jam kerja per hari</p>
          </div>
          <div class="field">
            <label for="overtimeHours">Jam lembur</label>
            <input id="overtimeHours" v-model="overtimeHours" type="number" min="0" step="0.5" placeholder="0" />
            <p class="hint">Total jam lembur yang dihitung</p>
          </div>
        </div>
      </div>
    </section>

    <section class="panel reveal">
      <p class="panel-title">Hasil</p>
      <div class="card">
        <div class="result-list">
          <div class="result-row">
            <span class="label">Upah per jam</span>
            <span class="value">{{ result.hourly }}</span>
          </div>
          <div class="result-row">
            <span class="label">Total upah lembur</span>
            <span class="value">{{ result.overtime }}</span>
          </div>
          <div class="result-row total">
            <span class="label">Gaji + lembur</span>
            <span class="value">{{ result.total }}</span>
          </div>
        </div>
        <p class="result-note">{{ result.note }}</p>
      </div>
    </section>
  </ToolLayout>
</template>
