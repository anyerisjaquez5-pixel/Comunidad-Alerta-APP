import { ChangeDetectorRef, Component, inject, OnDestroy } from '@angular/core';
import { ScanResult } from '@capacitor-community/bluetooth-le';
import { CommunityService, Nota, Perfil } from '../services/community.service';
import { NfcService } from '../services/nfc.service';
import { CommunityBleService } from '../services/community-ble.service';

@Component({ selector: 'app-community', templateUrl: './community.page.html', standalone: false })
export class CommunityPage implements OnDestroy {
  private datos = inject(CommunityService);
  private nfc = inject(NfcService);
  private ble = inject(CommunityBleService);
  private cd = inject(ChangeDetectorRef);

  perfil: Perfil = { nombre: '', sector: '', descripcion: '' };
  notas: Nota[] = [];
  titulo = '';
  contenido = '';
  mensaje = '';
  estadoNfc = '';
  ocupado = false;
  publicando = false;
  recibida?: Nota;
  dispositivos: ScanResult[] = [];
  private visible = false;
  private publicationTimer?: ReturnType<typeof setTimeout>;

  async ionViewWillEnter(): Promise<void> {
    this.visible = true;
    try { this.perfil = this.datos.perfil(); this.notas = this.datos.notas(); }
    catch (error) { this.error(error); }
    try { this.estadoNfc = await this.nfc.estado(); }
    catch (error) { this.error(error); }
    this.actualizar();
  }

  guardarPerfil(): void {
    try { this.datos.guardarPerfil(this.perfil); this.mensaje = 'Perfil guardado en este dispositivo'; }
    catch (error) { this.error(error); }
  }

  crear(): void {
    try {
      const autor = this.datos.perfil().nombre;
      if (!autor) throw new Error('Guarda tu perfil antes de crear una nota');
      this.datos.guardarNota({ id: crypto.randomUUID(), titulo: this.titulo.trim(),
        contenido: this.contenido.trim(), autor, fecha: new Date().toISOString() });
      this.notas = this.datos.notas();
      this.titulo = ''; this.contenido = '';
      this.mensaje = 'Nota guardada';
    } catch (error) { this.error(error); }
  }

  async usarNfc(nota?: Nota): Promise<void> {
    if (this.ocupado || this.publicando) return;
    this.ocupado = true;
    this.mensaje = nota ? 'Acerca la etiqueta para reemplazar su contenido con esta nota' : 'Acerca la etiqueta para leer la nota';
    try {
      const recibida = await this.nfc.ejecutar(nota);
      if (recibida) this.recibida = recibida;
      this.mensaje = nota ? 'Nota escrita en la etiqueta' : 'Nota leída, revisa el contenido antes de guardarlo';
    } catch (error) { this.error(error); }
    finally { this.ocupado = false; this.actualizar(); }
  }

  guardarRecibida(): void {
    if (!this.recibida) return;
    try {
      this.datos.guardarNota(this.recibida); this.notas = this.datos.notas();
      this.recibida = undefined; this.mensaje = 'Nota recibida guardada';
    } catch (error) { this.error(error); }
  }

  async publicar(nota: Nota): Promise<void> {
    if (this.ocupado || this.publicando) return;
    this.ocupado = true;
    try {
      await this.ble.publicar(nota);
      if (!this.visible) { await this.ble.detener(); return; }
      this.publicando = true;
      this.mensaje = 'Nota disponible por BLE durante 60 segundos, busca desde el otro teléfono';
      this.publicationTimer = setTimeout(() => { void this.detener(); }, 60000);
    } catch (error) { this.error(error); }
    finally { this.ocupado = false; this.actualizar(); }
  }

  async buscar(): Promise<void> {
    if (this.ocupado || this.publicando) return;
    this.ocupado = true;
    this.dispositivos = [];
    this.mensaje = 'Buscando notas BLE durante 8 segundos';
    try {
      this.dispositivos = await this.ble.buscar();
      this.mensaje = this.dispositivos.length ? 'Selecciona un teléfono para leer su nota' : 'No se encontraron notas BLE disponibles';
    } catch (error) { this.error(error); }
    finally { this.ocupado = false; this.actualizar(); }
  }

  async recibir(id: string): Promise<void> {
    if (this.ocupado || this.publicando) return;
    this.ocupado = true;
    try { this.recibida = await this.ble.recibir(id); this.mensaje = 'Nota recibida por BLE, revisa el contenido'; }
    catch (error) { this.error(error); }
    finally { this.ocupado = false; this.actualizar(); }
  }

  async detener(): Promise<void> {
    this.nfc.detener();
    if (this.publicationTimer) clearTimeout(this.publicationTimer);
    try { await this.ble.detener(); }
    catch (error) { this.error(error); }
    this.publicando = false;
    this.actualizar();
  }

  ionViewWillLeave(): void { this.visible = false; void this.detener(); }
  ngOnDestroy(): void { this.visible = false; void this.detener(); }
  private actualizar(): void { if (this.visible) this.cd.detectChanges(); }
  private error(error: unknown): void { this.mensaje = error instanceof Error ? error.message : String(error); }
}
