import { useEffect, useState } from "react";
import { PurchaseOrder } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../utils/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Calendar, Package, Building2, CheckCircle, XCircle, Clock } from "lucide-react";
import { Navigate } from "react-router";
import { toast } from "sonner";
import { useUndo } from "../contexts/UndoContext";

export function Purchases() {
  const { currentUser } = useAuth();
  const { pushAction } = useUndo();
  const isContador = currentUser?.role === "contador";
  const isAdmin = currentUser?.role === "admin";

  // Solo admin y contador pueden ver compras
  if (!isContador && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ============================
  // CARGAR ÓRDENES DE COMPRA
  // ============================
  const loadPurchases = async () => {
    try {
      setIsLoading(true);
      const data = await api.getPurchaseOrders();
      setPurchases(data);
    } catch (error) {
      toast.error("Error al cargar órdenes de compra");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPurchases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================
  // MARCAR COMO ENTREGADO (solo admin y contador)
  // ============================
  const handleDeliver = async (order: PurchaseOrder) => {
    if (order.status === "delivered") {
      toast.info("Esta orden ya está entregada");
      return;
    }

    const prevPurchases = [...purchases];

    try {
      const updated = await api.deliverPurchaseOrder(order.id);
      const updatedPurchases = purchases.map((p) =>
        p.id === order.id ? { ...p, status: "delivered" } : p
      );
      setPurchases(updatedPurchases);
      toast.success(`Orden "${order.productName}" marcada como entregada`);

      pushAction({
        message: `Orden "${order.productName}" marcada como entregada`,
        undo: () => {
          setPurchases(prevPurchases);
          toast.info("Cambio deshecho (solo local)");
        },
        redo: () => {
          setPurchases(updatedPurchases);
          toast.success("Cambio rehecho (solo local)");
        },
      });
    } catch (error) {
      toast.error("Error al marcar como entregada");
      console.error(error);
    }
  };

  // ============================
  // RENDER
  // ============================
  const getStatusBadge = (status: PurchaseOrder["status"]) => {
    const variants = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      delivered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };
    const labels = {
      pending: "Pendiente",
      delivered: "Entregado",
      cancelled: "Cancelado",
    };
    return <Badge className={variants[status]}>{labels[status]}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando órdenes de compra...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold text-foreground">Registro de Compras a Proveedores</h2>
        <p className="text-muted-foreground mt-1">
          Historial de pedidos realizados para reposición de stock.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Compras</CardTitle>
        </CardHeader>
        <CardContent>
          {purchases.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No hay compras registradas aún.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Sucursal</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Costo Total</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Estado</TableHead>
                    {(isAdmin || isContador) && <TableHead>Acciones</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        {new Date(p.date + "T12:00:00").toLocaleDateString("es-AR")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Package className="h-3.5 w-3.5 text-muted-foreground" />
                          {p.productName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          {p.branch}
                        </div>
                      </TableCell>
                      <TableCell>{p.quantity} {p.productUnit || "unidades"}</TableCell>
                      <TableCell>${p.cost.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>{p.provider}</TableCell>
                      <TableCell>{getStatusBadge(p.status)}</TableCell>
                      {(isAdmin || isContador) && (
                        <TableCell>
                          {p.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeliver(p)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Marcar entregado
                            </Button>
                          )}
                          {p.status === "delivered" && (
                            <Badge variant="outline" className="text-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Entregado
                            </Badge>
                          )}
                          {p.status === "cancelled" && (
                            <Badge variant="outline" className="text-red-600">
                              <XCircle className="h-3 w-3 mr-1" />
                              Cancelado
                            </Badge>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}