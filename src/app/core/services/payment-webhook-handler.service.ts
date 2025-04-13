// src/app/core/services/payment-webhook-handler.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { PaymentService } from './payment.service';
import { ColisService } from './colis.service';
import { PriseEnChargeService } from './prise-en-charge.service';

@Injectable({
  providedIn: 'root'
})
export class PaymentWebhookHandlerService {
  private baseUrl = `${environment.apiUrl}/api/payments/webhook`;
  
  constructor(
    private http: HttpClient,
    private router: Router,
    private snackBar: MatSnackBar,
    private paymentService: PaymentService,
    private colisService: ColisService,
    private priseEnChargeService: PriseEnChargeService
  ) {}

  /**
   * Traite les webhooks externes de passerelles de paiement comme PayPal ou Stripe
   */
  handleExternalWebhook(source: string, eventType: string, data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/${source}`, {
      event: eventType,
      data: data
    }).pipe(
      tap(response => {
        console.log(`Webhook de ${source} traité avec succès:`, response);
        
        // Vérifier si le webhook est lié à un paiement complété
        if (eventType === 'payment_success' || eventType === 'payment.succeeded' || eventType === 'PAYMENT.CAPTURE.COMPLETED') {
          this.handleSuccessfulPayment(response);
        }
      }),
      catchError(error => {
        console.error(`Erreur lors du traitement du webhook ${source}:`, error);
        return of(null);
      })
    );
  }

  /**
   * Traite un paiement réussi en mettant à jour les statuts du colis et de la prise en charge
   */
  handleSuccessfulPayment(paymentInfo: any): void {
    if (!paymentInfo || !paymentInfo.paymentId) {
      console.error('Informations de paiement incomplètes');
      return;
    }

    // Mettre à jour le statut du paiement
    this.paymentService.updatePaymentStatus(paymentInfo.paymentId, 'COMPLETED').pipe(
      switchMap(payment => {
        if (payment && payment.colis && payment.priseEnCharge) {
          // Mettre à jour le statut du colis à "En cours"
          return this.updateColisStatus(payment.colis.idColis, 2).pipe(
            switchMap(() => {
              // Mettre à jour le statut de la prise en charge à "Accepté"
              return this.updatePriseEnChargeStatus(payment.priseEnCharge.idPrise, 5);
            })
          );
        }
        return of(null);
      })
    ).subscribe({
      next: () => {
        // Afficher une notification si l'utilisateur est dans l'application
        this.snackBar.open('Paiement traité avec succès!', 'Fermer', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });

        // Supprimer l'ID du paiement en attente du localStorage
        localStorage.removeItem('pendingPaymentId');

        // Rediriger vers la page de succès si nécessaire
        if (paymentInfo.redirectToSuccess) {
          this.router.navigate(['/payment/success'], {
            queryParams: { paymentId: paymentInfo.paymentId }
          });
        }
      },
      error: (error) => {
        console.error('Erreur lors de la mise à jour des statuts après paiement:', error);
      }
    });
  }

  /**
   * Met à jour le statut d'un colis
   */
  private updateColisStatus(colisId: number, statusId: number): Observable<any> {
    return this.colisService.getColisById(colisId).pipe(
      switchMap(colis => {
        if (colis) {
          colis.statuts = { idStatut: statusId, libelStatut: this.getStatusLibel(statusId) };
          
          // Créer FormData pour l'envoi
          const formData = new FormData();
          formData.append('idColis', colisId.toString());
          formData.append('statuts', JSON.stringify(colis.statuts));
          
          // Ajouter les autres propriétés importantes
          if (colis.longueur) formData.append('longueur', colis.longueur.toString());
          if (colis.largeur) formData.append('largeur', colis.largeur.toString());
          if (colis.hauteur) formData.append('hauteur', colis.hauteur.toString());
          if (colis.nbKilo) formData.append('nbKilo', colis.nbKilo.toString());
          if (colis.tarif) formData.append('tarif', colis.tarif.toString());
          if (colis.villeDepart) formData.append('villeDepart', colis.villeDepart);
          if (colis.villeArrivee) formData.append('villeArrivee', colis.villeArrivee);
          if (colis.description) formData.append('description', colis.description);
          
          return this.colisService.updateColis(formData);
        }
        return of(null);
      })
    );
  }

  /**
   * Met à jour le statut d'une prise en charge
   */
  private updatePriseEnChargeStatus(priseId: number, statusId: number): Observable<any> {
    return this.priseEnChargeService.getPriseEnChargeById(priseId).pipe(
      switchMap(prise => {
        if (prise) {
          prise.statuts = { idStatut: statusId, libelStatut: this.getStatusLibel(statusId) };
          return this.priseEnChargeService.updatePriseEnCharge(priseId, prise);
        }
        return of(null);
      })
    );
  }

  /**
   * Retourne le libellé d'un statut en fonction de son ID
   */
  private getStatusLibel(statusId: number): string {
    switch (statusId) {
      case 1: return 'Créé';
      case 2: return 'En cours';
      case 3: return 'Clôturé';
      case 4: return 'En attente';
      case 5: return 'Accepté';
      case 6: return 'Refusé';
      case 7: return 'Annulé';
      case 8: return 'Livré';
      default: return 'Inconnu';
    }
  }
}
