from conexion import get_connection


class StockManager:

    TABLAS = {
        "Sucursal Centro": "productos_centro",
        "Sucursal Norte": "productos_norte",
        "Sucursal Sur": "productos_sur",
        "Sucursal Este": "productos_este",
        "Sucursal Oeste": "productos_oeste",
        "Deposito Central": "productos_deposito"
    }

    def __init__(self, sucursal):
        if sucursal not in self.TABLAS:
            raise ValueError("Sucursal inválida")

        self.sucursal = sucursal
        self.tabla = self.TABLAS[sucursal]

        self.conexion = get_connection()
        self.cursor = self.conexion.cursor(dictionary=True)

    # ============================
    # NORMALIZAR PRODUCTO (DB → FRONT)
    # ============================

    def _mapear_producto(self, p):
        return {
            "id": p["id"],
            "name": p["nombre"],
            "category": p["categoria"],
            "price": float(p["precio"]),
            "currentStock": int(p["stock_actual"]),
            "minStock": int(p["stock_minimo"]),
            "branch": self.sucursal
        }

    # ============================
    # VALIDACIÓN
    # ============================

    def _validar_data(self, data):
        required = ["name", "category", "price", "currentStock", "minStock"]

        for campo in required:
            if campo not in data:
                raise ValueError(f"Falta el campo: {campo}")

        if not data["name"].strip():
            raise ValueError("El nombre no puede estar vacío")

        if float(data["price"]) <= 0:
            raise ValueError("El precio debe ser mayor a 0")

        if int(data["currentStock"]) < 0:
            raise ValueError("El stock no puede ser negativo")

        if int(data["minStock"]) < 0:
            raise ValueError("El stock mínimo no puede ser negativo")

    # ============================
    # OBTENER PRODUCTOS
    # ============================

    def obtener_productos(self):
        query = f"SELECT * FROM {self.tabla}"
        self.cursor.execute(query)
        resultados = self.cursor.fetchall()

        return [self._mapear_producto(p) for p in resultados]

    # ============================
    # INSERTAR PRODUCTO
    # ============================

    def insertar_producto(self, data):
        self._validar_data(data)

        query = f"""
        INSERT INTO {self.tabla}
        (nombre, categoria, precio, stock_actual, stock_minimo)
        VALUES (%s, %s, %s, %s, %s)
        """

        self.cursor.execute(query, (
            data["name"].strip(),
            data["category"],
            float(data["price"]),
            int(data["currentStock"]),
            int(data["minStock"])
        ))

        self.conexion.commit()

    # ============================
    # ACTUALIZAR PRODUCTO
    # ============================

    def actualizar_producto(self, producto_id, data):
        self._validar_data(data)

        query = f"""
        UPDATE {self.tabla}
        SET nombre=%s,
            categoria=%s,
            precio=%s,
            stock_actual=%s,
            stock_minimo=%s
        WHERE id=%s
        """

        self.cursor.execute(query, (
            data["name"].strip(),
            data["category"],
            float(data["price"]),
            int(data["currentStock"]),
            int(data["minStock"]),
            producto_id
        ))

        self.conexion.commit()

    # ============================
    # ELIMINAR PRODUCTO
    # ============================

    def eliminar_producto(self, producto_id):
        query = f"DELETE FROM {self.tabla} WHERE id=%s"
        self.cursor.execute(query, (producto_id,))
        self.conexion.commit()

    # ============================
    # CERRAR
    # ============================

    def cerrar(self):
        if self.cursor:
            self.cursor.close()

        if self.conexion:
            self.conexion.close()