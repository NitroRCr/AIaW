import { useQuasar } from "quasar"
import { Ref } from "vue"
import { useI18n } from "vue-i18n"

import { OrderItem } from "@/shared/utils/types"

export function useOrder (loading: Ref<boolean>, onDialogOK: (res) => void) {
  const $q = useQuasar()
  const { t } = useI18n()

  async function order (item: OrderItem, payMethod) {
    try {
      loading.value = true
      // const path = payMethod === "wxpay" ? "/wxpay-order" : "/stripe-checkout"
      // const res = await fetch(`${BudgetBaseURL}${path}`, {
      //   method: 'POST',
      //   body: JSON.stringify({
      //     item
      //   }),
      //   headers: {
      //     'Content-Type': 'application/json',
      //     Authorization: `Bearer ${db.cloud.currentUser.value.accessToken}`
      //   }
      // })
      // if (!res.ok) throw new Error('Failed to order')
      // const body = await res.json()
      onDialogOK({
        orderId: "body.order_id",
        payUrl: "body.pay_url",
      })
    } catch (error) {
      console.error(error)
      $q.notify({
        message: t("order.failure"),
        color: "negative",
      })
    } finally {
      loading.value = false
    }
  }

  return {
    order,
  }
}
