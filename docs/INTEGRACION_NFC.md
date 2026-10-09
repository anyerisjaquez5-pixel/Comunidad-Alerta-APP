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

1. ```yaml
name: Validar integración NFC

on:
  pull_request:
    branches: [master]
  workflow_dispatch:

permissions:
  contents: read

jobs:
  android:
    runs-on: ubuntu-latest

    steps:
      - name: Descargar repositorio
        uses: actions/checkout@v4

      - name: Configurar Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm

      - name: Configurar Java
        uses: actions/setup-java@v5
        with:
          distribution: temurin
          java-version: 21

      - name: Configurar Android SDK
        uses: android-actions/setup-android@v3

      - name: Instalar SDK de Android
        run: sdkmanager "platforms;android-36" "build-tools;36.0.0"

      - name: Instalar dependencias
        run: npm ci

      - name: Compilar aplicación web
        run: npm run build

      - name: Sincronizar Capacitor
        run: npx cap sync android

      - name: Compilar APK
        run: bash gradlew assembleDebug --no-daemon
        working-directory: android

      - name: Guardar APK
        uses: actions/upload-artifact@v4
        with:
          name: comunidad-alerta-debug
          path: android/app/build/outputs/apk/debug/app-debug.apk
```
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

## Resultados históricos de la primera integración

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

## Revisión del 6 de octubre de 2026

Esta sección registra la revisión actual de `integracion-nfc` y reemplaza los resultados históricos para esta versión. Se comprobaron rama, remoto y estado local antes de editar. No se encontró `AGENTS.md` en el repositorio ni en sus directorios ascendentes. Se conservó la copia `Comunidad_Alerta_Integracion_NFC/` fuera del commit. Los dos archivos Gradle que aparecían modificados inicialmente no tenían diferencias de contenido y no se incluyeron en el commit.

### Cambios

- Inicio muestra primero la tarjeta **Notas comunitarias**, con explicación sobre crear y compartir por etiquetas NFC o Bluetooth y botón **Abrir Comunidad** a `/tabs/comunidad`
- Conserva la pestaña Comunidad y las tarjetas de conexión y Bluetooth, sus botones, estados y lista de dispositivos
- El template de Inicio usa `@if` y `@for`, exigidos por el lint actual, con identificación de dispositivos por `deviceId`
- NFC bloquea la sesión antes de consultar el estado y conserva el bloqueo hasta terminar la preparación, escritura y limpieza
- Solo atiende el primer evento de etiqueta, para evitar lecturas o escrituras duplicadas
- Cancela al salir de Comunidad, destruir la pantalla, pasar la app al fondo, apagar NFC o agotar 30 segundos
- Instala listeners antes de escanear, comprueba que la app esté activa y elimina todos sus listeners al terminar, incluso si se cancela durante su instalación
- Intenta retirar todos los listeners y detener el escaneo aunque una parte de la limpieza falle, e informa el fallo
- Mantiene el aviso de reemplazo del contenido anterior y confirma éxito únicamente tras resolver `write` y limpiar la sesión
- Una escritura nativa ya iniciada no se puede abortar mediante la API instalada: si se cancela o vence el plazo, espera la llamada nativa, conserva el bloqueo y advierte que la etiqueta pudo cambiar y debe leerse de nuevo
- Diferencia NFC apagado, hardware ausente, etiqueta vacía o sin NDEF legible, formato ajeno, texto inválido, etiqueta bloqueada y falta de capacidad
- Valida UTF-8 estricto, el bit reservado del registro de texto y el rango de los bytes, con errores comprensibles en español
- Conserva el cálculo de capacidad NDEF, incluida la cabecera larga para payloads de 256 bytes o más, y permite formatear etiquetas compatibles
- Limpia una nota recibida anterior al iniciar otra operación NFC y descarta resultados que lleguen después de salir de la pantalla
- La nota recibida requiere revisión y guardado explícito; conserva el perfil, las notas locales y la primera copia ante duplicados
- El workflow incorpora las pruebas nuevas de NFC, Comunidad e Inicio; no se ha abierto ningún PR ni ejecutado el workflow remoto en esta revisión

### Compatibilidad y Android

