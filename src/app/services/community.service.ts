import { Injectable } from '@angular/core';

export interface Perfil { nombre: string; sector: string; descripcion: string }
export interface Nota { id: string; titulo: string; contenido: string; autor: string; fecha: string }

// Valida también los datos recibidos de otros dispositivos
export function validarNota(valor: unknown): Nota {
  const n = valor as Partial<Nota> | null;
  if (!n || typeof n !== 'object' ||
      typeof n.id !== 'string' || n.id.length > 80 || !n.id ||
      typeof n.titulo !== 'string' || !n.titulo.trim() || n.titulo.length > 60 ||
      typeof n.contenido !== 'string' || !n.contenido.trim() || n.contenido.length > 240 ||
      typeof n.autor !== 'string' || !n.autor.trim() || n.autor.length > 40 ||
      typeof n.fecha !== 'string' || n.fecha.length > 30 || !Number.isFinite(Date.parse(n.fecha))) {
    throw new Error('La nota no tiene un formato válido');
  }
  return { id: n.id, titulo: n.titulo, contenido: n.contenido, autor: n.autor, fecha: n.fecha };
}

@Injectable({ providedIn: 'root' })
export class CommunityService {
  private readonly perfilKey = 'comunidad_alerta_perfil_v1';
  private readonly notasKey = 'comunidad_alerta_notas_v1';

  perfil(): Perfil {
    const raw = localStorage.getItem(this.perfilKey);
    if (!raw) return { nombre: '', sector: '', descripcion: '' };
    const p = JSON.parse(raw) as Perfil;
    if (!p || typeof p.nombre !== 'string' || typeof p.sector !== 'string' || typeof p.descripcion !== 'string') {
      throw new Error('No se pudo leer el perfil guardado');
    }
    return p;
  }

  guardarPerfil(p: Perfil): void {
    if (!p.nombre.trim() || p.nombre.length > 40 || p.sector.length > 60 || p.descripcion.length > 160) {
      throw new Error('Revisa el nombre y los límites del perfil');
    }
    localStorage.setItem(this.perfilKey, JSON.stringify({
      nombre: p.nombre.trim(), sector: p.sector.trim(), descripcion: p.descripcion.trim()
    }));
  }

  notas(): Nota[] {
    const raw = localStorage.getItem(this.notasKey);
    if (!raw) return [];
    const datos: unknown = JSON.parse(raw);
    if (!Array.isArray(datos)) throw new Error('No se pudieron leer las notas guardadas');
    return datos.map(validarNota);
  }

  guardarNota(n: Nota): void {
    const nota = validarNota(n);
    const notas = this.notas();
    // Evita duplicados y conserva la primera copia recibida
    if (notas.some(item => item.id === nota.id)) throw new Error('Esta nota ya está guardada');
    localStorage.setItem(this.notasKey, JSON.stringify([nota, ...notas]));
  }
}
