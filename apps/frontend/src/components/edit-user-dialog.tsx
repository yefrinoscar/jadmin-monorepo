import { useState, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserIcon, Mail } from "lucide-react";
import { ROLE_LABELS, USER_ROLES, type UserRole } from "@/lib/constants";
import { trpc } from "@/lib/trpc";

interface EditUserDialogProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    isDisabled: boolean;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditUserDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: EditUserDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>(USER_ROLES.CLIENT);
  const [isDisabled, setIsDisabled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const utils = trpc.useUtils();

  // Update form when user changes
  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setRole(user.role as UserRole);
      setIsDisabled(user.isDisabled);
      setError(null);
    }
  }, [user]);

  const updateUser = trpc.user.update.useMutation({
    onSuccess: () => {
      utils.user.getAll.invalidate();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await updateUser.mutateAsync({
        id: user.id,
        name,
        email,
        isDisabled,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            Editar Usuario
          </DialogTitle>
          <DialogDescription>
            Modifica los datos del usuario. Los cambios se aplicarán
            inmediatamente.
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
              <Label htmlFor="name">Nombre Completo</Label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-9"
                  placeholder="Nombre del usuario"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                El nombre completo del usuario como aparecerá en el sistema.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  placeholder="correo@ejemplo.com"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Este será el email de inicio de sesión del usuario.
              </p>
            </div>
            <div className="grid gap-2">
              <Label>Rol del Usuario (No modificable)</Label>
              <Select value={role} onValueChange={(val) => setRole(val as UserRole)} disabled>
                <SelectTrigger className="bg-muted text-muted-foreground opacity-100">
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
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-disabled">Estado de la cuenta</Label>
              <div className="flex items-center gap-2">
                <Switch
                  id="edit-disabled"
                  checked={isDisabled}
                  onCheckedChange={setIsDisabled}
                  className={isDisabled ? "data-[state=checked]:bg-destructive" : ""}
                />
                <span className="text-sm text-muted-foreground">
                  {isDisabled 
                    ? "Cuenta desactivada (Sin acceso)" 
                    : "Cuenta activa (Con acceso)"}
                </span>
              </div>
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
            <Button type="submit" disabled={isSubmitting} variant={isDisabled ? "destructive" : "default"}>
              {isSubmitting ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
