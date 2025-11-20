<template>
  <div>
    <v-expand-transition>
      <v-card
        v-if="showPasswordForm"
        variant="flat"
      >
        <v-card-title class="text-h6 font-weight-bold mb-2">
          Change Password
        </v-card-title>

        <v-card-text>
          <v-form
            ref="passwordFormRef"
            v-model="isPasswordFormValid"
            style="max-width: 50%; min-width: 300px;"
            @submit.prevent="handleChangePassword"
          >
            <v-text-field
              v-model="oldPassword"
              label="Current Password"
              :type="showOldPassword
                ? 'text'
                : 'password'"
              variant="outlined"
              class="mb-4"
              :disabled="passwordLoading"
              :rules="passwordRules"
            >
              <template #append-inner>
                <v-icon
                  class="cursor-pointer"
                  @click="showOldPassword = !showOldPassword"
                >
                  {{ showOldPassword
                    ? 'mdi-eye-off'
                    : 'mdi-eye' }}
                </v-icon>
              </template>
            </v-text-field>

            <v-text-field
              v-model="newPassword"
              label="New Password"
              :type="showNewPassword
                ? 'text'
                : 'password'"
              variant="outlined"
              class="mb-4"
              :disabled="passwordLoading"
              :rules="passwordRules"
              :color="newPassword && passwordRules.every(rule => rule(newPassword) === true)
                ? 'success'
                : newPassword && passwordRules.some(rule => rule(newPassword) !== true)
                  ? 'error'
                  : undefined"
              validate-on="input"
              @focus="newPasswordFocused = true"
              @blur="newPasswordFocused = false"
            >
              <template #append-inner>
                <v-icon
                  v-if="newPassword && passwordRules.every(rule => rule(newPassword) === true)"
                  color="success"
                  class="me-2"
                >
                  mdi-check-circle
                </v-icon>

                <v-icon
                  v-else-if="newPassword && passwordRules.some(rule => rule(newPassword) !== true)"
                  color="error"
                  class="me-2"
                >
                  mdi-close-circle
                </v-icon>

                <v-icon
                  class="cursor-pointer"
                  @click="showNewPassword = !showNewPassword"
                >
                  {{ showNewPassword
                    ? 'mdi-eye-off'
                    : 'mdi-eye' }}
                </v-icon>
              </template>
            </v-text-field>

            <v-expand-transition>
              <div
                v-if="newPasswordFocused && newPassword"
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
                      :color="req.test(newPassword)
                        ? 'success'
                        : 'error'"
                      size="small"
                      class="me-2"
                    >
                      {{ req.test(newPassword)
                        ? 'mdi-check'
                        : 'mdi-close' }}
                    </v-icon>

                    <span
                      :class="req.test(newPassword)
                        ? 'text-success'
                        : 'text-error'"
                    >
                      {{ req.text }}
                    </span>
                  </div>
                </v-card>
              </div>
            </v-expand-transition>

            <v-text-field
              v-model="confirmPassword"
              label="Confirm New Password"
              :type="showConfirmPassword
                ? 'text'
                : 'password'"
              variant="outlined"
              class="mb-4"
              :disabled="passwordLoading"
              :rules="[
                ...passwordRules,
                (v: string) => v === newPassword || 'Passwords do not match',
              ]"
            >
              <template #append-inner>
                <v-icon
                  class="cursor-pointer"
                  @click="showConfirmPassword = !showConfirmPassword"
                >
                  {{ showConfirmPassword
                    ? 'mdi-eye-off'
                    : 'mdi-eye' }}
                </v-icon>
              </template>
            </v-text-field>

            <v-alert
              v-if="passwordSuccess"
              type="success"
              density="compact"
              class="mb-4"
              closable
              @click:close="passwordSuccess = ''"
            >
              {{ passwordSuccess }}
            </v-alert>

            <v-alert
              v-if="passwordError"
              type="error"
              density="compact"
              class="mb-4"
              closable
              @click:close="passwordError = ''"
            >
              {{ passwordError }}
            </v-alert>

            <div class="d-flex gap-2">
              <v-btn
                type="submit"
                color="primary"
                :loading="passwordLoading"
                :disabled="!isPasswordFormValid || passwordLoading"
              >
                Change Password
              </v-btn>

              <v-btn
                variant="text"
                :disabled="passwordLoading"
                @click="handleCancelPasswordChange"
              >
                Cancel
              </v-btn>
            </div>
          </v-form>
        </v-card-text>
      </v-card>
    </v-expand-transition>

    <v-btn
      v-if="!showPasswordForm"
      color="primary"
      prepend-icon="mdi-lock-reset"
      @click="showPasswordForm = true"
    >
      Change Password
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { passwordRequirements, passwordRules } from '~/utils/validation'

const authStore = useAuthStore()

const passwordFormRef = ref()
const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const showPasswordForm = ref(false)
const showOldPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)
const newPasswordFocused = ref(false)
const isPasswordFormValid = ref(false)
const passwordLoading = ref(false)
const passwordSuccess = ref('')
const passwordError = ref('')

async function handleChangePassword() {
  if (!isPasswordFormValid.value || passwordLoading.value)
    return

  passwordLoading.value = true
  passwordSuccess.value = ''
  passwordError.value = ''

  try {
    const result = await authStore.changePassword({
      old_password: oldPassword.value,
      new_password: newPassword.value,
    })

    if (result.success) {
      passwordSuccess.value = result.message || 'Password changed successfully'
      resetPasswordForm(false)
      setTimeout(() => {
        passwordSuccess.value = ''
        showPasswordForm.value = false
      }, 3000)
    }
    else {
      passwordError.value = result.error || 'Failed to change password'
      setTimeout(() => {
        passwordError.value = ''
      }, 5000)
    }
  }
  catch (error: any) {
    passwordError.value = error.message || 'Failed to change password'
    setTimeout(() => {
      passwordError.value = ''
    }, 5000)
  }
  finally {
    passwordLoading.value = false
  }
}

function handleCancelPasswordChange() {
  showPasswordForm.value = false
  resetPasswordForm()
}

function resetPasswordForm(clearMessages = true) {
  oldPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  showOldPassword.value = false
  showNewPassword.value = false
  showConfirmPassword.value = false
  newPasswordFocused.value = false
  if (clearMessages) {
    passwordSuccess.value = ''
    passwordError.value = ''
  }
  if (passwordFormRef.value) {
    passwordFormRef.value.reset()
  }
}
</script>
