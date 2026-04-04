##  Observer

**Nombre del patrón:** Observer  
**Intención:** Notificar automáticamente a varios objetos cuando hay cambios.  
**Problema que resuelve:** Avisar cuando cambia el stock de un producto.  
**Justificación de la elección:** Permite que distintos sistemas (ventas, alertas o reportes) reaccionen a cambios en el inventario sin depender directamente del módulo de stock.

**Ejemplo en el código:**
```python

class Observador:
    def actualizar(self, producto, stock):
        pass

class SistemaVentas(Observador):
    def actualizar(self, producto, stock):
        print(f"Stock actualizado de {producto}: {stock}")

class Inventario:
    def __init__(self):
        self.observadores = []
        self.stock = {}

    def agregar_observador(self, obs):
        self.observadores.append(obs)

    def actualizar_stock(self, producto, cantidad):
        self.stock[producto] = cantidad
        for obs in self.observadores:
            obs.actualizar(producto, cantidad)

# Uso
inventario = Inventario()
ventas = SistemaVentas()
inventario.agregar_observador(ventas)
inventario.actualizar_stock("Martillo", 50)

Este código define distintas formas de calcular el precio de un producto mediante clases que representan estrategias. En lugar de usar condicionales, se elige una estrategia (por ejemplo, descuento) y se aplica al precio base. Esto permite cambiar fácilmente la forma de cálculo sin modificar el resto del sistema
```
---
##  Strategy

**Nombre del patrón:** Strategy  
**Intención:** Permitir elegir dinámicamente un algoritmo o comportamiento.  
**Problema que resuelve:** Diferentes formas de calcular precios (por ejemplo: precio normal, con descuento, mayorista).  
**Justificación de la elección:** Evita muchos `if/else` y permite cambiar la lógica sin modificar el código principal.  

**Ejemplo en el código:**
```python
from abc import ABC, abstractmethod

class EstrategiaPrecio(ABC):
    @abstractmethod
    def calcular(self, precio_base):
        pass

class PrecioNormal(EstrategiaPrecio):
    def calcular(self, precio_base):
        return precio_base

class PrecioDescuento(EstrategiaPrecio):
    def calcular(self, precio_base):
        return precio_base * 0.9

# Uso
estrategia = PrecioDescuento()
print(estrategia.calcular(100))
```
---
##  Factory  

**Nombre del patrón:** Factory  
**Intención:** Crear objetos sin especificar su clase concreta.  
**Problema que resuelve:** Crear distintos tipos de productos (por ejemplo: martillo, clavo, tornillo) sin acoplar el código.  
**Justificación de la elección:** Permite agregar nuevos productos fácilmente sin modificar el código existente.  

**Ejemplo en el código:**  
```python
class Producto:
    def descripcion(self):
        pass

class Martillo(Producto):
    def descripcion(self,):
        return "Martillo"

class Clavo(Producto):
    def descripcion(self):
        return "Clavo"

class ProductoFactory:
    @staticmethod
    def crear_producto(tipo):
        if tipo == "martillo":
            return Martillo()
        elif tipo == "clavo":
            return Clavo()
        else:
            return None

# Uso
producto = ProductoFactory.crear_producto("martillo")
print(producto.descripcion())
```

