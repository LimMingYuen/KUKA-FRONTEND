import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

import { SidebarComponent } from './sidebar/sidebar';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    MatSnackBarModule,
    MatMenuModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    SidebarComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  title = 'KUKA-GUI';

  constructor(public authService: AuthService) {}
}
