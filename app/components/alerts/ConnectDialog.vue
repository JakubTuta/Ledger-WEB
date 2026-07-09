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

          <template v-else-if="kind === 'slack'">
            <v-text-field
              v-model="webhookUrl"
              label="Slack Incoming Webhook URL"
              variant="outlined"
              density="compact"
              placeholder="https://hooks.slack.com/services/..."
              :rules="[
                v => !!v || 'URL required',
                v => /^https:\/\//.test(v) || 'Must be a valid https URL',
              ]"
            />
          </template>

          <template v-else-if="kind === 'discord'">
            <v-text-field
              v-model="webhookUrl"
              label="Discord Webhook URL"
              variant="outlined"
              density="compact"
              placeholder="https://discord.com/api/webhooks/..."
              :rules="[
                v => !!v || 'URL required',
                v => /^https:\/\//.test(v) || 'Must be a valid https URL',
              ]"
            />
          </template>

          <template v-else-if="kind === 'pagerduty'">
            <v-text-field
              v-model="integrationKey"
              label="PagerDuty integration key"
              variant="outlined"
              density="compact"
              :type="showSecret
                ? 'text'
                : 'password'"
              :append-inner-icon="showSecret
                ? 'mdi-eye-off'
                : 'mdi-eye'"
              :hint="isEdit
                ? 'Leave blank to keep existing key'
                : 'Events API v2 routing key from the PagerDuty service integration'"
              persistent-hint
              :rules="isEdit
                ? []
                : [v => !!v || 'Integration key required']"
              @click:append-inner="showSecret = !showSecret"
            />
          </template>

          <template v-else-if="kind === 'opsgenie'">
            <v-text-field
              v-model="apiKey"
              label="Opsgenie API key"
              variant="outlined"
              density="compact"
              :type="showSecret
                ? 'text'
                : 'password'"
              :append-inner-icon="showSecret
                ? 'mdi-eye-off'
                : 'mdi-eye'"
              :hint="isEdit
                ? 'Leave blank to keep existing key'
                : 'API key from an Opsgenie API integration'"
              persistent-hint
              :rules="isEdit
                ? []
                : [v => !!v || 'API key required']"
              @click:append-inner="showSecret = !showSecret"
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
import { connectorMeta } from '~/types/alerts'

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
const integrationKey = ref('')
const apiKey = ref('')
const showSecret = ref(false)
const saving = ref(false)
const errorMessage = ref('')

const isEdit = computed(() => !!props.connector)

const kindLabel = computed(() => connectorMeta(props.kind).label)
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
    integrationKey.value = cfg.integration_key ?? ''
    apiKey.value = cfg.api_key ?? ''
  }
  else {
    name.value = kindLabel.value
    webhookUrl.value = ''
    webhookSecret.value = ''
    emailAddress.value = ''
    integrationKey.value = ''
    apiKey.value = ''
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
  if (props.kind === 'slack' || props.kind === 'discord')
    return JSON.stringify({ url: webhookUrl.value })
  if (props.kind === 'pagerduty') {
    const cfg: Record<string, string> = {}
    if (integrationKey.value)
      cfg.integration_key = integrationKey.value

    return JSON.stringify(cfg)
  }
  if (props.kind === 'opsgenie') {
    const cfg: Record<string, string> = {}
    if (apiKey.value)
      cfg.api_key = apiKey.value

    return JSON.stringify(cfg)
  }

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
