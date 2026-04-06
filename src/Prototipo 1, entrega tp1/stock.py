from conexion import get_connection

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
    query_check = "SELECT * FROM productos WHERE Nombre = %s"
    cursor.execute(query_check, (nombre,))
    resultado = cursor.fetchone()

    if resultado:
        conexion.close()
        raise ValueError("Error: El producto ya existe. ¿Desea cambiarlo por el actual?")
    
    # ============================
    # 🔍 VERIFICAR SI YA EXISTE (Código)
    # ============================
    query_check = "SELECT 1 FROM productos WHERE Codigo = %s"
    cursor.execute(query_check, (codigo,))
    resultado = cursor.fetchone()

    if resultado:
        cursor.close()
        conexion.close()
        raise ValueError("Error: Ya existe un producto con ese código. Por favor ingrese uno diferente.")


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
