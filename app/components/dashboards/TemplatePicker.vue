<template>
  <v-dialog
    v-model="dialogOpen"
    max-width="640"
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between pa-4">
        <span>Choose a dashboard template</span>

        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          @click="dialogOpen = false"
        />
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-4">
        <v-row>
          <v-col
            v-for="template in templates"
            :key="template.id"
            cols="12"
            sm="6"
          >
            <v-card
              :variant="selected === template.id
                ? 'flat'
                : 'outlined'"
              :color="selected === template.id
                ? 'primary'
                : undefined"
              class="h-100 cursor-pointer"
              @click="selected = template.id"
            >
              <v-card-text class="d-flex flex-column gap-2 pa-4 align-start">
                <div class="d-flex align-center gap-2">
                  <v-icon
                    :icon="template.icon"
                    size="24"
                    :color="selected === template.id
                      ? 'on-primary'
                      : 'medium-emphasis'"
                  />

                  <span
                    class="text-subtitle-2 font-weight-bold"
                    :class="selected === template.id ? 'text-on-primary' : ''"
                  >{{ template.name }}</span>
                </div>

                <span
                  class="text-caption"
                  :class="selected === template.id ? 'text-on-primary' : 'text-medium-emphasis'"
                >{{ template.description }}</span>

                <div class="d-flex mt-1 flex-wrap gap-1">
                  <v-chip
                    v-for="panel in template.panels.slice(0, 3)"
                    :key="panel.name"
                    size="x-small"
                    variant="outlined"
                    :color="selected === template.id ? 'on-primary' : undefined"
                  >
                    {{ panel.name }}
                  </v-chip>

                  <v-chip
                    v-if="template.panels.length > 3"
                    size="x-small"
                    variant="outlined"
                    :color="selected === template.id ? 'on-primary' : 'medium-emphasis'"
                  >
                    +{{ template.panels.length - 3 }} more
                  </v-chip>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
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
          variant="flat"
          :disabled="!selected"
          :loading="applying"
          @click="apply"
        >
          Apply template
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { templates } from '~/dashboards/templates'

const props = defineProps<{
  modelValue: boolean
  projectId: string | number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'applied': []
}>()

const panelsStore = usePanelsStore()

const dialogOpen = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v),
})

const selected = ref<string | null>(null)
const applying = ref(false)

watch(dialogOpen, (open) => {
  if (!open)
    selected.value = null
})

async function apply() {
  if (!selected.value)
    return
  applying.value = true
  try {
    await panelsStore.applyTemplate(selected.value, props.projectId)
    emit('applied')
    dialogOpen.value = false
  }
  finally {
    applying.value = false
  }
}
</script>
