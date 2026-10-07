import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection,
} from '@capacitor-community/sqlite';

export interface Tarea {
  id: number;
  titulo: string;
  completada: number;
  fecha: string;
}

@Injectable({ providedIn: 'root' })
export class SqliteService {
  private readonly dbName = 'comunidad_alerta';
  private readonly table = 'tareas';
  private sqlite = new SQLiteConnection(CapacitorSQLite);
  private db?: SQLiteDBConnection;
  private inicializada = false;

  async inicializar(): Promise<void> {
    if (this.inicializada) return;

    if (Capacitor.getPlatform() === 'web') {
      // SQLite nativo se utiliza en Android/iOS. Para poder probar la interfaz
      // con `ionic serve`, se conserva una copia local como respaldo de desarrollo.
      this.inicializada = true;
      return;
    }

    const consistency = await this.sqlite.checkConnectionsConsistency();
    const connected = await this.sqlite.isConnection(this.dbName, false);

    if (consistency.result && connected.result) {
      this.db = await this.sqlite.retrieveConnection(this.dbName, false);
    } else {
      this.db = await this.sqlite.createConnection(
        this.dbName,
        false,
        'no-encryption',
        1,
        false
      );
    }

    await this.db.open();
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS ${this.table} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT NOT NULL,
        completada INTEGER NOT NULL DEFAULT 0,
        fecha TEXT NOT NULL
      );
    `);

    this.inicializada = true;
  }

  async listar(): Promise<Tarea[]> {
    await this.inicializar();
    if (Capacitor.getPlatform() === 'web') return this.listarWeb();

    const result = await this.db!.query(
      `SELECT id, titulo, completada, fecha FROM ${this.table} ORDER BY id DESC;`
    );
    return (result.values ?? []) as Tarea[];
  }

  async crear(titulo: string): Promise<Tarea> {
    await this.inicializar();
    const fecha = new Date().toISOString();

    if (Capacitor.getPlatform() === 'web') {
      const tareas = this.listarWeb();
      const id = tareas.length ? Math.max(...tareas.map(t => t.id)) + 1 : 1;
      const tarea: Tarea = { id, titulo, completada: 0, fecha };
      localStorage.setItem(this.webKey(), JSON.stringify([tarea, ...tareas]));
      return tarea;
    }

    const result = await this.db!.run(
      `INSERT INTO ${this.table} (titulo, completada, fecha) VALUES (?, 0, ?);`,
      [titulo, fecha]
    );
    return {
      id: Number(result.changes?.lastId),
      titulo,
      completada: 0,
      fecha,
    };
  }

  async actualizar(tarea: Tarea): Promise<void> {
    await this.inicializar();

    if (Capacitor.getPlatform() === 'web') {
      const tareas = this.listarWeb().map(item => item.id === tarea.id ? tarea : item);
      localStorage.setItem(this.webKey(), JSON.stringify(tareas));
      return;
    }

    await this.db!.run(
      `UPDATE ${this.table} SET titulo = ?, completada = ? WHERE id = ?;`,
      [tarea.titulo, tarea.completada, tarea.id]
    );
  }

  async eliminar(id: number): Promise<void> {
    await this.inicializar();

    if (Capacitor.getPlatform() === 'web') {
      const tareas = this.listarWeb().filter(item => item.id !== id);
      localStorage.setItem(this.webKey(), JSON.stringify(tareas));
      return;
    }

    await this.db!.run(`DELETE FROM ${this.table} WHERE id = ?;`, [id]);
  }

  private webKey(): string {
    return 'comunidad_alerta_tareas';
  }

  private listarWeb(): Tarea[] {
    try {
      return JSON.parse(localStorage.getItem(this.webKey()) ?? '[]') as Tarea[];
    } catch {
      return [];
    }
  }
}
