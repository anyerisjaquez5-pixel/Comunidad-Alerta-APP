
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

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit, OnDestroy {

  conectado = true;
  tipoConexion = 'unknown';

  dispositivosBluetooth: ScanResult[] = [];
  bluetoothActivo = false;
  buscandoBluetooth = false;

  latitud: number | null = null;
  longitud: number | null = null;
  obteniendoUbicacion = false;
  errorUbicacion = '';

  private networkSubscription?: Subscription;
  private bluetoothTimer?: ReturnType<typeof setTimeout>;
  private mapa?: L.Map;
  private marcadorUsuario?: L.Marker;
  private circuloPrecision?: L.Circle;
  private mapaInicializado = false;

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

  // Inicializar el mapa cuando Home esté visible.
  ionViewDidEnter(): void {
    setTimeout(() => {
      this.inicializarMapa();
    }, 200);
  }

  private inicializarMapa(): void {
    const elemento = document.getElementById('mapa');

    if (!elemento || this.mapaInicializado) {
      return;
    }

    try {
      this.mapa = L.map(elemento).setView(
        [19.4515, -70.6970],
        13
      );

      L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19
        }
      ).addTo(this.mapa);

      this.mapaInicializado = true;

      L.marker([19.4515, -70.6970])
        .addTo(this.mapa)
        .bindPopup(
          'Zona de referencia: Moca, República Dominicana'
        );

      setTimeout(() => {
        this.mapa?.invalidateSize();
      }, 300);

    } catch (error) {
      console.error('Error inicializando el mapa:', error);
    }
  }

  // Obtener la ubicación real del dispositivo.
  async obtenerUbicacion(): Promise<void> {
    this.obteniendoUbicacion = true;
    this.errorUbicacion = '';
    this.cdr.detectChanges();

    try {
      const permisos = await Geolocation.checkPermissions();

      if (
        permisos.location !== 'granted' &&
        permisos.coarseLocation !== 'granted'
      ) {
        const solicitud =
          await Geolocation.requestPermissions();

        if (
          solicitud.location !== 'granted' &&
          solicitud.coarseLocation !== 'granted'
        ) {
          throw new Error(
            'No se concedió el permiso de ubicación.'
          );
        }
      }

      const posicion =
        await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0
        });

      this.latitud = posicion.coords.latitude;
      this.longitud = posicion.coords.longitude;

      this.inicializarMapa();

      if (!this.mapa) {
        throw new Error(
          'El mapa todavía no está disponible. Intenta nuevamente.'
        );
      }

      const coordenadas: L.LatLngExpression = [
        this.latitud,
        this.longitud
      ];

      this.mapa.setView(coordenadas, 17);

      if (this.marcadorUsuario) {
        this.marcadorUsuario.setLatLng(coordenadas);
      } else {
        this.marcadorUsuario = L.marker(coordenadas)
          .addTo(this.mapa)
          .bindPopup('Tu ubicación actual');
      }

      if (this.circuloPrecision) {
        this.circuloPrecision.setLatLng(coordenadas);
        this.circuloPrecision.setRadius(
          posicion.coords.accuracy
        );
      } else {
        this.circuloPrecision = L.circle(coordenadas, {
          radius: posicion.coords.accuracy,
          color: '#1677ff',
          fillOpacity: 0.12
        }).addTo(this.mapa);
      }

      this.marcadorUsuario.openPopup();

      setTimeout(() => {
        this.mapa?.invalidateSize();
      }, 200);

    } catch (error) {
      console.error('Error obteniendo ubicación:', error);

      this.errorUbicacion =
        error instanceof Error
          ? error.message
          : 'No se pudo obtener la ubicación. Comprueba el GPS y los permisos.';

    } finally {
      this.obteniendoUbicacion = false;
      this.cdr.detectChanges();
    }
  }

  // Inicializar Bluetooth.
  async inicializarBluetooth(): Promise<void> {
    try {
      await BleClient.initialize();
      this.bluetoothActivo = await BleClient.isEnabled();

    } catch (error) {
      console.error(
        'Error al inicializar Bluetooth:',
        error
      );
      this.bluetoothActivo = false;
    }

    this.cdr.detectChanges();
  }

  // Buscar dispositivos Bluetooth cercanos.
  async buscarBluetooth(): Promise<void> {
    this.dispositivosBluetooth = [];
    this.buscandoBluetooth = true;

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

      this.bluetoothTimer = setTimeout(() => {
        void this.detenerBusquedaBluetooth();
      }, 8000);

    } catch (error) {
      console.error(
        'Error buscando dispositivos Bluetooth:',
        error
      );

      this.buscandoBluetooth = false;

      alert(
        'No fue posible realizar la búsqueda Bluetooth. Comprueba los permisos.'
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
      console.error(
        'Error deteniendo búsqueda Bluetooth:',
        error
      );
    }

    this.buscandoBluetooth = false;
    this.cdr.detectChanges();
  }

  // Guardar datos offline o enviarlos por Internet.
  guardarDato(): void {
    const datos = {
      mensaje: 'Dato de Comunidad Alerta',
      fecha: new Date().toISOString()
    };

    if (!this.conectado) {
      localStorage.setItem(
        'datoOffline',
        JSON.stringify(datos)
      );

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
        console.log('Dato enviado:', respuesta);
        alert('Dato enviado correctamente.');
      },

      error: error => {
        console.error('Error enviando el dato:', error);
        alert('No fue posible enviar el dato.');
      }
    });
  }

  ionViewWillLeave(): void {
    void this.detenerBusquedaBluetooth();
  }

  ngOnDestroy(): void {
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
