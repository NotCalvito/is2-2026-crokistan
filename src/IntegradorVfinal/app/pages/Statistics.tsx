import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../utils/api";
import { StatisticsResponse, PredictionResult, DescriptivasResponse, InferencialResponse, InterpolacionResult } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from "recharts";
import { BRANCHES } from "../types";
import { toast } from "sonner";

export function Statistics() {
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<StatisticsResponse | null>(null);
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [predictX, setPredictX] = useState<number>(0);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);

  // Nuevas secciones
  const [descriptivas, setDescriptivas] = useState<DescriptivasResponse | null>(null);
  const [inferencial, setInferencial] = useState<InferencialResponse | null>(null);
  const [interpolacion, setInterpolacion] = useState<InterpolacionResult | null>(null);
  const [interpX, setInterpX] = useState<number>(0);
  const [isInterpolando, setIsInterpolando] = useState(false);
  const [mu0Custom, setMu0Custom] = useState<string>("");

  const isAdmin = currentUser?.role === "admin";
  const isContador = currentUser?.role === "contador";

  if (!isAdmin && !isContador) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No tienes permisos para ver estadísticas.</p>
      </div>
    );
  }

  const loadStatistics = async () => {
    try {
      setIsLoading(true);
      const branch = isAdmin ? branchFilter : currentUser?.branch || "all";
      const branchParam = branch !== "all" ? branch : undefined;

      // Llamadas independientes: si una falla no rompe las demás
      const [result, desc, inf] = await Promise.all([
        api.getStatistics(branchParam).catch(() => null),
        api.getDescriptivas(branchParam).catch(() => null),
        api.getInferencial(branchParam).catch(() => null),
      ]);

      setData(result);
      setDescriptivas(desc?.descriptivas ? desc : null);
      setInferencial(inf?.intervalo_confianza ? inf : null);
      setPrediction(null);
      setInterpolacion(null);
    } catch (error) {
      toast.error("Error al cargar estadísticas");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStatistics();
  }, [branchFilter]);

  const handlePredict = async () => {
    if (predictX <= 0) {
      toast.error("Ingresa un valor de stock válido (mayor a 0)");
      return;
    }
    try {
      setIsPredicting(true);
      const branch = isAdmin ? branchFilter : currentUser?.branch || "all";
      const result = await api.predict(predictX, branch !== "all" ? branch : undefined);
      setPrediction(result);
      toast.success(`Predicción realizada: ${result.y_pred.toFixed(2)} ventas esperadas`);
    } catch (error) {
      toast.error("Error al realizar predicción");
      console.error(error);
    } finally {
      setIsPredicting(false);
    }
  };

  const handleInterpolate = async () => {
    if (interpX <= 0) {
      toast.error("Ingresá un valor de stock válido (mayor a 0)");
      return;
    }
    try {
      setIsInterpolando(true);
      const branch = isAdmin ? branchFilter : currentUser?.branch || "all";
      const result = await api.interpolate(interpX, branch !== "all" ? branch : undefined);
      setInterpolacion(result);
      toast.success(`Valor interpolado: ${result.y_interpolado.toFixed(2)} ventas`);
    } catch (error) {
      toast.error("Error al interpolar");
    } finally {
      setIsInterpolando(false);
    }
  };

  // ✅ CORREGIDO: formato correcto para Scatter
  const formatDataForChart = () => {
    if (!data || !data.datos || data.datos.length === 0) return [];
    return data.datos.map((d) => ({
      x: d.stock,      // ← Eje X: Stock
      y: d.ventas,     // ← Eje Y: Ventas
      name: d.productName,
      branch: d.branch,
    }));
  };

  // ✅ CORREGIDO: generación de la recta de regresión con valores redondeados
  const getRegressionLine = () => {
    if (!data || !data.regresion || !data.datos || data.datos.length === 0) return [];
    const { slope, intercept } = data.regresion;
    const stocks = data.datos.map((d) => d.stock);
    const minStock = Math.min(...stocks);
    const maxStock = Math.max(...stocks);
    // Usar Math.round para evitar floating point acumulado (ej: 6626.7999...)
    const step = Math.round((maxStock - minStock) / 20);
    const points = [];
    for (let x = minStock; x <= maxStock + step; x += step || 1) {
      const roundedX = Math.round(x);
      points.push({ x: roundedX, y: parseFloat((slope * roundedX + intercept).toFixed(4)) });
    }
    return points;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando datos estadísticos...</p>
        </div>
      </div>
    );
  }

  const chartData = formatDataForChart();
  const regressionLine = getRegressionLine();
  const hasData = data && data.datos && data.datos.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-semibold text-foreground">Estadísticas</h2>
          <p className="text-muted-foreground mt-1">
            Análisis de relación entre stock actual y ventas por producto
          </p>
        </div>
      </div>

      {isAdmin && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Label htmlFor="branch-filter">Sucursal:</Label>
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Todas las sucursales" />
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
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Productos analizados</p>
            <p className="text-2xl font-semibold">{data?.total_productos || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Correlación</p>
            <p className="text-2xl font-semibold">
              {data?.regresion?.correlation !== undefined && data.regresion.correlation !== null
                ? data.regresion.correlation.toFixed(3)
                : "N/A"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Ecuación del modelo</p>
            <p className="text-sm font-medium truncate">
              {data?.regresion
                ? `Y = ${data.regresion.intercept.toFixed(4)} + ${data.regresion.slope.toFixed(4)} * X`
                : "Sin datos suficientes"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ✅ GRÁFICO CORREGIDO */}
      <Card>
        <CardHeader>
          <CardTitle>Diagrama de Dispersión: Stock vs Ventas</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasData ? (
            <div className="py-12 text-center text-muted-foreground">
              No hay datos suficientes para mostrar el gráfico.
              <br />
              Se necesitan al menos 2 productos con ventas registradas.
            </div>
          ) : (
            <div className="w-full h-[450px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart margin={{ top: 10, right: 20, left: 20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="x"
                    type="number"
                    name="Stock"
                    domain={["auto", "auto"]}
                    tickFormatter={(v) => Math.round(v).toString()}
                    label={{ value: "Stock Actual (unidades)", position: "insideBottom", offset: -20 }}
                  />
                  <YAxis
                    dataKey="y"
                    type="number"
                    name="Ventas"
                    label={{ value: "Ventas Totales (unidades)", angle: -90, position: "insideLeft", offset: 10 }}
                  />
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === "Productos") return [value, "Ventas"];
                      if (name === "Recta de Regresión") return [typeof value === "number" ? value.toFixed(2) : value, "Ventas (regresión)"];
                      return [value, name];
                    }}
                    labelFormatter={(label) => `Stock: ${Math.round(Number(label))}`}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Scatter
                    name="Productos"
                    data={chartData}
                    dataKey="y"
                    fill="#ea580c"
                    shape="circle"
                    radius={6}
                  />
                  <Line
                    name="Recta de Regresión"
                    data={regressionLine}
                    dataKey="y"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={false}
                    activeDot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {data?.regresion && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados de Regresión Lineal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Ecuación</p>
                <p className="text-lg font-semibold">{`Y = ${data.regresion.intercept.toFixed(4)} + ${data.regresion.slope.toFixed(4)} * X`}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Coeficiente de Correlación (r)</p>
                <p className="text-lg font-semibold">{data.regresion.correlation.toFixed(4)}</p>
                <p className="text-sm text-muted-foreground">
                  {Math.abs(data.regresion.correlation) >= 0.8
                    ? "Correlación fuerte"
                    : Math.abs(data.regresion.correlation) >= 0.5
                    ? "Correlación moderada"
                    : "Correlación débil"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendiente</p>
                <p className="text-lg font-semibold">{data.regresion.slope.toFixed(4)}</p>
                <p className="text-sm text-muted-foreground">
                  Por cada unidad de stock, las ventas {data.regresion.slope >= 0 ? "aumentan" : "disminuyen"} en {Math.abs(data.regresion.slope).toFixed(2)} unidades
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Número de observaciones</p>
                <p className="text-lg font-semibold">{data.regresion.n}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>🔮 Predecir Ventas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="predict-stock">Stock actual (unidades):</Label>
              <Input
                id="predict-stock"
                type="number"
                min={0}
                step={1}
                value={predictX || ""}
                onChange={(e) => setPredictX(parseInt(e.target.value) || 0)}
                placeholder="Ingresa el stock..."
              />
            </div>
            <Button onClick={handlePredict} disabled={isPredicting || !data?.regresion}>
              {isPredicting ? "Prediciendo..." : "Predecir Ventas"}
            </Button>
          </div>

          {prediction && (
            <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-md">
              <p className="font-medium text-foreground">Resultado de la predicción</p>
              <div className="grid gap-2 mt-2 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Stock ingresado</p>
                  <p className="text-lg font-semibold">{prediction.x} unidades</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ventas esperadas</p>
                  <p className="text-lg font-semibold text-primary">
                    {prediction.y_pred.toFixed(2)} unidades
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Modelo utilizado</p>
                  <p className="text-sm font-medium">{prediction.equation}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Coeficiente de correlación: r = {prediction.correlation.toFixed(4)}
              </p>
            </div>
          )}

          {!data?.regresion && (
            <p className="text-sm text-muted-foreground mt-2">
              No hay suficientes datos para realizar predicciones. Se necesitan al menos 2 productos con ventas registradas.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ========== ESTADÍSTICA DESCRIPTIVA ========== */}
      {descriptivas && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>📊 Estadística Descriptiva — Ventas por producto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { label: "Media (x̄)",          value: descriptivas.descriptivas.media },
                  { label: "Mediana",              value: descriptivas.descriptivas.mediana },
                  { label: "Moda",                 value: descriptivas.descriptivas.moda.join(", ") },
                  { label: "Desvío estándar (s)",  value: descriptivas.descriptivas.desvio_estandar },
                  { label: "Varianza (s²)",        value: descriptivas.descriptivas.varianza },
                  { label: "Coef. variación (CV%)",value: descriptivas.descriptivas.coeficiente_variacion + " %" },
                  { label: "Mínimo",               value: descriptivas.descriptivas.minimo },
                  { label: "Máximo",               value: descriptivas.descriptivas.maximo },
                  { label: "Rango",                value: descriptivas.descriptivas.rango },
                  { label: "Q1",                   value: descriptivas.descriptivas.q1 },
                  { label: "Q3",                   value: descriptivas.descriptivas.q3 },
                  { label: "RIC (Q3 - Q1)",        value: descriptivas.descriptivas.iqr },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 rounded-lg border bg-muted/30">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-lg font-semibold">{value}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                n = {descriptivas.descriptivas.n} productos analizados · Variable: unidades vendidas totales por producto
              </p>
            </CardContent>
          </Card>

          {/* Tabla de frecuencias */}
          <Card>
            <CardHeader>
              <CardTitle>📋 Tabla de Frecuencias — Regla de Sturges (k = {descriptivas.frecuencias.k})</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted text-left">
                    {["Clase", "L. Inf", "L. Sup", "Marca clase", "fi", "fr", "Fa", "Fra"].map(h => (
                      <th key={h} className="border px-3 py-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {descriptivas.frecuencias.clases.map(c => (
                    <tr key={c.clase} className="even:bg-muted/20">
                      <td className="border px-3 py-1 text-center">{c.clase}</td>
                      <td className="border px-3 py-1">{c.limite_inferior}</td>
                      <td className="border px-3 py-1">{c.limite_superior}</td>
                      <td className="border px-3 py-1">{c.marca_clase}</td>
                      <td className="border px-3 py-1 text-center font-medium">{c.fi}</td>
                      <td className="border px-3 py-1 text-center">{c.fr}</td>
                      <td className="border px-3 py-1 text-center">{c.Fa}</td>
                      <td className="border px-3 py-1 text-center">{c.Fra}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-muted-foreground mt-2">
                Amplitud de clase: {descriptivas.frecuencias.amplitud} · fi: frec. absoluta · fr: frec. relativa · Fa: frec. acumulada · Fra: frec. rel. acumulada
              </p>
            </CardContent>
          </Card>
        </>
      )}

      {/* ========== ESTADÍSTICA INFERENCIAL ========== */}
      {inferencial && (
        <Card>
          <CardHeader>
            <CardTitle>🔬 Estadística Inferencial</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Intervalo de confianza */}
            <div>
              <h3 className="font-semibold text-base mb-3">
                Intervalo de Confianza al {inferencial.intervalo_confianza.confianza}%
              </h3>
              <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-950/30 space-y-1 text-sm">
                <p>
                  <span className="font-medium">IC:</span>{" "}
                  [ {inferencial.intervalo_confianza.limite_inferior} ; {inferencial.intervalo_confianza.limite_superior} ]
                </p>
                <p><span className="font-medium">Media muestral x̄:</span> {inferencial.intervalo_confianza.media}</p>
                <p><span className="font-medium">Error estándar:</span> {inferencial.intervalo_confianza.error_estandar}</p>
                <p><span className="font-medium">Valor crítico ({inferencial.intervalo_confianza.tipo_critico}):</span> {inferencial.intervalo_confianza.t_critico}</p>
                <p><span className="font-medium">Margen de error:</span> ± {inferencial.intervalo_confianza.margen_error}</p>
                <p className="text-muted-foreground pt-1">
                  Con un {inferencial.intervalo_confianza.confianza}% de confianza, la media poblacional de ventas se encuentra entre{" "}
                  <strong>{inferencial.intervalo_confianza.limite_inferior}</strong> y{" "}
                  <strong>{inferencial.intervalo_confianza.limite_superior}</strong> unidades.
                </p>
              </div>
            </div>

            {/* Prueba de hipótesis */}
            <div>
              <h3 className="font-semibold text-base mb-1">Prueba de Hipótesis Bilateral (α = {inferencial.prueba_hipotesis.alpha})</h3>
              <p className="text-xs text-muted-foreground mb-3">
                H₀: μ = {inferencial.prueba_hipotesis.mu0} &nbsp;|&nbsp; H₁: μ ≠ {inferencial.prueba_hipotesis.mu0}
                &nbsp;(μ₀ = mediana muestral como valor de referencia)
              </p>
              <div className={`p-4 rounded-lg border text-sm space-y-1 ${inferencial.prueba_hipotesis.rechazar_h0 ? "bg-red-50 dark:bg-red-950/30 border-red-200" : "bg-green-50 dark:bg-green-950/30 border-green-200"}`}>
                <p><span className="font-medium">Estadístico t:</span> {inferencial.prueba_hipotesis.t_estadistico}</p>
                <p><span className="font-medium">Valor crítico ({inferencial.prueba_hipotesis.tipo_critico}):</span> ± {inferencial.prueba_hipotesis.t_critico}</p>
                <p><span className="font-medium">p-valor (aprox.):</span> {inferencial.prueba_hipotesis.p_valor_aprox}</p>
                <p className={`font-semibold pt-1 ${inferencial.prueba_hipotesis.rechazar_h0 ? "text-red-700 dark:text-red-300" : "text-green-700 dark:text-green-300"}`}>
                  {inferencial.prueba_hipotesis.rechazar_h0 ? "✗ Se rechaza H₀" : "✓ No se rechaza H₀"}
                </p>
                <p className="text-muted-foreground">{inferencial.prueba_hipotesis.conclusion}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========== INTERPOLACIÓN LINEAL (Análisis Numérico) ========== */}
      <Card>
        <CardHeader>
          <CardTitle>📐 Interpolación Lineal — Análisis Numérico</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            A diferencia de la regresión (que ajusta una recta a todos los datos), la interpolación lineal
            estima el valor de ventas para un stock dado usando los <strong>dos puntos reales más cercanos</strong>
            en la tabla de datos ordenada.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="interp-stock">Stock a interpolar (unidades):</Label>
              <Input
                id="interp-stock"
                type="number"
                min={0}
                step={1}
                value={interpX || ""}
                onChange={(e) => setInterpX(parseInt(e.target.value) || 0)}
                placeholder="Ingresá el stock..."
              />
            </div>
            <Button onClick={handleInterpolate} disabled={isInterpolando || !hasData} variant="outline">
              {isInterpolando ? "Calculando..." : "Interpolar"}
            </Button>
          </div>

          {interpolacion && (
            <div className="mt-4 p-4 bg-muted/30 border rounded-md space-y-2 text-sm">
              <p className="font-medium">Resultado de la interpolación</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">Puntos usados</p>
                  <p>P₀: "{interpolacion.punto0}" (stock={interpolacion.x0}, ventas={interpolacion.y0})</p>
                  <p>P₁: "{interpolacion.punto1}" (stock={interpolacion.x1}, ventas={interpolacion.y1})</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Ventas interpoladas para stock = {interpolacion.x_nuevo}</p>
                  <p className="text-2xl font-bold text-primary">{interpolacion.y_interpolado}</p>
                </div>
              </div>
              <div className="bg-background border rounded p-2 font-mono text-xs break-all">
                {interpolacion.formula}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}