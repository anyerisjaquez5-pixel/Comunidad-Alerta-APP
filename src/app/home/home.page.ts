import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';
import { Subscription } from 'rxjs';
import { ConnectionStatus } from '@capacitor/network';
import { NetworkService } from '../services/network.service';
import { HttpClient } from '@angular/common/http';
import * as L from 'leaflet';

// Rutas de los iconos de Leaflet incluidos en src/assets/leaflet.
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
  iconUrl: 'assets/leaflet/marker-icon.png',
  shadowUrl: 'assets/leaflet/marker-shadow.png'
});

import {
  BleClient,
  ScanResult
} from '@capacitor-community/bluetooth-le';
@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit, OnDestroy {
  conectado = true;
  tipoConexion = 'unknown';
  private mapaComunidad?: L.Map;
  private marcadorGPS?: L.Marker;
  cargandoGPS = false;
  mensajeGPS = '';

  dispositivosBluetooth: ScanResult[] = [];
  bluetoothActivo = false;
  buscandoBluetooth = false;
  private networkSubscription?: Subscription;
  private bluetoothTimer?: ReturnType<typeof setTimeout>;
  private bluetoothInicializado = false;
  private inicializandoBluetooth = false;
  private notificacionesBluetoothIniciadas = false;
  private componenteDestruido = false;
  constructor(
    private networkService: NetworkService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient
  ) {}
  async ngOnInit(): Promise<void> {
    this.componenteDestruido = false;
    this.networkSubscription =
      this.networkService.connectionStatus$.subscribe(
        (status: ConnectionStatus) => {

          this.conectado = status.connected;
          this.tipoConexion = status.connectionType;
          console.log('Estado de conexión:', this.conectado);
          console.log('Tipo de conexión:', this.tipoConexion);
          this.actualizarVista();
        }
      );

    await this.inicializarBluetooth();
  }
  // Inicializar BLE con la configuración correspondiente a Android.
  async inicializarBluetooth(): Promise<void> {
    if (
      this.inicializandoBluetooth ||
      this.componenteDestruido
    ) {
      return;
    }
    this.inicializandoBluetooth = true;
    try {
      await BleClient.initialize({
        androidNeverForLocation: true
      });
      this.bluetoothInicializado = true;
      console.log('Cliente Bluetooth BLE inicializado.');
      await this.actualizarEstadoBluetooth();
      if (!this.notificacionesBluetoothIniciadas) {
        try {
          await BleClient.startEnabledNotifications(
            (activo: boolean) => {
              if (this.componenteDestruido) {
                return;
              }
              this.bluetoothActivo = activo;
              console.log(
                'Estado de Bluetooth:',
                activo ? 'ACTIVO' : 'INACTIVO'
              );
              this.actualizarVista();
            }
          );
          this.notificacionesBluetoothIniciadas = true;
        } catch (error) {
          console.error(
            'No se pudieron activar las notificaciones BLE:',
            error
          );
        }
      }
    } catch (error) {
      this.bluetoothInicializado = false;
      this.bluetoothActivo = false;
      console.error(
        'Error real al inicializar BLE:',
        error
      );
    } finally {
      this.inicializandoBluetooth = false;
      this.actualizarVista();
    }
  }
  // Consultar el estado actual del Bluetooth.
  async actualizarEstadoBluetooth(): Promise<void> {
    if (this.componenteDestruido) {
      return;
    }
    if (!this.bluetoothInicializado) {
      await this.inicializarBluetooth();
      return;
    }
    try {
      this.bluetoothActivo = await BleClient.isEnabled();
      console.log(
        'Bluetooth:',
        this.bluetoothActivo ? 'ACTIVO' : 'INACTIVO'
      );
    } catch (error) {

      console.error(
        'Error al consultar el estado de Bluetooth:',
        error
      );
    } finally {
      this.actualizarVista();
    }
  }
  // Comprobar Bluetooth al volver a la pantalla de inicio.
  async ionViewWillEnter(): Promise<void> {
    if (this.componenteDestruido) {
      return;
    }
    if (!this.bluetoothInicializado) {
      await this.inicializarBluetooth();
    } else {
      await this.actualizarEstadoBluetooth();
    }
  }
  // Buscar dispositivos BLE cercanos durante ocho segundos.
  async buscarBluetooth(): Promise<void> {
    if (this.buscandoBluetooth) {
      return;
    }
    this.dispositivosBluetooth = [];
    this.buscandoBluetooth = true;

    if (this.bluetoothTimer) {
      clearTimeout(this.bluetoothTimer);
      this.bluetoothTimer = undefined;
    }
    this.actualizarVista();
    let escaneoIniciado = false;
    try {
      if (!this.bluetoothInicializado) {
        await this.inicializarBluetooth();
      }
      if (!this.bluetoothInicializado) {
        alert(
          'No se pudo inicializar Bluetooth. Consulta el error registrado en la consola.'
        );
        return;
      }
      this.bluetoothActivo = await BleClient.isEnabled();
      if (!this.bluetoothActivo) {

        alert(
          'El Bluetooth está apagado. Actívalo en los ajustes del teléfono.'
        );
        
        return;
      }



      await BleClient.requestLEScan(
        {},
        (resultado: ScanResult) => {
          if (this.componenteDestruido) {
            return;
          }
          const existe = this.dispositivosBluetooth.some(
            dispositivo =>
              dispositivo.device.deviceId ===
              resultado.device.deviceId
          );
          if (!existe) {

            this.dispositivosBluetooth.push(resultado);

            console.log(
              'Dispositivo encontrado:',
              resultado.device.name ||
              resultado.device.deviceId
            );
            this.actualizarVista();
          }
        }
      );
      escaneoIniciado = true;
      console.log('Búsqueda Bluetooth iniciada.');
      this.bluetoothTimer = setTimeout(() => {
        void this.detenerBusquedaBluetooth();
      }, 8000);

    } catch (error) {

      console.error(
        'Error real durante la búsqueda BLE:',
        error
      );

      

      alert(
        'No se pudo iniciar la búsqueda Bluetooth. Revisa el error registrado en la consola.'
      );
    } finally {
      if (!escaneoIniciado) {
        this.buscandoBluetooth = false;
      }
      this.actualizarVista();
    }
  }
  // Detener el escaneo y liberar el temporizador.
  async detenerBusquedaBluetooth(): Promise<void> {
    if (this.bluetoothTimer) {
      clearTimeout(this.bluetoothTimer);
      this.bluetoothTimer = undefined;
    }

    try {
      if (this.bluetoothInicializado) {
        await BleClient.stopLEScan();
      }
    } catch (error) {
      console.warn('Error al detener el escaneo BLE:', error);
    } finally {
      this.buscandoBluetooth = false;
      this.actualizarVista();
    }
  }
  // Guardar localmente sin conexión o enviar mediante HTTP.
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
      console.log('Dato guardado localmente:', datos);
      alert(
        'Dato guardado localmente.\n\nSe conservará en el dispositivo mientras no haya conexión.'
      );
      return;
    }
    this.http.post(
      'https://jsonplaceholder.typicode.com/posts',
      datos
    ).subscribe({
      next: (respuesta) => {
        console.log('Respuesta del servidor:', respuesta);
        alert('Dato enviado correctamente.');
      },
      error: (error) => {
        console.error('Error al enviar el dato:', error);
        alert('No fue posible enviar el dato.');
      }
    });
  }
  private actualizarVista(): void {
    if (!this.componenteDestruido) {
      this.cdr.detectChanges();
    }
  }


  ionViewDidEnter(): void {
    setTimeout(() => this.inicializarMapaComunidad(), 200);
  }

  private inicializarMapaComunidad(): void {
    const el = document.getElementById('mapa-comunidad-alerta');
    if (!el) return;
    if (this.mapaComunidad) {
      setTimeout(() => this.mapaComunidad?.invalidateSize(), 200);
      return;
    }
    this.mapaComunidad = L.map(el).setView([19.42624, -70.67277], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(this.mapaComunidad);
    L.marker([19.42624, -70.67277])
      .addTo(this.mapaComunidad)
      .bindPopup('Marcador de referencia aproximado de UAPA');
    setTimeout(() => this.mapaComunidad?.invalidateSize(), 300);
  }

  async centrarUbicacionActual(): Promise<void> {
    if (this.cargandoGPS) return;
    this.cargandoGPS = true;
    this.mensajeGPS = 'Solicitando ubicación...';
    try {
      const posicion = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Este navegador no admite geolocalización.'));
          return;
        }
        if (!window.isSecureContext) {
          reject(new Error('El GPS del navegador requiere HTTPS. Abre la web con una dirección HTTPS segura.'));
          return;
        }
        navigator.geolocation.getCurrentPosition(
          resolve,
          (error) => {
            const mensajes: Record<number, string> = {
              1: 'Permiso de ubicación denegado. Autoriza la ubicación en el navegador.',
              2: 'No se pudo determinar tu posición. Activa la ubicación del dispositivo.',
              3: 'La búsqueda agotó el tiempo. Inténtalo en un lugar con mejor señal GPS.'
            };
            reject(new Error(mensajes[error.code] || 'Error desconocido de ubicación.'));
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
      });
      const lat = posicion.coords.latitude;
      const lng = posicion.coords.longitude;
      const punto: L.LatLngExpression = [lat, lng];
      if (!this.mapaComunidad) this.inicializarMapaComunidad();
      if (!this.mapaComunidad) throw new Error('El mapa no se ha inicializado.');
      if (this.marcadorGPS) {
        this.marcadorGPS.setLatLng(punto);
      } else {
        this.marcadorGPS = L.marker(punto).addTo(this.mapaComunidad);
      }
      this.marcadorGPS.bindPopup(
        'Tu ubicación actual<br>Latitud: ' + lat.toFixed(6) +
        '<br>Longitud: ' + lng.toFixed(6)
      ).openPopup();
      this.mapaComunidad.setView(punto, 17);
      this.mensajeGPS = 'Ubicación obtenida: ' + lat.toFixed(6) + ', ' + lng.toFixed(6);
    } catch (error) {
      console.error('Error GPS:', error);
      this.mensajeGPS = error instanceof Error ? error.message : 'No se pudo obtener la ubicación.';
    } finally {
      this.cargandoGPS = false;
      this.actualizarVista();
    }
  }

  ionViewWillLeave(): void {

    void this.detenerBusquedaBluetooth();
  }
  async ngOnDestroy(): Promise<void> {
    this.componenteDestruido = true;
    this.networkSubscription?.unsubscribe();
    if (this.bluetoothTimer) {
      clearTimeout(this.bluetoothTimer);
      this.bluetoothTimer = undefined;
    }
    try {
      if (this.bluetoothInicializado) {
        await BleClient.stopLEScan();
      }
      if (this.notificacionesBluetoothIniciadas) {
        await BleClient.stopEnabledNotifications();
        this.notificacionesBluetoothIniciadas = false;
      }
    } catch (error) {
      console.warn(
        'Error al liberar recursos Bluetooth:',
        error
      );
    } finally {
      this.buscandoBluetooth = false;
    }
  }
}
