Comunidad Alerta APP

1. Descripción del proyecto

Comunidad Alerta APP es una aplicación móvil desarrollada como proyecto académico para la asignatura Programación de Dispositivos Móviles de la Universidad Abierta Para Adultos (UAPA).

El proyecto está orientado a facilitar la participación de los ciudadanos en asuntos de interés comunitario mediante una aplicación que reúne diferentes módulos, como inicio, noticias, reportes, multimedia y tareas. También cuenta con servicios destinados a funciones de conectividad y acceso a capacidades de los dispositivos móviles.

La aplicación se desarrolla utilizando tecnologías web y herramientas que permiten preparar el proyecto para dispositivos móviles.

2. Tecnologías utilizadas

Las siguientes tecnologías y dependencias aparecen en la configuración actual del proyecto:

* Ionic: componentes e interfaz para la aplicación móvil.
* Angular: estructura de la aplicación y desarrollo de sus páginas.
* TypeScript: lenguaje de programación utilizado por el proyecto.
* Capacitor: integración con funcionalidades de dispositivos móviles.
* RxJS: programación reactiva.
* Ionicons: biblioteca de iconos.
* Bluetooth LE: integración con dispositivos Bluetooth de baja energía.
* Capacitor Camera: acceso a funciones de cámara.
* Barcode Scanning: lectura de códigos de barras o QR.
* Network: información sobre el estado de la conexión.
* NFC: integración con tecnología de comunicación de campo cercano.
* SQLite: dependencia para trabajar con bases de datos locales.

3. Estructura del repositorio

El repositorio contiene archivos de configuración, documentación, código fuente y el proyecto Android.

Comunidad-Alerta-APP/
├── .github/
├── .vscode/
├── android/
├── docs/
├── src/
├── tareas/
├── www/
├── .browserslistrc
├── .editorconfig
├── .gitignore
├── angular.json
├── capacitor.config.ts
├── eslint.config.js
├── ionic.config.json
├── package.json
├── package-lock.json
├── tsconfig.app.json
├── tsconfig.json
└── tsconfig.spec.json

Estructura de src/app/

src/app/
├── community/
├── detalle-noticia/
├── home/
├── multimedia/
├── noticias/
├── reportes/
├── services/
├── tabs/
├── tareas/
├── app-routing.module.ts
├── app.component.html
├── app.component.scss
├── app.component.spec.ts
├── app.component.ts
└── app.module.ts

Función de las carpetas principales

* community/: contiene los archivos correspondientes al módulo de comunidad.
* detalle-noticia/: contiene la página destinada al detalle de una noticia.
* home/: contiene la página de inicio.
* multimedia/: contiene la página del módulo multimedia.
* noticias/: contiene los archivos del módulo de noticias.
* reportes/: contiene los archivos del módulo de reportes.
* services/: agrupa servicios relacionados con la lógica y las capacidades de la aplicación.
* tabs/: contiene los archivos de navegación mediante pestañas.
* tareas/: contiene los archivos del módulo de tareas.

Los archivos de configuración y enrutamiento de src/app/ permiten organizar la aplicación y definir su estructura de navegación.

4. Requisitos para ejecutar el proyecto

Antes de instalar el proyecto, se necesita contar con:

* Node.js y npm instalados.
* Git instalado.
* Ionic CLI disponible para ejecutar ionic serve.
* Un editor de código, como Visual Studio Code.

5. Instalación y ejecución

Para obtener el proyecto y ejecutarlo localmente, se deben seguir estos pasos.

Paso 1. Clonar el repositorio

git clone https://github.com/anyerisjaquez5-pixel/Comunidad-Alerta-APP.git

Paso 2. Entrar en la carpeta

cd Comunidad-Alerta-APP

Paso 3. Instalar las dependencias

npm install

Este comando instala las dependencias definidas en package.json y utiliza package-lock.json para reproducir la instalación.

Paso 4. Ejecutar la aplicación

ionic serve

Este comando inicia el servidor de desarrollo de Ionic para visualizar la aplicación en el navegador.

6. Comandos disponibles

El archivo package.json contiene los siguientes scripts:

Comando	Función
npm start	Inicia el servidor de desarrollo de Angular.
npm run build	Ejecuta la compilación de Angular.
npm run watch	Compila en modo de observación para desarrollo.
npm test	Ejecuta el comando de pruebas configurado.
npm run lint	Ejecuta la revisión estática del código.

Para generar la compilación de Ionic también se ha utilizado el comando:

ionic build

7. Integrantes del equipo

N.º	Nombre del participante	Matrícula
1	Anyiri Rafael Jaquez Martínez	100063657
2	Juan Alberto Marte Rodríguez	100060991
3	Elian Ernesto Domínguez Gutiérrez	100072737
4	Erison Antonio Minaya Devora	100014407
5	Josue Yael Cuevas Rosario	100059107

Asignación de módulos

La asignación de módulos debe completarse con la distribución acordada por los integrantes del equipo.

Integrante	Módulo asignado
Anyiri Rafael Jaquez Martínez	Pendiente de confirmar
Juan Alberto Marte Rodríguez	Pendiente de confirmar
Elian Ernesto Domínguez Gutiérrez	Pendiente de confirmar
Erison Antonio Minaya Devora	Pendiente de confirmar
Josue Yael Cuevas Rosario	Pendiente de confirmar

8. Control de versiones

El proyecto utiliza Git para el control de versiones y GitHub como plataforma de alojamiento del repositorio.

Repositorio: https://github.com/anyerisjaquez5-pixel/Comunidad-Alerta-APP

El repositorio permite centralizar el código fuente, registrar cambios y facilitar el trabajo colaborativo entre los integrantes del equipo.

9. Estado de la documentación

Este README describe la estructura de carpetas observada y las tecnologías registradas en package.json. La distribución definitiva de los módulos por integrante debe actualizarse cuando el equipo confirme sus responsabilidades.