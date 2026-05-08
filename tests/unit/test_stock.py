import unittest
import sys
import os

# Ruta absoluta a src/app/backend
ruta_backend = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        "../../src/Prototipo 2, Entrega tp2/src/app/backend"
    )
)

# Agregamos backend al path
if ruta_backend not in sys.path:
    sys.path.insert(0, ruta_backend)

from stock import StockManager

# =========================================================
# 2. CLASE DE PRUEBAS (CON LOS 6 CASOS)
# =========================================================

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