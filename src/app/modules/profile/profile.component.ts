// src/app/modules/profile/profile.component.ts
import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProfileService } from '../../core/services/profile.service';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  currentUser: User | null = null;
  loading = true;
  profilePhotoUrl: string = '';

  constructor(
    private profileService: ProfileService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.currentUser;
    this.loadUserProfile();
    this.getProfilePhotoUrl();
  }

  loadUserProfile(): void {
    this.loading = true;
    
    this.profileService.getUserById(this.currentUser.idUser)
      .pipe(finalize(() => {
        this.loading = false;
      }))
      .subscribe({
        next: (user) => {
          this.currentUser = user;
        },
        error: (error) => {
          console.error('Erreur lors du chargement du profil:', error);
          this.snackBar.open('Erreur lors du chargement des données du profil', 'Fermer', {
            duration: 5000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
            panelClass: ['error-snackbar']
          });
        }
      });
  }

  getProfilePhotoUrl(): void {
    this.profileService.getProfilePhotoUrl().subscribe(url => {
      this.profilePhotoUrl = url;
    });
  }

  onPhotoUploaded(success: boolean): void {
    if (success) {
      this.getProfilePhotoUrl();
      this.snackBar.open('Photo de profil mise à jour avec succès', 'Fermer', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom'
      });
    } else {
      this.snackBar.open('Erreur lors de la mise à jour de la photo de profil', 'Fermer', {
        duration: 5000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: ['error-snackbar']
      });
    }
  }

  onPersonalInfoUpdated(success: boolean): void {
    if (success) {
      this.loadUserProfile();
      this.snackBar.open('Informations personnelles mises à jour avec succès', 'Fermer', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom'
      });
    } else {
      this.snackBar.open('Erreur lors de la mise à jour des informations personnelles', 'Fermer', {
        duration: 5000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: ['error-snackbar']
      });
    }
  }

  onPasswordChanged(success: boolean): void {
    if (success) {
      this.snackBar.open('Mot de passe modifié avec succès', 'Fermer', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom'
      });
    } else {
      this.snackBar.open('Erreur lors de la modification du mot de passe', 'Fermer', {
        duration: 5000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: ['error-snackbar']
      });
    }
  }
}
