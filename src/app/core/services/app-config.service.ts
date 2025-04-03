// src/app/core/services/app-config.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface AppConfig {
  serviceFeesPercentage: number;
  maxPackageWeight: number;
  maxPackageDimensions: number;
  otherParams?: any;
}

@Injectable({
  providedIn: 'root'
})
export class AppConfigService {
  private apiUrl = `${environment.apiUrl}/config`;
  private configSubject = new BehaviorSubject<AppConfig>({
    serviceFeesPercentage: 10, // Valeur par défaut: 10%
    maxPackageWeight: 30,
    maxPackageDimensions: 150
  });

  public config$ = this.configSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadConfig();
  }

  /**
   * Charge la configuration depuis le serveur
   */
  public loadConfig(): void {
    this.http.get<AppConfig>(`${this.apiUrl}/params`)
      .pipe(
        catchError(error => {
          console.error('Erreur lors du chargement de la configuration:', error);
          // En cas d'erreur, on conserve les valeurs par défaut
          return of(this.configSubject.value);
        }),
        tap(config => {
          this.configSubject.next(config);
        })
      )
      .subscribe();
  }

  /**
   * Calcule les frais de service basés sur le montant du colis
   * @param amount Le montant du colis
   * @returns Le montant des frais de service
   */
  public calculateServiceFees(amount: number): number {
    const config = this.configSubject.value;
    return (amount * config.serviceFeesPercentage) / 100;
  }

  /**
   * Calcule le montant total incluant les frais de service
   * @param amount Le montant du colis
   * @returns Le montant total à payer
   */
  public calculateTotalAmount(amount: number): number {
    return amount + this.calculateServiceFees(amount);
  }

  /**
   * Met à jour la configuration (pour les administrateurs)
   * @param config La nouvelle configuration
   * @returns Observable avec la configuration mise à jour
   */
  public updateConfig(config: Partial<AppConfig>): Observable<AppConfig> {
    return this.http.put<AppConfig>(`${this.apiUrl}/params`, config)
      .pipe(
        tap(updatedConfig => {
          this.configSubject.next({
            ...this.configSubject.value,
            ...updatedConfig
          });
        }),
        catchError(error => {
          console.error('Erreur lors de la mise à jour de la configuration:', error);
          return of(this.configSubject.value);
        })
      );
  }

  /**
   * Obtenir la configuration actuelle
   * @returns La configuration actuelle
   */
  public getCurrentConfig(): AppConfig {
    return this.configSubject.value;
  }
}
