import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth-client"
import { Link, useSearch } from "@tanstack/react-router"
import { ArrowLeft, CheckCircle, AlertTriangle } from "lucide-react"

export function ResetPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const search = useSearch({ strict: false }) as { token?: string; error?: string }
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isTokenInvalid, setIsTokenInvalid] = useState(false)

  // Check for error in URL (Better Auth adds ?error=INVALID_TOKEN when token is invalid)
  useEffect(() => {
    if (search.error === "INVALID_TOKEN") {
      setIsTokenInvalid(true)
      setError("El enlace ha expirado o es inválido. Por favor, solicita uno nuevo.")
    }
  }, [search.error])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden")
      return
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres")
      return
    }

    if (!search.token) {
      setError("Token de restablecimiento no encontrado")
      setIsTokenInvalid(true)
      return
    }

    setIsLoading(true)

    try {
      // Token validation happens here via Better Auth API
      const { error: resetError } = await authClient.resetPassword({
        newPassword: password,
        token: search.token,
      })

      if (resetError) {
        // Handle specific error cases
        const errorMessage = resetError.message?.toLowerCase() || ''
        
        if (errorMessage.includes('invalid') || errorMessage.includes('expired') || errorMessage.includes('token')) {
          setIsTokenInvalid(true)
          setError("El enlace ha expirado o es inválido. Por favor, solicita uno nuevo.")
        } else {
          setError(resetError.message || "Error al restablecer la contraseña")
        }
      } else {
        setIsSuccess(true)
      }
    } catch (err) {
      console.error('Reset password error:', err)
      setError("Error al restablecer la contraseña. Por favor, intenta de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }

  // No token provided or token is invalid
  if (!search.token || isTokenInvalid) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="rounded-full bg-yellow-100 p-3">
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
          </div>
          <img 
            src="/logo.svg" 
            alt="jadmin logo" 
            className="size-12 object-contain"
          />
          <h2 className="text-xl font-semibold">Enlace inválido o expirado</h2>
          <p className="text-muted-foreground text-sm">
            {error || "Este enlace no es válido o ha expirado. Por favor, solicita un nuevo enlace de restablecimiento."}
          </p>
        </div>
        <Button asChild className="w-full">
          <Link to="/forgot-password">
            Solicitar nuevo enlace
          </Link>
        </Button>
        <Link 
          to="/login" 
          className="inline-flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio de sesión
        </Link>
      </div>
    )
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
          <h2 className="text-xl font-semibold">Contraseña actualizada</h2>
          <p className="text-muted-foreground text-sm">
            Tu contraseña ha sido restablecida exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.
          </p>
        </div>
        <Button asChild className="w-full">
          <Link to="/login">
            Iniciar sesión
          </Link>
        </Button>
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
            <h2 className="text-xl font-semibold">Nueva contraseña</h2>
            <p className="text-muted-foreground text-sm">
              Ingresa tu nueva contraseña
            </p>
          </div>
          {error && (
            <div className="text-destructive text-sm text-center p-2 bg-destructive/10 rounded-md">
              {error}
            </div>
          )}
          <Field>
            <FieldLabel htmlFor="password">Nueva contraseña</FieldLabel>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              minLength={8}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="confirmPassword">Confirmar contraseña</FieldLabel>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
              minLength={8}
            />
          </Field>
          <Field>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Guardando..." : "Restablecer contraseña"}
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

