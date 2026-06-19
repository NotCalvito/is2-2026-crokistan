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
        self.cursor = self.conexion.cursor()

    def _mapear_producto(self, p):
        return {
            "id": p["id"],
            "name": p["nombre"],
            "category": p["categoria"],
            "price": float(p["precio"]),
            "currentStock": int(p["stock_actual"]),
            "minStock": int(p["stock_minimo"]),
            "unit": p.get("unidad", "Unidades"),
            "branch": self.sucursal
        }

    def _validar_data(self, data):
        required = ["name", "category", "price", "currentStock", "minStock", "unit"]

        for campo in required:
            if campo not in data:
                raise ValueError(f"Falta el campo: {campo}")

        if not data["name"].strip():
            raise ValueError("El nombre no puede estar vacío")

        if float(data["price"]) < 0:
            raise ValueError("El precio no puede ser negativo")

        if int(data["currentStock"]) < 0:
            raise ValueError("El stock no puede ser negativo")

        if int(data["minStock"]) < 0:
            raise ValueError("El stock mínimo no puede ser negativo")

    def _validar_precio_definitivo(self, price):
        """
        Validación para cuando se define el precio FINAL de un producto
        (acción exclusiva del rol 'contador', ver app.py: PUT /products/<id>).

        A diferencia de _validar_data -que acepta 0 como "sin precio
        asignado", el estado con el que un empleado crea un producto-, acá
        el precio debe ser estrictamente mayor a cero: un contador no puede
        dejar un producto sin precio.
        """
        if float(price) <= 0:
            raise ValueError("El precio debe ser mayor a cero")

    def definir_precio(self, producto_id, price):
        """Actualiza únicamente el precio de un producto (rol: contador)."""
        self._validar_precio_definitivo(price)

        query = f"UPDATE {self.tabla} SET precio=%s WHERE id=%s"
        self.cursor.execute(query, (float(price), producto_id))
        self.conexion.commit()

    def obtener_productos(self):
        query = f"SELECT * FROM {self.tabla}"
        self.cursor.execute(query)
        resultados = self.cursor.fetchall()
        return [self._mapear_producto(p) for p in resultados]

    def insertar_producto(self, data):
        self._validar_data(data)

        query = f"""
        INSERT INTO {self.tabla}
        (nombre, categoria, precio, stock_actual, stock_minimo, unidad)
        VALUES (%s, %s, %s, %s, %s, %s)
        """

        self.cursor.execute(query, (
            data["name"].strip(),
            data["category"],
            float(data["price"]),
            int(data["currentStock"]),
            int(data["minStock"]),
            data.get("unit", "Unidades")
        ))

        self.conexion.commit()

    def actualizar_producto(self, producto_id, data):
        self._validar_data(data)

        query = f"""
        UPDATE {self.tabla}
        SET nombre=%s,
            categoria=%s,
            precio=%s,
            stock_actual=%s,
            stock_minimo=%s,
            unidad=%s
        WHERE id=%s
        """

        self.cursor.execute(query, (
            data["name"].strip(),
            data["category"],
            float(data["price"]),
            int(data["currentStock"]),
            int(data["minStock"]),
            data.get("unit", "Unidades"),
            producto_id
        ))

        self.conexion.commit()

    def eliminar_producto(self, producto_id):
        query = f"DELETE FROM {self.tabla} WHERE id=%s"
        self.cursor.execute(query, (producto_id,))
        self.conexion.commit()

    def actualizar_stock(self, producto_id, delta):
        """
        Suma `delta` al stock_actual del producto (positivo = entrada, negativo = salida).
        Lanza ValueError si el resultado queda negativo.
        Hace commit al finalizar.
        """
        self.cursor.execute(
            f"UPDATE {self.tabla} SET stock_actual = stock_actual + %s WHERE id = %s",
            (delta, producto_id)
        )
        self.cursor.execute(
            f"SELECT stock_actual FROM {self.tabla} WHERE id = %s",
            (producto_id,)
        )
        row = self.cursor.fetchone()
        if row and int(row['stock_actual']) < 0:
            self.conexion.rollback()
            raise ValueError("Stock insuficiente")
        self.conexion.commit()

    def cerrar(self):
        if self.cursor:
            self.cursor.close()
        if self.conexion:
            self.conexion.close()