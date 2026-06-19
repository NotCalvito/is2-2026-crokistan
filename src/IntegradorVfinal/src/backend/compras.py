from conexion import get_connection
from datetime import datetime

class CompraManager:
    def __init__(self):
        self.conexion = get_connection()
        self.cursor = self.conexion.cursor()

    def _mapear_compra(self, c):
        return {
            "id": str(c["id"]),
            "productId": str(c["producto_id"]),
            "productName": c["producto_nombre"],
            "productUnit": c["unidad"],
            "branch": c["sucursal"],
            "quantity": c["cantidad"],
            "cost": float(c["costo_total"]),
            "provider": c["proveedor"],
            "date": c["fecha"].isoformat() if c["fecha"] else None,
            "status": c["estado"],
            "createdAt": c["created_at"].isoformat() if c["created_at"] else None
        }

    def obtener_compras(self, branch=None, status=None):
        query = """
        SELECT * FROM compras_proveedores
        WHERE 1=1
        """
        params = []

        if branch:
            query += " AND sucursal = %s"
            params.append(branch)
        
        if status:
            query += " AND estado = %s"
            params.append(status)

        query += " ORDER BY fecha DESC, created_at DESC"

        self.cursor.execute(query, params)
        resultados = self.cursor.fetchall()
        return [self._mapear_compra(c) for c in resultados]

    def obtener_compra_por_id(self, compra_id):
        query = "SELECT * FROM compras_proveedores WHERE id = %s"
        self.cursor.execute(query, (compra_id,))
        resultado = self.cursor.fetchone()
        if not resultado:
            raise ValueError("Orden de compra no encontrada")
        return self._mapear_compra(resultado)

    def insertar_compra(self, data):
        product_id = data.get('productId')
        product_name = data.get('productName')
        product_unit = data.get('productUnit', 'Unidades')
        branch = data.get('branch')
        quantity = data.get('quantity')
        cost = data.get('cost')
        provider = data.get('provider')
        date = data.get('date', datetime.now().strftime('%Y-%m-%d'))

        if not product_id:
            raise ValueError("ID del producto es obligatorio")
        if not product_name:
            raise ValueError("Nombre del producto es obligatorio")
        if not branch:
            raise ValueError("Sucursal es obligatoria")
        if not quantity or int(quantity) <= 0:
            raise ValueError("La cantidad debe ser mayor a 0")
        if cost is None or float(cost) < 0:
            raise ValueError("El costo debe ser mayor o igual a 0")
        if not provider:
            raise ValueError("El nombre del proveedor es obligatorio")

        try:
            datetime.strptime(date, '%Y-%m-%d')
        except ValueError:
            raise ValueError("Formato de fecha inválido. Use YYYY-MM-DD")

        query = """
        INSERT INTO compras_proveedores (
            producto_id, producto_nombre, unidad, sucursal,
            cantidad, costo_total, proveedor, fecha
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        self.cursor.execute(query, (
            product_id,
            product_name,
            product_unit,
            branch,
            int(quantity),
            float(cost),
            provider,
            date
        ))
        self.conexion.commit()

        return {"id": self.cursor.lastrowid}

    def actualizar_compra(self, compra_id, data):
        fields = []
        params = []

        if 'status' in data:
            status = data['status']
            if status not in ['pending', 'delivered', 'cancelled']:
                raise ValueError("Estado inválido. Debe ser 'pending', 'delivered' o 'cancelled'")
            fields.append("estado = %s")
            params.append(status)
        
        if 'provider' in data:
            fields.append("proveedor = %s")
            params.append(data['provider'])
        
        if 'cost' in data:
            if float(data['cost']) < 0:
                raise ValueError("El costo no puede ser negativo")
            fields.append("costo_total = %s")
            params.append(float(data['cost']))
        
        if 'quantity' in data:
            if int(data['quantity']) <= 0:
                raise ValueError("La cantidad debe ser mayor a 0")
            fields.append("cantidad = %s")
            params.append(int(data['quantity']))
        
        if 'date' in data:
            try:
                datetime.strptime(data['date'], '%Y-%m-%d')
            except ValueError:
                raise ValueError("Formato de fecha inválido. Use YYYY-MM-DD")
            fields.append("fecha = %s")
            params.append(data['date'])

        if not fields:
            raise ValueError("No hay datos para actualizar")

        params.append(compra_id)
        query = f"UPDATE compras_proveedores SET {', '.join(fields)} WHERE id = %s"
        self.cursor.execute(query, params)
        self.conexion.commit()

        if self.cursor.rowcount == 0:
            raise ValueError("Orden de compra no encontrada")

        return self.obtener_compra_por_id(compra_id)

    def marcar_entregado(self, compra_id):
        compra = self.obtener_compra_por_id(compra_id)
        
        if compra["status"] != "pending":
            raise ValueError(f"La orden ya está {compra['status']}")

        self.conexion.start_transaction()

        try:
            from stock import StockManager

            manager = StockManager(compra["branch"])
            productos = manager.obtener_productos()
            producto = next((p for p in productos if p["id"] == compra["productId"]), None)
            
            if producto:
                nuevo_stock = producto["currentStock"] + compra["quantity"]
                manager.actualizar_producto(producto["id"], {
                    "branch": compra["branch"],
                    "name": producto["name"],
                    "category": producto["category"],
                    "price": producto["price"],
                    "currentStock": nuevo_stock,
                    "minStock": producto["minStock"],
                    "unit": producto["unit"]
                })
            else:
                manager.insertar_producto({
                    "branch": compra["branch"],
                    "name": compra["productName"],
                    "category": "Otros",
                    "price": 0,
                    "currentStock": compra["quantity"],
                    "minStock": 1,
                    "unit": compra["productUnit"]
                })

            manager.cerrar()

            query = """
            UPDATE compras_proveedores
            SET estado = 'delivered'
            WHERE id = %s
            """
            self.cursor.execute(query, (compra_id,))
            self.conexion.commit()

            return self.obtener_compra_por_id(compra_id)

        except Exception as e:
            self.conexion.rollback()
            raise ValueError(f"Error al marcar como entregado: {str(e)}")

    def cerrar(self):
        if self.cursor:
            self.cursor.close()
        if self.conexion:
            self.conexion.close()