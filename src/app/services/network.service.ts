 import { Injectable } from '@angular/core';
import { Network, ConnectionStatus } from '@capacitor/network';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NetworkService {

  // Guarda y comunica el estado actual de la conexión
  private connectionStatus = new BehaviorSubject<ConnectionStatus>({
    connected: true,
    connectionType: 'unknown'
  });

  // Observable que permite a la pantalla recibir los cambios en tiempo real
  connectionStatus$ = this.connectionStatus.asObservable();

  constructor() {
    this.inicializarRed();
  }

  async inicializarRed() {

    // Obtener el estado inicial de la conexión
    const status = await Network.getStatus();
    this.connectionStatus.next(status);

    // Escuchar cambios de conexión en tiempo real
    Network.addListener('networkStatusChange', (status) => {

      console.log('Estado de red:', status.connected);
      console.log('Tipo de conexión:', status.connectionType);

      // Actualizar el estado para que la pantalla cambie automáticamente
      this.connectionStatus.next(status);
    });
  }

  // Consultar el estado actual de la conexión
  async obtenerEstado(): Promise<ConnectionStatus> {

    const status = await Network.getStatus();

    this.connectionStatus.next(status);

    return status;
  }
}
