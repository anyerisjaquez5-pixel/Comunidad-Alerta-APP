# Integración NFC, BLE y perfil local — Comunidad Alerta

## Objetivo académico

Implementar la fila proporcionada de la tarea: **Bluetooth/NFC + Perfil**, unidades **U5 y U9**, compartir notas por **NFC/BLE** y conservar un perfil de usuario con almacenamiento local

El alcance de esta entrega es Android, plataforma nativa presente en el repositorio. El navegador permite utilizar perfil y notas locales, pero no ejecuta el intercambio nativo. No se añade una plataforma iOS ni se afirma compatibilidad móvil no comprobada

## Estado previo

- Aplicación Ionic 9, Angular 22 y Capacitor 8, rama principal `master`
- Inicio consultaba conectividad, guardaba un dato offline y escaneaba BLE
- Noticias usaba JSONPlaceholder, una API de demostración, y caché local
- Reportes contenía una pantalla informativa
- No existían perfil local, notas comunitarias ni NFC
- `sqlite.service.ts` estaba vacío: no había una implementación SQLite

## Caso de uso

La junta de vecinos crea una nota “Reunión de vecinos” con el contenido “Sábado a las 5 en el salón”. Escribe el aviso en una etiqueta NFC situada en el salón o en un llavero reutilizable. Otro vecino lo lee desde la app, revisa la nota y decide guardarla

Por BLE, un teléfono publica una nota temporalmente y el segundo busca el servicio de Comunidad Alerta, se conecta y lee el contenido. Ambos conservan las notas recibidas de forma local y pueden consultarlas sin internet

## Relación entre requisitos y código

| Requisito | Implementación |
|---|---|
| Perfil local | Nombre, sector y descripción, persistidos en `localStorage` |
| Notas | Título, contenido, autor declarado, fecha e identificador |
| Escritura NFC | Registro NDEF de texto UTF-8 con JSON de la nota |
| Lectura NFC | Valida formato y muestra la nota antes de guardarla |
| BLE | Servidor GATT local Android y cliente del complemento existente |
| Navegación | Nueva pestaña Comunidad, conserva Inicio, Noticias y Reportes |
| Documentación | Este informe, instrucciones y matriz de pruebas |

## Archivos y responsabilidades

| Archivo | Responsabilidad |
|---|---|
| `src/app/community/community.page.ts` | Coordina perfil, notas y operaciones de intercambio |
| `src/app/community/community.page.html` | Formularios, lista local, acciones y mensajes |
| `src/app/community/community.module.ts` | Módulo con carga diferida |
| `src/app/services/community.service.ts` | Persistencia, validación y prevención de duplicados |
| `src/app/services/nfc.service.ts` | Registro NDEF, capacidad, sesión y limpieza NFC |
| `src/app/services/community-ble.service.ts` | Publicación, búsqueda y lectura BLE |
| `android/app/src/main/java/io/ionic/starter/CommunityBlePlugin.java` | Publica un servicio GATT Android de solo lectura |
| `android/app/src/main/java/io/ionic/starter/MainActivity.java` | Registra el complemento BLE local |
| `android/app/src/main/AndroidManifest.xml` | Permisos NFC y BLE y hardware opcional |
| `src/app/tabs/` | Añade la ruta y la pestaña Comunidad |
| `src/app/home/home.page.ts` | Detiene el escaneo existente al salir de Inicio para evitar conflictos |
| `src/app/services/community.service.spec.ts` | Pruebas de persistencia, validación y formato NDEF |
| `.github/workflows/integracion-nfc.yml` | Validación web, pruebas nuevas y compilación Android en GitHub |

`package.json` y su lock añaden `@capgo/capacitor-nfc` **8.2.10**, compatible con Capacitor 8. Los archivos de configuración Gradle se actualizan mediante `npx cap sync android`

## Almacenamiento local

- Perfil: clave `comunidad_alerta_perfil_v1`
- Notas: clave `comunidad_alerta_notas_v1`
- Se conservan las claves anteriores de noticias y el dato offline
- Guardar una nota duplicada no reemplaza la copia original
- Si el almacenamiento está corrupto, se informa el problema en vez de sobrescribir los datos silenciosamente
- Los datos pertenecen al dispositivo y pueden perderse al borrar los datos de la app o desinstalarla
- El perfil no constituye autenticación y el nombre del autor no está verificado

## NFC

1. Se comprueba que la app está en Android y que NFC está activo
2. Se instala el listener antes de iniciar el escaneo
3. El usuario acerca una etiqueta NDEF compatible
4. Para escribir, se comprueba que sea escribible y que el registro quepa en la capacidad informada
5. La escritura reemplaza el contenido anterior, como indica la interfaz
6. Para leer, se valida el registro UTF-8 y la estructura de la nota
7. El usuario revisa la nota y elige guardar o descartar
8. La sesión finaliza al completar, cancelar, fallar o agotar 30 segundos

No se bloquean las etiquetas permanentemente. Una etiqueta puede reutilizarse. El tamaño disponible depende de la etiqueta y del texto UTF-8; los acentos y emojis ocupan más bytes. Reducir el aviso si no cabe

No se utiliza Android Beam ni se promete transferencia NFC directa entre teléfonos. La demostración NFC utiliza una etiqueta o llavero como medio

## Bluetooth Low Energy

El complemento `@capacitor-community/bluetooth-le` existente actúa como central, no como periférico. Por eso se añade un complemento local Android que publica una nota como característica GATT de solo lectura

