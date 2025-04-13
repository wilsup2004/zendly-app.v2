// src/app/modules/payment/mobile-payment/mobile-payment.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PaymentService } from '../../../core/services/payment.service';
import { Subscription, finalize, interval } from 'rxjs';
import { take, takeWhile, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-mobile-payment',
  templateUrl: './mobile-payment.component.html',
  styleUrls: ['./mobile-payment.component.scss']
})
export class MobilePaymentComponent implements OnInit, OnDestroy {
  paymentForm: FormGroup;
  paymentId: number | null = null;
  colisId: number | null = null;
  priseId: number | null = null;
  
  loading = false;
  submitted = false;
  paymentConfirmed = false;
  
  // Pour l'UI
  countdown = 300; // 5 minutes
  countdownSubscription?: Subscription;
  
  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private paymentService: PaymentService
  ) {
    this.paymentForm = this.fb.group({
      phoneNumber: ['', [Validators.required, Validators.pattern(/^\d{9,15}$/)]],
      provider: ['orange', Validators.required]
    });
  }
  
  ngOnInit(): void {
    // Récupérer les paramètres de l'URL
    this.route.queryParams.subscribe(params => {
      if (params['paymentId']) {
        this.paymentId = parseInt(params['paymentId']);
      }
      
      if (params['colisId']) {
        this.colisId = parseInt(params['colisId']);
      }
      
      if (params['priseId']) {
        this.priseId = parseInt(params['priseId']);
      }
      
      // Afficher une erreur si des paramètres sont manquants
      if (!this.paymentId && (!this.colisId || !this.priseId)) {
        this.snackBar.open('Paramètres manquants pour le paiement', 'Fermer', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
          panelClass: ['error-snackbar']
        });
        this.router.navigate(['/dashboard']);
      }
    });
  }
  
  ngOnDestroy(): void {
    // Arrêter le compte à rebours s'il est actif
    if (this.countdownSubscription) {
      this.countdownSubscription.unsubscribe();
    }
  }
  
  onSubmit(): void {
    if (this.paymentForm.invalid) {
      return;
    }
    
    this.submitted = true;
    this.loading = true;
    
    const phoneNumber = this.paymentForm.get('phoneNumber')?.value;
    const provider = this.paymentForm.get('provider')?.value;
    
    // Si nous n'avons pas d'ID de paiement, nous devons en créer un
    if (!this.paymentId && this.colisId && this.priseId) {
      this.paymentService.initiatePaymentForPriseEnCharge(this.colisId, this.priseId)
        .pipe(finalize(() => {
          this.loading = false;
        }))
        .subscribe({
          next: (response) => {
            this.paymentId = response.paymentId;
            this.processMobilePayment(phoneNumber, provider);
          },
          error: (error) => {
            console.error('Erreur lors de l\'initialisation du paiement:', error);
            this.submitted = false;
            this.snackBar.open('Erreur lors de l\'initialisation du paiement', 'Fermer', {
              duration: 5000,
              horizontalPosition: 'center',
              verticalPosition: 'bottom',
              panelClass: ['error-snackbar']
            });
          }
        });
    } else if (this.paymentId) {
      // Si nous avons déjà un ID de paiement, nous pouvons continuer
      this.processMobilePayment(phoneNumber, provider);
    }
  }
  
  private processMobilePayment(phoneNumber: string, provider: string): void {
    if (!this.paymentId) return;
    
    // Préparer les données de paiement
    const paymentData = {
      paymentId: this.paymentId,
      phoneNumber: phoneNumber,
      provider: provider,
      returnUrl: `${window.location.origin}/payment/success`,
      cancelUrl: `${window.location.origin}/payment/cancel`
    };
    
    // Envoyer la demande de paiement
    this.paymentService.createOrangeMoneyPayment(paymentData)
      .pipe(finalize(() => {
        this.loading = false;
      }))
      .subscribe({
        next: (response) => {
          // Stocker l'ID du paiement dans localStorage pour reprise éventuelle
          localStorage.setItem('pendingPaymentId', this.paymentId!.toString());
          
          // Démarrer le compte à rebours et la vérification périodique
          this.startConfirmationCheck();
        },
        error: (error) => {
          console.error('Erreur lors du traitement du paiement mobile:', error);
          this.submitted = false;
          this.snackBar.open('Erreur lors du traitement du paiement', 'Fermer', {
            duration: 5000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
            panelClass: ['error-snackbar']
          });
        }
      });
  }
  
  startConfirmationCheck(): void {
    // Démarrer le compte à rebours
    this.countdownSubscription = interval(1000).pipe(
      take(this.countdown)
    ).subscribe({
      next: (i) => {
        this.countdown = this.countdown - 1;
        
        // Vérifier le statut toutes les 5 secondes
        if (i % 5 === 0 && this.paymentId) {
          this.checkPaymentStatus();
        }
      },
      complete: () => {
        // Quand le compte à rebours est terminé
        if (!this.paymentConfirmed) {
          this.snackBar.open('Le délai pour confirmer le paiement est expiré', 'Fermer', {
            duration: 5000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
            panelClass: ['error-snackbar']
          });
          
          // Rediriger vers la page d'annulation
          this.router.navigate(['/payment/cancel'], {
            queryParams: { paymentId: this.paymentId }
          });
        }
      }
    });
  }
  
  checkPaymentStatus(): void {
    if (!this.paymentId) return;
    
    this.paymentService.getPaymentStatus(this.paymentId)
      .subscribe({
        next: (payment) => {
          if (payment.paymentStatus === 'COMPLETED') {
            // Paiement confirmé
            this.paymentConfirmed = true;
            
            // Arrêter le compte à rebours
            if (this.countdownSubscription) {
              this.countdownSubscription.unsubscribe();
            }
            
            // Afficher un message de succès
            this.snackBar.open('Paiement confirmé avec succès !', 'Fermer', {
              duration: 3000,
              horizontalPosition: 'center',
              verticalPosition: 'bottom'
            });
            
            // Rediriger vers la page de succès
            this.router.navigate(['/payment/success'], {
              queryParams: { paymentId: this.paymentId }
            });
          }
        },
        error: (error) => {
          console.error('Erreur lors de la vérification du statut du paiement:', error);
        }
      });
  }
  
  // Formater le compte à rebours
  formatCountdown(): string {
    const minutes = Math.floor(this.countdown / 60);
    const seconds = this.countdown % 60;
    return `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
  }
  
  // Annuler le paiement
  cancelPayment(): void {
    if (!this.paymentId) return;
    
    this.loading = true;
    
    this.paymentService.updatePaymentStatus(this.paymentId, 'CANCELLED')
      .pipe(finalize(() => {
        this.loading = false;
      }))
      .subscribe({
        next: () => {
          // Arrêter le compte à rebours
          if (this.countdownSubscription) {
            this.countdownSubscription.unsubscribe();
          }
          
          // Supprimer l'ID du paiement en attente
          localStorage.removeItem('pendingPaymentId');
          
          // Rediriger vers la page d'annulation
          this.router.navigate(['/payment/cancel']);
        },
        error: (error) => {
          console.error('Erreur lors de l\'annulation du paiement:', error);
          this.snackBar.open('Erreur lors de l\'annulation du paiement', 'Fermer', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
            panelClass: ['error-snackbar']
          });
        }
      });
  }
}