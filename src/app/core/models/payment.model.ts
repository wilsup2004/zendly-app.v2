// src/app/core/models/payment.model.ts
// Ajouter ou mettre à jour ces interfaces

export interface PaymentMethod {
  idMethod: number;
  methodName: string;
  methodDescription: string;
  isActive: boolean;
}

export interface Payment {
  idPayment: number;
  userId: number | string;
  colisId: number;
  priseId: number;
  user?: any;
  colis?: any;
  priseEnCharge?: any;
  paymentMethod: PaymentMethod;
  paymentStatus: string;
  transactionId: string;
  paymentDate: Date;
  paymentAmount: number; // Montant total avec frais
  baseAmount: number;    // Montant de base du colis
  serviceFees: number;   // Montant des frais de service
  paymentDetails?: any;  // Données spécifiques au paiement
  createdAt: Date;
  updatedAt: Date;
}