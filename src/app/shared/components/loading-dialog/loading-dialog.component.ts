// src/app/shared/components/loading-dialog/loading-dialog.component.ts
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface LoadingDialogData {
  message: string;
}

@Component({
  selector: 'app-loading-dialog',
  template: `
    <div class="loading-dialog">
      <mat-spinner diameter="50"></mat-spinner>
      <p>{{ data.message || 'Chargement en cours...' }}</p>
    </div>
  `,
  styles: [`
    .loading-dialog {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    
    p {
      margin-top: 16px;
      color: var(--text-color);
      text-align: center;
    }
  `]
})
export class LoadingDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: LoadingDialogData) {}
}
