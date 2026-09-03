import { Component, OnInit } from '@angular/core';
import { NetworkService } from '../services/network.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {

  conectado: boolean = true;

  constructor(private networkService: NetworkService) {}

  async ngOnInit() {
    this.conectado = await this.networkService.obtenerEstado();
  }
}
