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