Se mantiene `@capgo/capacitor-nfc` **8.2.10** con Capacitor **8**. La [tabla oficial del complemento](https://github.com/Cap-go/capacitor-nfc#compatibility) relaciona las versiones 8.x de ambos. Se revisaron también el paquete instalado, sus tipos TypeScript y su implementación Java, que usa Java 21 y SDK 36. No se infiere compatibilidad exclusivamente del nombre de la versión: la compilación Android terminó correctamente.

El manifiesto de la app y el manifiesto fusionado de depuración contienen `android.permission.NFC` y `android.hardware.nfc` con `required="false"`. NFC no necesita un diálogo de permiso en tiempo de ejecución. La implementación usa reader mode dentro de la pantalla, por lo que no necesita un filtro para abrir automáticamente la app al acercar etiquetas. Se conservan los permisos Bluetooth y las funciones existentes. Configuración: minSdk 24, compileSdk 36 y targetSdk 36.

### Resultados reales

| Verificación | Resultado actual |
|---|---|
| Compilación web de producción | Correcta, `npm.cmd run build` |
| Pruebas relevantes | **36 aprobadas**, en 6 archivos |
| Pruebas de servicio NFC | **20 aprobadas con API nativa simulada**, no equivalen a prueba física |
| Persistencia y formato NDEF | **7 aprobadas**, incluidos acentos y emojis |
| Comunidad | **4 aprobadas**, revisión y guardado explícito, duplicados, salida y lectura fallida |
| Inicio | **3 aprobadas**, enlace `/tabs/comunidad`, tarjetas conservadas y estado offline |
| Noticias y Reportes | **2 aprobadas**, creación de componentes; no prueban API remota ni hardware |
| Suite completa | **37 aprobadas y 2 fallidas**: Tabs y Detalle de noticia sin proveedor `ActivatedRoute`, fallos ya documentados antes de esta revisión |
| Lint | Correcto en todos los archivos TS/HTML modificados y en Comunidad y servicios comunitarios |
| Capacitor Android | Sincronización correcta; detecta NFC 8.2.10 y otros 6 complementos |
| Android | `assembleDebug --no-daemon` correcto con JDK **21.0.10** de Android Studio y SDK **36** |
| Dispositivo disponible | `adb devices` no detecta teléfonos ni emuladores conectados |
| Presentación móvil y escritorio | Pendiente de revisión visual: la herramienta de control no tiene navegadores ni aplicaciones disponibles |
| NFC físico y BLE físico | No ejecutados |

Las pruebas de Inicio renderizan el template y comprueban la ruta y los estados existentes. La tarjeta usa componentes Ionic, el espaciado existente y un botón de ancho completo sin añadir anchos fijos; esto es revisión de código, no evidencia visual de móvil o escritorio.

Persisten las advertencias sobre Browserslist y el presupuesto de estilos de Noticias, y Gradle avisa sobre `flatDir`. Los primeros intentos de algunas verificaciones encontraron restricciones de lectura/red del sandbox; se repitieron con acceso ampliado y los resultados anteriores corresponden a las ejecuciones terminadas. No se modificó la política de ejecución de PowerShell: se usaron `npm.cmd` y `npx.cmd`.

Comandos de validación en Windows:

```powershell
npm.cmd run build
npm.cmd test -- --watch=false --include=src/app/services/*.spec.ts --include=src/app/community/*.spec.ts --include=src/app/home/*.spec.ts --include=src/app/noticias/*.spec.ts --include=src/app/reportes/*.spec.ts
npm.cmd test -- --watch=false
npx.cmd eslint src/app/community src/app/home/home.page.html src/app/home/home.module.ts src/app/home/home.page.spec.ts src/app/services/community.service.ts src/app/services/community-ble.service.ts src/app/services/nfc.service.ts src/app/services/nfc.service.spec.ts src/app/services/community.service.spec.ts
npx.cmd cap sync android
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME='C:\Users\seers\AppData\Local\Android\Sdk'
cd android
.\gradlew.bat assembleDebug --no-daemon
```

APK local: `android/app/build/outputs/apk/debug/app-debug.apk`. No se añade el APK ni los archivos de configuración local al commit.

### Qué falta comprobar físicamente

Se requiere al menos un teléfono Android con NFC y etiquetas NDEF: una escribible con capacidad suficiente, una vacía, una bloqueada, una pequeña y una con contenido inválido. Para probar intercambio entre vecinos y BLE se necesitan dos teléfonos Android; el emisor debe admitir anuncios BLE.

1. Instalar el APK, comprobar Inicio, Noticias, Reportes y Comunidad en móvil, y revisar el navegador de escritorio en distintas anchuras
2. Escribir una nota con acentos y emojis sobre contenido previo y leerla de nuevo, preferiblemente con otro dispositivo, verificando texto, autor y fecha
3. Probar NFC apagado y un dispositivo sin NFC; confirmar que el resto de la app continúa disponible
4. Leer etiquetas vacías, ajenas o dañadas; escribir en etiquetas bloqueadas o insuficientes y comprobar los errores reales
5. Cancelar antes y durante el contacto, esperar el plazo, cambiar de pestaña y llevar la app al fondo; comprobar que no se reinicia el escaneo y que no aparecen éxitos tardíos
6. Mantener y volver a acercar la etiqueta para verificar que no se duplican eventos ni escrituras
7. Retirar la etiqueta durante la escritura, leer después su contenido y comprobar que no se afirma éxito sin confirmación nativa
8. Revisar y descartar una nota antes de guardar, guardar una duplicada y reiniciar la app para verificar perfil y persistencia local
9. Probar BLE entre dos teléfonos y los permisos de dispositivos cercanos; no sustituirlo por pruebas simuladas

Registrar modelo, versión Android, tipo y capacidad de etiqueta, fecha, pasos, resultado y capturas. No se afirma que NFC funcione al 100 % sin estas pruebas.

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
