TABLAS = {
    "Sucursal Centro": "productos_centro",
    "Sucursal Norte": "productos_norte",
    "Sucursal Sur": "productos_sur",
    "Sucursal Este": "productos_este",
    "Sucursal Oeste": "productos_oeste",
    "Deposíto Central": "productos_deposito"
}

def obtener_tabla(sucursal):
    if sucursal not in TABLAS:
        raise ValueError("Sucursal inválida")
    return TABLAS[sucursal]