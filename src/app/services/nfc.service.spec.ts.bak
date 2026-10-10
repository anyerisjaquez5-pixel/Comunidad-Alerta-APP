import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '@capacitor/app';
import { CapacitorNfc, NdefRecord, NfcEvent, NfcStateChangeEvent } from '@capgo/capacitor-nfc';
import { NfcService, leerRegistro, registroNota } from './nfc.service';
import { Nota } from './community.service';

vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => 'android' } }));
vi.mock('@capacitor/app', () => ({ App: { addListener: vi.fn(), getState: vi.fn() } }));
vi.mock('@capgo/capacitor-nfc', () => ({ CapacitorNfc: {
  getStatus: vi.fn(), addListener: vi.fn(), startScanning: vi.fn(), stopScanning: vi.fn(), write: vi.fn()
} }));

const nota: Nota = { id: 'nfc-1', titulo: 'Reunión 📌', contenido: 'Mañana en el salón 😊', autor: 'José', fecha: '2026-10-06T12:00:00.000Z' };
function diferido<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

// Vacía las continuaciones de las llamadas nativas simuladas
async function avanzar() { for (let i = 0; i < 30; i++) await Promise.resolve(); }

describe('Sesiones NFC con API nativa simulada', () => {
  let servicio: NfcService;
  let evento: (event: NfcEvent) => void;
  let estado: (event: NfcStateChangeEvent) => void;
  let app: (event: { isActive: boolean }) => void;
  let remove: ReturnType<typeof vi.fn<() => Promise<void>>>;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    servicio = new NfcService();
    remove = vi.fn().mockResolvedValue(undefined);
    vi.mocked(CapacitorNfc.getStatus).mockResolvedValue({ status: 'NFC_OK' });
    vi.mocked(App.getState).mockResolvedValue({ isActive: true });
    vi.mocked(App.addListener as (name: 'appStateChange', callback: (event: { isActive: boolean }) => void) => Promise<{ remove: () => Promise<void> }>).mockImplementation(async (_, callback) => {
      app = callback;
      return { remove };
    });
    vi.mocked(CapacitorNfc.addListener as (name: string, callback: (event: never) => void) => Promise<{ remove: () => Promise<void> }>).mockImplementation(async (nombre, callback) => {
      if (nombre === 'nfcEvent') evento = callback as typeof evento;
      if (nombre === 'nfcStateChange') estado = callback as typeof estado;
      return { remove };
    });
    vi.mocked(CapacitorNfc.startScanning).mockResolvedValue(undefined);
    vi.mocked(CapacitorNfc.stopScanning).mockResolvedValue(undefined);
    vi.mocked(CapacitorNfc.write).mockResolvedValue(undefined);
  });
  afterEach(() => vi.useRealTimers());

  async function iniciar(escribir?: Nota) {
    const resultado = servicio.ejecutar(escribir);
    const observado = resultado.then(value => ({ value, error: '' }), error => ({ value: undefined, error: error.message as string }));
    await avanzar();
    return { observado };
  }

  it('bloquea otra operación mientras consulta el estado', async () => {
    const pendiente = diferido<{ status: 'NFC_OK' }>();
    vi.mocked(CapacitorNfc.getStatus).mockReturnValue(pendiente.promise);
    const { observado } = await iniciar();
    await expect(servicio.ejecutar()).rejects.toThrow('en curso');
    servicio.detener();
    pendiente.resolve({ status: 'NFC_OK' });
    expect((await observado).error).toContain('cancelada');
    expect(CapacitorNfc.startScanning).not.toHaveBeenCalled();
  });

  it.each(['NFC_DISABLED', 'NO_NFC'] as const)('rechaza %s antes del escaneo', async status => {
    vi.mocked(CapacitorNfc.getStatus).mockResolvedValue({ status });
    const { observado } = await iniciar();
    expect((await observado).error).toMatch(/Activa NFC|no tiene NFC/);
    expect(CapacitorNfc.startScanning).not.toHaveBeenCalled();
  });

  it('lee UTF-8 y entrega la nota sin guardarla automáticamente', async () => {
    localStorage.clear();
    const { observado } = await iniciar();
    evento({ type: 'ndef', tag: { ndefMessage: [registroNota(nota)] } });
    expect((await observado).value).toEqual(nota);
    expect(localStorage.length).toBe(0);
    expect(remove).toHaveBeenCalledTimes(3);
    expect(CapacitorNfc.stopScanning).toHaveBeenCalledOnce();
  });

  it.each<{ ndefMessage: NdefRecord[] }>([
    { ndefMessage: [] },
    { ndefMessage: [{ tnf: 1, type: [85], id: [], payload: [1] }] },
    { ndefMessage: [{ ...registroNota(nota), payload: [2, 101, 115, 255] }] }
  ])('rechaza contenido vacío o inválido', async ({ ndefMessage }) => {
    const { observado } = await iniciar();
    evento({ type: 'ndef', tag: { ndefMessage } });
    expect((await observado).error).not.toBe('');
    expect(remove).toHaveBeenCalledTimes(3);
  });

  it.each([{ isWritable: false }, { maxSize: 10 }])('rechaza bloqueo o capacidad insuficiente', async tag => {
    const { observado } = await iniciar(nota);
    evento({ type: 'ndef', tag });
    expect((await observado).error).toMatch(/bloqueada|no cabe/);
    expect(CapacitorNfc.write).not.toHaveBeenCalled();
  });

  it('cuenta la cabecera NDEF larga al comprobar la capacidad', async () => {
    const grande = { ...nota, contenido: 'á'.repeat(240) };
    const registro = registroNota(grande);
    const { observado } = await iniciar(grande);
    evento({ type: 'ndef', tag: { maxSize: registro.payload.length + 6 } });
    expect((await observado).error).toContain('no cabe');
    expect(CapacitorNfc.write).not.toHaveBeenCalled();
  });

  it('espera la escritura nativa e ignora eventos duplicados', async () => {
    const pendiente = diferido<void>();
    vi.mocked(CapacitorNfc.write).mockReturnValue(pendiente.promise);
    const { observado } = await iniciar(nota);
    const finalizado = vi.fn();
    void observado.then(finalizado);
    evento({ type: 'ndef', tag: {} });
    evento({ type: 'ndef', tag: {} });
    await avanzar();
    expect(finalizado).not.toHaveBeenCalled();
    expect(CapacitorNfc.write).toHaveBeenCalledOnce();
    pendiente.resolve();
    expect((await observado).error).toBe('');
  });

  it('no informa éxito cuando falla la escritura nativa', async () => {
    vi.mocked(CapacitorNfc.write).mockRejectedValue(new Error('Failed to write NDEF message.'));
    const { observado } = await iniciar(nota);
    evento({ type: 'ndef', tag: {} });
    expect((await observado).error).toContain('No se pudo confirmar');
  });

  it('conserva el bloqueo durante una escritura cancelada y advierte que pudo cambiar la etiqueta', async () => {
    const pendiente = diferido<void>();
    vi.mocked(CapacitorNfc.write).mockReturnValue(pendiente.promise);
    const { observado } = await iniciar(nota);
    evento({ type: 'ndef', tag: {} });
    servicio.detener();
    await avanzar();
    await expect(servicio.ejecutar()).rejects.toThrow('en curso');
    pendiente.resolve();
    expect((await observado).error).toContain('puede haber cambiado');
    expect(CapacitorNfc.stopScanning).toHaveBeenCalledOnce();
  });

  it.each(['cancelar', 'tiempo', 'fondo', 'apagado'])('limpia al terminar por %s', async motivo => {
    const { observado } = await iniciar();
    if (motivo === 'cancelar') servicio.detener();
    if (motivo === 'tiempo') await vi.advanceTimersByTimeAsync(30000);
    if (motivo === 'fondo') app({ isActive: false });
    if (motivo === 'apagado') estado({ status: 'NFC_DISABLED', enabled: false });
    expect((await observado).error).not.toBe('');
    expect(remove).toHaveBeenCalledTimes(3);
    expect(CapacitorNfc.stopScanning).toHaveBeenCalledOnce();
    const siguiente = await iniciar();
    servicio.detener();
    await siguiente.observado;
  });

  it('limpia un listener que termina de instalarse después de cancelar', async () => {
    const pendiente = diferido<{ remove: () => Promise<void> }>();
    vi.mocked(App.addListener).mockReturnValue(pendiente.promise);
    const { observado } = await iniciar();
    servicio.detener();
    pendiente.resolve({ remove });
    await observado;
    expect(remove).toHaveBeenCalledOnce();
    expect(CapacitorNfc.startScanning).not.toHaveBeenCalled();
  });

  it('intenta toda la limpieza aunque falle la eliminación de listeners', async () => {
    remove.mockRejectedValue(new Error('listener'));
    const { observado } = await iniciar();
    servicio.detener();
    expect((await observado).error).toContain('cerrar por completo');
    expect(remove).toHaveBeenCalledTimes(3);
    expect(CapacitorNfc.stopScanning).toHaveBeenCalledOnce();
  });

  it('rechaza el bit reservado y bytes fuera de rango', () => {
    const registro = registroNota(nota);
    expect(() => leerRegistro({ ...registro, payload: [66, ...registro.payload.slice(1)] })).toThrow();
    expect(() => leerRegistro({ ...registro, payload: [...registro.payload, 256] })).toThrow();
  });
});
