import { Component } from '@angular/core';
import { addIcons } from 'ionicons';
import {
  homeOutline,
  newspaperOutline,
  alertCircleOutline,
  headsetOutline,
  peopleOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor() {
    addIcons({
      homeOutline,
      newspaperOutline,
      alertCircleOutline,
      headsetOutline,
      peopleOutline
    });
  }
}
