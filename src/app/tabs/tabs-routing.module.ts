import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TabsPage } from './tabs.page';

const routes: Routes = [
  {
    path: '',
    component: TabsPage,

    children: [

      {
        path: 'home',
        loadChildren: () =>
          import('../home/home.module').then(
            m => m.HomePageModule
          )
      },

      {
        path: 'noticias',
        loadChildren: () =>
          import('../noticias/noticias.module').then(
            m => m.NoticiasPageModule
          )
      },

      {
        path: 'reportes',
        loadChildren: () =>
          import('../reportes/reportes.module').then(
            m => m.ReportesPageModule
          )
      },
       
      {
        path: 'multimedia',
        loadChildren: () =>
          import('../multimedia/multimedia.module').then(
            m => m.MultimediaPageModule
          )
      },

      {
        path: 'comunidad',
        loadChildren: () => import('../community/community.module').then(m => m.CommunityModule)
      },

      {
        path: 'detalle-noticia',
        loadChildren: () =>
          import('../detalle-noticia/detalle-noticia.module').then(
            m => m.DetalleNoticiaPageModule
          )
      },

      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      }

    ]
  }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes)
  ],

  exports: [
    RouterModule
  ],
})
export class TabsPageRoutingModule {}