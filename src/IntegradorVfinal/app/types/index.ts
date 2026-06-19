export interface User {
  id: string;
  username: string;
  password: string;
  role: "admin" | "employee" | "contador";
  branch: string; // 'all' for admin and contador
  fullName: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  isFrequent: boolean;
  purchaseCount: number;
  createdAt: string;
}

export interface Discount {
  id: string;
  name: string;
  type: "percentage" | "fixed";
  value: number;
  isActive: boolean;
  appliesTo: "all" | "frequent_customers";
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  branch: string;
  price: number;
  currentStock: number;
  minStock: number;
  unit: string; // <-- NUEVO
  createdAt: string;
}

export interface Movement {
  id: string;
  productId: string;
  productName: string;
  productBranch?: string;
  type: "entry" | "exit";
  quantity: number;
  reason: string;
  description?: string;
  date: string;
  customerName?: string;
  customerPhone?: string;
  isFrequentCustomer?: boolean;
  sellerId?: string;
  sellerName?: string;
  sellerBranch?: string;
  discountId?: string;
  discountName?: string;
  discountValue?: number;
  unitPrice?: number;
  finalUnitPrice?: number;
  totalAmount?: number;
  isCash?: boolean; // <-- NUEVO
  cashDiscountValue?: number; // <-- NUEVO
}

export const CATEGORIES = [
  "Herramientas manuales",
  "Herramientas eléctricas",
  "Materiales de construcción",
  "Pintura",
  "Plomería",
  "Electricidad",
  "Ferretería general",
  "Adhesivos y selladores",
  "Otros",
];

export const BRANCHES = [
  "Sucursal Centro",
  "Sucursal Norte",
  "Sucursal Sur",
  "Sucursal Este",
  "Sucursal Oeste",
];

export const MOVEMENT_REASONS = {
  entry: [
    "Compra a proveedor",
    "Devolución de cliente",
    "Traslado desde otra sucursal",
    "Ajuste de inventario (entrada)",
    "Producción interna",
    "Otro",
  ],
  exit: [
    "Venta",
    "Traslado a otra sucursal",
    "Producto defectuoso",
    "Producto vencido",
    "Merma o pérdida",
    "Uso interno",
    "Ajuste de inventario (salida)",
    "Otro",
  ],
};

export interface StockRequest {
  id: string;
  productId: string;
  productName: string;
  productUnit: string;
  requestedBy: string;
  requestedByName: string;
  fromBranch: string;
  toBranch: string;
  quantity: number;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolvedByName?: string;
}

export interface PurchaseOrder {
  id: string;
  productId: string;
  productName: string;
  productUnit: string;
  branch: string;
  quantity: number;
  cost: number;
  provider: string;
  date: string;
  status: "pending" | "delivered" | "cancelled";
  createdAt: string;
}

export const UNITS = [
  "Unidades",
  "Metros",
  "Kilogramos",
  "Gramos",
  "Litros",
  "Centímetros",
  "Piezas",
  "Pares",
  "Docenas",
  "Otro",
];
export interface StatisticsData {
  productId: string;
  productName: string;
  stock: number;
  ventas: number;
  branch: string;
}

export interface RegressionResult {
  slope: number;
  intercept: number;
  correlation: number;
  equation: string;
  n: number;
  x_mean: number;
  y_mean: number;
}

export interface StatisticsResponse {
  datos: StatisticsData[];
  regresion: RegressionResult | null;
  total_productos: number;
}

export interface PredictionResult {
  x: number;
  y_pred: number;
  equation: string;
  correlation: number;
}

// -------- Estadística descriptiva --------
export interface DescriptivasResult {
  variable: string;
  n: number;
  media: number;
  mediana: number;
  moda: number[];
  desvio_estandar: number;
  varianza: number;
  coeficiente_variacion: number;
  minimo: number;
  maximo: number;
  rango: number;
  q1: number;
  q3: number;
  iqr: number;
}

export interface ClaseFrecuencia {
  clase: number;
  limite_inferior: number;
  limite_superior: number;
  marca_clase: number;
  fi: number;
  fr: number;
  Fa: number;
  Fra: number;
}

export interface TablaFrecuencias {
  k: number;
  amplitud: number;
  n: number;
  clases: ClaseFrecuencia[];
  variable: string;
}

export interface DescriptivasResponse {
  descriptivas: DescriptivasResult;
  frecuencias: TablaFrecuencias;
}

// -------- Estadística inferencial --------
export interface IntervaloCoonfianza {
  variable: string;
  n: number;
  media: number;
  desvio: number;
  error_estandar: number;
  confianza: number;
  t_critico: number;
  tipo_critico: string;
  margen_error: number;
  limite_inferior: number;
  limite_superior: number;
}

export interface PruebaHipotesis {
  variable: string;
  n: number;
  media_muestral: number;
  desvio: number;
  mu0: number;
  alpha: number;
  t_estadistico: number;
  t_critico: number;
  tipo_critico: string;
  p_valor_aprox: number;
  rechazar_h0: boolean;
  conclusion: string;
}

export interface InferencialResponse {
  intervalo_confianza: IntervaloCoonfianza;
  prueba_hipotesis: PruebaHipotesis;
}

// -------- Interpolación lineal (Análisis Numérico) --------
export interface InterpolacionResult {
  x_nuevo: number;
  y_interpolado: number;
  x0: number; y0: number;
  x1: number; y1: number;
  punto0: string;
  punto1: string;
  formula: string;
  variable_x: string;
  variable_y: string;
}