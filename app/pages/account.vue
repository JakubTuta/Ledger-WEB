<template>
  <v-container
    fluid
    class="pa-4"
  >
    <v-card class="w-100">
      <v-card-title class="text-h5 font-weight-bold pa-6 pb-2">
        Account Settings
      </v-card-title>

      <v-card-text class="pa-6">
        <AccountSettings />
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

useSeoMeta({
  title: 'Account',
  robots: 'noindex, nofollow',
})
</script>
