from conexion import get_connection
from datetime import datetime

# Espeja el mapeo de StockManager para poder actualizar stock
# en la misma transacción que el INSERT de movimientos.
TABLAS_STOCK = {
    "Sucursal Centro":  "productos_centro",
    "Sucursal Norte":   "productos_norte",
    "Sucursal Sur":     "productos_sur",
    "Sucursal Este":    "productos_este",
    "Sucursal Oeste":   "productos_oeste",
    "Deposito Central": "productos_deposito",
}

class MovimientoManager:
    def __init__(self):
        self.conexion = get_connection()
        self.cursor = self.conexion.cursor()

    def obtener_movimientos(self, filtros=None):
        query = """
        SELECT * FROM movimientos
        WHERE 1=1
        """
        params = []

        if filtros:
            if filtros.get('branch'):
                query += " AND sucursal_origen = %s"
                params.append(filtros['branch'])
            if filtros.get('type'):
                query += " AND tipo = %s"
                params.append(filtros['type'])
            if filtros.get('customer'):
                query += " AND cliente_nombre LIKE %s"
                params.append(f"%{filtros['customer']}%")
            if filtros.get('date_from'):
                query += " AND fecha >= %s"
                params.append(filtros['date_from'])
            if filtros.get('date_to'):
                query += " AND fecha <= %s"
                params.append(filtros['date_to'])

        query += " ORDER BY fecha DESC, created_at DESC"
        self.cursor.execute(query, params)
        return self.cursor.fetchall()

    def insertar_movimiento(self, data):
        cantidad    = data.get('quantity')      # frontend manda 'quantity'
        tipo        = data.get('type')           # 'entry' | 'exit'
        producto_id = data.get('productId')
        sucursal    = data.get('productBranch')

        query = """
        INSERT INTO movimientos (
            producto_id, producto_nombre, sucursal_origen, tipo, cantidad,
            motivo, descripcion, fecha, vendedor_id, vendedor_nombre,
            vendedor_sucursal, cliente_nombre, cliente_telefono,
            es_cliente_frecuente, descuento_id, descuento_nombre,
            descuento_valor, precio_unitario, precio_final_unitario,
            total, es_efectivo, descuento_efectivo_valor
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s
        )
        """
        self.cursor.execute(query, (
            producto_id,
            data.get('productName'),
            sucursal,
            tipo,
            cantidad,
            data.get('reason'),
            data.get('description'),
            data.get('date'),
            data.get('sellerId'),
            data.get('sellerName'),
            data.get('sellerBranch'),
            data.get('customerName'),
            data.get('customerPhone'),
            data.get('isFrequentCustomer', False),
            data.get('discountId'),
            data.get('discountName'),
            data.get('discountValue'),
            data.get('unitPrice'),
            data.get('finalUnitPrice'),
            data.get('totalAmount'),
            data.get('isCash', False),
            data.get('cashDiscountValue')
        ))
        movimiento_id = self.cursor.lastrowid

        # Actualizar stock en la misma transacción --------------------------
        tabla = TABLAS_STOCK.get(sucursal)
        if tabla and cantidad is not None:
            delta = int(cantidad) if tipo == 'entry' else -int(cantidad)
            self.cursor.execute(
                f"UPDATE {tabla} SET stock_actual = stock_actual + %s WHERE id = %s",
                (delta, producto_id)
            )
            # Verificar que no quedó en negativo antes de confirmar
            self.cursor.execute(
                f"SELECT stock_actual FROM {tabla} WHERE id = %s",
                (producto_id,)
            )
            row = self.cursor.fetchone()
            if row and int(row['stock_actual']) < 0:
                self.conexion.rollback()
                raise ValueError("Stock insuficiente para realizar el movimiento")
        # -------------------------------------------------------------------

        self.conexion.commit()
        return {"id": movimiento_id}

    def cerrar(self):
        if self.cursor:
            self.cursor.close()
        if self.conexion:
            self.conexion.close()