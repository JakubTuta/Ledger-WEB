<template>
  <v-dialog
    :model-value="modelValue"
    max-width="520"
    persistent
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between pa-4">
        <span class="text-h6">{{ title }}</span>

        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          @click="close"
        />
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-4">
        <v-form
          ref="formRef"
          @submit.prevent="handleSubmit"
        >
          <v-text-field
            v-model="name"
            label="Name"
            variant="outlined"
            density="compact"
            :rules="[v => !!v || 'Name required']"
            class="mb-3"
          />

          <template v-if="kind === 'webhook'">
            <v-text-field
              v-model="webhookUrl"
              label="Webhook URL"
              variant="outlined"
              density="compact"
              placeholder="https://..."
              :rules="[
                v => !!v || 'URL required',
                v => /^https?:\/\//.test(v) || 'Must be a valid http(s) URL',
              ]"
              class="mb-3"
            />

            <v-text-field
              v-model="webhookSecret"
              label="HMAC secret"
              variant="outlined"
              density="compact"
              :type="showSecret
                ? 'text'
                : 'password'"
              :append-inner-icon="showSecret
                ? 'mdi-eye-off'
                : 'mdi-eye'"
              :hint="isEdit
                ? 'Leave blank to keep existing secret'
                : 'Used to sign X-Ledger-Signature header'"
              persistent-hint
              @click:append-inner="showSecret = !showSecret"
            >
              <template #append>
                <v-btn
                  size="small"
                  variant="tonal"
                  @click="generateSecret"
                >
                  Generate
                </v-btn>
              </template>
            </v-text-field>
          </template>

          <template v-else-if="kind === 'email'">
            <v-text-field
              v-model="emailAddress"
              label="Email address"
              variant="outlined"
              density="compact"
              :rules="[
                v => !!v || 'Email required',
                v => /.+@.+\..+/.test(v) || 'Invalid email',
              ]"
            />
          </template>

          <template v-else>
            <v-alert
              type="info"
              variant="tonal"
              density="compact"
              text="In-app alerts appear in the notification bell (top-right) on every page."
            />
          </template>

          <v-alert
            v-if="errorMessage"
            type="error"
            variant="tonal"
            density="compact"
            class="mt-3"
            :text="errorMessage"
          />
        </v-form>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-3">
        <v-spacer />

        <v-btn
          variant="text"
          @click="close"
        >
          Cancel
        </v-btn>

        <v-btn
          color="primary"
          variant="flat"
          :loading="saving"
          @click="handleSubmit"
        >
          {{ isEdit
            ? 'Save'
            : 'Connect' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { Connector, ConnectorKind } from '~/types/alerts'

const props = defineProps<{
  modelValue: boolean
  kind: ConnectorKind
  connector?: Connector
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  'saved': []
}>()

const alertsStore = useAlertsStore()

const formRef = ref()
const name = ref('')
const webhookUrl = ref('')
const webhookSecret = ref('')
const emailAddress = ref('')
const showSecret = ref(false)
const saving = ref(false)
const errorMessage = ref('')

const isEdit = computed(() => !!props.connector)

const kindLabel = computed(() => ({ webhook: 'Webhook', email: 'Email', in_app: 'In-app' }[props.kind]))
const title = computed(() => (isEdit.value
  ? `Edit ${kindLabel.value}`
  : `Connect ${kindLabel.value}`))

watch(() => props.modelValue, (open) => {
  if (open)
    resetForm()
})

function resetForm() {
  errorMessage.value = ''
  showSecret.value = false
  if (props.connector) {
    name.value = props.connector.name
    let cfg: Record<string, string> = {}
    try {
      cfg = JSON.parse(props.connector.config)
    }
    catch { /* noop */ }
    webhookUrl.value = cfg.url ?? ''
    webhookSecret.value = ''
    emailAddress.value = cfg.address ?? ''
  }
  else {
    name.value = kindLabel.value
    webhookUrl.value = ''
    webhookSecret.value = ''
    emailAddress.value = ''
  }
}

function generateSecret() {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  webhookSecret.value = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

function buildConfig(): string {
  if (props.kind === 'webhook') {
    const cfg: Record<string, string> = { url: webhookUrl.value }
    if (webhookSecret.value)
      cfg.hmac_secret = webhookSecret.value

    return JSON.stringify(cfg)
  }
  if (props.kind === 'email')
    return JSON.stringify({ address: emailAddress.value })

  return '{}'
}

async function handleSubmit() {
  const { valid } = await formRef.value.validate()
  if (!valid)
    return

  saving.value = true
  errorMessage.value = ''
  const config = buildConfig()

  const result = isEdit.value
    ? await alertsStore.updateConnector(props.connector!.id, { name: name.value, config })
    : await alertsStore.createConnector({ kind: props.kind, name: name.value, config })

  saving.value = false

  if (result.success) {
    emit('saved')
    close()
  }
  else {
    errorMessage.value = result.error || 'Failed to save connector'
  }
}

function close() {
  emit('update:modelValue', false)
}
</script>
