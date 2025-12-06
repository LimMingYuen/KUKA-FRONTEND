import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { SidebarComponent } from './sidebar/sidebar';
import { AuthService } from './services/auth.service';
import { LicenseService } from './services/license.service';

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
    MatProgressSpinnerModule,
    SidebarComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  title = 'KUKA-GUI';
  isCheckingLicense = signal<boolean>(true);

  constructor(
    public authService: AuthService,
    private licenseService: LicenseService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.checkLicense();
  }

  private checkLicense(): void {
    // Skip license check if already on license-activation page
    if (this.router.url === '/license-activation') {
      this.isCheckingLicense.set(false);
      return;
    }

    this.licenseService.getLicenseStatus().subscribe({
      next: (status) => {
        this.isCheckingLicense.set(false);

        if (!status.isValid) {
          // Redirect to license activation page
          this.router.navigate(['/license-activation']);
        }
      },
      error: () => {
        this.isCheckingLicense.set(false);
        // On error, redirect to license activation
        this.router.navigate(['/license-activation']);
      }
    });
  }
}
