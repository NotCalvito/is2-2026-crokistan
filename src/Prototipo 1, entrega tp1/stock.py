from conexion import get_connection
#Se encarga de mandar los datos a la base de datos, no tiene otra funcionalidad

def insertar_producto(data):
    conexion = get_connection()
    cursor = conexion.cursor()

    query = """
    INSERT INTO productos 
    (Nombre, Codigo, Precio, Cantidad, Proveedor)
    VALUES (%s, %s, %s, %s, %s)
    """


    valores = (
    data["Nombre del producto"],
    data["Código"],
    float(data["Precio"]),    
    int(data["Cantidad"]),     
    data["Proveedor"]
)
    

    cursor.execute(query, valores)
    conexion.commit()

    cursor.close()
    conexion.close()