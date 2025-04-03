// src/app/modules/auth/login/login.component.ts
import { Component, OnInit,AfterViewInit, ElementRef  } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  returnUrl: string = '/';
  loading = false;
  hidePassword = true;
  errorMessage: string | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private el: ElementRef
  ) {
    // Rediriger vers la page d'accueil si déjà connecté
    if (this.authService.isLoggedIn) {
      this.router.navigate(['/']);
    }

    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(5)]],
      rememberMe: [false]
    });
  }

  ngOnInit(): void {
    // Récupérer l'URL de retour des paramètres de la route ou utiliser '/'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
  }

  ngAfterViewInit(): void {
     // Créer un élément style
  const style = document.createElement('style');
  style.innerHTML = `
    .mat-checkbox-label {
      color: white !important;
    }
  `;
  // Ajouter au head du document
  document.head.appendChild(style);
  
  // Exécuter également notre autre méthode
  this.forceWhiteTextInFormFields();
  }

  private forceWhiteTextInFormFields(): void {
    // Cibler les inputs
    const inputs = this.el.nativeElement.querySelectorAll('input');
    inputs.forEach((input: Element) => {
      (input as HTMLElement).style.color = 'white';
    });
    
    // 1. Labels de mat-form-field
    const matLabels = document.querySelectorAll('.mat-form-field-label');
    matLabels.forEach((label: Element) => {
      (label as HTMLElement).style.color = 'white';
    });

      // Cibler les underlines des champs (pour appearance="legacy" ou "standard")
  const underlines = document.querySelectorAll('.mat-form-field-underline');
  underlines.forEach((underline: Element) => {
    (underline as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
  });
  
  // Cibler les ripples (effet d'animation lors du focus)
  const ripples = document.querySelectorAll('.mat-form-field-ripple');
  ripples.forEach((ripple: Element) => {
    (ripple as HTMLElement).style.backgroundColor = 'white';
  });
  
  // Pour appearance="outline", cibler les bordures de l'outline
  const outlines = document.querySelectorAll('.mat-form-field-outline');
  outlines.forEach((outline: Element) => {
    (outline as HTMLElement).style.color = 'white';
  });
  
  // Également, pour appearance="outline", cibler les segments de l'outline
  const outlineStarts = document.querySelectorAll('.mat-form-field-outline-start');
  outlineStarts.forEach((segment: Element) => {
    (segment as HTMLElement).style.borderColor = 'white';
  });
  
  const outlineEnds = document.querySelectorAll('.mat-form-field-outline-end');
  outlineEnds.forEach((segment: Element) => {
    (segment as HTMLElement).style.borderColor = 'white';
  });
  
  const outlineGaps = document.querySelectorAll('.mat-form-field-outline-gap');
  outlineGaps.forEach((segment: Element) => {
    (segment as HTMLElement).style.borderColor = 'white';
  });
  
  // Si vous utilisez appearance="fill", cibler le fond du champ
  const fills = document.querySelectorAll('.mat-form-field-flex');
  fills.forEach((fill: Element) => {
    // Ajouter une bordure subtile autour du champ
    (fill as HTMLElement).style.border = '1px solid rgba(255, 255, 255, 0.3)';
    (fill as HTMLElement).style.borderRadius = '4px';
    
    // Optionnel: ajouter un fond légèrement plus clair
    (fill as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
  });

  }

  // Faciliter l'accès aux contrôles du formulaire
  get f() {
    return this.loginForm.controls;
  }

  onSubmit(): void {
    // Arrêter le traitement si le formulaire est invalide
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.errorMessage = null;

    this.authService.login(this.f['email'].value, this.f['password'].value)
      .pipe(finalize(() => {
        this.loading = false;
      }))
      .subscribe({
        next: () => {
          this.snackBar.open('Connexion réussie', 'Fermer', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom'
          });
          this.router.navigate([this.returnUrl]);
        },
        error: (error) => {
          this.errorMessage = error.message || 'Une erreur est survenue lors de la connexion';
          this.snackBar.open(this.errorMessage, 'Fermer', {
            duration: 5000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
            panelClass: ['error-snackbar']
          });
        }
      });
  }
}
