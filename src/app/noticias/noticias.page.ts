import { ChangeDetectorRef, Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { finalize, timeout } from 'rxjs/operators';

interface Noticia {
  id: number;
  title: string;
  body: string;
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

  private readonly urlNoticias =
    'https://jsonplaceholder.typicode.com/posts';

  private cargaInicialRealizada = false;

  constructor(
    private http: HttpClient,
    private cd: ChangeDetectorRef
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

        this.noticias = respuesta.slice(0, 10);

        this.cd.detectChanges();
      },

      error: (error) => {

        console.error('Error al cargar noticias:', error);

        this.error = true;

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

        this.noticias = respuesta.slice(0, 10);

        this.cd.detectChanges();
      },

      error: (error) => {

        console.error('Error al actualizar noticias:', error);

        this.error = true;

        this.cd.detectChanges();
      }

    });
  }
}