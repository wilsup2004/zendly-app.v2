// src/app/modules/admin/config/admin-config.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AppConfigService, AppConfig } from '../../../core/services/app-config.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-admin-config',
  templateUrl: './admin-config.component.html',
  styleUrls: ['./admin-config.component.scss']
})
export class AdminConfigComponent implements OnInit {
  configForm: FormGroup;
  loading = false;
  
  constructor(
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private appConfigService: AppConfigService
  ) {
    this.configForm = this.fb.group({
      serviceFeesPercentage: [10, [Validators.required, Validators.min(0), Validators.max(100)]],
      maxPackageWeight: [30, [Validators.required, Validators.min(1)]],
      maxPackageDimensions: [150, [Validators.required, Validators.min(1)]]
    });
  }
  
  ngOnInit(): void {
    this.loadConfig();
  }
  
  loadConfig(): void {
    this.loading = true;
    
    this.appConfigService.config$.subscribe({
      next: (config) => {
        this.configForm.patchValue({
          serviceFeesPercentage: config.serviceFeesPercentage,
          maxPackageWeight: config.maxPackageWeight,
          maxPackageDimensions: config.maxPackageDimensions
        });
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement de la configuration:', error);
        this.snackBar.open('Erreur lors du chargement de la configuration', 'Fermer', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
        this.loading = false;
      }
    });
  }
  
  saveConfig(): void {
    if (this.configForm.invalid) {
      return;
    }
    
    this.loading = true;
    
    const updatedConfig: Partial<AppConfig> = {
      serviceFeesPercentage: this.configForm.value.serviceFeesPercentage,
      maxPackageWeight: this.configForm.value.maxPackageWeight,
      maxPackageDimensions: this.configForm.value.maxPackageDimensions
    };
    
    this.appConfigService.updateConfig(updatedConfig)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (config) => {
          this.snackBar.open('Configuration mise à jour avec succès', 'Fermer', {
            duration: 3000
          });
        },
        error: (error) => {
          console.error('Erreur lors de la mise à jour de la configuration:', error);
          this.snackBar.open('Erreur lors de la mise à jour de la configuration', 'Fermer', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
        }
      });
  }
}
