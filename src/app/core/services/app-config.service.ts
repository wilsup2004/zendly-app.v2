// src/app/core/services/app-config.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface AppConfig {
  serviceFeesPercentage: number;
  minServiceFee: number;
  maxServiceFee: number;
  currency: string;
  // Ajout des propriétés manquantes
  maxPackageWeight: number;
  maxPackageDimensions: number;
  paymentMethods: {
    stripe: boolean;
    paypal: boolean;
    orangeMoney: boolean;
    mobileMoney: boolean;
  };
  appVersion: string;
}

@Injectable({
  providedIn: 'root'
})
export class AppConfigService {
  private baseUrl = `${environment.apiUrl}/api/config`;
  private readonly configSubject = new BehaviorSubject<AppConfig>({
    serviceFeesPercentage: 10, // Default à 10%
    minServiceFee: 1, // Minimum 1€
    maxServiceFee: 50, // Maximum 50€
    currency: 'EUR',
    // Valeurs par défaut pour les nouvelles propriétés
    maxPackageWeight: 30, // 30 kg max par défaut
    maxPackageDimensions: 150, // 150 cm max par défaut
    paymentMethods: {
      stripe: true,
      paypal: true,
      orangeMoney: true,
      mobileMoney: true
    },
    appVersion: '1.0.0'
  });

  public config$ = this.configSubject.asObservable();
  
  constructor(private http: HttpClient) {
    this.loadConfig();
  }

  // Charger la configuration depuis le serveur
  loadConfig(): void {
    this.http.get<AppConfig>(`${this.baseUrl}`).pipe(
      tap((config) => this.configSubject.next(config))
    ).subscribe({
      error: (error) => {
        console.error('Erreur lors du chargement de la configuration:', error);
        // Garder les valeurs par défaut en cas d'erreur
      }
    });
  }

  // Calculer les frais de service basés sur le montant
  calculateServiceFees(amount: number): number {
    const config = this.configSubject.value;
    
    // Calculer les frais en pourcentage
    let fees = (amount * config.serviceFeesPercentage) / 100;
    
    // Appliquer les limites min et max
    fees = Math.max(fees, config.minServiceFee);
    fees = Math.min(fees, config.maxServiceFee);
    
    // Arrondir à 2 décimales
   // return Math.round(fees * 100) / 100;
    return fees ;
  }

  // Calculer le montant total incluant les frais
  calculateTotalAmount(baseAmount: number): number {
    const fees = this.calculateServiceFees(baseAmount);
    // Arrondir à 2 décimales
    return Math.round((baseAmount + fees) * 100) / 100;
  }

  // Vérifier si une méthode de paiement est activée
  isPaymentMethodEnabled(method: string): boolean {
    const config = this.configSubject.value;
    return config.paymentMethods[method as keyof typeof config.paymentMethods] || false;
  }

  // Mettre à jour la configuration (admin seulement)
  updateConfig(newConfig: Partial<AppConfig>): Observable<AppConfig> {
    return this.http.patch<AppConfig>(`${this.baseUrl}`, newConfig).pipe(
      tap((config) => this.configSubject.next(config))
    );
  }
}