"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/authStore"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { token, isLoading } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !token) {
      router.push("/login")
    }
  }, [token, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-primary font-semibold animate-pulse">Loading...</div>
      </div>
    )
  }

  if (!token) return null

  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}