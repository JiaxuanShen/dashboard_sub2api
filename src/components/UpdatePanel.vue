<template>
  <section class="update-panel" aria-label="Dashboard 更新">
    <div class="update-panel__row">
      <input
        v-model="updateKey"
        class="update-panel__input"
        type="password"
        placeholder="更新密钥"
        autocomplete="off"
      />
      <button data-test="check-update" class="refresh-button" type="button" :disabled="busy || !updateKey" @click="check">
        {{ busy ? '检查中...' : '检测更新' }}
      </button>
    </div>

    <p v-if="message" class="update-panel__message">{{ message }}</p>

    <div v-if="info" class="update-panel__details">
      <span>当前 {{ info.current_version }}</span>
      <span>最新 {{ info.latest_version }}</span>
      <strong v-if="info.has_update">发现新版本 {{ info.latest_version }}</strong>
      <span v-else>已是最新</span>
    </div>

    <div v-if="info?.has_update" class="update-panel__actions">
      <button class="refresh-button" type="button" :disabled="busy" @click="install">立即更新</button>
      <button class="refresh-button" type="button" :disabled="busy" @click="restart">重启服务</button>
      <button class="refresh-button" type="button" :disabled="busy" @click="rollback">回滚</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { createSystemApi, type VersionInfo } from '@/api/system'

interface UpdateApi {
  checkUpdates(force?: boolean): Promise<VersionInfo>
  update(): Promise<{ message: string; need_restart?: boolean }>
  restart(): Promise<{ message: string }>
  rollback(): Promise<{ message: string; need_restart?: boolean }>
}

const props = defineProps<{ api?: UpdateApi }>()

const updateKey = ref(sessionStorage.getItem('dashboard_update_key') || '')
const busy = ref(false)
const message = ref('')
const info = ref<VersionInfo | null>(null)

const api = () => props.api ?? createSystemApi(undefined, () => updateKey.value)

async function run(action: () => Promise<unknown>, success: (result: unknown) => string) {
  busy.value = true
  message.value = ''
  try {
    sessionStorage.setItem('dashboard_update_key', updateKey.value)
    const result = await action()
    message.value = success(result)
  } catch (error) {
    message.value = error instanceof Error ? error.message : '操作失败'
  } finally {
    busy.value = false
  }
}

function check() {
  return run(
    async () => {
      info.value = await api().checkUpdates(true)
      return info.value
    },
    (result) => ((result as VersionInfo).has_update ? `发现新版本 ${(result as VersionInfo).latest_version}` : '已是最新版本')
  )
}

function install() {
  return run(() => api().update(), (result) => `${(result as { message: string }).message}，请重启服务`)
}

function restart() {
  return run(() => api().restart(), () => '重启已发起，稍后刷新页面')
}

function rollback() {
  return run(() => api().rollback(), () => '回滚已安装，请重启服务')
}
</script>
