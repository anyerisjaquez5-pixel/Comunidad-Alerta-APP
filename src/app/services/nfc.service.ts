import { Injectable } from '@angular/core';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { CapacitorNfc, NdefRecord } from '@capgo/capacitor-nfc';
import { Nota, validarNota } from './community.service';

export function registroNota(nota: Nota): NdefRecord {
  const bytes = new TextEncoder().encode(JSON.stringify(validarNota(nota)));
  return { tnf: 1, type: [84], id: [], payload: [2, 101, 115, ...bytes] };
}

export function leerRegistro(record: NdefRecord): Nota {
  if (record.tnf !== 1 || record.type.length !== 1 || record.type[0] !== 84 ||
      !record.payload.length || (record.payload[0] & 128) !== 0) {
    throw new Error('La etiqueta no contiene una nota UTF-8 de Comunidad Alerta');
  }
  const inicio = 1 + (record.payload[0] & 63);
  if (inicio >= record.payload.length || record.payload.length > 2048) throw new Error('Contenido NFC inválido');
  return validarNota(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(record.payload.slice(inicio)))));
}

@Injectable({ providedIn: 'root' })
export class NfcService {
  private listener?: PluginListenerHandle;
  private timer?: ReturnType<typeof setTimeout>;
  private cancelar?: () => void;
  private ocupado = false;

  async estado(): Promise<string> {
    if (Capacitor.getPlatform() !== 'android') return 'NFC disponible en la app Android';
    const { status } = await CapacitorNfc.getStatus();
    return status === 'NFC_OK' ? 'NFC listo' : status === 'NFC_DISABLED' ? 'Activa NFC en los ajustes' : 'Este dispositivo no tiene NFC disponible';
  }

  async ejecutar(nota?: Nota): Promise<Nota | undefined> {
    if (this.ocupado) throw new Error('Ya hay una operación NFC en curso');
    if (Capacitor.getPlatform() !== 'android') throw new Error('Usa la app instalada en Android para NFC');
    if ((await CapacitorNfc.getStatus()).status !== 'NFC_OK') throw new Error('Activa NFC o utiliza un teléfono compatible');
    this.ocupado = true;
    let setup: Promise<void> | undefined;
    try {
      return await new Promise<Nota | undefined>((resolve, reject) => {
        let atendiendo = false;
        let terminado = false;
        const terminar = (error?: unknown, resultado?: Nota) => {
          if (terminado) return;
          terminado = true;
          if (error) reject(error); else resolve(resultado);
        };
        this.cancelar = () => terminar(new Error('Operación NFC cancelada'));
        this.timer = setTimeout(() => terminar(new Error('Tiempo agotado para acercar la etiqueta')), 30000);
        setup = (async () => {
          this.listener = await CapacitorNfc.addListener('nfcEvent', async ({ tag }) => {
            if (atendiendo || terminado) return;
            atendiendo = true;
            try {
              if (nota) {
                const record = registroNota(nota);
                if (tag.isWritable === false) throw new Error('La etiqueta es de solo lectura');
                // Incluye la cabecera NDEF en el cálculo de capacidad
                const size = record.payload.length + (record.payload.length < 256 ? 4 : 7);
                if (tag.maxSize != null && size > tag.maxSize) throw new Error('La nota no cabe en esta etiqueta, reduce su contenido');
                await CapacitorNfc.write({ records: [record] });
                terminar();
              } else {
                const record = tag.ndefMessage?.find(r => r.tnf === 1 && r.type[0] === 84);
                if (!record) throw new Error('La etiqueta no contiene una nota');
                terminar(undefined, leerRegistro(record));
              }
            } catch (error) { terminar(error); }
          });
          if (!terminado) await CapacitorNfc.startScanning({ invalidateAfterFirstRead: false });
        })();
        void setup.catch(terminar);
      });
    } finally {
      await setup?.catch(() => undefined);
      if (this.timer) clearTimeout(this.timer);
      await this.listener?.remove();
      await CapacitorNfc.stopScanning().catch(() => undefined);
      this.listener = undefined;
      this.cancelar = undefined;
      this.ocupado = false;
    }
  }

  detener(): void { this.cancelar?.(); }
}
