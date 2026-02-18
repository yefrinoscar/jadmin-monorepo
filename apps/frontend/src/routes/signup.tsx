import { createFileRoute } from '@tanstack/react-router'
import { SignupForm } from '@/components/signup-form'
import { guestMiddleware } from '@/lib/middleware'

export const Route = createFileRoute('/signup')({
  component: SignupPage,
  server: {
    middleware: [guestMiddleware],
  },
})

function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <SignupForm />
      </div>
    </div>
  )
}
