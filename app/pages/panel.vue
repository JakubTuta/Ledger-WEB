<template>
  <v-container
    fluid
    class="pa-6"
  >
    <v-row>
      <v-col cols="12">
        <v-card class="mb-4">
          <v-card-title>Filters</v-card-title>

          <v-card-text>
            <v-row>
              <v-col
                cols="12"
                md="4"
              >
                <v-select
                  label="Filter 1"
                  variant="outlined"
                />
              </v-col>

              <v-col
                cols="12"
                md="4"
              >
                <v-select
                  label="Filter 2"
                  variant="outlined"
                />
              </v-col>

              <v-col
                cols="12"
                md="4"
              >
                <v-select
                  label="Filter 3"
                  variant="outlined"
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col
        cols="12"
        md="6"
        lg="4"
      >
        <v-card>
          <v-card-title>Card 1</v-card-title>

          <v-card-text>
            Card content placeholder
          </v-card-text>
        </v-card>
      </v-col>

      <v-col
        cols="12"
        md="6"
        lg="4"
      >
        <v-card>
          <v-card-title>Card 2</v-card-title>

          <v-card-text>
            Card content placeholder
          </v-card-text>
        </v-card>
      </v-col>

      <v-col
        cols="12"
        md="6"
        lg="4"
      >
        <v-card>
          <v-card-title>Card 3</v-card-title>

          <v-card-text>
            Card content placeholder
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-btn
      color="primary"
      size="large"
      class="mt-4"
      prepend-icon="mdi-plus"
    >
      Add New Card
    </v-btn>
  </v-container>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

definePageMeta({
  middleware: 'auth',
})

const projectsStore = useProjectsStore()

function fetchData() {
  projectsStore.fetchProjects()
}

onMounted(() => {
  fetchData()
})
</script>
