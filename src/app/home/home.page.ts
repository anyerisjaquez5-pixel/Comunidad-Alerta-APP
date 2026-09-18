import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { ConnectionStatus } from '@capacitor/network';
import { NetworkService } from '../services/network.service';
import { HttpClient } from '@angular/common/http';
import { BleClient, ScanResult } from '@capacitor-community/bluetooth-le';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit, OnDestroy {

  conectado: boolean = true;
  tipoConexion: string = 'unknown';

  dispositivosBluetooth: ScanResult[] = [];
  bluetoothActivo: boolean = false;
  buscandoBluetooth: boolean = false;

  private networkSubscription?: Subscription;

  constructor(
    private networkService: NetworkService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient
  ) {}

  async ngOnInit() {

    this.networkSubscription =
      this.networkService.connectionStatus$.subscribe(
        (status: ConnectionStatus) => {

          this.conectado = status.connected;
          this.tipoConexion = status.connectionType;

          console.log('Conexión actual:', this.conectado);
          console.log('Tipo de conexión:', this.tipoConexion);

          this.cdr.detectChanges();
        }
      );

    await this.inicializarBluetooth();
  }

  // Inicializar Bluetooth BLE
  async inicializarBluetooth() {

    try {

      await BleClient.initialize();

      this.bluetoothActivo =
        await BleClient.isEnabled();

      console.log(
        'Bluetooth disponible:',
        this.bluetoothActivo
      );

    } catch (error) {

      console.error(
        'Error al inicializar Bluetooth:',
        error
      );

      this.bluetoothActivo = false;
    }

    this.cdr.detectChanges();
  }

  // Buscar dispositivos Bluetooth cercanos
  async buscarBluetooth() {

    this.dispositivosBluetooth = [];
    this.buscandoBluetooth = true;

    try {

      // Comprobar que Bluetooth esté activado
      this.bluetoothActivo =
        await BleClient.isEnabled();

      if (!this.bluetoothActivo) {

        alert(
          'Activa el Bluetooth del dispositivo para realizar una búsqueda.'
        );

        this.buscandoBluetooth = false;

        this.cdr.detectChanges();

        return;
      }

      console.log(
        'Iniciando búsqueda de dispositivos Bluetooth...'
      );

      await BleClient.requestLEScan(
        {},
        (resultado: ScanResult) => {

          const existe =
            this.dispositivosBluetooth.some(
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

            this.cdr.detectChanges();
          }
        }
      );

      // Mantener la búsqueda durante 8 segundos
      setTimeout(() => {
        this.detenerBusquedaBluetooth();
      }, 8000);

    } catch (error) {

      console.error(
        'Error buscando dispositivos Bluetooth:',
        error
      );

      this.buscandoBluetooth = false;

      alert(
        'No fue posible realizar la búsqueda de Bluetooth.'
      );

      this.cdr.detectChanges();
    }
  }

  // Detener búsqueda Bluetooth
  async detenerBusquedaBluetooth() {

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

  // Guardar o enviar datos dependiendo de la conexión
  guardarDato() {

    const datos = {
      mensaje: 'Dato de Comunidad Alerta',
      fecha: new Date().toISOString()
    };

    if (!this.conectado) {

      localStorage.setItem(
        'datoOffline',
        JSON.stringify(datos)
      );

      console.log(
        'Sin conexión. Dato guardado localmente:',
        datos
      );

      alert(
        'Dato guardado localmente.\n\nSe conservará en el dispositivo mientras no haya conexión.'
      );

    } else {

      this.http.post(
        'https://jsonplaceholder.typicode.com/posts',
        datos
      ).subscribe({

        next: (respuesta) => {

          console.log(
            'Dato enviado al servidor:',
            respuesta
          );

          alert(
            'Dato enviado correctamente.'
          );
        },

        error: (error) => {

          console.error(
            'Error al enviar el dato:',
            error
          );

          alert(
            'No fue posible enviar el dato.'
          );
        }
      });
    }
  }

  ngOnDestroy() {

    this.networkSubscription?.unsubscribe();

    this.detenerBusquedaBluetooth();
  }
}
