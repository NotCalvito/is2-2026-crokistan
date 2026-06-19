from conexion import get_connection
import math

class AnalisisManager:
    def __init__(self):
        self.conexion = get_connection()
        self.cursor = self.conexion.cursor()

    def obtener_datos_ventas_vs_stock(self, branch=None):
        if branch and branch != "all":
            from stock import StockManager
            try:
                manager = StockManager(branch)
                productos = manager.obtener_productos()
                manager.cerrar()
            except:
                return []
        else:
            from stock import StockManager
            productos = []
            for sucursal in ["Sucursal Centro", "Sucursal Norte", "Sucursal Sur",
                             "Sucursal Este", "Sucursal Oeste"]:
                try:
                    manager = StockManager(sucursal)
                    productos.extend(manager.obtener_productos())
                    manager.cerrar()
                except:
                    continue

        datos = []
        for p in productos:
            query = """
            SELECT SUM(cantidad) as total_ventas
            FROM movimientos
            WHERE producto_id = %s
            AND sucursal_origen = %s
            AND tipo = 'exit'
            AND motivo = 'Venta'
            """
            self.cursor.execute(query, (p["id"], p["branch"]))
            result = self.cursor.fetchone()
            total_ventas = int(result['total_ventas']) if result and result['total_ventas'] else 0
            if total_ventas > 0:
                datos.append({
                    "productId": p["id"],
                    "productName": p["name"],
                    "stock": p["currentStock"],
                    "ventas": total_ventas,
                    "branch": p["branch"]
                })
        return datos

    # ------------------------------------------------------------------ #
    # REGRESION LINEAL (existente, sin cambios)
    # ------------------------------------------------------------------ #
    def calcular_regresion_lineal(self, datos):
        n = len(datos)
        if n < 2:
            return None

        sum_x  = sum(d["stock"]              for d in datos)
        sum_y  = sum(d["ventas"]             for d in datos)
        sum_xy = sum(d["stock"]*d["ventas"]  for d in datos)
        sum_x2 = sum(d["stock"] ** 2         for d in datos)
        sum_y2 = sum(d["ventas"] ** 2        for d in datos)

        x_mean = sum_x / n
        y_mean = sum_y / n

        numerator   = sum_xy - (sum_x * sum_y) / n
        denominator = sum_x2 - (sum_x ** 2) / n
        slope     = numerator / denominator if denominator != 0 else 0
        intercept = y_mean - slope * x_mean

        corr_den = math.sqrt(
            (sum_x2 - (sum_x**2)/n) * (sum_y2 - (sum_y**2)/n)
        )
        correlation = numerator / corr_den if corr_den != 0 else 0

        return {
            "slope": slope,
            "intercept": intercept,
            "correlation": correlation,
            "equation": f"Y = {intercept:.4f} + {slope:.4f} * X",
            "n": n,
            "x_mean": x_mean,
            "y_mean": y_mean
        }

    def predecir(self, x, slope, intercept):
        return slope * x + intercept

    # ------------------------------------------------------------------ #
    # ESTADISTICA DESCRIPTIVA  (nuevo)
    # ------------------------------------------------------------------ #
    def calcular_estadisticas_descriptivas(self, datos, variable="ventas"):
        valores = sorted([d[variable] for d in datos])
        n = len(valores)
        if n == 0:
            return None

        media = sum(valores) / n

        if n % 2 == 1:
            mediana = float(valores[n // 2])
        else:
            mediana = (valores[n // 2 - 1] + valores[n // 2]) / 2.0

        frecuencias = {}
        for v in valores:
            frecuencias[v] = frecuencias.get(v, 0) + 1
        max_freq = max(frecuencias.values())
        moda = sorted([k for k, f in frecuencias.items() if f == max_freq])

        varianza = sum((v - media) ** 2 for v in valores) / (n - 1) if n > 1 else 0.0
        desvio   = math.sqrt(varianza)
        cv       = (desvio / media * 100) if media != 0 else 0

        def percentil(p):
            idx  = (n - 1) * p / 100.0
            lo   = int(idx)
            hi   = lo + 1
            frac = idx - lo
            if hi >= n:
                return float(valores[lo])
            return valores[lo] * (1 - frac) + valores[hi] * frac

        q1  = percentil(25)
        q3  = percentil(75)

        return {
            "variable": variable,
            "n": n,
            "media": round(media, 4),
            "mediana": round(mediana, 4),
            "moda": moda,
            "desvio_estandar": round(desvio, 4),
            "varianza": round(varianza, 4),
            "coeficiente_variacion": round(cv, 4),
            "minimo": valores[0],
            "maximo": valores[-1],
            "rango": valores[-1] - valores[0],
            "q1": round(q1, 4),
            "q3": round(q3, 4),
            "iqr": round(q3 - q1, 4),
        }

    # ------------------------------------------------------------------ #
    # TABLA DE FRECUENCIAS  (nuevo)
    # ------------------------------------------------------------------ #
    def construir_tabla_frecuencias(self, datos, variable="ventas"):
        valores = sorted([d[variable] for d in datos])
        n = len(valores)
        if n < 2:
            return None

        k = max(5, round(1 + 3.322 * math.log10(n)))
        rango    = valores[-1] - valores[0]
        amplitud = rango / k if rango > 0 else 1

        clases = []
        li = float(valores[0])
        for i in range(k):
            ls = li + amplitud
            if i == k - 1:
                fi = sum(1 for v in valores if li <= v <= ls)
            else:
                fi = sum(1 for v in valores if li <= v < ls)
            clases.append({
                "clase": i + 1,
                "limite_inferior": round(li, 4),
                "limite_superior": round(ls, 4),
                "marca_clase": round((li + ls) / 2, 4),
                "fi": fi,
            })
            li = ls

        fa = 0
        for c in clases:
            c["fr"]  = round(c["fi"] / n, 4)
            fa      += c["fi"]
            c["Fa"]  = fa
            c["Fra"] = round(fa / n, 4)

        return {
            "k": k,
            "amplitud": round(amplitud, 4),
            "n": n,
            "clases": clases,
            "variable": variable,
        }

    # ------------------------------------------------------------------ #
    # ESTADISTICA INFERENCIAL  (nuevo)
    # ------------------------------------------------------------------ #
    def calcular_intervalo_confianza(self, datos, variable="ventas", confianza=0.95):
        valores = [d[variable] for d in datos]
        n = len(valores)
        if n < 2:
            return None

        media = sum(valores) / n
        s2    = sum((v - media) ** 2 for v in valores) / (n - 1)
        s     = math.sqrt(s2)
        ee    = s / math.sqrt(n)
        alpha = 1 - confianza

        if n >= 30:
            t_critico = self._z_critico(1 - alpha / 2)
            tipo = "z (distribucion normal)"
        else:
            t_critico = self._t_critico(n - 1, alpha)
            tipo = "t de Student (gl=" + str(n - 1) + ")"

        margen = t_critico * ee

        return {
            "variable": variable,
            "n": n,
            "media": round(media, 4),
            "desvio": round(s, 4),
            "error_estandar": round(ee, 4),
            "confianza": confianza * 100,
            "t_critico": round(t_critico, 4),
            "tipo_critico": tipo,
            "margen_error": round(margen, 4),
            "limite_inferior": round(media - margen, 4),
            "limite_superior": round(media + margen, 4),
        }

    def realizar_prueba_hipotesis(self, datos, variable="ventas", mu0=None, alpha=0.05):
        valores = [d[variable] for d in datos]
        n = len(valores)
        if n < 2:
            return None

        media = sum(valores) / n
        s2    = sum((v - media) ** 2 for v in valores) / (n - 1)
        s     = math.sqrt(s2)

        if mu0 is None:
            sorted_v = sorted(valores)
            mu0 = (sorted_v[n//2 - 1] + sorted_v[n//2]) / 2.0 if n % 2 == 0 else float(sorted_v[n//2])

        t_stat = (media - mu0) / (s / math.sqrt(n)) if s != 0 else 0

        if n >= 30:
            t_critico = self._z_critico(1 - alpha / 2)
            tipo = "z (distribucion normal)"
        else:
            t_critico = self._t_critico(n - 1, alpha)
            tipo = "t de Student (gl=" + str(n - 1) + ")"

        rechazar = abs(t_stat) > t_critico
        p_valor  = self._p_valor_aproximado(abs(t_stat))

        return {
            "variable": variable,
            "n": n,
            "media_muestral": round(media, 4),
            "desvio": round(s, 4),
            "mu0": round(mu0, 4),
            "alpha": alpha,
            "t_estadistico": round(t_stat, 4),
            "t_critico": round(t_critico, 4),
            "tipo_critico": tipo,
            "p_valor_aprox": round(p_valor, 4),
            "rechazar_h0": rechazar,
            "conclusion": (
                "Se rechaza H0: la media de " + variable + " difiere significativamente de " + str(round(mu0, 2))
                if rechazar else
                "No se rechaza H0: no hay evidencia suficiente para afirmar que la media de " + variable + " difiere de " + str(round(mu0, 2))
            ),
        }

    # ------------------------------------------------------------------ #
    # INTERPOLACION LINEAL  -  Analisis Numerico  (nuevo)
    # ------------------------------------------------------------------ #
    def interpolar_lineal(self, datos, x_nuevo, variable_x="stock", variable_y="ventas"):
        puntos = sorted(datos, key=lambda d: d[variable_x])
        n = len(puntos)
        if n < 2:
            return None

        x_vals = [p[variable_x] for p in puntos]

        if x_nuevo <= x_vals[0]:
            i0, i1 = 0, 1
        elif x_nuevo >= x_vals[-1]:
            i0, i1 = n - 2, n - 1
        else:
            i1 = next(i for i, v in enumerate(x_vals) if v >= x_nuevo)
            i0 = i1 - 1

        x0 = puntos[i0][variable_x]
        y0 = puntos[i0][variable_y]
        x1 = puntos[i1][variable_x]
        y1 = puntos[i1][variable_y]

        if x1 == x0:
            y_interp = (y0 + y1) / 2.0
        else:
            y_interp = y0 + (y1 - y0) * (x_nuevo - x0) / float(x1 - x0)

        formula = (
            "P(" + str(x_nuevo) + ") = " + str(y0) +
            " + (" + str(y1) + " - " + str(y0) + ") x " +
            "(" + str(x_nuevo) + " - " + str(x0) + ") / " +
            "(" + str(x1) + " - " + str(x0) + ")" +
            " = " + str(round(y_interp, 4))
        )

        return {
            "x_nuevo": x_nuevo,
            "y_interpolado": round(y_interp, 4),
            "x0": x0, "y0": y0,
            "x1": x1, "y1": y1,
            "punto0": puntos[i0]["productName"],
            "punto1": puntos[i1]["productName"],
            "formula": formula,
            "variable_x": variable_x,
            "variable_y": variable_y,
        }

    # ------------------------------------------------------------------ #
    # Helpers estadisticos
    # ------------------------------------------------------------------ #
    def _z_critico(self, p):
        a = [2.50662823884, -18.61500062529, 41.39119773534, -25.44106049637]
        b = [-8.47351093090, 23.08336743743, -21.06224101826, 3.13082909833]
        c = [0.3374754822726147, 0.9761690190917186, 0.1607979714918209,
             0.0276438810333863, 0.0038405729373609, 0.0003951896511349,
             0.0000321767881768, 0.0000002888167364, 0.0000003960315187]
        q = p - 0.5
        if abs(q) <= 0.42:
            r = q * q
            return q * (((a[3]*r+a[2])*r+a[1])*r+a[0]) / ((((b[3]*r+b[2])*r+b[1])*r+b[0])*r+1)
        r = p if q > 0 else 1 - p
        r = math.log(-math.log(r))
        x = c[0]+r*(c[1]+r*(c[2]+r*(c[3]+r*(c[4]+r*(c[5]+r*(c[6]+r*(c[7]+r*c[8])))))))
        return x if q > 0 else -x

    def _t_critico(self, gl, alpha):
        tabla = {
            1:  {0.10:6.314,  0.05:12.706, 0.01:63.657},
            2:  {0.10:2.920,  0.05:4.303,  0.01:9.925},
            3:  {0.10:2.353,  0.05:3.182,  0.01:5.841},
            4:  {0.10:2.132,  0.05:2.776,  0.01:4.604},
            5:  {0.10:2.015,  0.05:2.571,  0.01:4.032},
            6:  {0.10:1.943,  0.05:2.447,  0.01:3.707},
            7:  {0.10:1.895,  0.05:2.365,  0.01:3.499},
            8:  {0.10:1.860,  0.05:2.306,  0.01:3.355},
            9:  {0.10:1.833,  0.05:2.262,  0.01:3.250},
            10: {0.10:1.812,  0.05:2.228,  0.01:3.169},
            15: {0.10:1.753,  0.05:2.131,  0.01:2.947},
            20: {0.10:1.725,  0.05:2.086,  0.01:2.845},
            25: {0.10:1.708,  0.05:2.060,  0.01:2.787},
            29: {0.10:1.699,  0.05:2.045,  0.01:2.756},
        }
        alpha_key = min(tabla[1].keys(), key=lambda a: abs(a - alpha))
        gl_key    = min(tabla.keys(),    key=lambda g: abs(g - gl))
        return tabla[gl_key][alpha_key]

    def _p_valor_aproximado(self, t_abs):
        if t_abs > 8:
            return 0.0
        p = math.exp(-0.717 * t_abs - 0.416 * t_abs * t_abs)
        return min(1.0, 2 * p)

    # ------------------------------------------------------------------ #
    def obtener_estadisticas_completas(self, branch=None):
        datos = self.obtener_datos_ventas_vs_stock(branch)
        regresion = self.calcular_regresion_lineal(datos) if datos else None
        return {
            "datos": datos,
            "regresion": regresion,
            "total_productos": len(datos)
        }

    def cerrar(self):
        if self.cursor:
            self.cursor.close()
        if self.conexion:
            self.conexion.close()
