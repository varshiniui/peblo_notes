"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/authStore"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user) {
      router.push("/dashboard")
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-indigo-600 font-semibold animate-pulse">Loading Peblo...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="mb-8 flex flex-col items-center gap-2">
        <h1 className="text-4xl font-bold tracking-tight text-indigo-600">Peblo</h1>
        <p className="text-sm text-gray-500 font-medium">Your Second Brain</p>
      </div>
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  )
}
