import { Navigate, createFileRoute } from '@tanstack/react-router'
import { guestMiddleware } from '@/lib/middleware'

export const Route = createFileRoute('/signup')({
  component: SignupPage,
  server: {
    middleware: [guestMiddleware],
  },
})


function SignupPage() {
  return <Navigate to="/login" search={{ error: undefined, redirect: undefined }} />
}
