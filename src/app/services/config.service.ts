import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

interface AppConfig {
  apiUrl: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private config: AppConfig = {
    apiUrl: 'http://localhost:5109' // Default fallback
  };

  constructor(private http: HttpClient) {}

  /**
   * Load configuration from config.json
   * Called by APP_INITIALIZER before app starts
   */
  async loadConfig(): Promise<void> {
    try {
      const config = await firstValueFrom(
        this.http.get<AppConfig>('/assets/config.json')
      );
      if (config) {
        this.config = config;
      }
    } catch (error) {
      // Could not load config.json, using default configuration
    }
  }

  /**
   * Get the API base URL
   */
  get apiUrl(): string {
    return this.config.apiUrl;
  }
}
