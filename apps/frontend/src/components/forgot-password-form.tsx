import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth-client"
import { Link } from "@tanstack/react-router"
import { ArrowLeft, CheckCircle } from "lucide-react"

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      // Use authClient.requestPasswordReset as per Better Auth docs
      const { error } = await authClient.requestPasswordReset({
        email,
        redirectTo: "/reset-password",
      })

      if (error) {
        setError(error.message || "Error al enviar el correo")
      } else {
        // Success - always show success for security (don't reveal if email exists)
        setIsSuccess(true)
      }
    } catch (err) {
      console.error(err)
      setError("Error al enviar el correo. Por favor, intenta de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="rounded-full bg-green-100 p-3">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <img 
            src="/logo.svg" 
            alt="jadmin logo" 
            className="size-12 object-contain"
          />
          <h2 className="text-xl font-semibold">Revisa tu correo</h2>
          <p className="text-muted-foreground text-sm">
            Hemos enviado instrucciones para restablecer tu contraseña a{" "}
            <span className="font-medium text-foreground">{email}</span>
          </p>
        </div>
        <Link 
          to="/login" 
          className="inline-flex items-center justify-center gap-2 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio de sesión
        </Link>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <img 
              src="/logo.svg" 
              alt="jadmin logo" 
              className="size-16 object-contain"
            />
            <h2 className="text-xl font-semibold">¿Olvidaste tu contraseña?</h2>
            <p className="text-muted-foreground text-sm">
              Ingresa tu correo electrónico y te enviaremos instrucciones para restablecerla
            </p>
          </div>
          {error && (
            <div className="text-destructive text-sm text-center p-2 bg-destructive/10 rounded-md">
              {error}
            </div>
          )}
          <Field>
            <FieldLabel htmlFor="email">Correo Electrónico</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </Field>
          <Field>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Enviando..." : "Enviar instrucciones"}
            </Button>
          </Field>
        </FieldGroup>
        <div className="mt-4 text-center">
          <Link 
            to="/login" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio de sesión
          </Link>
        </div>
      </form>
    </div>
  )
}

