import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular/lazy';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, RouterLink } from '@angular/router';
import { By } from '@angular/platform-browser';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';
import { HomePageModule } from './home.module';
import { NetworkService } from '../services/network.service';

import { HomePage } from './home.page';

vi.mock('@capacitor-community/bluetooth-le', () => ({ BleClient: {
  initialize: vi.fn().mockResolvedValue(undefined), isEnabled: vi.fn().mockResolvedValue(false),
  stopLEScan: vi.fn().mockResolvedValue(undefined)
} }));

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;
  let conexion: BehaviorSubject<{ connected: boolean; connectionType: string }>;

  beforeEach(async () => {
    conexion = new BehaviorSubject<{ connected: boolean; connectionType: string }>({ connected: true, connectionType: 'wifi' });
    await TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), HomePageModule],
      providers: [provideHttpClient(), provideRouter([]),
        { provide: NetworkService, useValue: { connectionStatus$: conexion } }]
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('muestra el acceso a Comunidad junto a conexión y Bluetooth', () => {
    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('Notas comunitarias');
    expect(element.textContent).toContain('Estado de conexión');
    expect(element.textContent).toContain('Bluetooth');
    const link = fixture.debugElement.query(By.directive(RouterLink)).injector.get(RouterLink);
    expect(link.urlTree?.toString()).toBe('/tabs/comunidad');
  });

  it('conserva los mensajes offline y la lista vacía de Bluetooth', async () => {
    conexion.next({ connected: false, connectionType: 'none' });
    component.dispositivosBluetooth = [];
    component.buscandoBluetooth = false;
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('Modo sin conexión');
    expect(element.textContent).toContain('No se han encontrado dispositivos Bluetooth');
  });
});
