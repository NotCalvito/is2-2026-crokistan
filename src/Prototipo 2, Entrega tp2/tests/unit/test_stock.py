import unittest
import sys
import os

# 1. Obtenemos la ubicación de este archivo (test_stock.py)
# Está en: .../tests/unit/test_stock.py
directorio_actual = os.path.dirname(os.path.abspath(__file__))

# 2. Subimos los niveles necesarios para llegar a la raíz del proyecto
# Subimos de 'unit' a 'tests', y de 'tests' a la carpeta 'Prototipo 2, Entrega tp2'
raiz_proyecto = os.path.dirname(os.path.dirname(directorio_actual))

# 3. Construimos la ruta exacta hacia el backend
# Según tu estructura: src/app/backend
ruta_backend = os.path.join(raiz_proyecto, "src", "app", "backend")

# 4. Lo agregamos al sistema para que Python "vea" a stock.py
if ruta_backend not in sys.path:
    sys.path.insert(0, ruta_backend)

try:
    from stock import StockManager # type: ignore
    print(f"✅ Importación exitosa desde: {ruta_backend}")
except ImportError as e:
    print(f"❌ Error: No se encontró stock.py en {ruta_backend}")
    # Es mejor detener la ejecución aquí si no encuentra el archivo
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