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
