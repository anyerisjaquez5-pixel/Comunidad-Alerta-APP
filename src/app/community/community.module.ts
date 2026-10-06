import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular/lazy';
import { CommunityPage } from './community.page';

@NgModule({
  declarations: [CommunityPage],
  imports: [CommonModule, FormsModule, IonicModule, RouterModule.forChild([{ path: '', component: CommunityPage }])]
})
export class CommunityModule {}
