// src/app/modules/payment/payment-list/payment-list.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PaymentService } from '../../../core/services/payment.service';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-payment-list',
  templateUrl: './payment-list.component.html',
  styleUrls: ['./payment-list.component.scss']
})
export class PaymentListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  currentUser: User | null = null;
  payments: any[] = [];
  loading = true;
  error = false;
  errorMessage = '';
  
  constructor(
    private router: Router,
    private snackBar: MatSnackBar,
    private paymentService: PaymentService,
    private authService: AuthService
  ) {}
  
  ngOnInit(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        if (user) {
          this.loadPayments();
        }
      });
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  loadPayments(): void {
    if (!this.currentUser) return;
    
    this.loading = true;
    this.error = false;
    
    this.paymentService.getUserPayments(this.currentUser.idUser)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (payments) => {
          this.payments = payments;
          this.loading = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des paiements:', error);
          this.handleError('Erreur lors du chargement des paiements');
        }
      });
  }
  
  viewPaymentDetails(paymentId: number): void {
    this.router.navigate(['/payment/process'], { queryParams: { paymentId: paymentId } });
  }
  
  handleError(message: string): void {
    this.error = true;
    this.errorMessage = message;
    this.loading = false;
    
    this.snackBar.open(message, 'Fermer', {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['error-snackbar']
    });
  }
}
