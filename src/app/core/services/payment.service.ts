// src/app/core/services/payment.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { AppConfigService } from './app-config.service';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private baseUrl = `${environment.apiUrl}/payments`;
  
  constructor(
    private http: HttpClient, 
    private appConfigService: AppConfigService
  ) {}

  // Obtenir tous les paiements d'un utilisateur
  getUserPayments(userId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/user/${userId}`);
  }

  // Obtenir le statut d'un paiement
  getPaymentStatus(paymentId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${paymentId}`);
  }

  // Mettre à jour le statut d'un paiement
  updatePaymentStatus(paymentId: number, status: string): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/status/${paymentId}?status=${status}`, {});
  }

  // Obtenir toutes les méthodes de paiement disponibles
  getPaymentMethods(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/methods`);
  }

  // Créer un paiement avec frais de service
  createPaymentWithFees(paymentData: any): Observable<any> {
    // Ajouter les frais de service calculés par le service AppConfig
    const baseAmount = paymentData.amount || paymentData.baseAmount;
    const serviceFees = this.appConfigService.calculateServiceFees(baseAmount);
    const totalAmount = this.appConfigService.calculateTotalAmount(baseAmount);
    
    const paymentWithFees = {
      ...paymentData,
      baseAmount: baseAmount,
      serviceFees: serviceFees,
      amount: totalAmount
    };
    
    return this.http.post<any>(`${this.baseUrl}/create`, paymentWithFees);
  }

  // Créer un paiement PayPal
  createPaypalPayment(paymentData: any): Observable<any> {
    // Si une transaction a déjà été approuvée par PayPal
    if (paymentData.transactionId) {
      // Enregistrer directement le paiement approuvé
      return this.http.post<any>(`${this.baseUrl}/paypal/capture`, paymentData);
    } else {
      // Créer une session PayPal (pour redirection manuelle)
      return this.http.post<any>(`${this.baseUrl}/paypal/create`, paymentData);
    }
  }

  // Créer un paiement Stripe
  createStripePayment(paymentData: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/stripe/create`, paymentData);
  }

  // Créer un paiement Orange Money / Mobile Money
  createOrangeMoneyPayment(paymentData: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/mobile-money/create`, paymentData);
  }

  // Vérifie si un paiement est nécessaire pour une prise en charge
  /*
  isPaymentNeeded(priseEnChargeId: number): Observable<boolean> {
    return this.http.get<boolean>(`${this.baseUrl}/check-needed/${priseEnChargeId}`);
  }
    */

  isPaymentNeeded(idColis: number, idPrise: number): Observable<boolean> {
    return this.http.get<boolean>(`${this.baseUrl}/check-needed?idPrise=${idPrise}&idColis=${idColis}`);
  }

  // Initier un paiement pour une prise en charge spécifique
  initiatePaymentForPriseEnCharge(colisId: number, priseId: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/initiate`, { colisId, priseId });
  }

  // Webhook pour notifications externes (ex: confirmation de paiement PayPal)
  receivePaymentWebhook(data: any): Observable<any> {
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.post<any>(`${this.baseUrl}/webhook`, data, { headers });
  }
}