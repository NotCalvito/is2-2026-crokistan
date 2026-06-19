import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Product, BRANCHES } from "../types";
import { api } from "../utils/api";
import { Search, Package, Building2 } from "lucide-react";
import { Input } from "./ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";

// Agrupa los productos de todas las sucursales que comparten el mismo nombre,
// para poder mostrar de un vistazo el stock que tiene cada sucursal de "ese" producto.
interface GroupedProduct {
  name: string;
  category: string;
  price: number;
  unit: string;
  totalStock: number;
  minStock: number;
  byBranch: { branch: string; id: string; currentStock: number; minStock: number }[];
}

function groupProductsByName(products: Product[]): GroupedProduct[] {
  const map = new Map<string, GroupedProduct>();

  for (const product of products) {
    const key = product.name.trim().toLowerCase();
    const existing = map.get(key);

    if (existing) {
      existing.totalStock += product.currentStock;
      existing.byBranch.push({
        branch: product.branch || "Sin sucursal",
        id: product.id,
        currentStock: product.currentStock,
        minStock: product.minStock,
      });
    } else {
      map.set(key, {
        name: product.name,
        category: product.category,
        price: product.price,
        unit: product.unit,
        totalStock: product.currentStock,
        minStock: product.minStock,
        byBranch: [
          {
            branch: product.branch || "Sin sucursal",
            id: product.id,
            currentStock: product.currentStock,
            minStock: product.minStock,
          },
        ],
      });
    }
  }

  // Ordenar las sucursales de cada producto alfabéticamente para una lectura consistente
  for (const group of map.values()) {
    group.byBranch.sort((a, b) => a.branch.localeCompare(b.branch));
  }

  return Array.from(map.values());
}

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [groupedProducts, setGroupedProducts] = useState<GroupedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Obtener productos de TODAS las sucursales para poder mostrar, para cada
  // producto, cuánto stock tienen las demás sucursales (no solo la propia).
  useEffect(() => {
    if (isOpen) {
      const fetchProducts = async () => {
        try {
          setIsLoading(true);
          const resultados = await Promise.all(
            BRANCHES.map((branch) =>
              api.getProducts(branch).catch((error) => {
                console.error(`Error al cargar productos de ${branch}:`, error);
                return [] as Product[];
              })
            )
          );
          const todosLosProductos = resultados.flat();
          setGroupedProducts(groupProductsByName(todosLosProductos));
        } catch (error) {
          console.error("Error al cargar productos para búsqueda:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchProducts();
    }
  }, [isOpen]);

  const filteredProducts = groupedProducts.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.byBranch.some((b) => b.branch.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSelectProduct = () => {
    setIsOpen(false);
    setSearchTerm("");
    navigate("/inventory");
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="relative w-64 justify-start text-sm text-muted-foreground"
      >
        <Search className="h-4 w-4 mr-2" />
        Buscar productos...
        <kbd className="pointer-events-none absolute right-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[680px]">
          <DialogHeader>
            <DialogTitle>Buscar Productos</DialogTitle>
            <DialogDescription>
              Busca un producto y mirá el stock disponible en cada sucursal
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, categoría o sucursal..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {isLoading ? (
                <div className="py-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground mt-2">Cargando...</p>
                </div>
              ) : searchTerm === "" ? (
                <div className="py-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Escribe para buscar productos
                  </p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-muted-foreground">
                    No se encontraron productos
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredProducts.map((product) => {
                    const isLowStockTotal = product.totalStock <= product.minStock;
                    return (
                      <button
                        key={product.name}
                        onClick={handleSelectProduct}
                        className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-foreground">
                                {product.name}
                              </p>
                              {isLowStockTotal && (
                                <span className="text-xs bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400 px-2 py-0.5 rounded-full">
                                  Stock bajo
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {product.category}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              ${product.price.toLocaleString("es-AR")}
                            </p>
                            <p
                              className={`text-sm ${
                                isLowStockTotal
                                  ? "text-amber-600"
                                  : "text-muted-foreground"
                              }`}
                            >
                              Total: {product.totalStock} {product.unit}
                            </p>
                          </div>
                        </div>

                        {/* Desglose de stock por sucursal */}
                        <div className="mt-2 pt-2 border-t border-border/60 grid grid-cols-2 gap-1.5">
                          {product.byBranch.map((b) => {
                            const isBranchLow = b.currentStock <= b.minStock;
                            return (
                              <div
                                key={b.branch}
                                className="flex items-center justify-between gap-2 text-xs bg-muted/50 rounded-md px-2 py-1"
                              >
                                <span className="flex items-center gap-1 text-muted-foreground truncate">
                                  <Building2 className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{b.branch}</span>
                                </span>
                                <span
                                  className={`font-medium shrink-0 ${
                                    isBranchLow ? "text-amber-600" : "text-foreground"
                                  }`}
                                >
                                  {b.currentStock}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}