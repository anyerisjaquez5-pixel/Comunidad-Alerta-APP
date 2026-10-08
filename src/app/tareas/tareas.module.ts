import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular/lazy';
import { TareasPage } from './tareas.page';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule],
  declarations: [TareasPage]
})
export class TareasPageModule {}
