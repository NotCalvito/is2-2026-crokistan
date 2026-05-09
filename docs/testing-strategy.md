---

## 1. Tipos de pruebas seleccionadas
| Tipo de prueba | ¿Aplica en este proyecto? | Justificación |
| :--- | :---: | :--- |
| Unitarias | ✅ | [Ej: verificar lógica de validación de campos, cálculos de stock, etc.] |
| Integración | ✅ | [Ej: comunicación entre frontend y API mockeada, módulo de login con base de datos simulada] |
| Componentes | ✅ (futuro) | [Ej: probar el módulo de gestión de usuarios de forma aislada cuando esté completo] |
| Sistema (E2E) | ✅ | [Ej: flujo completo de login exitoso, camino feliz básico] |
| Regresión | ✅ | [Se automatizará con CI/CD desde la primera fase] |
| Estrés | 🔜 Planificado | [Se implementará a partir de la fase 2, cuando haya más endpoints] |

---

---

## 2. Herramientas gratuitas elegidas (stack de automatización)

| Nivel de prueba | Herramienta | ¿Qué automatiza en este proyecto? | Justificación |
| :--- | :--- | :--- | :--- |
| Unitarias | `unittest` | Validación de datos, reglas de negocio y control de stock en funciones aisladas del backend. | Es una herramienta nativa de Python, simple de integrar y suficiente para las necesidades actuales del proyecto. |
| Integración | `unittest.mock` | Simulación de conexiones a base de datos y futuras APIs externas. | Permite reemplazar dependencias externas por objetos simulados sin modificar el código original. |
| Sistema / E2E | `Playwright` (planificado) | Navegación entre pantallas, interacción con formularios y flujos completos del sistema. | Ofrece automatización moderna para aplicaciones web, soporte multiplataforma y buena integración con aplicaciones React. |
| Estrés | `Locust` (planificado) | Simulación de múltiples usuarios realizando operaciones simultáneas sobre el sistema. | Permite modelar escenarios de carga utilizando Python y resulta liviano para proyectos académicos. |

---

## 3. Ejemplos de casos de prueba unitaria (clases de equivalencia y valores límite)

> **Funcionalidad elegida:** validación de datos de productos y stock.

### Clases de equivalencia identificadas

- **Válidas:**  
  Productos con nombre no vacío, precio mayor a 0, stock actual mayor o igual a 0 y stock mínimo válido.

- **Inválidas (por debajo/fuera de rango):**  
  Precio igual o menor a 0, stock negativo y stock mínimo negativo.

- **Inválidas (formato incorrecto):**  
  Nombre vacío o compuesto únicamente por espacios.

---

### Tres casos de prueba representativos

1. **Caso 1 (válido):**  
   Entrada = producto `"Pincel"` con precio `850`, stock `20` y stock mínimo `5`.  
   Resultado esperado = los datos son aceptados sin lanzar excepciones.

2. **Caso 2 (inválido – límite inferior):**  
   Entrada = precio `0`.  
   Resultado esperado = se lanza una excepción `ValueError` indicando que el precio es inválido.

3. **Caso 3 (inválido – valor fuera de rango):**  
   Entrada = stock actual `-1`.  
   Resultado esperado = se lanza una excepción `ValueError` indicando que el stock no puede ser negativo.

> Nota: estos casos se encuentran implementados en `tests/unit/test_stock.py`.

---

## 4. Plan de mocks / stubs para pruebas de integración

### Dependencias externas a simular

1. Base de datos MySQL.
2. API externa de proveedores.


### Estrategia de dobles

- Se utilizará `unittest.mock` para crear mocks y stubs que simulen respuestas de componentes externos.
- Los mocks permitirán reemplazar temporalmente conexiones reales a la base de datos o respuestas HTTP durante la ejecución de las pruebas.


**Ejemplo de prueba de integración:**

**Escenario:** actualización automática del precio de un producto a partir de información obtenida desde un proveedor externo.

**Flujo:**
1. El sistema solicita el precio actualizado del producto a una API externa.
2. El mock de la API devuelve una respuesta simulada con un nuevo precio.
3. La lógica de negocio procesa el valor recibido y calcula el precio final.
4. El sistema intenta actualizar el valor en la base de datos.
5. El mock de la base de datos verifica que la operación `UPDATE` fue ejecutada correctamente.

**Ejemplo conceptual:**

```python
mock_api.obtener_precio("Martillo") -> {"precio": 950}
```

La prueba valida que el sistema procese correctamente el nuevo valor y genere la actualización esperada.


### Ubicación en el repositorio

```text
tests/unit/
tests/integration/
tests/mocks/
```

Estas carpetas contendrán respectivamente:
- pruebas unitarias,
- pruebas de integración,
- objetos simulados reutilizables para testing.

---

## 5. Pruebas de sistema (E2E) – flujo básico actual

**Flujo: “Login exitoso”**
1. Abrir la URL de la aplicación.
2. Localizar el campo de email e ingresar `[usuario de prueba]`.
3. Localizar el campo de contraseña e ingresar `[contraseña]`.
4. Hacer clic en “Iniciar sesión”.
5. **Validar** que la URL cambia a `/dashboard` y que aparece el mensaje de bienvenida.

*Script E2E implementado en: `tests/e2e/login.spec.*`*

**Futuros flujos** (a medida que avance el desarrollo):
- [Reserva de espacio – coworking]
- [Alta de producto – ferretería]
- [Asignación de turno – turnos médicos]

---

## 6. Estrategia de regresión automatizada (CI/CD)

- **Herramienta de CI/CD:** GitHub Actions (gratuito en repositorios públicos)
- **Workflow:** `.github/workflows/test.yml`
- **Activación:** Se ejecuta en cada `push` y `pull request` hacia la rama principal.
- **Qué pruebas ejecuta actualmente:**
  - Pruebas unitarias (`npm run test:unit` o equivalente)
  - Pruebas de integración (`npm run test:integration`)
  - *(Opcional)* Pruebas E2E básicas solo si no son muy pesadas.
- **Reporting:** Los resultados se muestran en la pestaña Actions de GitHub.

A medida que el proyecto crezca, se irán agregando las pruebas E2E completas y las de estrés al pipeline.

---

## 7. Pruebas de estrés – planificación futura

- **Herramienta elegida:** [k6 / JMeter / Locust]
- **Escenario de carga extrema propuesto:** [Ej: 1000 solicitudes de reserva en el primer minuto, 500 consultas de stock simultáneas, etc.]
- **Estado actual:** Tenemos un script plantilla comentado en `tests/stress/plan-base.*` que servirá como molde.
- **Hito de implementación:** Fase 2 (mes 3), cuando el backend tenga al menos dos módulos completos y endpoints estables.

---

