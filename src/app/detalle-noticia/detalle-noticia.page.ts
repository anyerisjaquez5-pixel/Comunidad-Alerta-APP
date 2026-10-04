import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { finalize, timeout } from 'rxjs/operators';

interface Noticia {
  id: number;
  title: string;
  body: string;
  fecha?: string;
}

@Component({
  selector: 'app-detalle-noticia',
  templateUrl: './detalle-noticia.page.html',
  styleUrls: ['./detalle-noticia.page.scss'],
  standalone: false,
})
export class DetalleNoticiaPage implements OnInit {

  idNoticia: number = 0;
  noticia: Noticia | null = null;
  cargando: boolean = false;
  error: boolean = false;

  private readonly urlNoticias =
    'https://jsonplaceholder.typicode.com/posts';

  private readonly claveCache =
    'comunidad_alerta_noticias';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit(): void {

    this.route.queryParams.subscribe(params => {

      this.idNoticia =
        Number(params['id']);

      if (this.idNoticia > 0) {
        this.cargarNoticia();
      } else {
        this.error = true;
      }

    });
  }

  cargarNoticia(): void {

    this.cargando = true;
    this.error = false;

    const noticiasGuardadas =
      localStorage.getItem(this.claveCache);

    if (noticiasGuardadas) {

      try {

        const noticias: Noticia[] =
          JSON.parse(noticiasGuardadas);

        const noticiaEncontrada =
          noticias.find(
            noticia =>
              noticia.id === this.idNoticia
          );

        if (noticiaEncontrada) {

          this.noticia = noticiaEncontrada;
          this.cargando = false;
        }

      } catch (error) {

        console.error(
          'Error al leer la caché:',
          error
        );
      }
    }

    this.http
      .get<Noticia>(
        `${this.urlNoticias}/${this.idNoticia}`
      )
      .pipe(

        timeout(8000),

        finalize(() => {
          this.cargando = false;
        })

      )
      .subscribe({

        next: (respuesta: Noticia) => {

          this.noticia = {
            ...respuesta,
            fecha:
              this.noticia?.fecha ||
              new Date().toISOString()
          };

          this.error = false;
        },

        error: (error) => {

          console.error(
            'Error al cargar el detalle de la noticia:',
            error
          );

          if (this.noticia) {
            this.error = false;
          } else {
            this.error = true;
          }

          this.cargando = false;
        }
      });
  }
}