import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { ConnectionStatus } from '@capacitor/network';
import { NetworkService } from '../services/network.service';
import { HttpClient } from '@angular/common/http';
@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit, OnDestroy {
  conectado: boolean = true;
  tipoConexion: string = 'unknown';
  private networkSubscription?: Subscription;
  constructor(
    private networkService: NetworkService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient
  ) {}
  ngOnInit() {
    this.networkSubscription =
      this.networkService.connectionStatus$.subscribe(
        (status: ConnectionStatus) => {
          this.conectado = status.connected;
          this.tipoConexion = status.connectionType;
          console.log('Conexión actual:', this.conectado);
          console.log('Tipo de conexión:', this.tipoConexion);
          // Actualizar inmediatamente la pantalla
          this.cdr.detectChanges();
        }
      );
  }
  // Guardar o enviar datos dependiendo de la conexión
  guardarDato() {
    const datos = {
      mensaje: 'Dato de Comunidad Alerta',
      fecha: new Date().toISOString()
    };
    if (!this.conectado) {
      // Sin conexión: guardar localmente
      localStorage.setItem('datoOffline', JSON.stringify(datos));
      console.log('Sin conexión. Dato guardado localmente:', datos);
    } else {
      // Con conexión: enviar a la API
      this.http.post(
        'https://jsonplaceholder.typicode.com/posts',
        datos
      ).subscribe({
        next: (respuesta) => {
          console.log('Dato enviado al servidor:', respuesta);
        },
        error: (error) => {
          console.error('Error al enviar el dato:', error);
        }
      });
    }
  }
  ngOnDestroy() {
    this.networkSubscription?.unsubscribe();
  }
}
