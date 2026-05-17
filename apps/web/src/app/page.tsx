"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/authStore"

export default function HomePage() {
  const { token, isLoading } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (token) {
        router.push("/dashboard")
      } else {
        router.push("/login")
      }
    }
  }, [token, isLoading, router])

  return (
    <div className="flex h-screen items-center justify-center bg-white">
      <div className="text-indigo-600 font-semibold animate-pulse text-2xl tracking-tight">
        Peblo
      </div>
    </div>
  )
}
