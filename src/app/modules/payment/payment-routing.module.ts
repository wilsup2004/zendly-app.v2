// src/app/modules/payment/payment-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PaymentComponent } from './payment.component';
import { PaymentListComponent } from './payment-list/payment-list.component';
import { PaymentSuccessComponent } from './payment-success/payment-success.component';
import { PaymentCancelComponent } from './payment-cancel/payment-cancel.component';
import { MobilePaymentComponent } from './mobile-payment/mobile-payment.component';
import { AuthGuard } from '../../core/guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    component: PaymentListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'process',
    component: PaymentComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'mobile',
    component: MobilePaymentComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'success',
    component: PaymentSuccessComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'cancel',
    component: PaymentCancelComponent,
    canActivate: [AuthGuard]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PaymentRoutingModule { }