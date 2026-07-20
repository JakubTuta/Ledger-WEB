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
          to="/explore"
          variant="text"
          prepend-icon="mdi-magnify"
        >
          Explore
        </v-btn>

        <v-btn
          to="/errors"
          variant="text"
          prepend-icon="mdi-bug"
        >
          Errors
        </v-btn>

        <v-btn
          to="/monitors"
          variant="text"
          prepend-icon="mdi-heart-pulse"
        >
          Monitors
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

      <v-tooltip
        text="Setup guide"
        location="bottom"
      >
        <template #activator="{'props': tooltipProps}">
          <v-btn
            v-bind="tooltipProps"
            to="/how-to-setup"
            icon="mdi-help"
            variant="text"
            aria-label="Setup guide"
          />
        </template>
      </v-tooltip>

      <NotificationBell v-if="authStore.isAuthenticated" />

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

          <v-list-item
            to="/how-to-setup"
            prepend-icon="mdi-help-circle-outline"
            title="Setup guide"
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
            to="/explore"
            prepend-icon="mdi-magnify"
            title="Explore"
            @click="drawer = false"
          />

          <v-list-item
            to="/errors"
            prepend-icon="mdi-bug"
            title="Errors"
            @click="drawer = false"
          />

          <v-list-item
            to="/monitors"
            prepend-icon="mdi-heart-pulse"
            title="Monitors"
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
            to="/settings"
            prepend-icon="mdi-cog"
            title="Settings"
            @click="drawer = false"
          />

          <v-list-item
            to="/account"
            prepend-icon="mdi-account-cog"
            title="Account settings"
            @click="drawer = false"
          />

          <v-list-item
            to="/how-to-setup"
            prepend-icon="mdi-help-circle-outline"
            title="Setup guide"
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