- UUID del servicio: `6d491400-69ac-4a20-8dca-3982152dd301`
- UUID de la característica: `6d491401-69ac-4a20-8dca-3982152dd301`
- Formato: JSON UTF-8 idéntico a la nota NFC
- Límite: 512 bytes para el JSON completo, según el límite del atributo GATT
- Publicación: hasta 60 segundos, con botón para detener
- Búsqueda: 8 segundos y filtro por el UUID del servicio
- Conexión y lectura: tiempo de espera de 10 segundos cada una
- Lecturas parciales: el servidor responde desde el offset solicitado
- Se desconecta después de leer o fallar
- El servidor y el anuncio se cierran al salir de la sección, pasar la app al fondo o destruir el complemento

Se necesitan dos teléfonos Android. El emisor debe soportar anuncios BLE. Mantener la app en primer plano en ambos. En Android 12 o superior se solicitan los permisos de dispositivos cercanos; en versiones anteriores el escaneo puede requerir ubicación y su servicio activo

El intercambio no usa internet ni un servidor remoto. La nota publicada no está cifrada por esta app y puede leerla un cliente BLE compatible mientras esté publicada; usar avisos públicos sin información privada

## Instalación y ejecución

Requisitos: Node compatible con Angular 22 —se verificó con Node 24—, Android Studio, JDK 21 y SDK Android 36

```bash
git fetch origin
git switch integracion-nfc
npm ci
npm run build
npx cap sync android
npx cap open android
```

Ejecutar desde Android Studio en un teléfono conectado por USB. Para generar APK de depuración:

```bash
cd android
./gradlew assembleDebug
```

En Windows utilizar `gradlew.bat assembleDebug`. APK esperado: `android/app/build/outputs/apk/debug/app-debug.apk`

## Guion para la evidencia

1. Abrir Comunidad y guardar el perfil “Ana”, sector “Centro”
2. Crear “Reunión de vecinos” con un aviso corto
3. Cerrar y abrir la app y mostrar que perfil y nota permanecen
4. Activar modo avión y verificar la consulta local
5. Pulsar Escribir NFC y acercar un llavero compatible
6. En el segundo teléfono pulsar Leer etiqueta NFC
7. Mostrar la nota, guardarla y consultar Mis notas
8. Volver al emisor, pulsar Compartir BLE y mantenerlo abierto
9. Desde el segundo teléfono pulsar Buscar notas BLE y Leer nota
10. Guardar la recibida o mostrar la prevención de duplicados si es la misma nota
11. Probar NFC desactivado, etiqueta pequeña o bloqueada y permisos BLE rechazados
12. Capturar también Inicio, Noticias y Reportes como comprobación de regresión

## Resultados de verificación en el entorno de desarrollo

| Verificación | Resultado |
|---|---|
| Compilación web de producción | Correcta |
| Sincronización Capacitor Android | Correcta, detecta el complemento NFC |
| Pruebas nuevas de datos y NDEF | 7 correctas |
| Suite original | 4 correctas y 2 fallidas por falta de `ActivatedRoute` en las pruebas |
| Comparación con `master` a092d79 | Reproduce exactamente los mismos 2 fallos originales |
| Lint de los archivos nuevos | Correcto tras adaptar inyección y control de flujo a Angular 22 |
| Compilación APK local | Pendiente: este entorno dispone de JDK 17 y no de SDK Android |
| Escritura y lectura NFC física | Pendiente de teléfonos y etiqueta |
| Intercambio BLE físico | Pendiente de dos teléfonos Android compatibles |
| Regresión visual en dispositivo | Pendiente de ejecución manual |

La compilación muestra advertencias anteriores sobre Browserslist y el presupuesto de estilos de Noticias. No se han cambiado esos estilos ni la configuración de navegadores

El workflow del PR prepara JDK 21 y SDK 36, compila Android y publica el APK de depuración como artefacto si termina correctamente. Su resultado debe consultarse en GitHub; no sustituye las pruebas físicas

## Matriz de pruebas manuales

| Caso | Resultado esperado | Estado |
|---|---|---|
| Perfil válido y reinicio | Conserva nombre, sector y descripción | Pendiente |
| Nombre vacío | Informa validación | Pendiente |
| Nota sin perfil | Solicita guardar perfil | Pendiente |
| Lectura local offline | Conserva y muestra notas | Pendiente |
| Etiqueta válida y escribible | Escribe y otro dispositivo lee la misma nota | Pendiente |
| Etiqueta pequeña o bloqueada | Informa error sin afirmar éxito | Pendiente |
| Etiqueta externa | Rechaza contenido ajeno o inválido | Pendiente |
| Cancelación o 30 segundos | Finaliza la sesión NFC | Pendiente |
| BLE entre dos teléfonos | Descubre y lee la nota publicada | Pendiente |
| JSON de más de 512 bytes | Pide reducir la nota antes de publicar BLE | Pendiente |
| BLE apagado o permiso rechazado | Informa el problema | Pendiente |
| Nota recibida duplicada | No duplica ni reemplaza la primera copia | Pendiente |
| Salir o llevar al fondo | Detiene las operaciones y anuncios | Pendiente |
| Inicio, Noticias y Reportes | Conservan las funciones previas | Pendiente |

Registrar modelo, versión Android, fecha, pasos, resultado real y captura para cada prueba. No presentar estos casos como aprobados hasta ejecutarlos

## Referencias técnicas

- NFC: https://github.com/Cap-go/capacitor-nfc
- Cliente BLE y limitación de rol: https://github.com/capacitor-community/bluetooth-le
- Complementos locales: https://capacitorjs.com/docs/android/custom-code
- Servidor GATT Android: https://developer.android.com/reference/android/bluetooth/BluetoothGattServer
