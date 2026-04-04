# Patrones de Diseño – Sistema de Stock (Ferretería)

## 🔹 Strategy

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
