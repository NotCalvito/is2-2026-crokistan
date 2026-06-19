from conexion import get_connection
from datetime import datetime
from stock import StockManager

class SolicitudManager:
    def __init__(self):
        self.conexion = get_connection()
        self.cursor = self.conexion.cursor()

    def _mapear_solicitud(self, s):
        return {
            "id": str(s["id"]),
            "productId": str(s["producto_id"]),
            "productName": s["producto_nombre"],
            "productUnit": s["unidad"],
            "requestedBy": str(s["solicitante_id"]),
            "requestedByName": s["solicitante_nombre"],
            "fromBranch": s["sucursal_origen"],
            "toBranch": s["sucursal_destino"],
            "quantity": s["cantidad"],
            "status": s["estado"],
            "createdAt": s["created_at"].isoformat() if s["created_at"] else None,
            "resolvedAt": s["resolved_at"].isoformat() if s["resolved_at"] else None,
            "resolvedBy": str(s["resolved_by"]) if s["resolved_by"] else None,
            "resolvedByName": s["resolved_by_nombre"]
        }

    def obtener_solicitudes(self, branch=None, status=None):
        query = """
        SELECT * FROM solicitudes_stock
        WHERE 1=1
        """
        params = []

        if branch:
            query += " AND (sucursal_origen = %s OR sucursal_destino = %s)"
            params.extend([branch, branch])
        
        if status:
            query += " AND estado = %s"
            params.append(status)

        query += " ORDER BY created_at DESC"

        self.cursor.execute(query, params)
        resultados = self.cursor.fetchall()
        return [self._mapear_solicitud(s) for s in resultados]

    def obtener_solicitud_por_id(self, solicitud_id):
        query = "SELECT * FROM solicitudes_stock WHERE id = %s"
        self.cursor.execute(query, (solicitud_id,))
        resultado = self.cursor.fetchone()
        if not resultado:
            raise ValueError("Solicitud no encontrada")
        return self._mapear_solicitud(resultado)

    def insertar_solicitud(self, data):
        product_id = data.get('productId')
        product_name = data.get('productName')
        product_unit = data.get('productUnit', 'Unidades')
        requested_by = data.get('requestedBy')
        requested_by_name = data.get('requestedByName')
        from_branch = data.get('fromBranch')
        to_branch = data.get('toBranch')
        quantity = data.get('quantity')

        if not product_id:
            raise ValueError("ID del producto es obligatorio")
        if not product_name:
            raise ValueError("Nombre del producto es obligatorio")
        if not requested_by:
            raise ValueError("Solicitante es obligatorio")
        if not requested_by_name:
            raise ValueError("Nombre del solicitante es obligatorio")
        if not from_branch:
            raise ValueError("Sucursal origen es obligatoria")
        if not to_branch:
            raise ValueError("Sucursal destino es obligatoria")
        if not quantity or int(quantity) <= 0:
            raise ValueError("La cantidad debe ser mayor a 0")

        try:
            manager = StockManager(to_branch)
            productos = manager.obtener_productos()
            producto_destino = next((p for p in productos if p["id"] == product_id), None)
            if producto_destino and producto_destino["currentStock"] < int(quantity):
                raise ValueError(f"Stock insuficiente en {to_branch}. Disponible: {producto_destino['currentStock']}")
        except ValueError as e:
            raise ValueError(f"Error al verificar stock en sucursal destino: {str(e)}")
        finally:
            try:
                manager.cerrar()
            except:
                pass

        query = """
        INSERT INTO solicitudes_stock (
            producto_id, producto_nombre, unidad, solicitante_id,
            solicitante_nombre, sucursal_origen, sucursal_destino, cantidad
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        self.cursor.execute(query, (
            product_id,
            product_name,
            product_unit,
            requested_by,
            requested_by_name,
            from_branch,
            to_branch,
            int(quantity)
        ))
        self.conexion.commit()

        return {"id": self.cursor.lastrowid}

    def aprobar_solicitud(self, solicitud_id, resolved_by, resolved_by_name):
        solicitud = self.obtener_solicitud_por_id(solicitud_id)
        
        if solicitud["status"] != "pending":
            raise ValueError(f"La solicitud ya está {solicitud['status']}")

        self.conexion.start_transaction()

        try:
            manager_destino = StockManager(solicitud["toBranch"])
            productos_destino = manager_destino.obtener_productos()
            producto_destino = next((p for p in productos_destino if p["id"] == solicitud["productId"]), None)
            
            if not producto_destino:
                raise ValueError(f"Producto no encontrado en {solicitud['toBranch']}")
            
            if producto_destino["currentStock"] < solicitud["quantity"]:
                raise ValueError(f"Stock insuficiente en {solicitud['toBranch']}. Disponible: {producto_destino['currentStock']}")

            nuevo_stock_destino = producto_destino["currentStock"] - solicitud["quantity"]
            manager_destino.actualizar_producto(producto_destino["id"], {
                "branch": solicitud["toBranch"],
                "name": producto_destino["name"],
                "category": producto_destino["category"],
                "price": producto_destino["price"],
                "currentStock": nuevo_stock_destino,
                "minStock": producto_destino["minStock"],
                "unit": producto_destino["unit"]
            })

            manager_origen = StockManager(solicitud["fromBranch"])
            productos_origen = manager_origen.obtener_productos()
            producto_origen = next((p for p in productos_origen if p["id"] == solicitud["productId"]), None)
            
            if producto_origen:
                nuevo_stock_origen = producto_origen["currentStock"] + solicitud["quantity"]
                manager_origen.actualizar_producto(producto_origen["id"], {
                    "branch": solicitud["fromBranch"],
                    "name": producto_origen["name"],
                    "category": producto_origen["category"],
                    "price": producto_origen["price"],
                    "currentStock": nuevo_stock_origen,
                    "minStock": producto_origen["minStock"],
                    "unit": producto_origen["unit"]
                })
            else:
                manager_origen.insertar_producto({
                    "branch": solicitud["fromBranch"],
                    "name": solicitud["productName"],
                    "category": "Otros",
                    "price": 0,
                    "currentStock": solicitud["quantity"],
                    "minStock": 1,
                    "unit": solicitud["productUnit"]
                })

            query = """
            UPDATE solicitudes_stock
            SET estado = 'approved',
                resolved_at = %s,
                resolved_by = %s,
                resolved_by_nombre = %s
            WHERE id = %s
            """
            self.cursor.execute(query, (
                datetime.now(),
                resolved_by,
                resolved_by_name,
                solicitud_id
            ))
            
            self.conexion.commit()
            
            manager_destino.cerrar()
            manager_origen.cerrar()
            
            return self.obtener_solicitud_por_id(solicitud_id)

        except Exception as e:
            self.conexion.rollback()
            raise ValueError(f"Error al aprobar solicitud: {str(e)}")

    def rechazar_solicitud(self, solicitud_id, resolved_by, resolved_by_name):
        solicitud = self.obtener_solicitud_por_id(solicitud_id)
        
        if solicitud["status"] != "pending":
            raise ValueError(f"La solicitud ya está {solicitud['status']}")

        query = """
        UPDATE solicitudes_stock
        SET estado = 'rejected',
            resolved_at = %s,
            resolved_by = %s,
            resolved_by_nombre = %s
        WHERE id = %s
        """
        self.cursor.execute(query, (
            datetime.now(),
            resolved_by,
            resolved_by_name,
            solicitud_id
        ))
        self.conexion.commit()

        return self.obtener_solicitud_por_id(solicitud_id)

    def cerrar(self):
        if self.cursor:
            self.cursor.close()
        if self.conexion:
            self.conexion.close()