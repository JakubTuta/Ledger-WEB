<template>
  <v-app-bar
    app
    elevation="2"
    density="compact"
  >
    <v-app-bar-nav-icon
      class="d-md-none"
      color="white"
      @click="drawer = !drawer"
    />

    <div class="d-none d-md-flex align-center w-100 px-2">
        <v-chip
          to="/"
          variant="flat"
          prepend-icon="mdi-finance"
          size="large"
          class="font-weight-bold text-primary mr-3 cursor-pointer"
          label
        >
          Ledger
        </v-chip>

        <template v-if="authStore.isAuthenticated">
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

          <v-btn
            to="/settings"
            variant="text"
            prepend-icon="mdi-cog"
          >
            Settings
          </v-btn>
        </template>

        <v-spacer />

        <NotificationsNotificationBell v-if="authStore.isAuthenticated" />

        <v-menu
          location="bottom end"
          close-on-content-click
        >
          <template #activator="{'props': menuProps}">
            <v-btn
              v-bind="menuProps"
              variant="text"
            >
              <v-icon size="x-large">
                mdi-account
              </v-icon>

              <v-icon>
                mdi-chevron-down
              </v-icon>
            </v-btn>
          </template>

          <v-list
            min-width="180"
          >
            <template v-if="!authStore.isAuthenticated">
              <v-list-item
                to="/login"
                prepend-icon="mdi-login"
                title="Login"
              />

              <v-list-item
                to="/register"
                prepend-icon="mdi-account-plus"
                title="Register"
              />
            </template>

            <template v-else>
              <v-list-item
                to="/account"
                prepend-icon="mdi-account-cog"
                title="Account settings"
              />

              <v-list-item
                prepend-icon="mdi-logout"
                title="Logout"
                @click="handleLogout"
              />
            </template>
          </v-list>
        </v-menu>
      </div>
  </v-app-bar>

  <ClientOnly>
  <v-navigation-drawer
    v-model="drawer"
    temporary
  >
    <v-list>
      <template v-if="!authStore.isAuthenticated">
        <v-list-item
          to="/"
          variant="flat"
          prepend-icon="mdi-finance"
          size="large"
          class="font-weight-bold text-primary mr-3 cursor-pointer"
          label
        >
          Ledger
        </v-list-item>

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
          to="/settings"
          prepend-icon="mdi-cog"
          title="Settings"
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
          prepend-icon="mdi-account-cog"
          title="Account settings"
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
  </ClientOnly>
</template>

<script setup lang="ts">
const authStore = useAuthStore()
const drawer = ref(false)

async function handleLogout() {
  drawer.value = false
  await authStore.logout()
}
</script>
