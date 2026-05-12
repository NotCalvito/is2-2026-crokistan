## B0. Investigación previa

Clase de equivalencia

Una clase de equivalencia se trata de un conjunto de entrada de datos cuyos valores son equivalentes, es decir que el sistema se comportará de la misma forma para todos los datos de 
un mismo grupo. Estas clases de equivalencia pueden ser de dos tipos
* Válidas: valores que el sistema procesará correctamente 
* Inválidas: valores fuera de los límites esperados 

Para diseñar los casos de prueba utilizando clases de equivalencia se debe:
1. Identificar las variables de entrada,
2. Dividir cada variable en clases válidas o inválidas teniendo como criterio rangos numéricos, valores específicos, condiciones, etc.
3. Seleccionar un valor de cada clase para que las represente y luego hacer las pruebas con los valores elegidos. De este modo se reduce el volumen de pruebas y se cumplen todos los
4. escenarios posibles, ya que si se cumple para un valor de una clase también se va a cumplir para el resto de la misma.

Valor límite

Un valor límite es un dato que se encuentra en los extremos de una clase de equivalencia. El análisis de valores límite es una técnica de prueba que busca validar cómo responderá
el sistema cuando se ingresan los valores límite de un rango permitido y valores cercanos. El análisis del valor límite se fija en:
1. Valor mínimo
2. Valor por debajo del mínimo
3. Valor máximo
4. Valor por encima del máximo

Ejemplo de Clase de Equivalencia

Para el registro de nombre de un producto, el sistema requiere que el nombre no sea una cadena vacía.
* Clase Válida: Cualquier cadena con texto (ej. "Martillo de acero").
* Clase Inválida: Cadenas que solo contienen espacios o están vacías (ej. " ").
Entonces, al probar con " ", estamos representando a todas las posibles entradas de texto vacío, asegurando que el sistema las rechace globalmente.

Ejemplo de Valor Límite

Para la validación del precio de un producto, este debe ser un valor positivo mayor a cero. En este caso, el valor crítico de frontera es 0. Entonces:
1. Se testea con 0.01 (Valor mínimo válido: el sistema debe aceptarlo).
2. Se testea con 0.00 (Valor límite inválido: el sistema debe lanzar un ValueError).
3. Se testea con -0.01 (Valor por debajo del mínimo: el sistema debe rechazarlo).



## B1. Pruebas unitarias con TDD
Clase bajo prueba: StockManager (se encuentra en el archivo stock.py)

Herramienta: Framework unittest de Python

Definición de Clases de Equivalencia y Límites

Variable: Precio (price)
* Clase Válida: Números reales positivos (> 0).
* Clase Inválida: Números reales negativos (< 0) y el valor cero (0).
* Valor Límite Crítico: 0 (Frontera de rechazo).

Variable: Stock Actual (currentStock)
* Clase Válida: Números enteros no negativos ( 0).
* Clase Inválida: Números enteros negativos (< 0).
* Valor Límite Crítico: 0 (Mínimo valor aceptado).

Variable: Nombre del Producto (name)

* Clase Válida: Cadenas de texto con caracteres alfanuméricos.
* Clase Inválida: Cadenas vacías o compuestas únicamente por espacios en blanco.

Casos de prueba propuestos:
<img width="712" height="516" alt="image" src="https://github.com/user-attachments/assets/168ed35d-8b59-465f-afe1-3a79558426b6" />


## B2. Framework de pruebas y automatización CI/CD

Framework: Para el desarrollo de las pruebas unitarias se seleccionó el framework unittest. Esta decisión se fundamenta en su pertenencia 
a la biblioteca estándar de Python, lo que elimina la necesidad de gestionar dependencias externas y mitiga riesgos de compatibilidad en el 
entorno de ejecución. Asimismo, su arquitectura inspirada en JUnit permite un diseño de pruebas estrictamente orientado a objetos, por lo que 
al trabajar con clases nos garantiza una estructura coherente con el resto del sistema desarrollado.

Captura de pantalla del workflow:
<img width="557" height="290" alt="image" src="https://github.com/user-attachments/assets/33c63704-2613-4f9b-b895-7bf1c2578ede" />

<img width="488" height="146" alt="image" src="https://github.com/user-attachments/assets/d7ff7c6a-13fd-449f-aa0a-a612ca9ead15" />


Video de YouTube: https://youtu.be/Z_dBRNbsiUw 


## B3. Diseño conceptual de pruebas de integración (no implementar)
1. Identificación de Dependencias Externas

Para que nuestro Sistema de Gestión de Inventario funcione en un entorno real, interactúa con:

* Base de Datos (MySQL): El sistema depende de un servidor externo para persistir los datos de los productos, sucursales y movimientos de stock.
* API de Proveedores (Servicio REST externo): Una dependencia futura para consultar precios en tiempo real o realizar pedidos automáticos de reposición a proveedores externos.

2. Estrategia de Mocking / Stubbing

Para probar la lógica del sistema sin depender de que el servidor de base de datos esté online o que la API del proveedor nos cobre por cada
consulta, usaríamos objetos simulados:

* Para la Base de Datos: Se utilizaría un Mock del objeto de conexión. En lugar de ejecutar un SELECT real, el Mock intercepta la llamada y
devuelve una lista de tuplas predefinida (ej. [(1, 'Pincel', 10)]). Esto permite testear si el sistema procesa bien los datos que vienen "de afuera".
* Para la API de Proveedores: Se utilizaría un Stub que simule la respuesta JSON del servidor externo. Esto evita latencias de red y fallos por falta de conectividad durante los tests.

3. Ejemplo de Flujo de Prueba de Integración

* Escenario: Actualización de precio sugerido desde un proveedor externo.
* Inicio: El sistema solicita el precio actualizado del "Pincel" a la API del proveedor.
* Mocking: El objeto simulado de la API intercepta la petición y devuelve un código 200 OK con un JSON: {"precio": 950.00}.
* Procesamiento: La lógica de negocio recibe el dato, aplica el margen de ganancia de la ferretería y calcula el nuevo precio de venta.
* Persistencia (Mock): El sistema intenta guardar el cambio. El Mock de la base de datos confirma que recibió la instrucción UPDATE correctamente.
* Verificación: El test valida que el precio final calculado se envió a la "base de datos" simulada con el valor esperado.

4. Herramienta Recomendada: unittest.mock

Es la opción más coherente dado que ya estamos utilizando el framework unittest para las pruebas unitarias. Su decorador @patch es sumamente potente 
para interceptar llamadas a librerías de conexión (como mysql-connector o requests) y sustituirlas por dobles de prueba sin alterar el código fuente 
original. Al ser una herramienta nativa, mantenemos el proyecto libre de dependencias externas adicionales.
