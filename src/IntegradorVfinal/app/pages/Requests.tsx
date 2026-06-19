import { useEffect, useState } from "react";
import { StockRequest } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useUndo } from "../contexts/UndoContext";
import { api } from "../utils/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Check, X, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { Navigate } from "react-router";

export function Requests() {
  const { currentUser } = useAuth();
  const { pushAction } = useUndo();
  const isEmployee = currentUser?.role === "employee";
  const isAdmin = currentUser?.role === "admin";
  const isContador = currentUser?.role === "contador";

  if (isContador) {
    return <Navigate to="/purchases" replace />;
  }

  const userBranch = currentUser?.branch;
  const [requests, setRequests] = useState<StockRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ============================
  // CARGAR SOLICITUDES DESDE API
  // ============================
  const loadRequests = async () => {
    try {
      setIsLoading(true);
      // Si es admin, carga todas; si es empleado, filtra por su sucursal
      const branch = isAdmin ? undefined : userBranch;
      const data = await api.getStockRequests(branch);
      setRequests(data);
    } catch (error) {
      toast.error("Error al cargar solicitudes");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================
  // FILTRAR SOLICITUDES
  // ============================
  const filteredRequests = requests.filter((r) => {
    if (isAdmin) return true;
    if (isEmployee) {
      return r.fromBranch === userBranch || r.toBranch === userBranch;
    }
    return false;
  });

  // Solicitudes recibidas (pendientes para mi sucursal)
  const received = filteredRequests.filter(
    (r) => r.toBranch === userBranch && r.status === "pending"
  );

  // Solicitudes enviadas (desde mi sucursal) + historial (resueltas)
  const sent = filteredRequests.filter((r) => r.fromBranch === userBranch);
  const other = filteredRequests.filter(
    (r) =>
      isAdmin ||
      (r.status !== "pending" && (r.fromBranch === userBranch || r.toBranch === userBranch))
  );

  // Combinar historial (sent + other) sin duplicados
  const history = [...sent, ...other].filter(
    (r, index, self) => self.findIndex((item) => item.id === r.id) === index
  );

  // ============================
  // APROBAR SOLICITUD
  // ============================
  const handleApprove = async (request: StockRequest) => {
    const prevRequests = [...requests];
    try {
      const updated = await api.approveStockRequest(request.id);
      toast.success(
        `Solicitud aprobada: ${request.quantity} ${request.productUnit || "unidades"} de "${request.productName}"`
      );

      // Actualizar estado local
      const updatedRequests = requests.map((r) =>
        r.id === request.id ? { ...r, status: "approved" as const } : r
      );
      setRequests(updatedRequests);

      pushAction({
        message: `Solicitud aprobada: ${request.quantity} ${request.productUnit || "unidades"}`,
        undo: () => {
          setRequests(prevRequests);
          toast.info("Aprobación deshecha (solo local)");
        },
        redo: () => {
          setRequests(updatedRequests);
          toast.success("Aprobación rehecha (solo local)");
        },
      });

      // Recargar para sincronizar con el backend
      await loadRequests();
    } catch (error) {
      toast.error("Error al aprobar solicitud");
      console.error(error);
    }
  };

  // ============================
  // RECHAZAR SOLICITUD
  // ============================
  const handleReject = async (request: StockRequest) => {
    const prevRequests = [...requests];
    try {
      const updated = await api.rejectStockRequest(request.id);
      toast.info(
        `Solicitud rechazada: ${request.quantity} ${request.productUnit || "unidades"} de "${request.productName}"`
      );

      // Actualizar estado local
      const updatedRequests = requests.map((r) =>
        r.id === request.id ? { ...r, status: "rejected" as const } : r
      );
      setRequests(updatedRequests);

      pushAction({
        message: `Solicitud rechazada: ${request.quantity} ${request.productUnit || "unidades"}`,
        undo: () => {
          setRequests(prevRequests);
          toast.info("Rechazo deshecho (solo local)");
        },
        redo: () => {
          setRequests(updatedRequests);
          toast.success("Rechazo rehecho (solo local)");
        },
      });

      // Recargar para sincronizar con el backend
      await loadRequests();
    } catch (error) {
      toast.error("Error al rechazar solicitud");
      console.error(error);
    }
  };

  // ============================
  // ESTADO BADGE
  // ============================
  const getStatusBadge = (status: StockRequest["status"]) => {
    const variants = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };
    const labels = {
      pending: "Pendiente",
      approved: "Aprobada",
      rejected: "Rechazada",
    };
    return <Badge className={variants[status]}>{labels[status]}</Badge>;
  };

  // ============================
  // RENDER
  // ============================
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando solicitudes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold text-foreground">Solicitudes de Stock</h2>
        <p className="text-muted-foreground mt-1">
          Gestiona las solicitudes de stock entre sucursales.
        </p>
      </div>

      {/* Solicitudes recibidas (pendientes) */}
      {received.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Solicitudes recibidas (pendientes)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Solicitante</TableHead>
                    <TableHead>Sucursal origen</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {received.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.productName}</TableCell>
                      <TableCell>
                        {r.quantity} {r.productUnit || "unidades"}
                      </TableCell>
                      <TableCell>{r.requestedByName}</TableCell>
                      <TableCell>{r.fromBranch}</TableCell>
                      <TableCell>
                        {new Date(r.createdAt).toLocaleDateString("es-AR")}
                      </TableCell>
                      <TableCell className="flex gap-1">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleApprove(r)}
                        >
                          <Check className="h-4 w-4 mr-1" /> Aprobar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(r)}
                        >
                          <X className="h-4 w-4 mr-1" /> Rechazar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historial de solicitudes */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historial de solicitudes</CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No hay solicitudes previas.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Desde</TableHead>
                      <TableHead>Hacia</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.productName}</TableCell>
                        <TableCell>
                          {r.quantity} {r.productUnit || "unidades"}
                        </TableCell>
                        <TableCell>{r.fromBranch}</TableCell>
                        <TableCell>{r.toBranch}</TableCell>
                        <TableCell>{getStatusBadge(r.status)}</TableCell>
                        <TableCell>
                          {new Date(r.createdAt).toLocaleDateString("es-AR")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {received.length === 0 && history.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No hay solicitudes de stock entre sucursales.
          </CardContent>
        </Card>
      )}
    </div>
  );
}