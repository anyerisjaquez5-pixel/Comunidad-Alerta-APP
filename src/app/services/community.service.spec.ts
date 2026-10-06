import { beforeEach, describe, expect, it } from 'vitest';
import { CommunityService, Nota, validarNota } from './community.service';
import { leerRegistro, registroNota } from './nfc.service';

const nota: Nota = { id: 'ejemplo-1', titulo: 'Reunión de vecinos', contenido: 'Sábado a las 5, frente al salón', autor: 'José', fecha: '2026-10-06T01:00:00.000Z' };

describe('Notas y perfil comunitario', () => {
  beforeEach(() => localStorage.clear());

  it('conserva el perfil y las notas al crear otra instancia', () => {
    const datos = new CommunityService();
    datos.guardarPerfil({ nombre: ' Ana ', sector: ' Centro ', descripcion: '' });
    datos.guardarNota(nota);
    const reabierto = new CommunityService();
    expect(reabierto.perfil().nombre).toBe('Ana');
    expect(reabierto.notas()).toEqual([nota]);
  });

  it('rechaza notas duplicadas sin reemplazar la copia guardada', () => {
    const datos = new CommunityService();
    datos.guardarNota(nota);
    expect(() => datos.guardarNota({ ...nota, contenido: 'Modificada' })).toThrow('ya está guardada');
    expect(datos.notas()).toEqual([nota]);
  });

  it('rechaza entradas vacías, grandes o con fecha inválida', () => {
    for (const cambio of [{ titulo: ' ' }, { contenido: 'x'.repeat(241) }, { fecha: 'ayer' }, { autor: null }]) {
      expect(() => validarNota({ ...nota, ...cambio })).toThrow();
    }
  });

  it('no reemplaza silenciosamente un almacenamiento corrupto', () => {
    localStorage.setItem('comunidad_alerta_notas_v1', 'contenido roto');
    expect(() => new CommunityService().guardarNota(nota)).toThrow();
    expect(localStorage.getItem('comunidad_alerta_notas_v1')).toBe('contenido roto');
  });

  it('transporta acentos y emojis en un registro NDEF de texto', () => {
    const original = { ...nota, contenido: 'Atención: reunión mañana 📌' };
    expect(leerRegistro(registroNota(original))).toEqual(original);
  });

  it('rechaza etiquetas externas, UTF-16 y registros truncados', () => {
    const registro = registroNota(nota);
    expect(() => leerRegistro({ ...registro, type: [85] })).toThrow();
    expect(() => leerRegistro({ ...registro, payload: [128, 65] })).toThrow();
    expect(() => leerRegistro({ ...registro, payload: [63] })).toThrow();
  });

  it('rechaza JSON externo que no representa una nota', () => {
    const payload = [2, 101, 115, ...new TextEncoder().encode('{"mensaje":"otro formato"}')];
    expect(() => leerRegistro({ tnf: 1, type: [84], id: [], payload })).toThrow();
  });
});
