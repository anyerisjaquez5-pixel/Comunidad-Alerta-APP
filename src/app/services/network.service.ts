import { Injectable } from '@angular/core';
import { Network } from '@capacitor/network';

@Injectable({
  providedIn: 'root'
})
export class NetworkService {

  isOnline: boolean = true;

  constructor() {
    this.inicializarRed();
  }

  async inicializarRed() {

    const status = await Network.getStatus();
    this.isOnline = status.connected;

    Network.addListener('networkStatusChange', status => {
      console.log('Estado de red:', status.connected);
      this.isOnline = status.connected;
    });
  }

  async obtenerEstado(): Promise<boolean> {
    const status = await Network.getStatus();
    return status.connected;
  }
}