import { Component, OnInit } from '@angular/core';
import {
  BarcodeScanner,
  BarcodeFormat
} from '@capacitor-mlkit/barcode-scanning';

// Estructura de datos de cada podcast
interface Podcast {
  titulo: string;
  descripcion: string;
  audio: string;
}

@Component({
  selector: 'app-multimedia',
  templateUrl: './multimedia.page.html',
  styleUrls: ['./multimedia.page.scss'],
  standalone: false,
})
export class MultimediaPage implements OnInit {

  // Lista de podcasts disponibles en la aplicación
  podcasts: Podcast[] = [
    {
      titulo: 'Tecnología en la comunidad',
      descripcion: 'Importancia de la tecnología para mejorar los servicios de la comunidad.',
      audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
    },
    {
      titulo: 'Cuidado del medio ambiente',
      descripcion: 'Consejos para mantener limpia y saludable nuestra comunidad.',
      audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'
    },
    {
      titulo: 'Participación ciudadana',
      descripcion: 'Cómo la comunidad puede participar en la solución de problemas locales.',
      audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'
    }
  ];

  // Podcast que aparece seleccionado inicialmente
  podcastSeleccionado: Podcast = this.podcasts[0];

  // Controlan el estado y progreso del reproductor
  reproduciendo = false;
  progreso = 0;
  duracion = 0;

  // Resultado del código QR
  codigoEscaneado = '';
  mensajeQR = '';

  // Elemento de audio HTML5 utilizado para reproducir los podcasts
  private audio = new Audio();

  constructor() {}

  ngOnInit() {

    // Carga el audio del podcast seleccionado inicialmente
    this.audio.src = this.podcastSeleccionado.audio;

    // Actualiza la barra de progreso mientras se reproduce el audio
    this.audio.addEventListener('timeupdate', () => {
      if (this.audio.duration) {
        this.progreso =
          (this.audio.currentTime / this.audio.duration) * 100;
      }
    });

    // Obtiene la duración total del audio
    this.audio.addEventListener('loadedmetadata', () => {
      this.duracion = this.audio.duration;
    });

    // Cuando termina el audio, reinicia el reproductor
    this.audio.addEventListener('ended', () => {
      this.reproduciendo = false;
      this.progreso = 0;
    });
  }

  // Permite seleccionar un podcast diferente de la lista
  seleccionarPodcast(podcast: Podcast) {
    this.detener();

    this.podcastSeleccionado = podcast;
    this.audio.src = podcast.audio;
    this.audio.load();
  }

  // Inicia la reproducción del podcast
  reproducir() {
    this.audio.play();
    this.reproduciendo = true;
  }

  // Pausa la reproducción del podcast
  pausar() {
    this.audio.pause();
    this.reproduciendo = false;
  }

  // Detiene el audio y vuelve al inicio
  detener() {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.progreso = 0;
    this.reproduciendo = false;
  }

  // Permite mover manualmente la barra de progreso
  cambiarProgreso(event: any) {
    if (!this.duracion) {
      return;
    }

    const valor = Number(event.detail.value);

    this.audio.currentTime =
      (valor / 100) * this.duracion;

    this.progreso = valor;
  }

  // Escanea un código QR para registrar asistencia
  async escanearQR() {

    try {

      this.mensajeQR = 'Abriendo lector QR...';
      this.codigoEscaneado = '';

      const resultado = await BarcodeScanner.scan({
        formats: [BarcodeFormat.QrCode],
        autoZoom: true
      });

      if (resultado.barcodes.length > 0) {

        const codigo = resultado.barcodes[0].displayValue;

        this.codigoEscaneado = codigo || '';

        if (this.codigoEscaneado) {
          this.mensajeQR =
            'Asistencia registrada correctamente.';
        } else {
          this.mensajeQR =
            'El código QR fue detectado, pero no contiene información.';
        }

      } else {

        this.mensajeQR =
          'No se detectó ningún código QR.';

      }

    } catch (error) {

      console.error(
        'Error al escanear código QR:',
        error
      );

      this.mensajeQR =
        'No fue posible abrir el lector QR en este momento.';

    }

  }

}