1. Verificación: Se enfoca en la parte técnica. Consiste en comprobar que el software hace exactamente lo que dice el documento de requisitos y que el código funciona sin errores (bugs). Es comparar el software contra sus propias especificaciones.
Validación: Se enfoca en el usuario y el negocio. Consiste en comprobar que el software realmente le sirve a la ferretería para resolver su problema. No importa si el código es perfecto; si no ayuda al encargado a saber qué pedir y cuándo, falló la validación.
Para el ejemplo de verificación, utilizaremos la funcionalidad de "Alertar cuando un producto cae por debajo del stock mínimo configurado". Para verificar esto, haríamos pruebas técnicas:
Configuramos el stock mínimo del producto "Martillo" en 10 unidades.
Registramos una salida de stock que deja la cantidad actual en 9.
Así, el sistema dispara la alerta internamente o en la interfaz sin arrojar ningún error de código, demostrando que la lógica matemática (si stock_actual < stock_minimo entonces alertar()) funciona a la perfección.
Por otro lado, para el ejemplo de validación, pongamos el caso en el que le mostramos el sistema terminado al encargado de compras de la ferretería para que lo use en su día a día.
El sistema funciona técnicamente perfecto (pasó la verificación), pero el encargado de compras les dice: "El sistema me tira un pop-up por cada clavo y tornillo que baja del stock mínimo mientras los empleados están vendiendo en el mostrador. Es molesto y termino cerrando las alertas sin leerlas. Necesito simplemente que me arme un reporte resumido a las 8:00 AM para hacer los pedidos".
Así diríamos que el sistema falló la validación. Aunque estaba bien programado, no se adaptaba a la forma de trabajar del usuario real. Para validarlo, deben ajustar la forma en que se presenta esa alerta para que realmente le aporte valor al negocio.

2. Actividad de Verificación: Peer Review (Revisión por Pares) obligatoria antes del Merge
Enfoque: ¿Estamos construyendo el producto correctamente? (Calidad del código y cumplimiento de requerimientos técnicos).
En qué consiste: Se establece como política del sprint que ningún código se integra a la rama principal (main) sin pasar por una revisión cruzada mediante un Pull Request (PR).
Ejecución concreta en la semana: Cuando un desarrollador termina una funcionalidad (por ejemplo, el módulo de alertas de stock mínimo), otro miembro del equipo (ej. el QA Lead o DevLead) revisa el código para verificar:
Que cumpla con los estándares de diseño del proyecto.
Que incluya sus respectivas pruebas unitarias con unittest.
Que los tests corran y pasen en verde localmente antes de aprobar el ingreso del código.
Actividad de Validación: Pruebas de Humo (Smoke Testing) basadas en Historias de Usuario
Enfoque: ¿Estamos construyendo el producto correcto? (Satisfacción de las necesidades del cliente/usuario final).
En qué consiste: Al final del sprint, se realiza una sesión de pruebas funcionales de caja negra sobre el software desplegado o ejecutable para validar que las funcionalidades entregadas realmente resuelvan el problema de la ferretería.
Ejecución concreta en la semana: El último día del sprint, se toma el criterio de aceptación de las Historias de Usuario desarrolladas en esa semana y se ejecuta un flujo crítico de punta a punta. Por ejemplo: "Ingresar un producto con stock menor al mínimo y validar que el sistema dispare la alerta visual esperada por el usuario". Si el sistema hace lo que el negocio necesita, la funcionalidad queda validada.


3. La diferencia principal es que una inspección de código consiste en una revisión manual realizada por desarrolladores para analizar la estructura, lógica, legibilidad y buenas prácticas del código, sin necesidad de ejecutarlo. En cambio, una prueba automática ejecuta el programa o una parte de él para comprobar que funcione correctamente y produzca los resultados esperados.
Conviene más una inspección de código cuando se busca detectar problemas de diseño, código poco mantenible o errores conceptuales que no siempre aparecen al ejecutar el programa. Por otro lado, una prueba automática conviene cuando se necesita verificar rápidamente el funcionamiento del sistema, especialmente después de realizar cambios frecuentes. Lo ideal es utilizar ambas de forma complementaria.

4. Una herramienta de análisis estático automatizado que podría utilizarse en un sistema de stock de ferretería es PMD.
PMD analiza el código sin necesidad de ejecutarlo y puede detectar errores como:
Variables declaradas pero nunca utilizadas.
Código duplicado.
Condiciones lógicas innecesarias.
Métodos demasiado largos o complejos.
Posibles errores en validaciones de stock o cálculos.

5. Los métodos formales de verificación son imprescindibles en sistemas donde un error puede generar consecuencias graves, irreversibles o muy costosas. Se utilizan especialmente en:
Sistemas aeronáuticos y espaciales
Centrales nucleares
Equipamiento médico
Sistemas ferroviarios y automotrices críticos
Criptografía y protocolos de seguridad
Software bancario o militar
En estos casos, no alcanza con “probar” el sistema mediante tests tradicionales, porque un fallo mínimo podría provocar accidentes, pérdidas económicas o riesgos para la vida humana. Los métodos formales permiten demostrar matemáticamente que un sistema cumple ciertas propiedades, como seguridad, consistencia o ausencia de errores lógicos.

6. En la Sprint Review, el Product Owner funciona como facilitador principal y enlace entre el equipo de desarrollo y los interesados. Sus responsabilidades incluyen:
Liderar la sesión y comunicar la visión: El PO debe iniciar explicando la hoja de ruta del producto (Roadmap), situando a la audiencia en el contexto del progreso general.
Validar el Incremento: Es responsable de declarar qué elementos del Product Backlog se consideran hechos y cuáles no.
Demostrar valor: Presente o supervisa demostraciones de las historias de usuario completadas para mostrar el valor real entregado a los clientes y accionistas.
Gestionar el feedback y el Backlog: Recopila comentarios de los interesados para ajustar y modificar las prioridades del Product Backlog, asegurando que los próximos pasos maximicen el valor del producto.
En cuanto a su relación con las pruebas, el PO se encarga de:
Los criterios de aceptación: El PO es responsable de actualizar y definir los criterios de aceptación de las historias de usuario, lo cual sirve de base para las pruebas de validación.
Evitar la microgestión técnica: Se advierte que el PO no debe realizar revisiones de código ni intervenir en la solución técnica detallada. Hacerlo puede socavar la confianza y la capacidad de autogestión de los desarrolladores.
Enfocarse en el "qué", no en el "cómo": Mientras el equipo de desarrollo decide cómo implementar y probar técnicamente el trabajo, el PO se asegura de que el resultado final cumpla con los objetivos de negocio y las necesidades del interesado.
