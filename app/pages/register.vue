<template>
  <v-container class="fill-height d-flex align-center justify-center">
    <v-card
      width="400"
      class="pa-4"
    >
      <v-card-title class="d-flex flex-column align-center mb-4 justify-center">
        <v-img
          width="80"
          class="mb-4"
        />

        <span class="text-h5">Register</span>
      </v-card-title>

      <v-card-text>
        <v-form
          ref="formRef"
          v-model="isFormValid"
          @submit.prevent="handleRegister"
        >
          <v-text-field
            v-model="name"
            label="Name"
            type="text"
            variant="outlined"
            class="mb-2"
            :disabled="loading"
            :rules="nameRules"
            :color="name && nameRules.every(rule => rule(name) === true)
              ? 'success'
              : name && nameRules.some(rule => rule(name) !== true)
                ? 'error'
                : undefined"
            validate-on="input"
          >
            <template #append-inner>
              <v-icon
                v-if="name && nameRules.every(rule => rule(name) === true)"
                color="success"
              >
                mdi-check-circle
              </v-icon>

              <v-icon
                v-else-if="name && nameRules.some(rule => rule(name) !== true)"
                color="error"
              >
                mdi-close-circle
              </v-icon>
            </template>
          </v-text-field>

          <v-text-field
            v-model="email"
            label="Email"
            type="email"
            variant="outlined"
            class="mb-2"
            :disabled="loading"
            :rules="emailRules"
            :color="email && emailRules.every(rule => rule(email) === true)
              ? 'success'
              : email && emailRules.some(rule => rule(email) !== true)
                ? 'error'
                : undefined"
            validate-on="input"
          >
            <template #append-inner>
              <v-icon
                v-if="email && emailRules.every(rule => rule(email) === true)"
                color="success"
              >
                mdi-check-circle
              </v-icon>

              <v-icon
                v-else-if="email && emailRules.some(rule => rule(email) !== true)"
                color="error"
              >
                mdi-close-circle
              </v-icon>
            </template>
          </v-text-field>

          <v-text-field
            v-model="password"
            label="Password"
            :type="showPassword
              ? 'text'
              : 'password'"
            variant="outlined"
            class="mb-2"
            :disabled="loading"
            :rules="passwordRules"
            :color="password && passwordRules.every(rule => rule(password) === true)
              ? 'success'
              : password && passwordRules.some(rule => rule(password) !== true)
                ? 'error'
                : undefined"
            validate-on="input"
            @focus="passwordFocused = true"
            @blur="passwordFocused = false"
          >
            <template #append-inner>
              <v-icon
                v-if="password && passwordRules.every(rule => rule(password) === true)"
                color="success"
                class="me-2"
              >
                mdi-check-circle
              </v-icon>

              <v-icon
                v-else-if="password && passwordRules.some(rule => rule(password) !== true)"
                color="error"
                class="me-2"
              >
                mdi-close-circle
              </v-icon>

              <v-icon
                class="cursor-pointer"
                @click="showPassword = !showPassword"
              >
                {{ showPassword
                  ? 'mdi-eye-off'
                  : 'mdi-eye' }}
              </v-icon>
            </template>
          </v-text-field>

          <v-expand-transition>
            <div
              v-if="passwordFocused && password"
              class="mb-4"
            >
              <v-card
                variant="outlined"
                class="pa-3"
              >
                <div class="text-caption font-weight-medium mb-2">
                  Password requirements:
                </div>

                <div
                  v-for="(req, index) in passwordRequirements"
                  :key="index"
                  class="d-flex align-center text-caption mb-1"
                >
                  <v-icon
                    :color="req.test(password)
                      ? 'success'
                      : 'error'"
                    size="small"
                    class="me-2"
                  >
                    {{ req.test(password)
                      ? 'mdi-check'
                      : 'mdi-close' }}
                  </v-icon>

                  <span
                    :class="req.test(password)
                      ? 'text-success'
                      : 'text-error'"
                  >
                    {{ req.text }}
                  </span>
                </div>
              </v-card>
            </div>
          </v-expand-transition>

          <v-alert
            v-if="error"
            type="error"
            class="mb-4"
            density="compact"
          >
            {{ error }}
          </v-alert>

          <v-btn
            type="submit"
            block
            color="primary"
            size="large"
            :loading="loading"
            :disabled="!isFormValid"
          >
            Register
          </v-btn>
        </v-form>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { emailRules, nameRules, passwordRequirements, passwordRules } from '~/utils/validation'

definePageMeta({
  middleware: 'guest',
})

const authStore = useAuthStore()

const formRef = ref()
const name = ref('')
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const isFormValid = ref(false)
const showPassword = ref(false)
const passwordFocused = ref(false)

async function handleRegister() {
  if (!isFormValid.value)
    return

  error.value = ''
  loading.value = true

  try {
    const result = await authStore.register({
      name: name.value,
      email: email.value,
      password: password.value,
    })

    if (!result.success) {
      error.value = result.error || 'Registration failed. Please try again.'
    }
  }
  finally {
    loading.value = false
  }
}
</script>
