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

---

## Validación

La validación se enfoca en el usuario y en las necesidades reales del negocio.

Responde a la pregunta:

> “¿Estamos construyendo el producto correcto?”

Aunque el sistema funcione técnicamente bien, puede no adaptarse a la forma de trabajo real del usuario. En ese caso, el software pasa la verificación, pero falla la validación.

---

# 2. Planificación de V&V para un Sprint

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

### Pruebas automáticas

Convienen para:

* Validar funcionalidades rápidamente.
* Detectar errores luego de cambios frecuentes.
* Automatizar regresiones.

Lo ideal es utilizar ambas de forma complementaria.

---

# 4. Análisis Estático Automatizado

## Herramienta utilizada

PMD

PMD permite analizar el código sin ejecutarlo.

### Errores que puede detectar

* Variables no utilizadas.
* Código duplicado.
* Métodos demasiado largos.
* Condiciones innecesarias.
* Posibles errores en cálculos o validaciones.

---

# 5. Métodos Formales de Verificación

Los métodos formales son imprescindibles en sistemas donde un error puede tener consecuencias graves.

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


