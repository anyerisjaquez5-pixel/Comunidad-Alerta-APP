import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';

import { Subscription } from 'rxjs';
import { ConnectionStatus } from '@capacitor/network';
import { Geolocation } from '@capacitor/geolocation';
import { NetworkService } from '../services/network.service';
import { HttpClient } from '@angular/common/http';
import { BleClient, ScanResult } from '@capacitor-community/bluetooth-le';
import * as L from 'leaflet';

// Configurar los iconos de Leaflet para Angular.
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
  iconUrl: 'assets/leaflet/marker-icon.png',
  shadowUrl: 'assets/leaflet/marker-shadow.png'
});

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit, OnDestroy {

  // CONECTIVIDAD
  conectado = true;
  tipoConexion = 'unknown';

  // BLUETOOTH
  dispositivosBluetooth: ScanResult[] = [];
  bluetoothActivo = false;
  buscandoBluetooth = false;

  // MAPA Y GPS
  latitud: number | null = null;
  longitud: number | null = null;
  cargandoUbicacion = false;
  errorUbicacion = '';

  private networkSubscription?: Subscription;
  private bluetoothTimer?: ReturnType<typeof setTimeout>;
  private mapa?: L.Map;
  private marcadorUsuario?: L.Marker;
  private circuloPrecision?: L.Circle;
  private mapaInicializado = false;
  private destruyendo = false;

  constructor(
    private networkService: NetworkService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient
  ) {}

  async ngOnInit(): Promise<void> {
    this.networkSubscription =
      this.networkService.connectionStatus$.subscribe(
        (status: ConnectionStatus) => {
          this.conectado = status.connected;
          this.tipoConexion = status.connectionType;
          this.cdr.detectChanges();
        }
      );

    await this.inicializarBluetooth();
  }

  // Inicializar el mapa cuando la página esté visible.
  ionViewDidEnter(): void {
    this.destruyendo = false;

    setTimeout(() => {
      if (this.destruyendo) {
        return;
      }

      this.inicializarMapa();
      this.mapa?.invalidateSize();
    }, 300);
  }

  private inicializarMapa(): void {
    const contenedor = document.getElementById('mapa');

    if (!contenedor || this.destruyendo) {
      return;
    }

    // Evitar crear dos mapas sobre el mismo elemento.
    if (this.mapa) {
      this.mapa.invalidateSize();
      return;
    }

    try {
      // Coordenadas de referencia de Moca, República Dominicana.
      const referencia: L.LatLngExpression = [19.4515, -70.6970];

      this.mapa = L.map(contenedor, {
        zoomControl: true
      }).setView(referencia, 13);

      L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19
        }
      ).addTo(this.mapa);

      L.marker(referencia)
        .addTo(this.mapa)
        .bindPopup('Zona de referencia: Moca, República Dominicana');

      this.mapaInicializado = true;

      setTimeout(() => {
        this.mapa?.invalidateSize();
      }, 250);
    } catch (error) {
      console.error('Error inicializando el mapa:', error);
    }
  }

  // Obtener la ubicación actual del dispositivo.
  async obtenerUbicacion(): Promise<void> {
    if (this.cargandoUbicacion) {
      return;
    }

    this.cargandoUbicacion = true;
    this.errorUbicacion = '';
    this.cdr.detectChanges();

    try {
      const permisos = await Geolocation.checkPermissions();

      if (
        permisos.location !== 'granted' &&
        permisos.coarseLocation !== 'granted'
      ) {
        const solicitud = await Geolocation.requestPermissions();

        if (
          solicitud.location !== 'granted' &&
          solicitud.coarseLocation !== 'granted'
        ) {
          throw new Error(
            'No se concedió el permiso para acceder a la ubicación.'
          );
        }
      }

      const posicion = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0
      });

      if (this.destruyendo) {
        return;
      }

      this.latitud = posicion.coords.latitude;
      this.longitud = posicion.coords.longitude;

      // Crear el mapa si todavía no está inicializado.
      if (!this.mapaInicializado) {
        this.inicializarMapa();
      }

      if (!this.mapa) {
        throw new Error(
          'El mapa todavía no está disponible. Intenta nuevamente.'
        );
      }

      const punto: L.LatLngExpression = [
        this.latitud,
        this.longitud
      ];

      // Centrar el mapa en la posición real del GPS.
      this.mapa.setView(punto, 17);

      if (this.marcadorUsuario) {
        this.marcadorUsuario.setLatLng(punto);
      } else {
        this.marcadorUsuario = L.marker(punto)
          .addTo(this.mapa)
          .bindPopup('<strong>Tu ubicación actual</strong>');
      }

      // Mostrar el radio aproximado de precisión del GPS.
      const precision = posicion.coords.accuracy;

      if (this.circuloPrecision) {
        this.circuloPrecision
          .setLatLng(punto)
          .setRadius(precision);
      } else {
        this.circuloPrecision = L.circle(punto, {
          radius: precision,
          color: '#1677ff',
          fillOpacity: 0.12
        }).addTo(this.mapa);
      }

      this.marcadorUsuario.openPopup();

      setTimeout(() => {
        this.mapa?.invalidateSize();
      }, 200);

      console.log('Latitud:', this.latitud);
      console.log('Longitud:', this.longitud);

    } catch (error) {
      console.error('Error obteniendo ubicación:', error);

      this.errorUbicacion =
        error instanceof Error
          ? error.message
          : 'No se pudo obtener la ubicación. Comprueba el GPS y los permisos.';

      alert(this.errorUbicacion);

    } finally {
      this.cargandoUbicacion = false;
      this.cdr.detectChanges();
    }
  }

  // Inicializar Bluetooth BLE.
  async inicializarBluetooth(): Promise<void> {
    try {
      await BleClient.initialize();
      this.bluetoothActivo = await BleClient.isEnabled();
    } catch (error) {
      console.error('Error al inicializar Bluetooth:', error);
      this.bluetoothActivo = false;
    }

    this.cdr.detectChanges();
  }

  // Buscar dispositivos Bluetooth cercanos.
  async buscarBluetooth(): Promise<void> {
    this.dispositivosBluetooth = [];
    this.buscandoBluetooth = true;
    this.cdr.detectChanges();

    if (this.bluetoothTimer) {
      clearTimeout(this.bluetoothTimer);
      this.bluetoothTimer = undefined;
    }

    try {
      this.bluetoothActivo = await BleClient.isEnabled();

      if (!this.bluetoothActivo) {
        alert(
          'Activa el Bluetooth del dispositivo para buscar dispositivos cercanos.'
        );

        this.buscandoBluetooth = false;
        this.cdr.detectChanges();
        return;
      }

      await BleClient.requestLEScan(
        {},
        (resultado: ScanResult) => {
          const existe = this.dispositivosBluetooth.some(
            dispositivo =>
              dispositivo.device.deviceId ===
              resultado.device.deviceId
          );

          if (!existe) {
            this.dispositivosBluetooth.push(resultado);
            this.cdr.detectChanges();
          }
        }
      );

      // Detener automáticamente la búsqueda después de 8 segundos.
      this.bluetoothTimer = setTimeout(() => {
        void this.detenerBusquedaBluetooth();
      }, 8000);

    } catch (error) {
      console.error('Error buscando dispositivos Bluetooth:', error);

      this.buscandoBluetooth = false;

      alert(
        'No fue posible realizar la búsqueda Bluetooth. Comprueba los permisos y el estado del dispositivo.'
      );

      this.cdr.detectChanges();
    }
  }

  // Detener la búsqueda Bluetooth.
  async detenerBusquedaBluetooth(): Promise<void> {
    if (this.bluetoothTimer) {
      clearTimeout(this.bluetoothTimer);
      this.bluetoothTimer = undefined;
    }

    try {
      await BleClient.stopLEScan();
    } catch (error) {
      console.error('Error deteniendo búsqueda Bluetooth:', error);
    }

    this.buscandoBluetooth = false;
    this.cdr.detectChanges();
  }

  // Guardar datos localmente sin Internet o enviarlos al servidor.
  guardarDato(): void {
    const datos = {
      mensaje: 'Dato de Comunidad Alerta',
      fecha: new Date().toISOString()
    };

    if (!this.conectado) {
      localStorage.setItem('datoOffline', JSON.stringify(datos));

      alert(
        'Dato guardado localmente mientras no haya conexión.'
      );

      return;
    }

    this.http.post(
      'https://jsonplaceholder.typicode.com/posts',
      datos
    ).subscribe({
      next: respuesta => {
        console.log('Dato enviado al servidor:', respuesta);
        alert('Dato enviado correctamente.');
      },
      error: error => {
        console.error('Error al enviar el dato:', error);

        // Si falla el envío, conservar el dato en el dispositivo.
        localStorage.setItem('datoOffline', JSON.stringify(datos));

        alert(
          'No fue posible enviar el dato. Se guardó localmente.'
        );
      }
    });
  }

  // Detener Bluetooth cuando se abandona la página.
  ionViewWillLeave(): void {
    void this.detenerBusquedaBluetooth();
  }

  // Liberar recursos al destruir el componente.
  ngOnDestroy(): void {
    this.destruyendo = true;

    this.networkSubscription?.unsubscribe();

    if (this.bluetoothTimer) {
      clearTimeout(this.bluetoothTimer);
      this.bluetoothTimer = undefined;
    }

    void this.detenerBusquedaBluetooth();

    this.mapa?.remove();
    this.mapa = undefined;
    this.marcadorUsuario = undefined;
    this.circuloPrecision = undefined;
    this.mapaInicializado = false;
  }
}