<template>
  <v-app-bar
    app
    color="primary"
    elevation="2"
  >
    <template v-if="mobile">
      <v-app-bar-nav-icon
        color="white"
        @click="drawer = !drawer"
      />

      <v-btn
        to="/"
        variant="text"
        color="white"
        prepend-icon="mdi-finance"
      >
        Ledger
      </v-btn>
    </template>

    <template v-else>
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

            <v-btn
              to="/alerts"
              variant="text"
              prepend-icon="mdi-bell-alert"
            >
              Alerts
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
            <NotificationsNotificationBell />

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
    </template>
  </v-app-bar>

  <v-navigation-drawer
    v-if="mobile"
    v-model="drawer"
    temporary
  >
    <v-list>
      <template v-if="!authStore.isAuthenticated">
        <v-list-item
          to="/"
          prepend-icon="mdi-home"
          title="Home"
          @click="drawer = false"
        />

        <v-list-item
          to="/login"
          prepend-icon="mdi-login"
          title="Login"
          @click="drawer = false"
        />

        <v-list-item
          to="/register"
          prepend-icon="mdi-account-plus"
          title="Register"
          @click="drawer = false"
        />
      </template>

      <template v-else>
        <v-list-item
          to="/panel"
          prepend-icon="mdi-view-dashboard"
          title="Panel"
          @click="drawer = false"
        />

        <v-list-item
          to="/alerts"
          prepend-icon="mdi-bell-alert"
          title="Alerts"
          @click="drawer = false"
        />

        <v-list-item
          to="/notifications"
          prepend-icon="mdi-bell"
          title="Notifications"
          @click="drawer = false"
        />

        <v-list-item
          to="/account"
          prepend-icon="mdi-account"
          title="Account"
          @click="drawer = false"
        />

        <v-list-item
          prepend-icon="mdi-logout"
          title="Logout"
          @click="handleLogout"
        />
      </template>
    </v-list>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { useDisplay } from 'vuetify'

const { mobile } = useDisplay()
const authStore = useAuthStore()
const drawer = ref(false)

async function handleLogout() {
  drawer.value = false
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
