<template>
  <v-container
    fluid
    class="fill-height pa-0"
  >
    <v-row
      class="fill-height"
      no-gutters
    >
      <v-col
        cols="12"
        md="3"
        class="border-e"
      >
        <v-list class="pa-4">
          <v-list-subheader>Settings</v-list-subheader>

          <v-list-item
            title="Account Information"
            prepend-icon="mdi-account"
          />

          <v-list-item
            title="Auth Keys Management"
            prepend-icon="mdi-key"
          />
        </v-list>
      </v-col>

      <v-col
        cols="12"
        md="9"
      >
        <v-container class="pa-6">
          <v-card>
            <v-card-title>Account Information</v-card-title>

            <v-card-text>
              <v-text-field
                label="Username"
                variant="outlined"
                class="mb-4"
              />

              <v-text-field
                label="Email"
                type="email"
                variant="outlined"
                class="mb-4"
              />

              <v-btn color="primary">
                Reset Password
              </v-btn>
            </v-card-text>
          </v-card>

          <v-card class="mt-4">
            <v-card-title>Auth Keys Management</v-card-title>

            <v-card-text>
              Auth keys management placeholder
            </v-card-text>
          </v-card>
        </v-container>
      </v-col>
    </v-row>
  </v-container>
</template>
