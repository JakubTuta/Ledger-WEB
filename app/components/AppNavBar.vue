<template>
  <v-app-bar
    app
    color="primary"
    elevation="2"
  >
    <div class="d-flex align-center w-100">
      <div class="navbar-section navbar-section-left">
        <v-btn
          to="/"
          variant="text"
          color="white"
          prepend-icon="mdi-finance"
        >
          Ledger
        </v-btn>
      </div>

      <div class="navbar-section navbar-section-center">
        <template v-if="!authStore.isAuthenticated">
          <v-btn
            to="/"
            variant="text"
            prepend-icon="mdi-home"
          >
            Home
          </v-btn>
        </template>

        <template v-else>
          <v-btn
            to="/panel"
            variant="text"
            prepend-icon="mdi-view-dashboard"
          >
            Panel
          </v-btn>
        </template>
      </div>

      <div class="navbar-section navbar-section-right">
        <template v-if="!authStore.isAuthenticated">
          <v-btn
            to="/login"
            variant="text"
            prepend-icon="mdi-login"
          >
            Login
          </v-btn>

          <v-btn
            to="/register"
            variant="text"
            prepend-icon="mdi-account-plus"
          >
            Register
          </v-btn>
        </template>

        <template v-else>
          <v-btn
            to="/account"
            variant="text"
            prepend-icon="mdi-account"
          >
            Account
          </v-btn>

          <v-btn
            variant="text"
            prepend-icon="mdi-logout"
            @click="handleLogout"
          >
            Logout
          </v-btn>
        </template>
      </div>
    </div>
  </v-app-bar>
</template>

<script setup lang="ts">
const authStore = useAuthStore()

async function handleLogout() {
  await authStore.logout()
}
</script>

<style scoped>
.navbar-section {
  flex: 1;
  display: flex;
  align-items: center;
}

.navbar-section-left {
  justify-content: flex-start;
}

.navbar-section-center {
  justify-content: center;
}

.navbar-section-right {
  justify-content: flex-end;
}
</style>
