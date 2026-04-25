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

## 2. Herramientas gratuitas elegidas (stack de automatización)

| Nivel de prueba | Herramienta | ¿Qué automatiza en este proyecto? | Justificación |
| :--- | :--- | :--- | :--- |
| Unitarias | [Jest / JUnit / pytest / …] | [Funciones de validación, lógica de negocio aislada] | [Breve razón: facilidad de configuración, soporte en el stack, etc.] |
| Integración | [Mockito / Sinon.js / WireMock / …] | [Simulación de llamadas a la API, mocks de base de datos] | [Por qué es adecuada para el proyecto] |
| Sistema / E2E | [Cypress / Playwright / Selenium] | [Flujo de login, navegación básica] | [Comparativa breve y motivo de la elección] |
| Estrés | [k6 / JMeter / Locust] | [Pruebas de carga sobre endpoints, en el futuro] | [Ventajas de la herramienta para el proyecto] |

---

## 3. Ejemplos de casos de prueba unitaria (clases de equivalencia y valores límite)

> **Funcionalidad elegida:** [Ej: validación de formulario de login, cálculo de stock mínimo]

### Clases de equivalencia identificadas
- **Válidas:** [Descripción]
- **Inválidas (por debajo/fuera de rango):** [Descripción]
- **Inválidas (por encima/fuera de rango):** [Descripción]

### Tres casos de prueba representativos
1. **Caso 1 (válido):** Entrada = [valor], Resultado esperado = [describir]
2. **Caso 2 (inválido – límite inferior):** Entrada = [valor justo fuera del límite], Resultado esperado = [error o comportamiento]
3. **Caso 3 (inválido – límite superior):** Entrada = [valor justo fuera del límite], Resultado esperado = [error o comportamiento]

*Nota: estos casos están implementados (o se implementarán) en `tests/unit/[archivo].test.*`*

---

## 4. Plan de mocks / stubs para pruebas de integración

- **Dependencias externas a simular:**
  1. [Base de datos / API de autenticación]
  2. [Servicio de correo / pasarela de pago / etc.]
- **Estrategia de dobles:**
  - Usaremos [herramienta] para crear [mocks / stubs / fakes] que devuelvan respuestas predefinidas.
  - Ejemplo de prueba de integración:
    - *Flujo:* Login → mock de base de datos devuelve usuario válido → se genera token → se verifica que el frontend redirige al dashboard.
    - *Pseudocódigo (o descripción):* `mockDatabase.findUser('test@example.com')` devuelve `{ id: 1, name: 'Test' }`. La prueba verifica que el componente muestra el nombre del usuario.
- **Ubicación en el repo:** `tests/integration/` y `tests/mocks/` (si aplica).

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

