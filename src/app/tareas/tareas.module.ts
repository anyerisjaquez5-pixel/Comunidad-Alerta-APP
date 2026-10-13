import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular/lazy';

import { TareasPageRoutingModule } from './tareas-routing.module';
import { TareasPage } from './tareas.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TareasPageRoutingModule
  ],
  declarations: [TareasPage]
})
export class TareasPageModule {}