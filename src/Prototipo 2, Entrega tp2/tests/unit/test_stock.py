import unittest
import sys
import os

# 1. Buscamos la carpeta raíz del repositorio 'is2-2026-crokistan'
directorio_actual = os.path.dirname(os.path.abspath(__file__))
# Subimos niveles hasta llegar a la carpeta principal del repo
# unit -> tests -> Entrega tp2 -> Prototipo 2... vamos a buscar la carpeta 'src'
# Lo más seguro es buscar el nombre del proyecto
base_path = directorio_actual
while "is2-2026-crokistan" in base_path:
    if os.path.exists(os.path.join(base_path, "src")):
        break
    parent = os.path.dirname(base_path)
    if parent == base_path: break
    base_path = parent

# 2. Ahora armamos la ruta exacta basándonos en lo que vimos en el error de la captura
# La ruta real donde está stock.py es:
ruta_backend = os.path.join(base_path, "src", "Prototipo 2, Entrega tp2", "src", "app", "backend")

if ruta_backend not in sys.path:
    sys.path.insert(0, ruta_backend)

print(f"Buscando stock.py en: {ruta_backend}")

try:
    from stock import StockManager # type: ignore
    print("✅ StockManager cargado exitosamente.")
except ImportError:
    print(f"❌ Error: No se encontró stock.py en {ruta_backend}")
    sys.exit(1)

# =========================================================
# 2. CLASE DE PRUEBAS
# =========================================================
class TestStockUnitario(unittest.TestCase):
    
    def setUp(self):
        """Configuración antes de cada test."""
        try:
            # Intentamos inicializar normalmente
            self.manager = StockManager("Sucursal Centro")
        except Exception:
            # Si falla (ej. no hay base de datos en el servidor de GitHub), 
            # forzamos la creación del objeto para testear la lógica de validación
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