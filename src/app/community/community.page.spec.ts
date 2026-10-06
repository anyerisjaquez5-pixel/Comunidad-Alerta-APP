import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CommunityPage } from './community.page';
import { CommunityModule } from './community.module';
import { CommunityService, Nota } from '../services/community.service';
import { NfcService } from '../services/nfc.service';
import { CommunityBleService } from '../services/community-ble.service';

const nota: Nota = { id: 'recibida-1', titulo: 'Reunión', contenido: 'Mañana 📌', autor: 'José', fecha: '2026-10-06T12:00:00.000Z' };

describe('Comunidad y revisión de notas recibidas', () => {
  const nfc = { estado: vi.fn().mockResolvedValue('NFC listo'), ejecutar: vi.fn(), detener: vi.fn() };
  const ble = { detener: vi.fn().mockResolvedValue(undefined) };
  let page: CommunityPage;
  let datos: CommunityService;

  beforeEach(async () => {
    localStorage.clear();
    nfc.ejecutar.mockReset();
    nfc.detener.mockClear();
    TestBed.configureTestingModule({ imports: [CommunityModule], providers: [
      { provide: NfcService, useValue: nfc }, { provide: CommunityBleService, useValue: ble }
    ] });
    const fixture = TestBed.createComponent(CommunityPage);
    page = fixture.componentInstance;
    datos = TestBed.inject(CommunityService);
    await page.ionViewWillEnter();
    fixture.detectChanges();
  });

  it('exige revisar y guardar explícitamente la nota recibida', async () => {
    nfc.ejecutar.mockResolvedValue(nota);
    await page.usarNfc();
    expect(page.recibida).toEqual(nota);
    expect(datos.notas()).toEqual([]);
    page.guardarRecibida();
    expect(datos.notas()).toEqual([nota]);
    expect(page.recibida).toBeUndefined();
  });

  it('conserva la primera copia al recibir una nota duplicada', async () => {
    datos.guardarNota(nota);
    nfc.ejecutar.mockResolvedValue({ ...nota, contenido: 'Otro texto' });
    await page.usarNfc();
    page.guardarRecibida();
    expect(datos.notas()).toEqual([nota]);
    expect(page.mensaje).toContain('ya está guardada');
  });

  it('cancela al salir y descarta un resultado tardío', async () => {
    let resolver!: (nota: Nota) => void;
    nfc.ejecutar.mockReturnValue(new Promise<Nota>(resolve => { resolver = resolve; }));
    const operacion = page.usarNfc();
    page.ionViewWillLeave();
    expect(nfc.detener).toHaveBeenCalled();
    resolver(nota);
    await operacion;
    expect(page.recibida).toBeUndefined();
    expect(datos.notas()).toEqual([]);
    expect(page.ocupado).toBe(false);
  });

  it('quita la nota anterior si una lectura nueva falla', async () => {
    page.recibida = nota;
    nfc.ejecutar.mockRejectedValue(new Error('Etiqueta vacía'));
    await page.usarNfc();
    expect(page.recibida).toBeUndefined();
    expect(page.mensaje).toBe('Etiqueta vacía');
  });
});
