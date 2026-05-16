# Mini Plan de Verificación y Validación (V&V)

## Integrantes del Proyecto

Sistema de gestión de stock para ferretería.

---

# SECCIÓN 1: Verificación vs Validación

## 1. Verificación

Actualmente realizamos una verificación mediante una prueba unitaria que comprueba que el sistema genere correctamente una excepción (`ValueError`) cuando se intenta registrar un producto con stock negativo, asegurando así que la lógica de validación funcione según los requisitos definidos.

## 2. Validación

Validaríamos con el Product Owner cuáles serán los motivos predefinidos y obligatorios para registrar las salidas de stock (por ejemplo: venta, rotura o mercadería vencida) para facilitar el registro de las mismas.

---

# SECCIÓN 2: Planificación de V&V

## Próximos 2 sprints (cada sprint = 1 semana)

| Sprint  | Actividad de V&V                                                                                                                                  | Técnica           | Responsable | Herramienta               |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ----------- | ------------------------- |
| Actual  | Implementar pruebas unitarias para verificar la generación automática de alertas cuando un producto quede por debajo del stock mínimo configurado | Pruebas unitarias | QA Lead     | unittest + GitHub Actions |
| Próximo | Validar los flujos críticos del sistema                                                                                                           | Pruebas de humo   | Dev Lead    | Criterios de aceptación   |

---

# SECCIÓN 3: Inspección y análisis estático

## a) ¿Qué archivo o módulo inspeccionarían primero? ¿Por qué?

El primer módulo que inspeccionaríamos sería `App.tsx`, ubicado en `src/Interfaz Figma TP2/src/app/App.tsx`, porque funciona como componente principal de la interfaz y probablemente centraliza la navegación, la estructura general y la integración entre componentes. Revisarlo primero permite detectar problemas de arquitectura, dependencias innecesarias o errores de organización que afectan a todo el proyecto.

## b) Herramienta de análisis estático

Una herramienta de análisis estático adecuada sería ESLint, ya que el proyecto utiliza TypeScript y React.

La primera regla que aplicaríamos sería `no-unused-vars`, porque ayuda a detectar variables o imports no utilizados, mejorando la legibilidad del código, eliminando código innecesario y evitando posibles errores lógicos dentro de los componentes.

---

# SECCIÓN 4: Método formal conceptual

## a) Invariante de una clase importante

### Invariante de la clase `StockManager`

Todo producto gestionado por la clase debe cumplir que:

* El nombre no puede estar vacío.
* El precio debe ser mayor a 0.
* El stock actual debe ser mayor o igual a 0.
* El stock mínimo debe ser mayor o igual a 0.

Esto se garantiza mediante el método `_validar_data()`, que se ejecuta antes de insertar o actualizar un producto.

## b) ¿Cómo lo probarían?

La prueba unitaria verifica que el método `_validar_data()` rechace datos inválidos.

Por ejemplo:

* Si se intenta ingresar un producto con precio negativo.
* O un producto con stock negativo.

El sistema debe lanzar una excepción `ValueError`, garantizando así que el invariante de la clase se mantenga correctamente.

---

# SECCIÓN 5: Reunión de validación (simulación)

## Preguntas para el Product Owner en la Sprint Review

1. ¿Considera que el sistema cubre todas las necesidades principales de gestión y control del stock en las distintas sucursales de la ferretería?

2. ¿La plataforma resulta lo suficientemente clara e intuitiva como para facilitar el trabajo diario de los empleados y mejorar la organización del negocio?



---
