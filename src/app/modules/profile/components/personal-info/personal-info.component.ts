// src/app/modules/profile/components/personal-info/personal-info.component.ts
import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { User, UserProfile } from '../../../../core/models/user.model';
import { ProfileService } from '../../../../core/services/profile.service';
import { AuthService } from '../../../../core/services/auth.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-personal-info',
  templateUrl: './personal-info.component.html',
  styleUrls: ['./personal-info.component.scss']
})
export class PersonalInfoComponent implements OnInit {
  @Input() currentUser: User | null = null;
  @Input() userId: string | null = null; // Pour l'édition par l'admin
  @Output() infoUpdated = new EventEmitter<boolean>();
  
  personalInfoForm: FormGroup;
  loading = false;
  userIsAdmin = false; // Pour indiquer si l'utilisateur courant est admin
  countryList: string[] = [
    'France', 'Belgique', 'Suisse', 'Canada', 'Allemagne', 
    'Espagne', 'Italie', 'Royaume-Uni', 'Portugal', 'Pays-Bas',
    'Luxembourg', 'États-Unis', 'Maroc', 'Tunisie', 'Algérie'
  ];
  
  constructor(
    private fb: FormBuilder,
    private profileService: ProfileService,
    private authService: AuthService
  ) {
    this.personalInfoForm = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(2)]],
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      mail: ['', [Validators.required, Validators.email]],
      telephone: ['', Validators.pattern(/^\+?[0-9\s-]{8,15}$/)],
      adresse: ['', Validators.required],
      complementAdresse: [''],
      codePostal: ['', [Validators.required, Validators.pattern(/^[0-9]{5}$/)]],
      ville: ['', Validators.required],
      pays: ['France', Validators.required],
      isActif: [true] // Champ pour activer/désactiver le compte (admin seulement)
    });
  }
  
  ngOnInit(): void {
    // Vérifier si l'utilisateur actuel est admin
    this.userIsAdmin = this.authService.isAdmin;
    
    // Si userId est fourni, c'est un admin qui édite le profil d'un autre utilisateur
    if (this.userId && this.userIsAdmin) {
      this.loadUserDataById(this.userId);
    } else if (this.currentUser) {
      // Sinon, c'est l'utilisateur qui modifie son propre profil
      this.loadUserData();
    }
  }
  
  loadUserData(): void {
    if (!this.currentUser) return;
    
    // Récupérer les informations à jour de l'utilisateur
    this.profileService.getUserById(this.currentUser.idUser).subscribe({
      next: (user) => {
        this.currentUser = user;
        this.initForm();
      },
      error: (err) => {
        console.error('Erreur lors de la récupération des données utilisateur', err);
      }
    });
  }
  
  loadUserDataById(userId: string): void {
    this.loading = true;
    
    this.profileService.getUserById(userId)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (user) => {
          this.currentUser = user;
          this.initForm();
        },
        error: (err) => {
          console.error('Erreur lors de la récupération des données utilisateur', err);
        }
      });
  }
  
  initForm(): void {
    if (!this.currentUser) return;
    
    // Assurer la compatibilité entre isActif et isActive
    if (this.currentUser.isActif === undefined && this.currentUser.isActif !== undefined) {
      this.currentUser.isActif = this.currentUser.isActif;
    } else if (this.currentUser.isActif === undefined) {
      this.currentUser.isActif = true; // Valeur par défaut
    }
    
    this.personalInfoForm = this.fb.group({
      nom: [this.currentUser.nom || '', [Validators.required, Validators.minLength(2)]],
      prenom: [this.currentUser.prenom || '', [Validators.required, Validators.minLength(2)]],
      mail: [this.currentUser.mail || '', [Validators.required, Validators.email]],
      telephone: [this.currentUser.telephone || '', Validators.pattern(/^\+?[0-9\s-]{8,15}$/)],
      adresse: [this.currentUser?.adresse || '', Validators.required],
      complementAdresse: [this.currentUser?.complementAdresse || ''],
      codePostal: [this.currentUser?.codePostal || '', [Validators.required, Validators.pattern(/^[0-9]{5}$/)]],
      ville: [this.currentUser?.ville || '', Validators.required],
      pays: [this.currentUser?.pays || 'France', Validators.required],
      isActif: [this.currentUser.isActif]
    });
    
    // Si ce n'est pas un admin, désactiver le champ isActif
    if (!this.userIsAdmin) {
      this.personalInfoForm.get('isActif')?.disable();
    }
  }
  
  onSubmit(): void {
    if (this.personalInfoForm.invalid || !this.currentUser) {
      // Marquer tous les champs comme touchés pour afficher les erreurs
      Object.keys(this.personalInfoForm.controls).forEach(key => {
        const control = this.personalInfoForm.get(key);
        control?.markAsTouched();
      });
      return;
    }
    
    this.loading = true;
    
    // Mettre à jour les informations de base de l'utilisateur
    const userUpdate: Partial<User> = {
      idUser: this.currentUser.idUser,
      nom: this.personalInfoForm.value.nom,
      prenom: this.personalInfoForm.value.prenom,
      mail: this.personalInfoForm.value.mail,
      telephone: this.personalInfoForm.value.telephone,
      adresse: this.personalInfoForm.value.adresse,
      complementAdresse: this.personalInfoForm.value.complementAdresse,
      codePostal: this.personalInfoForm.value.codePostal,
      ville: this.personalInfoForm.value.ville,
      pays: this.personalInfoForm.value.pays
    };
    
    // Si c'est un admin, inclure la propriété isActif
    if (this.userIsAdmin) {
      userUpdate.isActif = this.personalInfoForm.value.isActif;
      // Maintenir la compatibilité
      userUpdate.isActif = this.personalInfoForm.value.isActif;
    }
    
    // Mettre à jour les informations de profil
 
    const profileUpdate: Partial<UserProfile> = {
      /*
      adresse: this.personalInfoForm.value.adresse,
      complementAdresse: this.personalInfoForm.value.complementAdresse,
      codePostal: this.personalInfoForm.value.codePostal,
      ville: this.personalInfoForm.value.ville,
      pays: this.personalInfoForm.value.pays
      */
    };
 
    
    // Si c'est un admin qui édite un autre utilisateur
    if (this.userId && this.userIsAdmin) {
      this.updateUserAsAdmin(userUpdate, profileUpdate);
    } else {
      // Utilisateur qui édite son propre profil
      this.updateOwnProfile(userUpdate, profileUpdate);
    }
  }
  
  updateUserAsAdmin(userUpdate: Partial<User>, profileUpdate: Partial<UserProfile>): void {
    if (!this.currentUser) return;
    
    // Utiliser le service d'administration
    this.profileService.updateUser(this.currentUser.idUser, userUpdate)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: () => {
          // Mettre à jour le profil
          this.profileService.updateUserProfile(profileUpdate)
            .subscribe({
              next: () => {
                this.infoUpdated.emit(true);
              },
              error: (err) => {
                console.error('Erreur lors de la mise à jour du profil', err);
                this.infoUpdated.emit(false);
              }
            });
        },
        error: (err) => {
          console.error('Erreur lors de la mise à jour des informations utilisateur', err);
          this.infoUpdated.emit(false);
        }
      });
  }
  
  updateOwnProfile(userUpdate: Partial<User>, profileUpdate: Partial<UserProfile>): void {
    if (!this.currentUser) return;
    
    // Mettre à jour les informations de l'utilisateur courant
    this.profileService.updateUser(this.currentUser.idUser, userUpdate)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: () => {
          // Mettre à jour le profil
          this.profileService.updateUserProfile(profileUpdate)
            .subscribe({
              next: () => {
                // Mettre à jour l'utilisateur dans le authService
                if (this.currentUser) {
                  const updatedUser = { ...this.currentUser, ...userUpdate };
                  this.authService.updateCurrentUser(updatedUser);
                }
                
                this.infoUpdated.emit(true);
              },
              error: (err) => {
                console.error('Erreur lors de la mise à jour du profil', err);
                this.infoUpdated.emit(false);
              }
            });
        },
        error: (err) => {
          console.error('Erreur lors de la mise à jour des informations utilisateur', err);
          this.infoUpdated.emit(false);
        }
      });
  }
  
  // Méthodes utilitaires pour la validation des formulaires
  hasError(controlName: string, errorName: string): boolean {
    const control = this.personalInfoForm.get(controlName);
    return !!control && control.hasError(errorName) && control.touched;
  }
  
  resetForm(): void {
    this.initForm();
  }
}