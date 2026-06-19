import { useEffect, useState } from "react";
import { Discount } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useUndo } from "../contexts/UndoContext";
import { api } from "../utils/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Switch } from "../components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Plus, Edit, Trash2, Tag, Percent, DollarSign, Users, Globe } from "lucide-react";
import { toast } from "sonner";
import { Navigate } from "react-router";

export function Offers() {
  const { currentUser, isAdmin } = useAuth();
  const { pushAction } = useUndo();
  const isContador = currentUser?.role === "contador";
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [discountToDelete, setDiscountToDelete] = useState<Discount | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    type: "percentage" as "percentage" | "fixed",
    value: "",
    appliesTo: "all" as "all" | "frequent_customers",
    isActive: true,
  });

  const [formErrors, setFormErrors] = useState({
    name: "",
    value: "",
  });

  // ============================
  // CARGAR DESCUENTOS DESDE API
  // ============================
  const loadDiscounts = async () => {
    try {
      setIsLoading(true);
      const data = await api.getDiscounts();
      setDiscounts(data);
    } catch (error) {
      toast.error("Error al cargar descuentos");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDiscounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Solo admin y contador pueden acceder
  if (!isAdmin && !isContador) {
    return <Navigate to="/" replace />;
  }

  // ============================
  // ABRIR DIÁLOGO (CREAR/EDITAR)
  // ============================
  const handleOpenDialog = (discount?: Discount) => {
    if (discount) {
      setEditingDiscount(discount);
      setFormData({
        name: discount.name,
        type: discount.type,
        value: discount.value.toString(),
        appliesTo: discount.appliesTo,
        isActive: discount.isActive,
      });
    } else {
      setEditingDiscount(null);
      setFormData({
        name: "",
        type: "percentage",
        value: "",
        appliesTo: "all",
        isActive: true,
      });
    }
    setFormErrors({ name: "", value: "" });
    setIsDialogOpen(true);
  };

  // ============================
  // VALIDACIÓN
  // ============================
  const validateForm = () => {
    const errors = { name: "", value: "" };
    let isValid = true;

    if (!formData.name.trim()) {
      errors.name = "El nombre es obligatorio";
      isValid = false;
    } else if (formData.name.trim().length < 3) {
      errors.name = "El nombre debe tener al menos 3 caracteres";
      isValid = false;
    }

    if (!formData.value) {
      errors.value = "El valor es obligatorio";
      isValid = false;
    } else {
      const num = parseFloat(formData.value);
      if (isNaN(num) || num <= 0) {
        errors.value = "El valor debe ser mayor a 0";
        isValid = false;
      } else if (formData.type === "percentage" && num > 100) {
        errors.value = "El porcentaje no puede ser mayor a 100%";
        isValid = false;
      }
    }

    setFormErrors(errors);
    return isValid;
  };

  // ============================
  // GUARDAR DESCUENTO (CREAR/EDITAR)
  // ============================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const prevDiscounts = [...discounts];

    try {
      let updatedDiscounts: Discount[];

      if (editingDiscount) {
        // Actualizar
        const updated = await api.updateDiscount(editingDiscount.id, {
          name: formData.name.trim(),
          type: formData.type,
          value: parseFloat(formData.value),
          appliesTo: formData.appliesTo,
          isActive: formData.isActive,
        });

        updatedDiscounts = discounts.map((d) =>
          d.id === editingDiscount.id ? { ...d, ...updated } : d
        );
        toast.success(`Oferta "${formData.name}" actualizada`);
      } else {
        // Crear
        const result = await api.createDiscount({
          name: formData.name.trim(),
          type: formData.type,
          value: parseFloat(formData.value),
          appliesTo: formData.appliesTo,
          isActive: formData.isActive,
        });

        const newDiscount: Discount = {
          id: result.id || Date.now().toString(),
          name: formData.name.trim(),
          type: formData.type,
          value: parseFloat(formData.value),
          appliesTo: formData.appliesTo,
          isActive: formData.isActive,
          createdAt: new Date().toISOString(),
        };

        updatedDiscounts = [...discounts, newDiscount];
        toast.success(`Oferta "${formData.name}" creada`);
      }

      setDiscounts(updatedDiscounts);
      setIsDialogOpen(false);

      // Deshacer/Rehacer (solo local)
      pushAction({
        message: editingDiscount
          ? `"${formData.name}" actualizado`
          : `"${formData.name}" creado`,
        undo: () => {
          setDiscounts(prevDiscounts);
          toast.info(editingDiscount ? "Edición deshecha (solo local)" : "Creación deshecha (solo local)");
        },
        redo: () => {
          setDiscounts(updatedDiscounts);
          toast.success(editingDiscount ? "Edición rehecha (solo local)" : "Creación rehecha (solo local)");
        },
      });

      // Recargar para sincronizar con el backend
      await loadDiscounts();
    } catch (error) {
      toast.error("Error al guardar el descuento");
      console.error(error);
    }
  };

  // ============================
  // ACTIVAR/DESACTIVAR
  // ============================
  const handleToggleActive = async (discount: Discount) => {
    const prevDiscounts = [...discounts];
    const newActiveState = !discount.isActive;
    
    try {
      const updated = await api.updateDiscount(discount.id, {
        ...discount,
        isActive: newActiveState,
      });

      const updatedDiscounts = discounts.map((d) =>
        d.id === discount.id 
          ? { ...d, ...(updated || {}), isActive: newActiveState } 
          : d
      );
      
      setDiscounts(updatedDiscounts);
      toast.success(
        `Oferta "${discount.name}" ${newActiveState ? "activada" : "desactivada"}`
      );

      pushAction({
        message: `"${discount.name}" ${newActiveState ? "activada" : "desactivada"}`,
        undo: () => {
          setDiscounts(prevDiscounts);
          toast.info("Cambio deshecho (solo local)");
        },
        redo: () => {
          setDiscounts(updatedDiscounts);
          toast.success("Cambio rehecho (solo local)");
        },
      });
    } catch (error) {
      toast.error("Error al cambiar estado del descuento");
      console.error(error);
    }
  };

  // ============================
  // ELIMINAR DESCUENTO
  // ============================
  const confirmDelete = async () => {
    if (!discountToDelete) return;
    const prevDiscounts = [...discounts];
    try {
      await api.deleteDiscount(discountToDelete.id);
      const updatedDiscounts = discounts.filter((d) => d.id !== discountToDelete.id);
      setDiscounts(updatedDiscounts);
      toast.success(`Oferta "${discountToDelete.name}" eliminada`);
      setDiscountToDelete(null);

      pushAction({
        message: `"${discountToDelete.name}" eliminado`,
        undo: () => {
          setDiscounts(prevDiscounts);
          toast.info("Eliminación deshecha (solo local)");
        },
        redo: () => {
          setDiscounts(updatedDiscounts);
          toast.success("Eliminación rehecha (solo local)");
        },
      });
    } catch (error) {
      toast.error("Error al eliminar descuento");
      console.error(error);
    }
  };

  // ============================
  // RENDER
  // ============================
  const activeCount = discounts.filter((d) => d.isActive).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando ofertas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-semibold text-foreground">Ofertas y Descuentos</h2>
          <p className="text-muted-foreground mt-1">
            Gestiona los descuentos disponibles para aplicar en ventas (
            {activeCount} activos de {discounts.length} totales)
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Oferta
        </Button>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 rounded-full p-2">
                <Tag className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de ofertas</p>
                <p className="text-2xl font-semibold">{discounts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-2">
                <Tag className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ofertas activas</p>
                <p className="text-2xl font-semibold text-green-600 dark:text-green-400">
                  {activeCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 dark:bg-blue-900/30 rounded-full p-2">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Para clientes frecuentes</p>
                <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
                  {discounts.filter((d) => d.appliesTo === "frequent_customers").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de descuentos */}
      <div className="space-y-4">
        {discounts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Tag className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No hay ofertas configuradas
              </h3>
              <p className="text-muted-foreground">
                Crea tu primera oferta usando el botón "Nueva Oferta"
              </p>
            </CardContent>
          </Card>
        ) : (
          discounts.map((discount) => (
            <Card
              key={discount.id}
              className={`transition-opacity ${!discount.isActive ? "opacity-60" : ""}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <CardTitle className="text-lg">{discount.name}</CardTitle>
                      <Badge
                        className={
                          discount.isActive
                            ? "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-400 border-green-300 dark:border-green-700"
                            : "bg-muted text-muted-foreground"
                        }
                        variant="outline"
                      >
                        {discount.isActive ? "Activa" : "Inactiva"}
                      </Badge>
                      <Badge variant="outline" className="flex items-center gap-1">
                        {discount.appliesTo === "all" ? (
                          <>
                            <Globe className="h-3 w-3" /> General
                          </>
                        ) : (
                          <>
                            <Users className="h-3 w-3" /> Clientes frecuentes
                          </>
                        )}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 mr-2">
                      <Label htmlFor={`toggle-${discount.id}`} className="text-sm text-muted-foreground cursor-pointer">
                        {discount.isActive ? "Activa" : "Inactiva"}
                      </Label>
                      <Switch
                        id={`toggle-${discount.id}`}
                        checked={discount.isActive}
                        onCheckedChange={() => handleToggleActive(discount)}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(discount)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDiscountToDelete(discount)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    {discount.type === "percentage" ? (
                      <Percent className="h-5 w-5 text-primary" />
                    ) : (
                      <DollarSign className="h-5 w-5 text-primary" />
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">Descuento</p>
                      <p className="text-2xl font-semibold text-primary">
                        {discount.type === "percentage"
                          ? `${discount.value}%`
                          : `$${discount.value.toLocaleString("es-AR")}`}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo</p>
                    <p className="font-medium">
                      {discount.type === "percentage" ? "Porcentaje" : "Monto fijo"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Aplica a</p>
                    <p className="font-medium">
                      {discount.appliesTo === "all"
                        ? "Todos los clientes"
                        : "Clientes frecuentes"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Diálogo crear/editar descuento */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingDiscount ? "Editar Oferta" : "Nueva Oferta"}
            </DialogTitle>
            <DialogDescription>
              {editingDiscount
                ? "Modifica los datos de la oferta."
                : "Configura un nuevo descuento o oferta para aplicar en ventas."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="disc-name">
                  Nombre de la oferta <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="disc-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Descuento de temporada"
                />
                {formErrors.name && (
                  <p className="text-sm text-destructive">{formErrors.name}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="disc-type">Tipo de descuento</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(v) =>
                      setFormData({ ...formData, type: v as "percentage" | "fixed" })
                    }
                  >
                    <SelectTrigger id="disc-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                      <SelectItem value="fixed">Monto fijo ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="disc-value">
                    Valor {formData.type === "percentage" ? "(%)" : "($)"}{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="disc-value"
                    type="number"
                    min="0.01"
                    max={formData.type === "percentage" ? "100" : undefined}
                    step="0.01"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder={formData.type === "percentage" ? "10" : "500"}
                  />
                  {formErrors.value && (
                    <p className="text-sm text-destructive">{formErrors.value}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="disc-applies">Aplica a</Label>
                <Select
                  value={formData.appliesTo}
                  onValueChange={(v) =>
                    setFormData({ ...formData, appliesTo: v as "all" | "frequent_customers" })
                  }
                >
                  <SelectTrigger id="disc-applies">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los clientes</SelectItem>
                    <SelectItem value="frequent_customers">
                      Solo clientes frecuentes
                    </SelectItem>
                  </SelectContent>
                </Select>
                {formData.appliesTo === "frequent_customers" && (
                  <p className="text-sm text-muted-foreground">
                    Esta oferta solo se puede aplicar cuando el cliente es marcado como frecuente en la venta.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  id="disc-active"
                  checked={formData.isActive}
                  onCheckedChange={(v) => setFormData({ ...formData, isActive: v })}
                />
                <Label htmlFor="disc-active">
                  Oferta activa (disponible para aplicar en ventas)
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingDiscount ? "Guardar Cambios" : "Crear Oferta"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmar eliminación */}
      <AlertDialog
        open={!!discountToDelete}
        onOpenChange={(open) => !open && setDiscountToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta oferta?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar "{discountToDelete?.name}". Esta acción no se puede
              deshacer. Las ventas ya registradas con este descuento no se verán afectadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}