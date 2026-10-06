import { Injectable } from '@angular/core';
import { App } from '@capacitor/app';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { CapacitorNfc, NdefRecord, NfcStatus } from '@capgo/capacitor-nfc';
import { Nota, validarNota } from './community.service';

export function registroNota(nota: Nota): NdefRecord {
  const bytes = new TextEncoder().encode(JSON.stringify(validarNota(nota)));
  return { tnf: 1, type: [84], id: [], payload: [2, 101, 115, ...bytes] };
}

export function leerRegistro(record: NdefRecord): Nota {
  if (record.tnf !== 1 || record.type.length !== 1 || record.type[0] !== 84 ||
      !record.payload.length || (record.payload[0] & 192) !== 0 ||
      record.payload.some(byte => !Number.isInteger(byte) || byte < 0 || byte > 255)) {
    throw new Error('La etiqueta no contiene una nota UTF-8 de Comunidad Alerta');
  }
  const inicio = 1 + (record.payload[0] & 63);
  if (inicio >= record.payload.length || record.payload.length > 2048) throw new Error('Contenido NFC inválido');
  try {
    return validarNota(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(record.payload.slice(inicio)))));
  } catch {
    throw new Error('La etiqueta contiene una nota inválida o texto UTF-8 dañado');
  }
}

function errorEstado(status: NfcStatus): string {
  return status === 'NFC_DISABLED' ? 'Activa NFC en los ajustes' : 'Este dispositivo no tiene NFC disponible';
}

function errorNativo(error: unknown): Error {
  const mensaje = error instanceof Error ? error.message : String(error);
  if (/read only/i.test(mensaje)) return new Error('La etiqueta está bloqueada o es de solo lectura');
  if (/capacity/i.test(mensaje)) return new Error('La nota no cabe en esta etiqueta, reduce su contenido');
  if (/does not support NDEF/i.test(mensaje)) return new Error('La etiqueta no admite NDEF ni su formato');
  if (/connection lost|Failed to write/i.test(mensaje)) return new Error('No se pudo confirmar la escritura, mantén la etiqueta cerca y revisa su contenido');
  return error instanceof Error ? error : new Error(mensaje);
}

@Injectable({ providedIn: 'root' })
export class NfcService {
  private cancelar?: (motivo?: string) => void;
  private ocupado = false;

  async estado(): Promise<string> {
    if (Capacitor.getPlatform() !== 'android') return 'NFC disponible en la app Android';
    const { status } = await CapacitorNfc.getStatus();
    return status === 'NFC_OK' ? 'NFC listo' : errorEstado(status);
  }

  async ejecutar(nota?: Nota): Promise<Nota | undefined> {
    if (this.ocupado) throw new Error('Ya hay una operación NFC en curso');
    if (Capacitor.getPlatform() !== 'android') throw new Error('Usa la app instalada en Android para NFC');
    // Bloquea también la preparación y la limpieza de la sesión
    this.ocupado = true;
    const listeners: PluginListenerHandle[] = [];
    let setup: Promise<void> | undefined;
    let escritura: Promise<void> | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let terminado = false;
    let atendiendo = false;
    let escaneoSolicitado = false;
    try {
      return await new Promise<Nota | undefined>((resolve, reject) => {
        const terminar = (error?: unknown, resultado?: Nota) => {
          if (terminado) return;
          terminado = true;
          if (timer) clearTimeout(timer);
          if (error) reject(errorNativo(error)); else resolve(resultado);
        };
        this.cancelar = (motivo = 'Operación NFC cancelada') => terminar(new Error(
          escritura ? `${motivo}. La escritura ya iniciada puede haber cambiado la etiqueta, revisa su contenido` : motivo
        ));
        timer = setTimeout(() => this.cancelar?.('Tiempo agotado para acercar la etiqueta'), 30000);
        setup = (async () => {
          const record = nota ? registroNota(nota) : undefined;
          const { status } = await CapacitorNfc.getStatus();
          if (terminado) return;
          if (status !== 'NFC_OK') throw new Error(errorEstado(status));
          listeners.push(await App.addListener('appStateChange', ({ isActive }) => {
            if (!isActive) this.cancelar?.('Operación NFC detenida al pasar la app al fondo');
          }));
          if (terminado) return;
          if (!(await App.getState()).isActive) {
            this.cancelar?.('Abre la app para usar NFC');
            return;
          }
          if (terminado) return;
          listeners.push(await CapacitorNfc.addListener('nfcStateChange', ({ status }) => {
            if (status !== 'NFC_OK') this.cancelar?.(errorEstado(status));
          }));
          if (terminado) return;
          listeners.push(await CapacitorNfc.addListener('nfcEvent', async ({ tag }) => {
            if (atendiendo || terminado) return;
            atendiendo = true;
            try {
              if (record) {
                if (tag.isWritable === false) throw new Error('La etiqueta está bloqueada o es de solo lectura');
                // Incluye la cabecera NDEF y el tipo de registro
                const size = record.payload.length + (record.payload.length < 256 ? 4 : 7);
                if (tag.maxSize != null && size > tag.maxSize) throw new Error('La nota no cabe en esta etiqueta, reduce su contenido');
                escritura = CapacitorNfc.write({ records: [record], allowFormat: true });
                await escritura;
                terminar();
              } else {
                if (!tag.ndefMessage?.length) throw new Error('La etiqueta está vacía o no contiene datos NDEF legibles');
                const texto = tag.ndefMessage.find(r => r.tnf === 1 && r.type.length === 1 && r.type[0] === 84);
                if (!texto) throw new Error('La etiqueta no contiene una nota de Comunidad Alerta');
                terminar(undefined, leerRegistro(texto));
              }
            } catch (error) { terminar(error); }
          }));
          if (terminado) return;
          escaneoSolicitado = true;
          await CapacitorNfc.startScanning({ invalidateAfterFirstRead: false });
        })();
        void setup.catch(terminar);
      });
    } finally {
      await setup?.catch(() => undefined);
      if (timer) clearTimeout(timer);
      // La API no permite abortar una escritura nativa ya iniciada
      await escritura?.catch(() => undefined);
      try {
        const limpieza = await Promise.allSettled([
          ...listeners.map(listener => Promise.resolve().then(() => listener.remove())),
          ...(escaneoSolicitado ? [CapacitorNfc.stopScanning()] : [])
        ]);
        if (limpieza.some(resultado => resultado.status === 'rejected')) {
          throw new Error('No se pudo cerrar por completo la sesión NFC, vuelve a abrir la app');
        }
      } finally {
        this.cancelar = undefined;
        this.ocupado = false;
      }
    }
  }

  detener(): void { this.cancelar?.(); }
}
