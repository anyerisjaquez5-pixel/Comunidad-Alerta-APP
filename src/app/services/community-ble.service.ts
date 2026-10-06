import { Injectable } from '@angular/core';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { BleClient, ScanResult } from '@capacitor-community/bluetooth-le';
import { Nota, validarNota } from './community.service';

const SERVICE = '6d491400-69ac-4a20-8dca-3982152dd301';
const NOTE = '6d491401-69ac-4a20-8dca-3982152dd301';
const Peripheral = registerPlugin<{ start(options: { nota: string }): Promise<void>; stop(): Promise<void> }>('CommunityBle');

@Injectable({ providedIn: 'root' })
export class CommunityBleService {
  private timer?: ReturnType<typeof setTimeout>;
  private terminarBusqueda?: () => void;

  private async preparar(): Promise<void> {
    if (Capacitor.getPlatform() !== 'android') throw new Error('El intercambio BLE está disponible en Android');
    await BleClient.initialize();
    if (!await BleClient.isEnabled()) throw new Error('Activa Bluetooth en los ajustes');
  }

  async publicar(nota: Nota): Promise<void> {
    await this.preparar();
    const texto = JSON.stringify(validarNota(nota));
    if (new TextEncoder().encode(texto).length > 512) throw new Error('Reduce la nota para compartirla por BLE, máximo 512 bytes');
    await Peripheral.start({ nota: texto });
  }

  async buscar(): Promise<ScanResult[]> {
    await this.preparar();
    const encontrados = new Map<string, ScanResult>();
    try {
      await BleClient.requestLEScan({ services: [SERVICE] }, item => encontrados.set(item.device.deviceId, item));
      await new Promise<void>(resolve => {
        this.terminarBusqueda = resolve;
        this.timer = setTimeout(resolve, 8000);
      });
      return [...encontrados.values()];
    } finally {
      if (this.timer) clearTimeout(this.timer);
      this.terminarBusqueda = undefined;
      await BleClient.stopLEScan();
    }
  }

  async recibir(id: string): Promise<Nota> {
    await this.preparar();
    try {
      await BleClient.connect(id, undefined, { timeout: 10000 });
      const value = await BleClient.read(id, SERVICE, NOTE, { timeout: 10000 });
      if (value.byteLength > 2048) throw new Error('Nota BLE demasiado grande');
      return validarNota(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(value)));
    } finally { await BleClient.disconnect(id).catch(() => undefined); }
  }

  async detener(): Promise<void> {
    this.terminarBusqueda?.();
    if (Capacitor.getPlatform() === 'android') await Peripheral.stop();
  }
}
