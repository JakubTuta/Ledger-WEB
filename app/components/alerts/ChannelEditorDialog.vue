<template>
  <v-dialog
    v-model="dialogOpen"
    max-width="480"
    persistent
  >
    <v-card>
      <v-card-title class="pa-4 d-flex align-center justify-space-between">
        <span>{{ isEdit ? 'Edit Channel' : 'New Channel' }}</span>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          @click="dialogOpen = false"
        />
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-4">
        <v-form
          ref="formRef"
          @submit.prevent="handleSubmit"
        >
          <v-btn-toggle
            v-if="!isEdit"
            v-model="form.kind"
            mandatory
            density="compact"
            color="primary"
            variant="outlined"
            class="mb-4"
          >
            <v-btn
              value="email"
              size="small"
            >
              <v-icon
                icon="mdi-email"
                class="mr-1"
              />
              Email
            </v-btn>
            <v-btn
              value="webhook"
              size="small"
            >
              <v-icon
                icon="mdi-webhook"
                class="mr-1"
              />
              Webhook
            </v-btn>
          </v-btn-toggle>

          <v-text-field
            v-if="form.kind === 'email'"
            v-model="form.address"
            label="Email address"
            variant="outlined"
            density="compact"
            class="mb-3"
            type="email"
            :rules="[v => !!v || 'Email required', v => /.+@.+\..+/.test(v) || 'Invalid email']"
          />

          <template v-if="form.kind === 'webhook'">
            <v-text-field
              v-model="form.url"
              label="Webhook URL"
              variant="outlined"
              density="compact"
              class="mb-3"
              :rules="[v => !!v || 'URL required', v => v.startsWith('https://') || 'Must be HTTPS']"
            />

            <v-text-field
              v-model="form.secret"
              label="HMAC secret"
              variant="outlined"
              density="compact"
              class="mb-3"
              :append-inner-icon="showSecret ? 'mdi-eye-off' : 'mdi-eye'"
              :type="showSecret ? 'text' : 'password'"
              @click:append-inner="showSecret = !showSecret"
            >
              <template #append>
                <v-btn
                  icon="mdi-refresh"
                  variant="text"
                  size="small"
                  title="Generate secret"
                  @click="generateSecret"
                />
                <v-btn
                  icon="mdi-content-copy"
                  variant="text"
                  size="small"
                  title="Copy secret"
                  @click="copySecret"
                />
              </template>
            </v-text-field>
          </template>

          <v-switch
            v-if="isEdit"
            v-model="form.enabled"
            label="Enabled"
            color="primary"
            density="compact"
            hide-details
          />
        </v-form>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-3">
        <v-spacer />
        <v-btn
          variant="text"
          @click="dialogOpen = false"
        >
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          variant="tonal"
          :loading="saving"
          @click="handleSubmit"
        >
          {{ isEdit ? 'Save' : 'Create' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { AlertChannel, CreateAlertChannelRequest, UpdateAlertChannelRequest } from '~/types/alerts'

const props = defineProps<{
  modelValue: boolean
  projectId: number
  channel?: AlertChannel
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

const alertsStore = useAlertsStore()

const isEdit = computed(() => !!props.channel)
const dialogOpen = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v),
})

const formRef = ref()
const saving = ref(false)
const showSecret = ref(false)

const form = reactive({
  kind: 'email' as 'in_app' | 'email' | 'webhook',
  address: '',
  url: '',
  secret: '',
  enabled: true,
})

function parseConfig(config: string) {
  try { return JSON.parse(config) } catch { return {} }
}

watch(() => props.channel, (channel) => {
  if (channel) {
    form.kind = channel.kind
    form.enabled = channel.enabled
    const cfg = parseConfig(channel.config)
    form.address = cfg.address ?? cfg.email ?? ''
    form.url = cfg.url ?? ''
    form.secret = cfg.secret ?? ''
  }
  else {
    form.kind = 'email'
    form.address = ''
    form.url = ''
    form.secret = ''
    form.enabled = true
  }
}, { immediate: true })

function buildConfig(): string {
  if (form.kind === 'email') return JSON.stringify({ address: form.address })
  if (form.kind === 'webhook') {
    const cfg: Record<string, string> = { url: form.url }
    if (form.secret) cfg.secret = form.secret
    return JSON.stringify(cfg)
  }
  return '{}'
}

function generateSecret() {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  form.secret = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('')
  showSecret.value = true
}

async function copySecret() {
  if (form.secret) {
    await navigator.clipboard.writeText(form.secret)
  }
}

async function handleSubmit() {
  const { valid } = await formRef.value.validate()
  if (!valid) return

  saving.value = true
  try {
    if (isEdit.value && props.channel) {
      const data: UpdateAlertChannelRequest = {
        config: buildConfig(),
        enabled: form.enabled,
      }
      await alertsStore.updateChannel(props.channel.id, props.projectId, data)
    }
    else {
      const data: CreateAlertChannelRequest = {
        project_id: props.projectId,
        kind: form.kind,
        config: buildConfig(),
      }
      await alertsStore.createChannel(data)
    }

    emit('saved')
    dialogOpen.value = false
  }
  catch (error: any) {
    console.error('Error saving alert channel:', error)
  }
  finally {
    saving.value = false
  }
}
</script>
