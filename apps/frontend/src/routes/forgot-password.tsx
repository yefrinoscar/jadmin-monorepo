import { createFileRoute } from '@tanstack/react-router'
import { ForgotPasswordForm } from '@/components/forgot-password-form'
import { guestMiddleware } from '@/lib/middleware'

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordPage,
  server: {
    middleware: [guestMiddleware],
  },
})

function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <ForgotPasswordForm />
      </div>
    </div>
  )
}
