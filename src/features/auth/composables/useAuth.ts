import { useQuasar } from "quasar"
import { Ref } from "vue"

import { supabase } from "@/services/supabase/client"

export function useAuth (loading: Ref<boolean>, onComplete: () => void) {
  const $q = useQuasar()

  async function auth (
    email: string,
    password: string,
    isSignUp: boolean = false
  ) {
    try {
      loading.value = true

      const { error } = isSignUp
        ? await supabase.auth.signUp({
          email,
          password,
        })
        : await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        $q.notify({
          message: error.message,
          color: "negative",
        })

        return
      }

      $q.notify({
        message: isSignUp
          ? `Signed up with ${email}`
          : `Logged in with ${email}`,
        color: "green",
      })

      onComplete()
    } catch (error) {
      console.error(error)
      $q.notify({
        message: `Error: ${error}`,
        color: "negative",
      })
    } finally {
      loading.value = false
    }

    // supabase.auth.getUser
  }

  return {
    signUp: async (email: string, password: string) =>
      await auth(email, password, true),
    signIn: async (email: string, password: string) =>
      await auth(email, password, false),
    signOut: async () => {
      await supabase.auth.signOut()
      onComplete()
    },
  }
}
