<template>
  <v-container class="fill-height d-flex align-center justify-center">
    <v-card>
      <v-card-title class="text-h4 text-center">
        Welcome to Ledger
      </v-card-title>

      <v-card-text class="text-center">
        Manage your finances with ease
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'guest',
})
</script>
