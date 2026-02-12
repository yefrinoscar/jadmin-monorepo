import { createFileRoute } from '@tanstack/react-router'
import { LoginForm } from '@/components/login-form'
import { guestMiddleware } from '@/lib/middleware'

export const Route = createFileRoute('/login')({
  component: LoginPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      error: search.error as string | undefined,
      redirect: search.redirect as string | undefined,
    }
  },
  server: {
    middleware: [guestMiddleware],
  },
})

function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  )
}


