import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import { Network } from '@capacitor/network';
import type { PluginListenerHandle } from '@capacitor/core';
import * as L from 'leaflet';

@Component({
  selector: 'app-mapa',
  templateUrl: './mapa.page.html',
  styleUrls: ['./mapa.page.scss'],
  standalone: false,
})
export class MapaPage implements OnInit, AfterViewInit, OnDestroy {

  enLinea = navigator.onLine;
  cargando = false;
  mensajeUbicacion = 'Pulsa el botón para consultar tu ubicación.';

  private mapa?: L.Map;
  private marcadorUsuario?: L.Marker;
  private listenerRed?: PluginListenerHandle;

  constructor() {}

  ngOnInit(): void {}

  async ngAfterViewInit(): Promise<void> {
    this.inicializarMapa();
    await this.actualizarEstadoRed();

    try {
      this.listenerRed = await Network.addListener(
        'networkStatusChange',
        estado => {
          this.enLinea = estado.connected;
        }
      );
    } catch (error) {
      console.error('Error al escuchar la conexión:', error);
      this.enLinea = navigator.onLine;
    }
  }

  private inicializarMapa(): void {
    const elemento = document.getElementById('mapa-leaflet');

    if (!elemento) {
      this.mensajeUbicacion = 'No se encontró el espacio del mapa.';
      return;
    }

    this.mapa = L.map(elemento).setView(
      [19.7800, -70.6900],
      14
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(this.mapa);

    setTimeout(() => this.mapa?.invalidateSize(), 200);
  }

  private async actualizarEstadoRed(): Promise<void> {
    try {
      const estado = await Network.getStatus();
      this.enLinea = estado.connected;
    } catch {
      this.enLinea = navigator.onLine;
    }
  }

  async localizarme(): Promise<void> {
    if (!this.mapa) {
      this.mensajeUbicacion = 'El mapa no está disponible todavía.';
      return;
    }

    this.cargando = true;
    this.mensajeUbicacion = 'Obteniendo ubicación GPS...';

    try {
      const permiso = await Geolocation.checkPermissions();

      if (
        permiso.location !== 'granted' &&
        permiso.coarseLocation !== 'granted'
      ) {
        const solicitado = await Geolocation.requestPermissions();

        if (
          solicitado.location !== 'granted' &&
          solicitado.coarseLocation !== 'granted'
        ) {
          this.mensajeUbicacion =
            'Debes permitir el acceso a la ubicación del teléfono.';
          return;
        }
      }

      const posicion = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      });

      const lat = posicion.coords.latitude;
      const lng = posicion.coords.longitude;

      if (this.marcadorUsuario) {
        this.marcadorUsuario.setLatLng([lat, lng]);
      } else {
        this.marcadorUsuario = L.marker([lat, lng])
          .addTo(this.mapa)
          .bindPopup('Tu ubicación actual');
      }

      this.mapa.setView([lat, lng], 17);
      this.marcadorUsuario.openPopup();

      this.mensajeUbicacion =
        `Ubicación obtenida: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;

    } catch (error) {
      console.error('Error al obtener el GPS:', error);
      this.mensajeUbicacion =
        'No se pudo obtener la ubicación. Revisa el GPS y los permisos.';
    } finally {
      this.cargando = false;
    }
  }

  async ngOnDestroy(): Promise<void> {
    await this.listenerRed?.remove();
    this.mapa?.remove();
    this.mapa = undefined;
  }
}