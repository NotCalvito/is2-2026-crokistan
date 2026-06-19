from conexion import get_connection
from datetime import datetime

FREQUENT_CUSTOMER_THRESHOLD = 3

class ClienteManager:
    def __init__(self):
        self.conexion = get_connection()
        self.cursor = self.conexion.cursor()

    def obtener_clientes(self, nombre=None):
        query = "SELECT * FROM clientes"
        params = []

        if nombre:
            query += " WHERE nombre LIKE %s"
            params.append(f"%{nombre}%")

        query += " ORDER BY nombre ASC"
        self.cursor.execute(query, params)
        return self.cursor.fetchall()

    def buscar_por_nombre_exacto(self, nombre):
        query = "SELECT * FROM clientes WHERE LOWER(nombre) = LOWER(%s)"
        self.cursor.execute(query, (nombre,))
        return self.cursor.fetchone()

    def insertar_cliente(self, data):
        nombre = data.get('name')
        telefono = data.get('phone')
        email = data.get('email')

        if not nombre:
            raise ValueError("El nombre del cliente es obligatorio")

        existing = self.buscar_por_nombre_exacto(nombre)
        if existing:
            raise ValueError(f"El cliente '{nombre}' ya existe")

        query = """
        INSERT INTO clientes (nombre, telefono, email, es_frecuente, compras)
        VALUES (%s, %s, %s, %s, %s)
        """
        self.cursor.execute(query, (
            nombre,
            telefono,
            email,
            False,
            0
        ))
        self.conexion.commit()

        return {"id": self.cursor.lastrowid}

    def actualizar_cliente(self, cliente_id, data):
        fields = []
        params = []

        if 'name' in data:
            fields.append("nombre = %s")
            params.append(data['name'])
        if 'phone' in data:
            fields.append("telefono = %s")
            params.append(data['phone'])
        if 'email' in data:
            fields.append("email = %s")
            params.append(data['email'])
        if 'isFrequent' in data:
            fields.append("es_frecuente = %s")
            params.append(1 if data['isFrequent'] else 0)

        if not fields:
            raise ValueError("No hay datos para actualizar")

        params.append(cliente_id)
        query = f"UPDATE clientes SET {', '.join(fields)} WHERE id = %s"
        self.cursor.execute(query, params)
        self.conexion.commit()

        if self.cursor.rowcount == 0:
            raise ValueError("Cliente no encontrado")

        return self.buscar_por_id(cliente_id)

    def buscar_por_id(self, cliente_id):
        query = "SELECT * FROM clientes WHERE id = %s"
        self.cursor.execute(query, (cliente_id,))
        return self.cursor.fetchone()

    def incrementar_compras(self, nombre):
        if not nombre:
            raise ValueError("El nombre del cliente es obligatorio")

        cliente = self.buscar_por_nombre_exacto(nombre)

        if not cliente:
            nuevo_cliente = self.insertar_cliente({
                'name': nombre,
                'phone': None,
                'email': None
            })
            cliente = self.buscar_por_id(nuevo_cliente['id'])

        nuevas_compras = cliente['compras'] + 1
        es_frecuente = nuevas_compras >= FREQUENT_CUSTOMER_THRESHOLD

        query = """
        UPDATE clientes
        SET compras = %s, es_frecuente = %s
        WHERE id = %s
        """
        self.cursor.execute(query, (nuevas_compras, 1 if es_frecuente else 0, cliente['id']))
        self.conexion.commit()

        return self.buscar_por_id(cliente['id'])

    def cerrar(self):
        if self.cursor:
            self.cursor.close()
        if self.conexion:
            self.conexion.close()