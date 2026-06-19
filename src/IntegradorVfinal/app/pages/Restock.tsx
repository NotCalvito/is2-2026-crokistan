import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Product, PurchaseOrder, BRANCHES } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useUndo } from "../contexts/UndoContext";
import { api } from "../utils/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  AlertTriangle,
  Package,
  ShoppingCart,
  Filter,
  Building2,
  Lock,
  Send,
  ArrowRightLeft,
  Clock,
  CheckCircle,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";

export function Restock() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { pushAction } = useUndo();
  const isEmployee = currentUser?.role === "employee";
  const isContador = currentUser?.role === "contador";
  const userBranch = currentUser?.branch;

  // Si es contador, redirigir a compras
  useEffect(() => {
    if (isContador) {
      navigate("/purchases", { replace: true });
    }
  }, [isContador, navigate]);

  const [products, setProducts] = useState<Product[]>([]);
  const [branchFilter, setBranchFilter] = useState<string>(
    isEmployee && userBranch ? userBranch : "all"
  );
  const [isLoading, setIsLoading] = useState(true);

  // Estado para diálogo de solicitud a otra sucursal
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [targetBranch, setTargetBranch] = useState<string>("");
  const [requestQuantity, setRequestQuantity] = useState<number>(0);
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);

  // Estado para pedidos a proveedor (indicador "pedido" + confirmar llegada)
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);

  // Estado para diálogo de pedido a proveedor (cantidad escrita por teclado)
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [orderProduct, setOrderProduct] = useState<Product | null>(null);
  const [orderQuantity, setOrderQuantity] = useState<number>(0);

  // ============================
  // CARGAR PRODUCTOS DESDE API
  // ============================
  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const branch = isEmployee && userBranch ? userBranch : "Sucursal Centro";
      const data = await api.getProducts(branch);
      setProducts(data);
    } catch (error) {
      toast.error("Error al cargar productos");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    loadPurchaseOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================
  // CARGAR PEDIDOS A PROVEEDOR PENDIENTES
  // ============================
  const loadPurchaseOrders = async () => {
    try {
      const data = await api.getPurchaseOrders(undefined, "pending");
      setPurchaseOrders(data);
    } catch (error) {
      console.error(error);
    }
  };

  // Devuelve el pedido a proveedor pendiente para un producto (si existe)
  const getPendingOrder = (product: Product) =>
    purchaseOrders.find(
      (o) => o.productId === product.id && o.branch === product.branch && o.status === "pending"
    );

  // ============================
  // FILTRAR PRODUCTOS BAJO STOCK
  // ============================
  const lowStockProducts = products
    .filter((p) => p.currentStock <= p.minStock)
    .filter((p) => branchFilter === "all" || p.branch === branchFilter)
    .sort((a, b) => {
      const percentA = a.currentStock / (a.minStock || 1);
      const percentB = b.currentStock / (b.minStock || 1);
      return percentA - percentB;
    });

  // ============================
  // ABRIR DIÁLOGO DE PEDIDO A PROVEEDOR
  // ============================
  const handleOpenOrderDialog = (product: Product) => {
    const deficit = Math.max(product.minStock - product.currentStock, product.minStock);
    setOrderProduct(product);
    setOrderQuantity(deficit);
    setIsOrderDialogOpen(true);
  };

  // ============================
  // CONFIRMAR PEDIDO A PROVEEDOR (cantidad escrita por el usuario)
  // ============================
  const handleConfirmOrderToSupplier = async () => {
    if (!orderProduct || orderQuantity <= 0) {
      toast.error("Ingresa una cantidad válida.");
      return;
    }

    try {
      await api.createPurchaseOrder({
        productId: orderProduct.id,
        productName: orderProduct.name,
        productUnit: orderProduct.unit || "Unidades",
        branch: orderProduct.branch,
        quantity: orderQuantity,
        cost: orderProduct.price * orderQuantity,
        provider: "Proveedor por defecto",
        date: new Date().toISOString().split("T")[0],
      });

      toast.success(
        `Pedido a proveedor registrado: ${orderQuantity} ${orderProduct.unit || "unidades"} de "${orderProduct.name}"`
      );

      pushAction({
        message: `Pedido a proveedor: ${orderQuantity} ${orderProduct.unit || "unidades"} de "${orderProduct.name}"`,
        undo: () => {
          // No podemos deshacer en el backend, solo local
          toast.info("Pedido a proveedor cancelado (solo local)");
        },
        redo: () => {
          toast.success("Pedido a proveedor rehecho (solo local)");
        },
      });

      setIsOrderDialogOpen(false);
      setOrderProduct(null);
      setOrderQuantity(0);

      await loadPurchaseOrders();
    } catch (error) {
      toast.error("Error al crear pedido a proveedor");
      console.error(error);
    }
  };

  // ============================
  // CONFIRMAR LLEGADA DEL PEDIDO (visible para el empleado)
  // ============================
  const handleConfirmArrival = async (order: PurchaseOrder) => {
    try {
      await api.deliverPurchaseOrder(order.id);

      toast.success(
        `Llegada confirmada: ${order.quantity} ${order.productUnit || "unidades"} de "${order.productName}"`
      );

      pushAction({
        message: `Llegada confirmada de "${order.productName}"`,
        undo: () => {
          toast.info("El stock ya fue actualizado en el servidor y no puede deshacerse.");
        },
        redo: () => {},
      });

      // Recargar productos (stock actualizado) y pedidos pendientes
      await Promise.all([loadProducts(), loadPurchaseOrders()]);
    } catch (error) {
      toast.error("Error al confirmar la llegada del pedido");
      console.error(error);
    }
  };

  // ============================
  // ABRIR DIÁLOGO DE SOLICITUD
  // ============================
  const handleOpenRequestDialog = (product: Product) => {
    setSelectedProduct(product);
    const deficit = Math.max(product.minStock - product.currentStock, product.minStock);
    setRequestQuantity(deficit);
    const branches = BRANCHES.filter(b => b !== product.branch);
    setAvailableBranches(branches);
    setTargetBranch(branches.length > 0 ? branches[0] : "");
    setIsRequestDialogOpen(true);
  };

  // ============================
  // ENVIAR SOLICITUD A OTRA SUCURSAL
  // ============================
  const handleSendRequest = async () => {
    if (!selectedProduct || !targetBranch || requestQuantity <= 0) {
      toast.error("Selecciona una sucursal y una cantidad válida.");
      return;
    }

    // Verificar que la sucursal destino tenga stock suficiente (búsqueda local)
    const targetProduct = products.find(
      (p) => p.id === selectedProduct.id && p.branch === targetBranch
    );
    if (!targetProduct) {
      toast.error(`El producto "${selectedProduct.name}" no existe en ${targetBranch}.`);
      return;
    }
    if (targetProduct.currentStock < requestQuantity) {
      toast.error(
        `Stock insuficiente en ${targetBranch}. Disponible: ${targetProduct.currentStock} ${targetProduct.unit || "unidades"}.`
      );
      return;
    }

    const prevProducts = [...products];

    try {
      // Crear solicitud
      const request = await api.createStockRequest({
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        productUnit: selectedProduct.unit || "Unidades",
        requestedBy: currentUser!.id,
        requestedByName: currentUser!.fullName,
        fromBranch: selectedProduct.branch, // sucursal que solicita
        toBranch: targetBranch, // sucursal destino (la que tiene stock)
        quantity: requestQuantity,
      });

      toast.success(
        `Solicitud enviada a ${targetBranch}: ${requestQuantity} ${selectedProduct.unit || "unidades"} de "${selectedProduct.name}"`
      );

      // Actualizar stock local de manera optimista (restar de destino, sumar a origen)
      const updatedProducts = products.map((p) => {
        if (p.id === selectedProduct.id && p.branch === targetBranch) {
          return { ...p, currentStock: p.currentStock - requestQuantity };
        }
        if (p.id === selectedProduct.id && p.branch === selectedProduct.branch) {
          return { ...p, currentStock: p.currentStock + requestQuantity };
        }
        return p;
      });
      setProducts(updatedProducts);

      pushAction({
        message: `Solicitud a ${targetBranch} por ${requestQuantity} ${selectedProduct.unit || "unidades"}`,
        undo: () => {
          setProducts(prevProducts);
          toast.info("Solicitud cancelada (solo local)");
        },
        redo: () => {
          setProducts(updatedProducts);
          toast.success("Solicitud rehecha (solo local)");
        },
      });

      setIsRequestDialogOpen(false);
      setSelectedProduct(null);
      setTargetBranch("");
      setRequestQuantity(0);

      // Recargar productos para sincronizar con el backend
      await loadProducts();
    } catch (error) {
      toast.error("Error al enviar solicitud");
      console.error(error);
    }
  };

  // ============================
  // IMPRIMIR
  // ============================
  const handlePrint = () => {
    window.print();
  };

  // ============================
  // RENDER
  // ============================
  if (isContador) {
    return null; // Redirige en el useEffect
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando productos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-semibold text-foreground">Productos a Reponer</h2>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            {isEmployee && userBranch ? (
              <>
                <Building2 className="h-4 w-4" />
                {userBranch} — productos por debajo del stock mínimo
              </>
            ) : (
              "Listado de productos por debajo del stock mínimo (verificado por sucursal)"
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!isEmployee ? (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="w-[180px]" aria-label="Filtrar por sucursal">
                  <SelectValue placeholder="Filtrar sucursal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las sucursales</SelectItem>
                  {BRANCHES.map((branch) => (
                    <SelectItem key={branch} value={branch}>
                      {branch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-muted/50 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>{userBranch}</span>
              <Lock className="h-3.5 w-3.5" />
            </div>
          )}

          {lowStockProducts.length > 0 && (
            <Button onClick={handlePrint} variant="outline">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Imprimir Lista
            </Button>
          )}
        </div>
      </div>

      {lowStockProducts.length > 0 && (
        <Card className="border-amber-400 dark:border-amber-700">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-500" />
              <CardTitle>
                {lowStockProducts.length} producto(s) requieren atención inmediata
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-foreground">
              Estos productos han alcanzado o están por debajo de su stock mínimo configurado.
              Puedes solicitar stock a otra sucursal o realizar un pedido a proveedor.
            </p>
          </CardContent>
        </Card>
      )}

      {!isEmployee && branchFilter !== "all" &&
        lowStockProducts.length === 0 &&
        products.filter((p) => p.currentStock <= p.minStock).length > 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No hay productos con stock bajo en la sucursal "{branchFilter}". Cambia el
                filtro para ver otros resultados.
              </p>
            </CardContent>
          </Card>
        )}

      <div className="space-y-4">
        {lowStockProducts.length === 0 &&
        products.filter((p) => p.currentStock <= p.minStock).length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                ¡Todo está en orden!
              </h3>
              <p className="text-muted-foreground">
                No hay productos que requieran reposición en este momento
                {isEmployee && userBranch ? ` en ${userBranch}` : ""}.
              </p>
            </CardContent>
          </Card>
        ) : lowStockProducts.length === 0 && isEmployee ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                ¡Todo está en orden en tu sucursal!
              </h3>
              <p className="text-muted-foreground">
                No hay productos con stock bajo en {userBranch}.
              </p>
            </CardContent>
          </Card>
        ) : (
          lowStockProducts.map((product) => {
            const deficit = Math.max(product.minStock - product.currentStock, product.minStock);
            const percentage =
              product.minStock > 0
                ? (product.currentStock / product.minStock) * 100
                : 0;
            const severity =
              percentage <= 0
                ? "critical"
                : percentage <= 50
                ? "high"
                : percentage <= 100
                ? "medium"
                : "low";

            const severityBorderColors = {
              critical: "border-amber-600 dark:border-amber-600",
              high: "border-amber-500 dark:border-amber-500",
              medium: "border-amber-400 dark:border-amber-600",
              low: "border-amber-300 dark:border-amber-700",
            };

            const severityBarColors = {
              critical: "bg-amber-600",
              high: "bg-amber-500",
              medium: "bg-amber-400",
              low: "bg-amber-300",
            };

            const severityLabels = {
              critical: "CRÍTICO",
              high: "URGENTE",
              medium: "ATENCIÓN",
              low: "REPONER",
            };

            const severityBadgeColors = {
              critical:
                "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-400 border-amber-400 dark:border-amber-700",
              high: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700",
              medium:
                "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-500 border-amber-200 dark:border-amber-800",
              low: "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-500 border-amber-200 dark:border-amber-800",
            };

            // Verificar si hay otra sucursal con stock
            const otherBranchesWithStock = products.filter(
              (p) => p.id === product.id && p.branch !== product.branch && p.currentStock > 0
            );

            // Verificar si ya existe un pedido a proveedor pendiente para este producto
            const pendingOrder = getPendingOrder(product);

            return (
              <Card key={product.id} className={severityBorderColors[severity]}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <CardTitle className="text-lg">{product.name}</CardTitle>
                        <Badge
                          variant="outline"
                          className={severityBadgeColors[severity]}
                        >
                          {severityLabels[severity]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {product.category} • {product.branch || "Sin sucursal"}
                        {" • "}
                        <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {product.unit || "Unidades"}
                        </span>
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Stock Actual</p>
                      <p className="text-lg font-semibold text-amber-600 dark:text-amber-500">
                        {product.currentStock} {product.unit || "unidades"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Stock Mínimo</p>
                      <p className="text-lg font-semibold">
                        {product.minStock} {product.unit || "unidades"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Cantidad Sugerida</p>
                      <p className="text-lg font-semibold text-primary">
                        {deficit} {product.unit || "unidades"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Costo Estimado</p>
                      <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                        $
                        {(product.price * deficit).toLocaleString("es-AR", {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Nivel de stock</span>
                      <span className="font-medium">{percentage.toFixed(0)}% del mínimo</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${severityBarColors[severity]}`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex flex-wrap items-start gap-2 pt-2">
                    {pendingOrder ? (
                      <div className="flex flex-1 min-w-[220px] flex-col gap-2">
                        <Badge
                          variant="outline"
                          className="w-fit bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800"
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          Pedido a proveedor — {pendingOrder.quantity} {product.unit || "unidades"}
                        </Badge>
                        <Button
                          onClick={() => handleConfirmArrival(pendingOrder)}
                          variant="outline"
                          className="flex-1 min-w-[120px] text-green-600 hover:text-green-700 border-green-300 dark:border-green-800"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Confirmar llegada
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={() => handleOpenOrderDialog(product)}
                        variant="default"
                        className="flex-1 min-w-[120px]"
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Pedir a Proveedor
                      </Button>
                    )}

                    {otherBranchesWithStock.length > 0 && (
                      <Button
                        onClick={() => handleOpenRequestDialog(product)}
                        variant="outline"
                        className="flex-1 min-w-[120px]"
                      >
                        <ArrowRightLeft className="h-4 w-4 mr-2" />
                        Solicitar a otra sucursal
                      </Button>
                    )}
                  </div>
                  {otherBranchesWithStock.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No hay otras sucursales con stock disponible de este producto.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Diálogo para solicitar a otra sucursal */}
      <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Solicitar a otra sucursal</DialogTitle>
            <DialogDescription>
              Selecciona la sucursal de la cual deseas obtener stock y la cantidad necesaria.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Producto</Label>
              <p className="text-sm font-medium">{selectedProduct?.name}</p>
              <p className="text-xs text-muted-foreground">
                Stock actual: {selectedProduct?.currentStock} {selectedProduct?.unit || "unidades"} · 
                Sucursal: {selectedProduct?.branch}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetBranch">Sucursal destino</Label>
              <Select value={targetBranch} onValueChange={setTargetBranch}>
                <SelectTrigger id="targetBranch">
                  <SelectValue placeholder="Selecciona una sucursal" />
                </SelectTrigger>
                <SelectContent>
                  {availableBranches.map((branch) => {
                    // Mostrar stock disponible en esa sucursal
                    const stockInBranch = products.find(
                      (p) => p.id === selectedProduct?.id && p.branch === branch
                    )?.currentStock || 0;
                    return (
                      <SelectItem key={branch} value={branch}>
                        {branch} (Stock: {stockInBranch} {selectedProduct?.unit || "unidades"})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="requestQuantity">Cantidad a solicitar</Label>
              <Input
                id="requestQuantity"
                type="number"
                min={1}
                value={requestQuantity}
                onChange={(e) => setRequestQuantity(parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                Déficit sugerido: {selectedProduct ? Math.max(selectedProduct.minStock - selectedProduct.currentStock, selectedProduct.minStock) : 0}{" "}
                {selectedProduct?.unit || "unidades"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRequestDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSendRequest}>
              <Send className="h-4 w-4 mr-2" />
              Enviar solicitud
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para pedir a proveedor (cantidad escrita por teclado) */}
      <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pedir a proveedor</DialogTitle>
            <DialogDescription>
              Se sugiere el déficit hasta el stock mínimo, pero puedes escribir cualquier otra cantidad.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Producto</Label>
              <p className="text-sm font-medium">{orderProduct?.name}</p>
              <p className="text-xs text-muted-foreground">
                Stock actual: {orderProduct?.currentStock} {orderProduct?.unit || "unidades"} ·{" "}
                Mínimo: {orderProduct?.minStock} {orderProduct?.unit || "unidades"} ·{" "}
                Sucursal: {orderProduct?.branch}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="orderQuantity">Cantidad a pedir</Label>
              <Input
                id="orderQuantity"
                type="number"
                min={1}
                value={orderQuantity}
                onChange={(e) => setOrderQuantity(parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                Déficit sugerido:{" "}
                {orderProduct
                  ? Math.max(orderProduct.minStock - orderProduct.currentStock, orderProduct.minStock)
                  : 0}{" "}
                {orderProduct?.unit || "unidades"}
              </p>
            </div>

            {orderProduct && (
              <p className="text-sm text-muted-foreground">
                Costo estimado: $
                {(orderProduct.price * orderQuantity).toLocaleString("es-AR", {
                  minimumFractionDigits: 2,
                })}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOrderDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmOrderToSupplier}>
              <ShoppingCart className="h-4 w-4 mr-2" />
              Confirmar pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resumen de costos */}
      {lowStockProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumen de Reposición</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-3 border-b border-border">
                <span className="text-muted-foreground">Total de productos a reponer:</span>
                <span className="text-lg font-semibold">{lowStockProducts.length}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-border">
                <span className="text-muted-foreground">Total de unidades a pedir:</span>
                <span className="text-lg font-semibold">
                  {lowStockProducts.reduce(
                    (sum, p) => sum + Math.max(p.minStock - p.currentStock, p.minStock),
                    0
                  )}{" "}
                  unidades
                </span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-foreground font-medium">Inversión estimada total:</span>
                <span className="text-2xl font-semibold text-green-600 dark:text-green-400">
                  $
                  {lowStockProducts
                    .reduce(
                      (sum, p) =>
                        sum + p.price * Math.max(p.minStock - p.currentStock, p.minStock),
                      0
                    )
                    .toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              💡 Sugerencia: Este resumen puede imprimirse para compartir con el equipo de compras
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}