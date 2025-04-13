// src/app/shared/shared.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Components
import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';
import { LoadingDialogComponent } from './components/loading-dialog/loading-dialog.component';

// Material Modules
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';  // Ajout
import { MatInputModule } from '@angular/material/input';           // Ajout
import { MatSelectModule } from '@angular/material/select';         // Optionnel, si nécessaire
import { MatDatepickerModule } from '@angular/material/datepicker'; // Optionnel, si nécessaire
import { MatNativeDateModule } from '@angular/material/core';       // Optionnel, si nécessaire


@NgModule({
  declarations: [
    ConfirmDialogComponent,
    LoadingDialogComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,   
    MatInputModule,       
    MatSelectModule,      
    MatDatepickerModule,  
    MatNativeDateModule   
  ],
  exports: [
    // Components
    ConfirmDialogComponent,
    LoadingDialogComponent,
    
    // Modules
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,  
    MatInputModule,     
    MatSelectModule,      
    MatDatepickerModule,  
    MatNativeDateModule   
  ]
})
export class SharedModule { }