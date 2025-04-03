// src/app/modules/auth/register/register.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';
import { finalize, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { User } from 'src/app/core/models/user.model';
import { of } from 'rxjs';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  loading = false;
  hidePassword = true;
  hideConfirmPassword = true;
  errorMessage: string | null = null;
  
  // Variables pour la vérification du pseudo
  checkingPseudo = false;
  pseudoAvailable = false;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {
    // Rediriger vers la page d'accueil si déjà connecté
    if (this.authService.isLoggedIn) {
      this.router.navigate(['/']);
    }

    this.registerForm = this.formBuilder.group({
      nom: ['', [Validators.required, Validators.minLength(2)]],
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      pseudo: ['', [
        Validators.required, 
        Validators.minLength(3),
        Validators.pattern(/^[a-zA-Z0-9_]+$/)
      ]],
      email: ['', [Validators.required, Validators.email]],
      telephone: ['', [Validators.pattern(/^[0-9]{10}$/)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      acceptTerms: [false, Validators.requiredTrue]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  ngOnInit(): void {
    // Écouter les changements du champ pseudo pour vérifier sa disponibilité
    this.registerForm.get('pseudo')?.valueChanges
      .pipe(
        debounceTime(500), // Attendre 500ms après que l'utilisateur ait arrêté de taper
        distinctUntilChanged(),
        switchMap(pseudo => {
          if (!pseudo || pseudo.length < 3) {
            this.checkingPseudo = false;
            this.pseudoAvailable = false;
            return of(null);
          }
          
          this.checkingPseudo = true;
          return this.authService.checkPseudoAvailability(pseudo);
        })
      )
      .subscribe(result => {
        this.checkingPseudo = false;
        
        if (result === null) return;
        
        this.pseudoAvailable = result;
        
        if (!this.pseudoAvailable) {
          this.registerForm.get('pseudo')?.setErrors({ pseudoTaken: true });
        }
      });
  }

  // Faciliter l'accès aux contrôles du formulaire
  get f() {
    return this.registerForm.controls;
  }

  // Validateur pour vérifier que les mots de passe correspondent
  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }

    return null;
  }

  onSubmit(): void {
    // Arrêter le traitement si le formulaire est invalide
    if (this.registerForm.invalid) {
      // Marquer tous les champs comme touchés pour montrer les erreurs
      Object.keys(this.registerForm.controls).forEach(key => {
        const control = this.registerForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    this.loading = true;
    this.errorMessage = null;

    // Créer l'objet utilisateur à partir du formulaire
    const user: User = {
      idUser: this.registerForm.value.pseudo, // Utiliser le pseudo comme idUser
      nom: this.registerForm.value.nom,
      prenom: this.registerForm.value.prenom,
      mail: this.registerForm.value.email,
      password: this.registerForm.value.password,
      telephone: this.registerForm.value.telephone || '', // Nouveau champ ajouté
      isActif: true, // Par défaut, l'utilisateur est actif à l'inscription

      // isActive: true, // Garder la compatibilité avec le modèle existant
      usersProfils: [], // Sera généralement initialisé côté serveur

      // Propriétés du modèle existant
      colis: [],
      priseEnCharges: [],
      usersTrades: [],
      adresse: this.registerForm.value.adresse || '',
      complementAdresse:  this.registerForm.value.complementAdresse || '',
      codePostal: this.registerForm.value.codePostal || '',
      ville:  this.registerForm.value.ville || '',
      pays:  this.registerForm.value.pays || ''
    };

    this.authService.register(user)
      .pipe(
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: () => {
          this.snackBar.open('Inscription réussie! Vous pouvez maintenant vous connecter.', 'Fermer', {
            duration: 5000
          });
          this.router.navigate(['/auth/login']);
        },
        error: (err) => {
          console.error('Erreur lors de l\'inscription', err);
          if (err.error?.code === 'PSEUDO_ALREADY_EXISTS') {
            this.errorMessage = 'Ce pseudo est déjà utilisé. Veuillez en choisir un autre.';
            this.registerForm.get('pseudo')?.setErrors({ pseudoTaken: true });
          } else {
            this.errorMessage = err.error?.message || 'Une erreur est survenue lors de l\'inscription. Veuillez réessayer.';
          }
        }
      });
  }
}