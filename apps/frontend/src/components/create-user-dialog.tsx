import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserIcon, Mail, Lock, Wand2, Copy, Check } from "lucide-react";
import { ROLE_LABELS, USER_ROLES, type UserRole } from "@/lib/constants";
import { trpc } from "@/lib/trpc";

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateUserDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateUserDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>(USER_ROLES.CLIENT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const utils = trpc.useUtils();

  const createUser = trpc.user.create.useMutation({
    onSuccess: () => {
      utils.user.getAll.invalidate();
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setRole(USER_ROLES.CLIENT);
    setError(null);
    setCopied(false);
  };

  const generatePassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let retVal = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
      retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    setPassword(retVal);
  };

  const copyPassword = () => {
    if (!password) return;
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Simple validation
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      setIsSubmitting(false);
      return;
    }

    try {
      await createUser.mutateAsync({
        name,
        email,
        password,
        role,
        isDisabled: false,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleColor = (role: UserRole) => {
    const colors: Record<UserRole, string> = {
      [USER_ROLES.ADMIN]: "bg-red-500",
      [USER_ROLES.TECHNICIAN]: "bg-blue-500",
      [USER_ROLES.CLIENT]: "bg-gray-500",
      [USER_ROLES.SUPERADMIN]: "bg-purple-500",
    };
    return colors[role] || "bg-gray-500";
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) resetForm();
      onOpenChange(val);
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            Agregar Nuevo Usuario
          </DialogTitle>
          <DialogDescription>
            Crea un nuevo usuario en el sistema. Asegúrate de asignar el rol correcto.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="text-destructive text-sm text-center p-2 bg-destructive/10 rounded-md">
                {error}
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="create-name">Nombre Completo</Label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="create-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-9"
                  placeholder="Nombre del usuario"
                  required
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="create-email">Correo Electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="create-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  placeholder="correo@ejemplo.com"
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="create-password">Contraseña</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="create-password"
                    type="text" // Show clear text so they can see/copy the generated password
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 font-mono"
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon"
                  onClick={generatePassword}
                  title="Generar contraseña segura"
                >
                  <Wand2 className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copyPassword}
                  disabled={!password}
                  title="Copiar contraseña"
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Se recomienda usar el generador para contraseñas seguras.
              </p>
            </div>

            <div className="grid gap-2">
              <Label>Rol del Usuario</Label>
              <Select value={role} onValueChange={(val) => setRole(val as UserRole)}>
                <SelectTrigger>
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${getRoleColor(role)}`}
                      />
                      {ROLE_LABELS[role]}
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(USER_ROLES).map(([, value]) => (
                    <SelectItem key={value} value={value}>
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${getRoleColor(value)}`}
                        />
                        {ROLE_LABELS[value]}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground text-yellow-600 dark:text-yellow-500 font-medium">
                Atención: El tipo de usuario no podrá ser modificado después de la creación.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creando..." : "Crear Usuario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
