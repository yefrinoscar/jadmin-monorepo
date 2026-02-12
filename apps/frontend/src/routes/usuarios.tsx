import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  ArrowUpDown,
  ChevronDown,
  MoreHorizontal,
  Plus,
  Search,
  User as UserIcon,
  Shield,
  Calendar,
  Mail,
  Filter,
  Loader2
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from "@/components/ui/skeleton"

import { adminMiddleware } from '@/lib/middleware'
import { ROLE_COLORS, ROLE_LABELS, type UserRole, USER_ROLES } from '@/lib/constants'
import { trpc } from '@/lib/trpc'
import { type User } from '@/lib/schema'
import { EditUserDialog } from '@/components/edit-user-dialog'
import { CreateUserDialog } from '@/components/create-user-dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useSession } from "@/lib/auth-client"
import { hasPermission } from "@/lib/permissions"

export const Route = createFileRoute('/usuarios')({
  component: UsuariosPage,
  server: {
    middleware: [adminMiddleware],
  },
})

// Type for serialized user data (dates become strings when sent over HTTP)
type SerializedUser = Omit<User, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
}


function UsuariosPage() {
  // Fetch users using tRPC
  const { data: users = [], isLoading, error } = trpc.user.getAll.useQuery()

  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role as UserRole

  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})

  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<SerializedUser | null>(null)

  const utils = trpc.useUtils()

  const deleteUserMutation = trpc.user.delete.useMutation({
    onSuccess: () => {
      utils.user.getAll.invalidate()
      setDeleteDialogOpen(false)
      // toast.success("Usuario eliminado correctamente")
    },
    onError: (error) => {
      // toast.error(error.message)
      alert(error.message) // Simple fallback
    }
  })

  const confirmDeleteUser = () => {
    if (selectedUser) {
      deleteUserMutation.mutate({ id: selectedUser.id })
    }
  }

  const handleEditUser = (user: SerializedUser) => {
    setSelectedUser(user)
    setEditDialogOpen(true)
  }

  const handleDeleteClick = (user: SerializedUser) => {
    setSelectedUser(user)
    setDeleteDialogOpen(true)
  }

  // Define columns with serialized user type inside component to access handleEditUser
  const columns: ColumnDef<SerializedUser>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            Usuario
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const u = row.original
        const initials = u.name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)

        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={u.image || ''} alt={u.name} />
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium text-sm">{u.name}</span>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'email',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Email
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Mail className="h-3.5 w-3.5" />
          {row.getValue('email')}
        </div>
      ),
    },
    {
      accessorKey: 'isDisabled',
      header: 'Estado',
      cell: ({ row }) => {
        const isDisabled = row.getValue('isDisabled') as boolean
        return isDisabled ? (
          <Badge variant="secondary" className="bg-red-100 text-red-700 hover:bg-red-100/80 font-normal">
            Desactivado
          </Badge>
        ) : (
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100/80 font-normal">
            Activo
          </Badge>
        )
      },
    },
    {
      accessorKey: 'role',
      header: 'Rol',
      cell: ({ row }) => {
        const role = row.getValue('role') as UserRole
        return (
          <Badge
            variant="secondary"
            className={`font-normal flex w-fit items-center gap-1.5 ${ROLE_COLORS[role] || "bg-gray-100 text-gray-700"}`}
          >
            <UserIcon className="h-3 w-3" />
            {ROLE_LABELS[role] || role}
          </Badge>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Se Unió
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const date = new Date(row.getValue('createdAt'))
        return (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Calendar className="h-3.5 w-3.5" />
            {date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })}
          </div>
        )
      },
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const u = row.original;
        const currentUserId = (session?.user as any)?.id;
        const isTargetSuperAdmin = u.role === USER_ROLES.SUPERADMIN;
        const isUserSuperAdmin = userRole === USER_ROLES.SUPERADMIN;
        const isSelf = currentUserId === u.id;

        let canDelete = false;
        if (isSelf) {
            canDelete = false;
        } else if (isTargetSuperAdmin) {
            canDelete = isUserSuperAdmin;
        } else {
            canDelete = hasPermission(userRole, 'delete', 'user');
        }

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menú</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(u.id)}
              >
                Copiar ID usuario
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleEditUser(u)}>
                Editar usuario
              </DropdownMenuItem>
              {canDelete && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => handleDeleteClick(u)}
                >
                  Eliminar usuario
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const table = useReactTable({
    data: users as unknown as SerializedUser[],
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full flex flex-col gap-6 p-2">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-2 w-full">
          <Skeleton className="h-10 w-full max-w-sm" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <div className="h-12 border-b px-4 flex items-center">
            <Skeleton className="h-4 w-full" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 border-b px-4 flex items-center gap-4">
             <Skeleton className="h-10 w-10 rounded-full" />
             <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-[30%]" />
                <Skeleton className="h-3 w-[20%]" />
             </div>
             <Skeleton className="h-6 w-20" />
             <Skeleton className="h-6 w-20" />
             <Skeleton className="h-8 w-8" />
          </div>
        ))}
      </div>
    </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-destructive font-medium">Error al cargar usuarios</p>
          <p className="text-muted-foreground text-sm">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="w-full flex flex-col gap-6 p-2">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold tracking-tight">Gestión de Usuarios</h2>
          <p className="text-muted-foreground">
            Administra los miembros del equipo y sus permisos de acceso al sistema
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-2 w-full">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
                onChange={(event) =>
                  table.getColumn('name')?.setFilterValue(event.target.value)
                }
                className="pl-8 w-full"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-dashed">
                  <Filter className="mr-2 h-4 w-4" />
                  Rol
                  {table.getColumn("role")?.getFilterValue() ? (
                    <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                      1
                    </span>
                  ) : null}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel>Filtrar por Rol</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => table.getColumn("role")?.setFilterValue(undefined)}
                    className="justify-between"
                  >
                    Todos
                    {!table.getColumn("role")?.getFilterValue() && <Shield className="h-4 w-4" />}
                  </DropdownMenuItem>
                  {Object.values(USER_ROLES).map((role) => (
                    <DropdownMenuItem
                      key={role}
                      onClick={() => table.getColumn("role")?.setFilterValue([role])}
                      className="justify-between"
                    >
                      {ROLE_LABELS[role]}
                      {/* Simplified check for single selection behavior */}
                      {(table.getColumn("role")?.getFilterValue() as string[])?.[0] === role && <Shield className="h-4 w-4" />}
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="ml-auto">
                  Columnas <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) =>
                          column.toggleVisibility(!!value)
                        }
                      >
                        {column.id === 'name' ? 'Usuario' : column.id}
                      </DropdownMenuCheckboxItem>
                    )
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar Usuario
            </Button>
          </div>
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No se encontraron resultados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="flex-1 text-sm text-muted-foreground">
            {table.getFilteredSelectedRowModel().rows.length} de{' '}
            {table.getFilteredRowModel().rows.length} fila(s) seleccionada(s).
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </div>

      {/* Edit User Dialog */}
      <EditUserDialog
        user={selectedUser}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />

       {/* Create User Dialog */}
       <CreateUserDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente al usuario
              <span className="font-bold"> {selectedUser?.name} </span>
              y removerá sus datos de nuestros servidores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUserMutation.isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
