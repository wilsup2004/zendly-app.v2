// src/app/modules/profile/components/security/security.component.ts
import { Component, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ProfileService } from '../../../../core/services/profile.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-security',
  templateUrl: './security.component.html',
  styleUrls: ['./security.component.scss']
})
export class SecurityComponent {
  @Output() passwordChanged = new EventEmitter<boolean>();
  
  passwordForm: FormGroup;
  loading = false;
  hideCurrentPassword = true;
  hideNewPassword = true;
  hideConfirmPassword = true;
  
  constructor(
    private fb: FormBuilder,
    private profileService: ProfileService
  ) {
    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required, Validators.minLength(8)]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, {
      validators: this.passwordMatchValidator
    });
  }
  
  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const newPassword = control.get('newPassword')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    
    if (newPassword !== confirmPassword) {
      control.get('confirmPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    return null;
  }
  
  onSubmit(): void {
    if (this.passwordForm.invalid) {
      // Marquer tous les champs comme touchés pour afficher les erreurs
      Object.keys(this.passwordForm.controls).forEach(key => {
        const control = this.passwordForm.get(key);
        control?.markAsTouched();
      });
      return;
    }
    
    this.loading = true;
    
    const currentPassword = this.passwordForm.value.currentPassword;
    const newPassword = this.passwordForm.value.newPassword;
    
    this.profileService.changePassword(currentPassword, newPassword)
      .pipe(
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: () => {
          this.passwordForm.reset();
          this.passwordChanged.emit(true);
        },
        error: (error: any) => {
          console.error('Erreur lors du changement de mot de passe', error);
          // Si l'erreur est due à un mot de passe actuel incorrect
          if (error.status === 400 && error.error?.code === 'INVALID_CURRENT_PASSWORD') {
            this.passwordForm.get('currentPassword')?.setErrors({ invalidCurrentPassword: true });
          }
          this.passwordChanged.emit(false);
        }
      });
  }
  
  hasError(controlName: string, errorName: string): boolean {
    const control = this.passwordForm.get(controlName);
    return !!control && control.hasError(errorName) && control.touched;
  }
  
  resetForm(): void {
    this.passwordForm.reset();
  }
}