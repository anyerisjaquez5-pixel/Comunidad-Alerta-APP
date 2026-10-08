import { Component, inject } from '@angular/core';
import { SqliteService, Tarea } from '../services/sqlite.service';

@Component({
  selector: 'app-tareas',
  templateUrl: './tareas.page.html',
  styleUrls: ['./tareas.page.scss'],
  standalone: false,
})
export class TareasPage {
  private readonly sqlite = inject(SqliteService);

  tareas: Tarea[] = [];
  titulo = '';
  mensaje = '';
  cargando = false;

  async ionViewWillEnter(): Promise<void> {
    await this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando = true;
    try {
      this.tareas = await this.sqlite.listar();
      this.mensaje = this.tareas.length ? '' : 'Todavía no hay tareas';
    } catch (error) {
      this.mensaje = error instanceof Error ? error.message : String(error);
    } finally {
      this.cargando = false;
    }
  }

  async agregar(): Promise<void> {
    const titulo = this.titulo.trim();
    if (!titulo) {
      this.mensaje = 'Escribe una tarea antes de agregarla';
      return;
    }

    try {
      await this.sqlite.crear(titulo);
      this.titulo = '';
      this.mensaje = 'Tarea agregada';
      await this.cargar();
    } catch (error) {
      this.mensaje = error instanceof Error ? error.message : String(error);
    }
  }

  async cambiarEstado(tarea: Tarea): Promise<void> {
    try {
      tarea.completada = tarea.completada ? 0 : 1;
      await this.sqlite.actualizar(tarea);
      this.mensaje = tarea.completada ? 'Tarea completada' : 'Tarea marcada como pendiente';
    } catch (error) {
      this.mensaje = error instanceof Error ? error.message : String(error);
      await this.cargar();
    }
  }

  async editar(tarea: Tarea): Promise<void> {
    const nuevoTitulo = window.prompt('Editar tarea', tarea.titulo)?.trim();
    if (!nuevoTitulo || nuevoTitulo === tarea.titulo) return;

    try {
      await this.sqlite.actualizar({ ...tarea, titulo: nuevoTitulo });
      this.mensaje = 'Tarea actualizada';
      await this.cargar();
    } catch (error) {
      this.mensaje = error instanceof Error ? error.message : String(error);
    }
  }

  async eliminar(tarea: Tarea): Promise<void> {
    try {
      await this.sqlite.eliminar(tarea.id);
      this.mensaje = 'Tarea eliminada';
      await this.cargar();
    } catch (error) {
      this.mensaje = error instanceof Error ? error.message : String(error);
    }
  }

  async refrescar(event: CustomEvent): Promise<void> {
    try {
      await this.cargar();
    } finally {
      (event.target as HTMLIonRefresherElement).complete();
    }
  }
}
