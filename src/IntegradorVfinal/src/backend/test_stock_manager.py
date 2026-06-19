"""
Pruebas unitarias de StockManager (src/backend/stock.py)

Implementa la estrategia descrita en el informe del proyecto:
  - Técnica: clases de equivalencia + valores límite
  - Enfoque: TDD
  - Framework: unittest
  - Variables evaluadas: nombre, precio, stock actual

Son pruebas de UNIDAD: no requieren MySQL/XAMPP corriendo. StockManager
depende de conexion.get_connection() (PyMySQL); esa dependencia se
reemplaza por un mock antes de instanciar la clase para aislar la lógica
de negocio de la base de datos real.
"""

import sys
import unittest
from unittest.mock import MagicMock, patch

# Aísla las pruebas de PyMySQL/MySQL: si el paquete no está instalado en el
# entorno donde se corren los tests, esto evita que falle el import de
# conexion.py; si está instalado, simplemente lo reemplazamos para no
# depender de una base de datos real.
sys.modules.setdefault("pymysql", MagicMock())
sys.modules.setdefault("pymysql.cursors", MagicMock())

import stock  # noqa: E402  (después de mockear pymysql)


class StockManagerTestBase(unittest.TestCase):
    """Crea un StockManager con una conexión de base de datos simulada."""

    def setUp(self):
        self.get_connection_patch = patch("stock.get_connection")
        mock_get_connection = self.get_connection_patch.start()

        self.mock_cursor = MagicMock()
        mock_conn = MagicMock()
        mock_conn.cursor.return_value = self.mock_cursor
        mock_get_connection.return_value = mock_conn

        self.manager = stock.StockManager("Sucursal Centro")

    def tearDown(self):
        self.get_connection_patch.stop()

    @staticmethod
    def producto_valido(**overrides):
        data = {
            "name": "Martillo",
            "category": "Herramientas",
            "price": 150.0,
            "currentStock": 10,
            "minStock": 2,
            "unit": "Unidades",
        }
        data.update(overrides)
        return data


class TestCreacionCorrecta(StockManagerTestBase):
    """Caso de prueba del informe: creación correcta de productos."""

    def test_creacion_correcta_inserta_y_confirma(self):
        self.manager.insertar_producto(self.producto_valido())
        self.mock_cursor.execute.assert_called_once()
        self.manager.conexion.commit.assert_called_once()


class TestValidacionPrecioGeneral(StockManagerTestBase):
    """Caso de prueba del informe: rechazo de precios inválidos (creación/edición general).

    Este es el flujo que usan admin y empleado al crear o editar un producto
    completo. Un empleado puede dejar el producto en price=0 a propósito
    (ver Inventory.tsx: "Los productos se crearán con precio 0, deberá ser
    definido por un contador"), así que 0 es un valor VÁLIDO acá.

    Clase válida: precio >= 0   |   Clase inválida: precio < 0
    """

    def test_precio_valido_tipico(self):
        try:
            self.manager.insertar_producto(self.producto_valido(price=99.5))
        except ValueError:
            self.fail("Un precio positivo típico no debería rechazarse")

    def test_precio_valido_limite_cero_producto_sin_precio_aun(self):
        # Valor límite inferior de la clase válida: producto recién creado
        # por un empleado, todavía sin precio asignado.
        try:
            self.manager.insertar_producto(self.producto_valido(price=0))
        except ValueError:
            self.fail("price=0 es un estado válido (producto pendiente de precio)")

    def test_precio_invalido_negativo(self):
        with self.assertRaises(ValueError):
            self.manager.insertar_producto(self.producto_valido(price=-10))


class TestDefinirPrecioContador(StockManagerTestBase):
    """Caso de prueba del informe: rechazo de precios inválidos (acción del contador).

    Este es el flujo exclusivo de StockManager.definir_precio(), que usa el
    rol 'contador' para asignarle precio final a un producto que no lo
    tiene. Acá sí aplican las clases de equivalencia tal como las define
    el informe.

    Clase válida: precio > 0   |   Clase inválida: precio <= 0
    """

    def test_precio_valido_tipico(self):
        self.manager.definir_precio("1", 150.0)
        self.mock_cursor.execute.assert_called_once()
        self.manager.conexion.commit.assert_called_once()

    def test_precio_valido_valor_limite_minimo(self):
        # Valor límite inferior de la clase válida (justo > 0)
        try:
            self.manager.definir_precio("1", 0.01)
        except ValueError:
            self.fail("0.01 es el límite inferior válido y no debería rechazarse")

    def test_precio_invalido_cero(self):
        # Valor límite: un contador no puede "definir" un precio de 0
        with self.assertRaises(ValueError):
            self.manager.definir_precio("1", 0)

    def test_precio_invalido_negativo(self):
        with self.assertRaises(ValueError):
            self.manager.definir_precio("1", -10)


class TestValidacionStock(StockManagerTestBase):
    """Caso de prueba del informe: validación de stock.

    Clase válida: enteros no negativos | Clase inválida: negativos
    """

    def test_stock_valido_limite_cero(self):
        # Valor límite inferior de la clase válida
        try:
            self.manager.insertar_producto(self.producto_valido(currentStock=0))
        except ValueError:
            self.fail("0 es el límite inferior de la clase válida de stock")

    def test_stock_valido_tipico(self):
        try:
            self.manager.insertar_producto(self.producto_valido(currentStock=40))
        except ValueError:
            self.fail("Un stock positivo típico no debería rechazarse")

    def test_stock_invalido_negativo(self):
        with self.assertRaises(ValueError):
            self.manager.insertar_producto(self.producto_valido(currentStock=-1))


class TestValidacionNombre(StockManagerTestBase):
    """Caso de prueba del informe: validación de nombres vacíos.

    Clase válida: cadenas con contenido | Clase inválida: vacías o espacios
    """

    def test_nombre_valido(self):
        try:
            self.manager.insertar_producto(self.producto_valido(name="Destornillador Phillips"))
        except ValueError:
            self.fail("Un nombre con contenido no debería rechazarse")

    def test_nombre_invalido_vacio(self):
        with self.assertRaises(ValueError):
            self.manager.insertar_producto(self.producto_valido(name=""))

    def test_nombre_invalido_solo_espacios(self):
        with self.assertRaises(ValueError):
            self.manager.insertar_producto(self.producto_valido(name="   "))


if __name__ == "__main__":
    unittest.main(verbosity=2)
