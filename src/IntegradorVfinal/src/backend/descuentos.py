from conexion import get_connection
from datetime import datetime

class DescuentoManager:
    def __init__(self):
        self.conexion = get_connection()
        self.cursor = self.conexion.cursor()

    def _mapear_descuento(self, d):
        return {
            "id": str(d["id"]),
            "name": d["nombre"],
            "type": d["tipo"],
            "value": float(d["valor"]),
            "isActive": bool(d["activo"]),
            "appliesTo": d["aplica_a"],
            "createdAt": d["created_at"].isoformat() if d["created_at"] else None
        }

    def obtener_descuentos(self, solo_activos=False):
        query = "SELECT * FROM descuentos"
        params = []
        
        if solo_activos:
            query += " WHERE activo = 1"
        
        query += " ORDER BY created_at DESC"
        
        self.cursor.execute(query, params)
        resultados = self.cursor.fetchall()
        return [self._mapear_descuento(d) for d in resultados]

    def obtener_descuento_por_id(self, descuento_id):
        query = "SELECT * FROM descuentos WHERE id = %s"
        self.cursor.execute(query, (descuento_id,))
        resultado = self.cursor.fetchone()
        if not resultado:
            raise ValueError("Descuento no encontrado")
        return self._mapear_descuento(resultado)

    def insertar_descuento(self, data):
        name = data.get('name')
        tipo = data.get('type')
        valor = data.get('value')
        aplica_a = data.get('appliesTo', 'all')
        activo = data.get('isActive', True)

        if not name:
            raise ValueError("El nombre del descuento es obligatorio")
        if not tipo or tipo not in ['percentage', 'fixed']:
            raise ValueError("Tipo de descuento inválido (debe ser 'percentage' o 'fixed')")
        if valor is None or float(valor) <= 0:
            raise ValueError("El valor del descuento debe ser mayor a 0")
        if tipo == 'percentage' and float(valor) > 100:
            raise ValueError("El porcentaje no puede ser mayor a 100")
        if aplica_a not in ['all', 'frequent_customers']:
            raise ValueError("'appliesTo' debe ser 'all' o 'frequent_customers'")

        query = """
        INSERT INTO descuentos (nombre, tipo, valor, activo, aplica_a)
        VALUES (%s, %s, %s, %s, %s)
        """
        self.cursor.execute(query, (
            name,
            tipo,
            float(valor),
            1 if activo else 0,
            aplica_a
        ))
        self.conexion.commit()

        return {"id": self.cursor.lastrowid}

    def actualizar_descuento(self, descuento_id, data):
        fields = []
        params = []

        if 'name' in data:
            fields.append("nombre = %s")
            params.append(data['name'])
        if 'type' in data:
            if data['type'] not in ['percentage', 'fixed']:
                raise ValueError("Tipo de descuento inválido")
            fields.append("tipo = %s")
            params.append(data['type'])
        if 'value' in data:
            if float(data['value']) <= 0:
                raise ValueError("El valor debe ser mayor a 0")
            if data.get('type') == 'percentage' and float(data['value']) > 100:
                raise ValueError("El porcentaje no puede ser mayor a 100")
            fields.append("valor = %s")
            params.append(float(data['value']))
        if 'appliesTo' in data:
            if data['appliesTo'] not in ['all', 'frequent_customers']:
                raise ValueError("'appliesTo' debe ser 'all' o 'frequent_customers'")
            fields.append("aplica_a = %s")
            params.append(data['appliesTo'])
        if 'isActive' in data:
            fields.append("activo = %s")
            params.append(1 if data['isActive'] else 0)

        if not fields:
            raise ValueError("No hay datos para actualizar")

        params.append(descuento_id)
        query = f"UPDATE descuentos SET {', '.join(fields)} WHERE id = %s"
        self.cursor.execute(query, params)
        self.conexion.commit()

        if self.cursor.rowcount == 0:
            raise ValueError("Descuento no encontrado")

        return self.obtener_descuento_por_id(descuento_id)

    def eliminar_descuento(self, descuento_id):
        query = "DELETE FROM descuentos WHERE id = %s"
        self.cursor.execute(query, (descuento_id,))
        self.conexion.commit()

        if self.cursor.rowcount == 0:
            raise ValueError("Descuento no encontrado")

    def toggle_active(self, descuento_id, activo):
        query = "UPDATE descuentos SET activo = %s WHERE id = %s"
        self.cursor.execute(query, (1 if activo else 0, descuento_id))
        self.conexion.commit()

        if self.cursor.rowcount == 0:
            raise ValueError("Descuento no encontrado")

        return self.obtener_descuento_por_id(descuento_id)

    def cerrar(self):
        if self.cursor:
            self.cursor.close()
        if self.conexion:
            self.conexion.close()