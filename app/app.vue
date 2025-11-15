<template>
  <v-app>
    <AppNavBar />

    <v-main class="gradient-bg">
      <NuxtPage />
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
const authStore = useAuthStore()

onMounted(async () => {
  await authStore.autoLogin()
})
</script>

<style scoped>
.gradient-bg {
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)) 0%, rgb(var(--v-theme-secondary)) 100%);
}
</style>
