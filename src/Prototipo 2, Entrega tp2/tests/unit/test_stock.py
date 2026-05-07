""" import unittest
import sys
import os

current_path = os.path.dirname(os.path.abspath(__file__))

project_root = os.path.dirname(os.path.dirname(current_path))

ruta_backend = os.path.join(project_root, "src", "app", "backend")

if ruta_backend not in sys.path:
    sys.path.insert(0, ruta_backend)

print(f"DEBUG - Buscando en: {ruta_backend}")

try:
    from stock import StockManager # type: ignore
    print("StockManager cargado con éxito.")
except ImportError:
    print(f"Error: No se encontró stock.py en {ruta_backend}")
    # Listamos lo que hay en la carpeta para debuguear en el video si falla
    if os.path.exists(ruta_backend):
        print(f"Contenido de la carpeta: {os.listdir(ruta_backend)}")
    sys.exit(1) """
import unittest
import sys
import os

# Buscamos la raíz del proyecto (donde empieza el primer 'src')
current_dir = os.path.dirname(os.path.abspath(__file__))
# Subimos hasta llegar a la carpeta "Prototipo 2, Entrega tp2"
project_root = os.path.dirname(os.path.dirname(current_dir))

# Agregamos la carpeta 'src' al path
src_path = os.path.join(project_root, "src")
if src_path not in sys.path:
    sys.path.insert(0, src_path)

try:
    # Intentamos la importación siguiendo la estructura de carpetas
    from app.backend.stock import StockManager
    print("✅ ¡Conectado! StockManager cargado correctamente.")
except ImportError as e:
    print(f"❌ Error: Python sigue sin verlo. Detalle: {e}")
    # Plan B: Importación directa si lo anterior falla
    sys.path.insert(0, os.path.join(src_path, "app", "backend"))
    from stock import StockManager
    print("✅ ¡Conectado vía Plan B!")


# ==========================================================

# 2. CLASE DE PRUEBAS (CON LOS 6 CASOS)

# ==========================================================

class TestStockUnitario(unittest.TestCase):

   

    def setUp(self):

        """Configuración antes de cada test."""

        try:

            # Inicializamos el manager para la sucursal del SQL

            self.manager = StockManager("Sucursal Centro")

        except Exception:

            # Si falla la conexión a DB, forzamos la creación para testear solo lógica

            self.manager = StockManager.__new__(StockManager)



    # --- TÉCNICA: VALORES LÍMITE ---



    def test_caso_01_datos_validos(self):

        """Caso 01: Datos correctos (Éxito)."""

        data = {"name": "Pincel", "category": "Pintura", "price": 850, "currentStock": 20, "minStock": 5}

        self.manager._validar_data(data)



    def test_caso_02_precio_limite_invalido(self):

        """Caso 02: Precio 0 (Límite inválido)."""

        data = {"name": "X", "category": "Otros", "price": 0, "currentStock": 1, "minStock": 1}

        with self.assertRaises(ValueError):

            self.manager._validar_data(data)



    def test_caso_04_stock_limite_valido(self):

        """Caso 04: Stock 0 (Límite válido)."""

        data = {"name": "X", "category": "Otros", "price": 10, "currentStock": 0, "minStock": 1}

        self.manager._validar_data(data)



    # --- TÉCNICA: CLASES DE EQUIVALENCIA ---



    def test_caso_03_stock_negativo(self):

        """Caso 03: Stock negativo (Clase inválida)."""

        data = {"name": "X", "category": "Otros", "price": 10, "currentStock": -1, "minStock": 1}

        with self.assertRaises(ValueError):

            self.manager._validar_data(data)



    def test_caso_05_nombre_vacio(self):

        """Caso 05: Nombre con espacios (Clase inválida)."""

        data = {"name": "   ", "category": "Otros", "price": 10, "currentStock": 1, "minStock": 1}

        with self.assertRaises(ValueError):

            self.manager._validar_data(data)



    def test_caso_06_min_stock_negativo(self):

        """Caso 06: Stock mínimo negativo (Clase inválida)."""

        data = {"name": "X", "category": "Otros", "price": 10, "currentStock": 1, "minStock": -5}

        with self.assertRaises(ValueError):

            self.manager._validar_data(data)



if __name__ == "__main__":

    unittest.main()