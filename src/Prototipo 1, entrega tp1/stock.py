from conexion import get_connection
from tkinter import messagebox

def insertar_producto(data):
    conexion = get_connection()
    cursor = conexion.cursor()

    nombre = data["Nombre del producto"]
    codigo = data["Código"]
    precio = float(data["Precio"])
    cantidad = int(data["Cantidad"])
    proveedor = data["Proveedor"]

    # ============================
    # ❌ VALIDACIÓN (datos inválidos)
    # ============================
    if precio <= 0 or cantidad <= 0:
        raise ValueError("Precio y cantidad no pueden ser negativos o iguales a 0")

     # ============================
    # 🔍 VERIFICAR SI YA EXISTE (Nombre)
    # ============================
    query_check = "SELECT ID FROM productos WHERE Nombre = %s"
    cursor.execute(query_check, (nombre,))
    resultado = cursor.fetchone()

    if resultado:
        respuesta = messagebox.askyesno(
            "Producto existente",
            "El producto ya existe. ¿Desea reemplazarlo?"
        )

        if not respuesta:
            cursor.close()
            conexion.close()
            raise ValueError("Operación cancelada por el usuario")

        # ============================
        # 🔄 UPDATE
        # ============================
        query_update = """
        UPDATE productos
        SET Codigo=%s, Precio=%s, Cantidad=%s, Proveedor=%s
        WHERE Nombre=%s
        """

        valores_update = (codigo, precio, cantidad, proveedor, nombre)

        cursor.execute(query_update, valores_update)
        conexion.commit()

        cursor.close()
        conexion.close()

        return "actualizado"
    
    # ============================
    # 🔍 VERIFICAR SI YA EXISTE (Codigo)
    # ============================
    query_check = "SELECT * FROM productos WHERE Codigo = %s"
    cursor.execute(query_check, (codigo,))
    resultado = cursor.fetchone()

    if resultado:
        conexion.close()
        raise ValueError("Error: Un producto ya posee ese codigo; por favor cambialo; gracias bro")


    # ============================
    # 📥 INSERT
    # ============================
    query_insert = """
    INSERT INTO productos 
    (Nombre, Codigo, Precio, Cantidad, Proveedor)
    VALUES (%s, %s, %s, %s, %s)
    """

    valores = (nombre, codigo, precio, cantidad, proveedor)

    cursor.execute(query_insert, valores)
    conexion.commit()

    # ============================
    # ⚠️ ALERTA STOCK BAJO
    # ============================
    STOCK_MINIMO = 5

    alerta_stock = cantidad <= STOCK_MINIMO

    cursor.close()
    conexion.close()

    # 👉 Devolvemos info para la UI
    return alerta_stock