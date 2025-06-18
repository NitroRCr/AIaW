<template>
  <q-dialog
    ref="dialogRef"
    @hide="onDialogHide"
  >
    <q-card min-w="320px">
      <q-card-section>
        <div class="text-h6">
          {{ $t("topupDialog.title") }}
        </div>
      </q-card-section>
      <q-card-section p-0>
        <q-list>
          <q-item>
            <q-item-section>
              <q-item-label>
                {{
                  $t(
                    payMethod === "wxpay"
                      ? "topupDialog.amountCNY"
                      : "topupDialog.amountUSD"
                  )
                }}
              </q-item-label>
              <q-item-label caption>
                {{ $t("topupDialog.amountCaption") }}
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <a-input
                class="w-50px"
                v-model.number="amount"
                type="number"
              />
            </q-item-section>
          </q-item>
          <q-item v-if="payMethod === 'stripe'">
            <q-item-section>
              {{ $t("topupDialog.transactionFee") }}
            </q-item-section>
            <q-item-section side>
              {{ `$ ${StripeFee}` }}
            </q-item-section>
          </q-item>
          <q-item>
            <q-item-section>
              {{ $t("topupDialog.payableAmount") }}
            </q-item-section>
            <q-item-section side>
              {{ payAmount }}
            </q-item-section>
          </q-item>
          <pay-method-item v-model="payMethod" />
        </q-list>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          flat
          color="primary"
          :label="$t('topupDialog.cancel')"
          @click="onDialogCancel"
        />
        <q-btn
          flat
          color="primary"
          :label="$t('topupDialog.order')"
          :loading
          :disable="!valid"
          @click="
            order(
              {
                type: payMethod === 'wxpay' ? 'api-budget' : 'api-budget-usd',
                amount,
              },
              payMethod
            )
          "
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent } from "quasar"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"

import { useOrder } from "@/shared/composables/order"
import { StripeFee } from "@/shared/utils/config"

import PayMethodItem from "./PayMethodItem.vue"

const { locale } = useI18n()

const payMethod = ref<"wxpay" | "stripe">(
  locale.value === "zh-CN" ? "wxpay" : "stripe"
)
const amount = ref<number>(5)

const payAmount = computed(() => {
  if (!valid.value) return "-"

  if (payMethod.value === "wxpay") {
    return "￥" + amount.value
  } else {
    return "$ " + (amount.value + StripeFee)
  }
})

defineEmits([...useDialogPluginComponent.emits])

const valid = computed(
  () => amount.value > 0 && amount.value < 1000 && amount.value % 1 === 0
)
const loading = ref(false)

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
  useDialogPluginComponent()

const { order } = useOrder(loading, (res) => {
  onDialogOK(res)
})
</script>
