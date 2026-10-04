import { ChangeDetectorRef, Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { finalize, timeout } from 'rxjs/operators';
import { Router } from '@angular/router';

interface Noticia {
  id: number;
  title: string;
  body: string;
  fecha?: string;
}

@Component({
  selector: 'app-noticias',
  templateUrl: './noticias.page.html',
  styleUrls: ['./noticias.page.scss'],
  standalone: false,
})
export class NoticiasPage {

  noticias: Noticia[] = [];
  cargando: boolean = false;
  error: boolean = false;

  nuevoTitulo: string = '';
  nuevoContenido: string = '';
  publicando: boolean = false;
  mensajePublicacion: string = '';

  private readonly urlNoticias =
    'https://jsonplaceholder.typicode.com/posts';

  private readonly claveCache =
    'comunidad_alerta_noticias';

  private cargaInicialRealizada = false;

  constructor(
    private http: HttpClient,
    private cd: ChangeDetectorRef,
    private router: Router
  ) {}

  ionViewDidEnter(): void {

    if (this.cargaInicialRealizada) {
      return;
    }

    this.cargaInicialRealizada = true;

    setTimeout(() => {
      this.cargarNoticiasIniciales();
    }, 300);
  }

  cargarNoticiasIniciales(): void {
    const noticiasGuardadas =
      localStorage.getItem(this.claveCache);

    if (noticiasGuardadas) {
      try {
        const noticias: Noticia[] =
          JSON.parse(noticiasGuardadas);

        this.noticias = noticias.map(noticia => ({
          ...noticia,
          fecha: noticia.fecha || new Date().toISOString()
        }));

        this.cd.detectChanges();

      } catch (error) {
        console.error(
          'Error al leer la caché:',
          error
        );
      }
    }

    this.cargando = true;
    this.error = false;

    this.cd.detectChanges();

    this.http.get<Noticia[]>(this.urlNoticias).pipe(

      timeout(8000),

      finalize(() => {
        this.cargando = false;
        this.cd.detectChanges();
      })
      
    ).subscribe({

      next: (respuesta: Noticia[]) => {

        const fechaConsulta =
          new Date().toISOString();

        this.noticias = respuesta
          .slice(0, 10)
          .map(noticia => ({
            ...noticia,
            fecha: fechaConsulta
          }));

        localStorage.setItem(
          this.claveCache,
          JSON.stringify(this.noticias)
        );

        this.error = false;
        this.cd.detectChanges();
      },

      error: (error) => {

        console.error(
          'Error al cargar noticias:',
          error
        );

        if (this.noticias.length > 0) {
          this.error = false;
        } else {
          this.error = true;
        }

        this.cd.detectChanges();
      }

    });
  }

  actualizarNoticias(event: any): void {

    this.error = false;
    this.cargando = true;

    this.cd.detectChanges();

    this.http.get<Noticia[]>(this.urlNoticias).pipe(

      timeout(8000),

      finalize(() => {

        event.target.complete();
        this.cargando = false;
        this.cd.detectChanges();
      })

    ).subscribe({

      next: (respuesta: Noticia[]) => {

        const fechaConsulta =
          new Date().toISOString();

        this.noticias = respuesta
          .slice(0, 10)
          .map(noticia => ({
            ...noticia,
            fecha: fechaConsulta
          }));

        localStorage.setItem(
          this.claveCache,
          JSON.stringify(this.noticias)
        );

        this.error = false;
        this.cd.detectChanges();
      },

      error: (error) => {

        console.error(
          'Error al actualizar noticias:',
          error
        );

        if (this.noticias.length > 0) {
          this.error = false;
        } else {
          this.error = true;
        }

        this.cd.detectChanges();
      }
    });
  }

  publicarNoticia(): void {

    if (
      !this.nuevoTitulo.trim() ||
      !this.nuevoContenido.trim()
    ) {
      this.mensajePublicacion =
        'Completa el título y el contenido.';
      return;
    }

    this.publicando = true;
    this.mensajePublicacion = '';

    const fechaPublicacion =
      new Date().toISOString();

    const nuevaNoticia = {
      title: this.nuevoTitulo.trim(),
      body: this.nuevoContenido.trim(),
      userId: 1
    };

    this.cd.detectChanges();

    this.http.post<Noticia>(
      this.urlNoticias,
      nuevaNoticia
    ).pipe(
      timeout(8000),

      finalize(() => {
        this.publicando = false;
        this.cd.detectChanges();
      })

    ).subscribe({

      next: (respuesta: Noticia) => {

        console.log(
          'Respuesta del POST:',
          respuesta
        );

        const noticiaPublicada: Noticia = {
          ...respuesta,
          fecha: fechaPublicacion
        };

        this.noticias.unshift(
          noticiaPublicada
        );

        localStorage.setItem(
          this.claveCache,
          JSON.stringify(this.noticias)
        );

        this.mensajePublicacion =
          'Noticia publicada correctamente.';

        this.nuevoTitulo = '';
        this.nuevoContenido = '';

        this.cd.detectChanges();
      },

      error: (error) => {

        console.error(
          'Error al publicar noticia:',
          error
        );

        this.mensajePublicacion =
          'No fue posible publicar la noticia.';

        this.cd.detectChanges();
      }

    });
  }

  abrirDetalle(id: number): void {

    this.router.navigate(
      ['/tabs/detalle-noticia'],
      {
        queryParams: {
          id: id
        }
      }
    );
  }
}