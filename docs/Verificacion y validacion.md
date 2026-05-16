# Verificación y Validación — Sistema de Stock para Ferretería

Trabajo práctico sobre conceptos de Verificación y Validación (V&V) aplicados a un sistema de gestión de stock para una ferretería.

---

# 1. Verificación vs Validación

## Verificación

La verificación se enfoca en la parte técnica del software.
Consiste en comprobar que el sistema esté correctamente construido según los requisitos y que el código funcione sin errores.

Responde a la pregunta:

> “¿Estamos construyendo el producto correctamente?”

La verificación compara el software contra sus especificaciones técnicas y funcionales.

### Ejemplo aplicado al proyecto

Actualmente se realiza una prueba unitaria que verifica que el sistema genere correctamente una excepción (`ValueError`) cuando se intenta registrar un producto con stock negativo, asegurando que la lógica de validación cumpla con los requisitos definidos.

---

## Validación

La validación se enfoca en el usuario y en las necesidades reales del negocio.

Responde a la pregunta:

> “¿Estamos construyendo el producto correcto?”

Aunque el sistema funcione técnicamente bien, puede no adaptarse a la forma de trabajo real del usuario. En ese caso, el software pasa la verificación, pero falla la validación.

### Ejemplo aplicado al proyecto

Se planea validar con el Product Owner cuáles serán los motivos predefinidos y obligatorios para registrar salidas de stock, como ventas, roturas o mercadería vencida, para asegurar que el sistema se adapte al funcionamiento real de la ferretería.

---

# 2. Planificación de V&V para un Sprint

| Sprint  | Actividad de V&V                                                                                                                                  | Técnica           | Responsable | Herramienta                 |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ----------- | --------------------------- |
| Actual  | Implementar pruebas unitarias para verificar la generación automática de alertas cuando un producto quede por debajo del stock mínimo configurado | Pruebas unitarias | QA Lead     | `unittest` + GitHub Actions |
| Próximo | Validar los flujos críticos del sistema                                                                                                           | Pruebas de humo   | Dev Lead    | Criterios de aceptación     |

---

## Actividad de Verificación

### Peer Review obligatorio antes del Merge

### Objetivo

Garantizar calidad técnica del código.

### Implementación

Antes de integrar código a `main`:

* Otro desarrollador revisa el Pull Request.
* Se verifican:

  * estándares de código,
  * pruebas unitarias,
  * funcionamiento correcto.

---

## Actividad de Validación

### Smoke Testing basado en Historias de Usuario

### Objetivo

Comprobar que las funcionalidades realmente resuelvan el problema de la ferretería.

### Implementación

Al finalizar el sprint:

* Ejecutar pruebas funcionales.
* Validar flujos críticos del sistema.
* Comprobar que el comportamiento sea el esperado por el usuario.

---

# 3. Inspección de Código vs Prueba Automática

| Inspección de Código                   | Prueba Automática                |
| -------------------------------------- | -------------------------------- |
| Revisión manual del código             | Ejecución automática del sistema |
| Detecta problemas de diseño y lógica   | Detecta fallos funcionales       |
| No necesita ejecutar el programa       | Sí requiere ejecución            |
| Analiza legibilidad y buenas prácticas | Analiza resultados esperados     |

## ¿Cuándo usar cada una?

### Inspección de código

Conviene para detectar:

* Código poco mantenible.
* Errores conceptuales.
* Problemas de diseño.

### Aplicación al proyecto

El primer módulo a inspeccionar sería `App.tsx`, ubicado en `src/Interfaz Figma TP2/src/app/App.tsx`, ya que actúa como componente principal de la interfaz y centraliza la navegación, estructura general e integración entre componentes. Revisarlo primero permite detectar problemas de arquitectura, dependencias innecesarias o errores de organización que afecten al resto del sistema.

---

### Pruebas automáticas

Convienen para:

* Validar funcionalidades rápidamente.
* Detectar errores luego de cambios frecuentes.
* Automatizar regresiones.

Lo ideal es utilizar ambas de forma complementaria.

---

# 4. Análisis Estático Automatizado

## Herramienta utilizada

ESLint

ESLint permite analizar el código sin ejecutarlo y es especialmente útil en proyectos desarrollados con TypeScript y React.

### Primera regla aplicada

`no-unused-vars`

Esta regla detecta variables e imports no utilizados, ayudando a:

* eliminar código innecesario,
* mejorar la legibilidad,
* reducir código muerto,
* prevenir posibles errores lógicos.

### Otros errores que puede detectar

* Código duplicado.
* Variables sin uso.
* Métodos demasiado largos.
* Condiciones innecesarias.
* Posibles errores de sintaxis y estilo.

---

# 5. Métodos Formales de Verificación

Los métodos formales son imprescindibles en sistemas donde un error puede tener consecuencias graves.

## Invariante del sistema

### Invariante de la clase `StockManager`

Todo producto gestionado por la clase debe cumplir que:

* El nombre no puede estar vacío.
* El precio debe ser mayor a 0.
* El stock actual debe ser mayor o igual a 0.
* El stock mínimo debe ser mayor o igual a 0.

Esto se garantiza mediante el método `_validar_data()`, ejecutado antes de insertar o actualizar productos.

---

## ¿Cómo se probaría?

Se utilizaría una prueba unitaria que verifique que `_validar_data()` rechace datos inválidos.

Por ejemplo:

* Si un producto posee precio negativo,
* o stock negativo,

el sistema debe lanzar un `ValueError`, garantizando que el invariante de la clase se mantenga.

---

## Ejemplos de sistemas críticos

* Sistemas aeronáuticos.
* Equipamiento médico.
* Centrales nucleares.
* Sistemas ferroviarios.
* Software bancario.
* Criptografía.

## ¿Por qué son importantes?

Permiten demostrar matemáticamente que el sistema:

* es seguro,
* consistente,
* y libre de ciertos errores.

## ¿Por qué no se usan siempre?

Porque:

* Son costosos.
* Requieren mucho tiempo.
* Necesitan conocimientos matemáticos avanzados.
* Son difíciles de aplicar en sistemas muy grandes.

---

# 6. Product Owner en Scrum/XP

En una Sprint Review, el Product Owner cumple el rol de enlace entre el equipo y el cliente.

## Responsabilidades

* Validar funcionalidades terminadas.
* Comunicar la visión del producto.
* Gestionar feedback.
* Ajustar prioridades del Product Backlog.

## Relación con las pruebas

El Product Owner:

* Define criterios de aceptación.
* Valida que el producto cumpla necesidades reales.
* No interviene directamente en el código.
* Se enfoca en el “qué” y no en el “cómo”.

---

## Preguntas para la próxima Sprint Review

* ¿Considera que el sistema cubre todas las necesidades principales de gestión y control del stock en las distintas sucursales de la ferretería?
* ¿La plataforma resulta lo suficientemente clara e intuitiva como para facilitar el trabajo diario de los empleados y mejorar la organización del negocio?

---
