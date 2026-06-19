import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { Product, Movement, MOVEMENT_REASONS, Discount, BRANCHES, Customer } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useUndo } from "../contexts/UndoContext";
import { api } from "../utils/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Calendar,
  AlertCircle,
  X,
  Filter,
  User,
  Tag,
  ShoppingCart,
  Building2,
  BadgePercent,
  Lock,
  Star,
  Search,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../components/ui/badge";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Separator } from "../components/ui/separator";

const FREQUENT_CUSTOMER_THRESHOLD = 3;

// Helper para normalizar tipos que vienen desde el backend (por si vienen en español)
const normalizeType = (t?: string) => {
  if (!t) return "exit";
  const lower = String(t).toLowerCase();
  return lower === "entrada" || lower === "entry" ? "entry" : "exit";
};

export function Movements() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const { pushAction } = useUndo();

  const isEmployee = currentUser?.role === "employee";
  const isContador = currentUser?.role === "contador";
  const userBranch = currentUser?.branch;

  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
  const [productFilter, setProductFilter] = useState<string>("");

  // Estados para el buscador interactivo de productos
  const [productSearch, setProductSearch] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  const filterType = searchParams.get("filter") as "entry" | "exit" | null;
  const [branchFilter, setBranchFilter] = useState<string>(
    isEmployee && userBranch ? userBranch : "all"
  );
  const [customerFilter, setCustomerFilter] = useState<string>("");

  const [formData, setFormData] = useState({
    productId: "",
    type: "" as "entry" | "exit" | "",
    quantity: "",
    reason: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    customerName: "",
    customerPhone: "",
    discountId: "", 
  });

  const [formErrors, setFormErrors] = useState({
    productId: "",
    type: "",
    quantity: "",
    reason: "",
    description: "",
    date: "",
    customerName: "",
  });

  // ============================
  // CARGAR DATOS INICIALES
  // ============================
  const loadData = async () => {
    try {
      setIsLoading(true);
      const branch = isEmployee && userBranch ? userBranch : "Sucursal Centro";
      const [productsData, movementsData, discountsData] = await Promise.all([
        api.getProducts(branch),
        api.getMovements(),
        api.getDiscounts(true),
      ]);
      setProducts(productsData);
      setMovements(movementsData);
      setDiscounts(discountsData);
    } catch (error) {
      toast.error("Error al cargar datos");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenDialog = () => {
    setFoundCustomer(null);
    setProductSearch("");
    setShowProductDropdown(false);
    setFormData({
      productId: "",
      type: "",
      quantity: "",
      reason: "",
      description: "",
      date: new Date().toISOString().split("T")[0],
      customerName: "",
      customerPhone: "",
      discountId: "",
    });
    setFormErrors({
      productId: "",
      type: "",
      quantity: "",
      reason: "",
      description: "",
      date: "",
      customerName: "",
    });
    setIsDialogOpen(true);
  };

  const selectedProduct = products.find((p) => String(p.id) === String(formData.productId));
  const isSale = formData.type === "exit" && formData.reason.toLowerCase() === "venta";
  const activeDiscounts = discounts.filter((d) => d.isActive);
  const selectedDiscount = discounts.find((d) => d.id === formData.discountId);

  // Cálculo de precios
  const unitPrice = selectedProduct?.price || 0;
  const hasValidPrice = selectedProduct ? selectedProduct.price > 0 : false;
  const qty = parseInt(formData.quantity) || 0;

  let discountAmount = 0;
  let finalUnitPrice = 0;
  let totalAmount = 0;

  if (hasValidPrice) {
    if (selectedDiscount && qty > 0) {
      if (selectedDiscount.type === "percentage") {
        discountAmount = unitPrice * (selectedDiscount.value / 100);
      } else {
        discountAmount = selectedDiscount.value;
      }
    }
    finalUnitPrice = Math.max(0, unitPrice - discountAmount);
    totalAmount = finalUnitPrice * qty;
  }

  // ============================
  // BUSCAR CLIENTE
  // ============================
  const handleCustomerNameChange = async (name: string) => {
    setFormData((prev) => ({ ...prev, customerName: name }));

    if (name.trim().length >= 2) {
      try {
        const customers = await api.getCustomers(name);
        if (customers.length > 0) {
          const found = customers[0];
          setFoundCustomer(found);
          if (found.es_frecuente) {
            const frequentDiscount = discounts.find(
              (d) => d.appliesTo === "frequent_customers" && d.isActive
            );
            setFormData((prev) => ({
              ...prev,
              discountId: prev.discountId || frequentDiscount?.id || "",
            }));
          }
        } else {
          setFoundCustomer(null);
        }
      } catch (error) {
        console.error("Error al buscar cliente:", error);
      }
    } else {
      setFoundCustomer(null);
    }
  };

  // ============================
  // VALIDACIÓN
  // ============================
  const validateForm = () => {
    const errors = {
      productId: "",
      type: "",
      quantity: "",
      reason: "",
      description: "",
      date: "",
      customerName: "",
    };
    let isValid = true;

    if (!formData.productId) {
      errors.productId = "Debes seleccionar un producto válido de la lista";
      isValid = false;
    }

    if (!formData.type) {
      errors.type = "Debes seleccionar el tipo de movimiento";
      isValid = false;
    }

    if (!formData.quantity) {
      errors.quantity = "La cantidad es obligatoria";
      isValid = false;
    } else if (parseInt(formData.quantity) <= 0) {
      errors.quantity = "La cantidad debe ser mayor a 0";
      isValid = false;
    } else if (
      formData.type === "exit" &&
      selectedProduct &&
      parseInt(formData.quantity) > selectedProduct.currentStock
    ) {
      errors.quantity = `No puedes retirar más de ${selectedProduct.currentStock} unidades disponibles`;
      isValid = false;
    }

    if (!formData.reason) {
      errors.reason = "Debes seleccionar un motivo";
      isValid = false;
    } else if (formData.reason === "Otro" && !formData.description.trim()) {
      errors.description = "Cuando seleccionas 'Otro', debes explicar el motivo";
      isValid = false;
    } else if (formData.reason === "Otro" && formData.description.trim().length < 10) {
      errors.description = "La descripción debe tener al menos 10 caracteres";
      isValid = false;
    }

    if (!formData.date) {
      errors.date = "La fecha es obligatoria";
      isValid = false;
    }

    if (isSale && selectedProduct && selectedProduct.price === 0) {
      errors.productId = "No se puede vender un producto sin precio definido.";
      toast.error("Este producto no tiene precio definido. Un contador debe asignarle uno antes de poder venderlo.");
      isValid = false;
    }

    if (
      isSale &&
      selectedDiscount?.appliesTo === "frequent_customers" &&
      !foundCustomer?.es_frecuente
    ) {
      toast.warning(`La oferta "${selectedDiscount.name}" es solo para clientes frecuentes.`);
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  // ============================
  // GUARDAR MOVIMIENTO
  // ============================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Por favor corrige los errores en el formulario");
      return;
    }

    const product = products.find((p) => String(p.id) === String(formData.productId));
    if (!product) return;

    const quantity = parseInt(formData.quantity);
    const prevMovements = [...movements];
    const prevProducts = [...products];

    const newMovement: any = {
      productId: product.id,
      productName: product.name,
      productBranch: product.branch,
      type: formData.type as "entry" | "exit",
      quantity,
      reason: formData.reason,
      description: formData.description.trim() || undefined,
      date: formData.date,
      sellerId: currentUser?.id,
      sellerName: currentUser?.fullName,
      sellerBranch: currentUser?.branch === "all" ? product.branch : currentUser?.branch,
    };

    if (isSale) {
      newMovement.customerName = formData.customerName.trim() || undefined;
      newMovement.customerPhone = formData.customerPhone.trim() || undefined;
      newMovement.isFrequentCustomer = foundCustomer?.es_frecuente || false;
      newMovement.discountId = formData.discountId || undefined;
      newMovement.discountName = selectedDiscount?.name;
      newMovement.discountValue = selectedDiscount?.value;
      newMovement.isCash = selectedDiscount?.id === "d-cash" || (selectedDiscount?.name.toLowerCase().includes("efectivo"));
      newMovement.unitPrice = unitPrice;
      newMovement.finalUnitPrice = finalUnitPrice;
      newMovement.totalAmount = totalAmount;
    }

    try {
      const result = await api.createMovement(newMovement);

      const updatedProducts = products.map((p) =>
        p.id === product.id
          ? {
              ...p,
              currentStock:
                formData.type === "entry"
                  ? p.currentStock + quantity
                  : p.currentStock - quantity,
            }
          : p
      );
      setProducts(updatedProducts);

      const newMovementWithId = { ...newMovement, id: result.id || Date.now().toString() };
      const updatedMovements = [newMovementWithId, ...movements];
      setMovements(updatedMovements);

      if (isSale && formData.customerName.trim()) {
        const updatedCustomer = await api.getCustomers(formData.customerName.trim());
        if (updatedCustomer.length > 0 && updatedCustomer[0].es_frecuente) {
          toast.success(
            `⭐ ¡${updatedCustomer[0].nombre} es cliente frecuente! (${updatedCustomer[0].compras} compras)`
          );
        }
      }

      const typeLabel = formData.type === "entry" ? "Entrada" : "Salida";
      toast.success(
        `${typeLabel} registrada: ${quantity} unidades de "${product.name}"`
      );
      setIsDialogOpen(false);

      pushAction({
        message: `${typeLabel}: ${quantity} u. de "${product.name}"`,
        undo: () => {
          setProducts(prevProducts);
          setMovements(prevMovements);
          toast.info("Movimiento deshecho (solo local)");
        },
        redo: () => {
          setProducts(updatedProducts);
          setMovements(updatedMovements);
          toast.success("Movimiento rehecho (solo local)");
        },
      });

      await loadData();
    } catch (error) {
      toast.error("Error al registrar movimiento");
      console.error(error);
    }
  };

  // ============================
  // FILTROS
  // ============================
  const visibleProducts = (
    isEmployee && userBranch
      ? products.filter((p) => p.branch === userBranch)
      : products
  ).sort((a, b) => a.name.localeCompare(b.name, "es"));

  const filteredMovements = movements
    .filter((m) => {
      const mType = normalizeType(m.type);
      const matchesType = !filterType || mType === filterType;
      const matchesBranch =
        branchFilter === "all" ||
        m.productBranch === branchFilter ||
        m.sellerBranch === branchFilter;
      const matchesCustomer =
        !customerFilter ||
        (m.customerName
          ?.toLowerCase()
          .includes(customerFilter.toLowerCase()) ?? false);
      const matchesProduct =
        !productFilter ||
        m.productName.toLowerCase().includes(productFilter.toLowerCase());
      return matchesType && matchesBranch && matchesCustomer && matchesProduct;
    })
    .sort((a, b) => {
      const dateA = new Date(a.date || (a as any).fecha || (a as any).createdAt || 0).getTime();
      const dateB = new Date(b.date || (b as any).fecha || (b as any).createdAt || 0).getTime();
      return dateB - dateA;
    });

  const clearFilter = () => setSearchParams({});

  const availableReasons = formData.type
    ? MOVEMENT_REASONS[formData.type as "entry" | "exit"]
    : [];

  const activeFiltersCount =
    (filterType ? 1 : 0) +
    (!isEmployee && branchFilter !== "all" ? 1 : 0) +
    (customerFilter ? 1 : 0) +
    (productFilter ? 1 : 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando movimientos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-3xl font-semibold text-foreground">
              Movimientos de Stock
            </h2>
            {filterType && (
              <Badge
                variant="secondary"
                className={`flex items-center gap-1 ${
                  filterType === "entry"
                    ? "bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-400"
                    : "bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-400"
                }`}
              >
                {filterType === "entry" ? (
                  <>
                    <TrendingUp className="h-3 w-3" /> Solo Entradas
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3 w-3" /> Solo Salidas
                  </>
                )}
                <button
                  onClick={clearFilter}
                  className="ml-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5"
                  aria-label="Quitar filtro"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {!isEmployee && branchFilter !== "all" && (
              <Badge
                variant="secondary"
                className="flex items-center gap-1 bg-primary/10 text-primary"
              >
                <Building2 className="h-3 w-3" />
                {branchFilter}
                <button
                  onClick={() => setBranchFilter("all")}
                  className="ml-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {customerFilter && (
              <Badge
                variant="secondary"
                className="flex items-center gap-1 bg-violet-100 dark:bg-violet-950/50 text-violet-800 dark:text-violet-400"
              >
                <User className="h-3 w-3" />
                Cliente: {customerFilter}
                <button
                  onClick={() => setCustomerFilter("")}
                  className="ml-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {productFilter && (
              <Badge
                variant="secondary"
                className="flex items-center gap-1 bg-orange-100 dark:bg-orange-950/50 text-orange-800 dark:text-orange-400"
              >
                <Package className="h-3 w-3" />
                Producto: {productFilter}
                <button
                  onClick={() => setProductFilter("")}
                  className="ml-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {isEmployee && userBranch && (
              <Badge
                variant="secondary"
                className="flex items-center gap-1 bg-muted text-muted-foreground"
              >
                <Building2 className="h-3 w-3" />
                {userBranch}
                <Lock className="h-3 w-3 ml-0.5" />
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            Mostrando {filteredMovements.length} de {movements.length} movimientos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="relative">
                <Filter className="h-4 w-4 mr-2" />
                Filtros
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-4" align="end">
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Filtrar movimientos</h4>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Por tipo</Label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={filterType === "entry" ? "default" : "outline"}
                      className="flex-1 h-8 text-xs"
                      onClick={() => {
                        setSearchParams({ filter: "entry" });
                        setIsFilterOpen(false);
                      }}
                    >
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Entradas
                    </Button>
                    <Button
                      size="sm"
                      variant={filterType === "exit" ? "default" : "outline"}
                      className="flex-1 h-8 text-xs"
                      onClick={() => {
                        setSearchParams({ filter: "exit" });
                        setIsFilterOpen(false);
                      }}
                    >
                      <TrendingDown className="h-3 w-3 mr-1" />
                      Salidas
                    </Button>
                  </div>
                </div>
                {!isEmployee && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Por sucursal</Label>
                    <Select
                      value={branchFilter}
                      onValueChange={(v) => {
                        setBranchFilter(v);
                        setIsFilterOpen(false);
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Todas las sucursales" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las sucursales</SelectItem>
                        {BRANCHES.map((b) => (
                          <SelectItem key={b} value={b}>
                            {b}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Por cliente</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      className="h-8 text-xs pl-7"
                      placeholder="Ej: Roberto Núñez..."
                      value={customerFilter}
                      onChange={(e) => setCustomerFilter(e.target.value)}
                    />
                    {customerFilter && (
                      <button
                        onClick={() => setCustomerFilter("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
                {(filterType ||
                  (!isEmployee && branchFilter !== "all") ||
                  customerFilter) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full h-8 text-xs text-muted-foreground"
                    onClick={() => {
                      clearFilter();
                      if (!isEmployee) setBranchFilter("all");
                      setCustomerFilter("");
                      setIsFilterOpen(false);
                    }}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Limpiar todos los filtros
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {!isContador && (
            <Button onClick={handleOpenDialog} disabled={visibleProducts.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Movimiento
            </Button>
          )}
        </div>
      </div>

      {visibleProducts.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No hay productos en el inventario. Debes agregar
            productos antes de registrar movimientos.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {filteredMovements.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No hay movimientos que coincidan con los filtros aplicados.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredMovements.map((movement) => {
            const isEntry = normalizeType(movement.type) === "entry";
            const movementReason = movement.reason || (movement as any).motivo || "No especificado";
            const rawDate = movement.date || (movement as any).fecha || (movement as any).createdAt;
            
            let displayDate = "Fecha sin definir";
            if (rawDate) {
              const dateStr = String(rawDate);
              const parsedDate = new Date(dateStr.length === 10 ? `${dateStr}T12:00:00` : dateStr);
              if (!isNaN(parsedDate.getTime())) {
                displayDate = parsedDate.toLocaleDateString("es-AR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                });
              }
            }

            return (
              <Card key={movement.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <CardTitle className="text-lg">{movement.productName}</CardTitle>
                        <Badge
                          className={`flex items-center gap-1 ${
                            isEntry
                              ? "bg-blue-600 hover:bg-blue-700 text-white"
                              : "bg-green-600 hover:bg-green-700 text-white border-green-600"
                          }`}
                        >
                          {isEntry ? (
                            <>
                              <TrendingUp className="h-3 w-3" /> Entrada
                            </>
                          ) : (
                            <>
                              <TrendingDown className="h-3 w-3" /> Salida
                            </>
                          )}
                        </Badge>
                        {movement.productBranch && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {movement.productBranch}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {displayDate}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Cantidad</p>
                      <p
                        className={`text-lg font-semibold ${
                          isEntry ? "text-blue-600" : "text-green-600"
                        }`}
                      >
                        {isEntry ? "+" : "-"}
                        {movement.quantity} unidades
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Motivo</p>
                      <p className="text-lg font-medium">{movementReason}</p>
                    </div>
                  </div>

                  {movementReason.toLowerCase() === "venta" && (
                    <div className="mt-4 p-3 bg-muted/50 rounded-md space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Detalles de la venta
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2 text-sm">
                        {movement.customerName && (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div>
                              <span className="text-muted-foreground">Cliente: </span>
                              <span className="font-medium">
                                {movement.customerName}
                              </span>
                              {movement.isFrequentCustomer && (
                                <Badge
                                  variant="outline"
                                  className="ml-1 text-xs py-0 h-4 text-primary border-primary/40"
                                >
                                  <Star className="h-2.5 w-2.5 mr-0.5" />
                                  Frecuente
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                        {movement.sellerName && (
                          <div className="flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div>
                              <span className="text-muted-foreground">Vendedor: </span>
                              <span className="font-medium">{movement.sellerName}</span>
                            </div>
                          </div>
                        )}
                        {movement.discountName && (
                          <div className="flex items-center gap-2">
                            <BadgePercent className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div>
                              <span className="text-muted-foreground">Oferta/Desc: </span>
                              <span className="font-medium">{movement.discountName}</span>
                            </div>
                          </div>
                        )}
                        {movement.totalAmount !== undefined && (
                          <div className="flex items-center gap-2">
                            <Tag className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div>
                              <span className="text-muted-foreground">Total: </span>
                              <span className="font-semibold text-primary">
                                $
                                {movement.totalAmount.toLocaleString("es-AR", {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {movement.description && (
                    <div className="mt-4 p-3 bg-muted rounded-md">
                      <p className="text-sm text-muted-foreground mb-1">
                        Descripción adicional:
                      </p>
                      <p className="text-sm text-foreground">{movement.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Movimiento de Stock</DialogTitle>
            <DialogDescription>
              Registra una entrada o salida de inventario
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              
              {/* SELECTOR DE PRODUCTO CON AUTOCOMPLETE / CAMPO DONDE SE ESCRIBE */}
              <div className="space-y-2 relative">
                <Label htmlFor="product">
                  Producto <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="product"
                    placeholder="Escribe para buscar un producto..."
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setShowProductDropdown(true);
                      if (!e.target.value) {
                        setFormData((prev) => ({ ...prev, productId: "" }));
                      }
                    }}
                    onFocus={() => setShowProductDropdown(true)}
                  />
                  {productSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setProductSearch("");
                        setFormData((prev) => ({ ...prev, productId: "" }));
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {showProductDropdown && (
                  <>
                    {/* Capa invisible para cerrar el menú si se hace clic afuera */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowProductDropdown(false)}
                    />
                    <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border rounded-md shadow-lg max-h-60 overflow-y-auto p-1 animate-in fade-in-50 duration-200">
                      {visibleProducts.filter((p) =>
                        p.name.toLowerCase().includes(productSearch.toLowerCase())
                      ).length === 0 ? (
                        <div className="text-sm p-3 text-muted-foreground text-center">
                          No se encontraron productos
                        </div>
                      ) : (
                        visibleProducts
                          .filter((p) =>
                            p.name.toLowerCase().includes(productSearch.toLowerCase())
                          )
                          .map((product) => {
                            const hasPrice = product.price > 0;
                            const isVentaDisabled =
                              !hasPrice &&
                              formData.type === "exit" &&
                              formData.reason.toLowerCase() === "venta";

                            return (
                              <button
                                key={product.id}
                                type="button"
                                disabled={isVentaDisabled}
                                className="w-full text-left text-sm px-3 py-2 rounded-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                onClick={() => {
                                  setFormData((prev) => ({
                                    ...prev,
                                    productId: String(product.id),
                                  }));
                                  setProductSearch(product.name);
                                  setShowProductDropdown(false);
                                }}
                              >
                                <div className="font-medium text-foreground">
                                  {product.name}
                                </div>
                                <div className="text-xs text-muted-foreground flex justify-between mt-0.5">
                                  <span>
                                    Stock: {product.currentStock} {product.unit}
                                  </span>
                                  <span>
                                    {hasPrice ? `$${product.price}` : "⚠️ Sin precio"}
                                  </span>
                                </div>
                              </button>
                            );
                          })
                      )}
                    </div>
                  </>
                )}
                {formErrors.productId && (
                  <p className="text-sm text-destructive">{formErrors.productId}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">
                  Tipo de Movimiento <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      type: value as "entry" | "exit",
                      reason: "",
                      discountId: "",
                    })
                  }
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Selecciona el tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entry">Entrada (Agregar stock)</SelectItem>
                    <SelectItem value="exit">Salida (Retirar stock)</SelectItem>
                  </SelectContent>
                </Select>
                {formErrors.type && (
                  <p className="text-sm text-destructive">{formErrors.type}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Cantidad</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, quantity: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Fecha</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Motivo</Label>
                <Select
                  value={formData.reason}
                  onValueChange={(value) => setFormData({ ...formData, reason: value, discountId: "" })}
                  disabled={!formData.type}
                >
                  <SelectTrigger id="reason">
                    <SelectValue placeholder="Selecciona un motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableReasons.map((reason) => (
                      <SelectItem key={reason} value={reason}>
                        {reason}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isSale && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 text-primary" />
                      <p className="font-medium text-sm">Información de la Venta</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="customerName">Cliente (opcional)</Label>
                      <Input
                        id="customerName"
                        value={formData.customerName}
                        onChange={(e) => handleCustomerNameChange(e.target.value)}
                        placeholder="Nombre del cliente"
                      />
                      {formData.customerName.length >= 2 && foundCustomer && (
                        <div className="text-xs mt-1">
                          {foundCustomer.es_frecuente ? (
                            <div className="text-primary font-medium">
                              ⭐ Cliente frecuente detectado ({foundCustomer.compras} compras).
                            </div>
                          ) : (
                            <div className="text-muted-foreground">
                              Cliente registrado ({foundCustomer.compras} compras).
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {activeDiscounts.length > 0 && (
                      <div className="space-y-2">
                        <Label htmlFor="discount">Aplicar oferta / método de pago</Label>
                        <Select
                          value={formData.discountId}
                          onValueChange={(v) =>
                            setFormData({ ...formData, discountId: v })
                          }
                        >
                          <SelectTrigger id="discount">
                            <SelectValue placeholder="Sin ofertas seleccionadas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Ninguna</SelectItem>
                            {activeDiscounts.map((d) => {
                              const requiresFrequent = d.appliesTo === "frequent_customers";
                              const canApply = !requiresFrequent || foundCustomer?.es_frecuente;
                              
                              const displayValue = d.type === "percentage" ? `${d.value}%` : `$${d.value}`;
                              const nameHasValue = d.name.includes(d.value.toString()) || d.name.includes(displayValue);

                              return (
                                <SelectItem key={d.id} value={d.id} disabled={!canApply}>
                                  <div className="flex items-center gap-2">
                                    <BadgePercent className="h-4 w-4" />
                                    {d.name} {!nameHasValue && `(${displayValue})`}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {selectedProduct && qty > 0 && hasValidPrice && (
                      <div className="p-3 bg-primary/5 border border-primary/20 rounded-md space-y-1 text-sm">
                        <div className="grid grid-cols-2 gap-1 text-muted-foreground">
                          <span>Subtotal ({qty} u.):</span>
                          <span className="text-right font-medium text-foreground">
                            ${(unitPrice * qty).toLocaleString("es-AR")}
                          </span>
                          {selectedDiscount && (
                            <>
                              <span>{selectedDiscount.name}:</span>
                              <span className="text-right font-medium text-green-600">
                                -$
                                {(discountAmount * qty).toLocaleString("es-AR", {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="flex justify-between pt-1 border-t border-primary/20 font-semibold text-foreground">
                          <span>Total Final:</span>
                          <span className="text-primary">
                            ${totalAmount.toLocaleString("es-AR", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="description">
                  Descripción {formData.reason === "Otro" && <span className="text-destructive">*</span>}
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Registrar Movimiento</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}