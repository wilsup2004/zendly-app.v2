// src/app/core/services/payment.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, Observable, of, throwError } from 'rxjs';
import { Payment, PaymentMethod } from '../models/payment.model';
import { environment } from '../../../environments/environment';
import { AppConfigService } from './app-config.service';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = `${environment.apiUrl}/payment`;

  constructor(private http: HttpClient,
    private appConfigService: AppConfigService) {}

  // Récupérer les méthodes de paiement disponibles
  getPaymentMethods(): Observable<PaymentMethod[]> {
    return this.http.get<PaymentMethod[]>(`${this.apiUrl}/methods`);
  }

  /**
 * Crée un paiement avec les frais de service calculés
 * @param paymentData Les données du paiement
 * @returns Observable avec la réponse du serveur
 */
createPayment(paymentData: any): Observable<any> {
  // En fonction de la méthode de paiement, rediriger vers le bon processeur
  switch (paymentData.methodId) {
    case 1: // PayPal (exemple)
      return this.createPaypalPayment(paymentData);
    case 2: // Stripe (exemple)
      return this.createStripePayment(paymentData);
    case 3: // Orange Money (exemple)
    case 4: // Mobile Money (exemple)
      return this.createOrangeMoneyPayment(paymentData);
    default:
      return throwError(() => new Error('Méthode de paiement non supportée'));
  }
}

/**
 * Crée un paiement avec les frais de service calculés
 * @param paymentData Les données du paiement
 * @returns Observable avec la réponse du serveur
 */
createPaymentWithFees(paymentData: any): Observable<any> {
  // Si le montant total n'est pas déjà calculé
  if (!paymentData.serviceFees || !paymentData.amount) {
    const baseAmount = paymentData.baseAmount || paymentData.amount;
    const serviceFees = this.appConfigService.calculateServiceFees(baseAmount);
    const totalAmount = baseAmount + serviceFees;
    
    paymentData = {
      ...paymentData,
      baseAmount: baseAmount,
      serviceFees: serviceFees,
      amount: totalAmount
    };
  }
  
  // En fonction de la méthode de paiement, rediriger vers le bon processeur
  switch (paymentData.methodId) {
    case 1: // PayPal (ajuster selon votre système)
      return this.createPaypalPayment(paymentData);
    case 2: // Stripe (ajuster selon votre système)
      return this.createStripePayment(paymentData);
    case 3: // Orange Money
    case 4: // Mobile Money
      return this.createOrangeMoneyPayment(paymentData);
    default:
      return throwError(() => new Error('Méthode de paiement non supportée'));
  }
}

  /**
 * Crée un paiement PayPal
 * @param payment Les données du paiement
 * @returns Observable avec la réponse du serveur
 */
createPaypalPayment(payment: any): Observable<any> {
  return this.http.post(`${this.apiUrl}/paypal/create`, payment);
}

/**
 * Crée un paiement Stripe
 * @param payment Les données du paiement
 * @returns Observable avec la réponse du serveur
 */
createStripePayment(payment: any): Observable<any> {
  return this.http.post(`${this.apiUrl}/stripe/create`, payment);
}

/**
 * Crée un paiement Orange Money
 * @param payment Les données du paiement
 * @returns Observable avec la réponse du serveur
 */
createOrangeMoneyPayment(payment: any): Observable<any> {
  return this.http.post(`${this.apiUrl}/orangemoney/create`, payment);
}

/**
 * Récupère les statistiques de revenus, y compris les frais de service
 */
/*
getRevenueStatistics(): Observable<any> {
  return this.http.get(`${this.apiUrl}/statistics/revenue`).pipe(
    map(stats => {
      // Ajouter les statistiques de frais si elles ne sont pas fournies par le backend
      if (!stats.hasOwnProperty('totalFees')) {
        const baseTotalFees = (stats.totalRevenue * this.appConfigService.getCurrentConfig().serviceFeesPercentage) / (100 + this.appConfigService.getCurrentConfig().serviceFeesPercentage);
        
        return {
          ...stats,
          totalFees: baseTotalFees,
          baseRevenue: stats.totalRevenue - baseTotalFees
        };
      }
      return stats;
    })
  );
}
*/
  // Vérifier le statut d'un paiement
  getPaymentStatus(paymentId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/status/${paymentId}`);
  }

  // Mettre à jour le statut d'un paiement
  updatePaymentStatus(paymentId: number, status: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/status/${paymentId}?status=${status}`, null);
  }
/*
  // Récupérer les paiements d'un utilisateur
  getUserPayments(userId: string): Observable<Payment[]> {
    return this.http.get<Payment[]>(`${this.apiUrl}/user/${userId}`);
  }
*/
  // Récupérer les statistiques de paiement
  getPaymentStatistics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/statistics`);
  }

  /**
 * Récupère tous les paiements d'un utilisateur
 * @param userId ID de l'utilisateur
 * @returns Liste des paiements
 */
getUserPayments(userId: string): Observable<any[]> {
  return this.http.get<any[]>(`${this.apiUrl}/user/${userId}`)
  .pipe(
    // En cas d'erreur 404 (aucun paiement trouvé), retourner un tableau vide
    catchError(error => {
      if (error.status === 404) {
        return of([]);
      }
      // Pour les autres erreurs, les propager
      return throwError(() => error);
    })
  );
}

}
