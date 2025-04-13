// src/app/modules/trajet/trajet-create/trajet-create.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TrajetService } from '../../../core/services/trajet.service';
import { PriseEnChargeService } from '../../../core/services/prise-en-charge.service';
import { ColisService } from '../../../core/services/colis.service'; // Ajout du service Colis
import { AuthService } from '../../../core/services/auth.service';
import { Aeroport } from '../../../core/models/aeroport.model';
import { Vol } from '../../../core/models/vol.model';
import { Colis } from '../../../core/models/colis.model'; // Ajout du modèle Colis
import { User } from '../../../core/models/user.model';
import { STEPPER_GLOBAL_OPTIONS } from '@angular/cdk/stepper';
import { finalize } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

@Component({
  selector: 'app-trajet-create',
  templateUrl: './trajet-create.component.html',
  styleUrls: ['./trajet-create.component.scss'],
  providers: [
    {
      provide: STEPPER_GLOBAL_OPTIONS,
      useValue: { showError: true }
    }
  ]
})
export class TrajetCreateComponent implements OnInit {
  trajetForm!: FormGroup;
  loading = false;
  currentUser: User | null = null;
  
  // Déclaration du trajet
  declarationType: 'manual' | 'vol' = 'manual';
  
  // Recherche d'aéroports
  aeroports: Aeroport[] = [];
  filteredDepartureAirports: Observable<Aeroport[]> | undefined;
  filteredArrivalAirports: Observable<Aeroport[]> | undefined;
  
  // Vols trouvés
  foundVols: Vol[] = [];
  selectedVol: Vol | null = null;
  searchingFlights = false;

  // Gestion des colis
  userColis: Colis[] = [];
  selectedColis: Colis | null = null;
  loadingColis = false;
  colisCompatibles: Colis[] = [];
  
  // Étape courante
  currentStep = 1; // 1 = info trajet, 2 = sélection colis
  
  constructor(
    private fb: FormBuilder,
    private router: Router,
    private snackBar: MatSnackBar,
    private trajetService: TrajetService,
    private priseEnChargeService: PriseEnChargeService,
    private colisService: ColisService, // Ajout du service Colis
    private authService: AuthService
  ) {}
  
  ngOnInit(): void {
    // Récupérer l'utilisateur actuel
    this.currentUser = this.authService.currentUser;
    
    // Initialiser le formulaire
    this.initForm();
    
    // Charger les aéroports
    this.loadAeroports();

    // Charger les colis de l'utilisateur
    if (this.currentUser) {
      this.loadUserColis();
    }
  }
  
  private initForm(): void {
    this.trajetForm = this.fb.group({
      // Informations générales
      idVol: [''],
      
      // Départ
      aeroportDepart: ['', Validators.required],
      villeDepart: ['', Validators.required],
      dateDepart: ['', Validators.required],
      
      // Arrivée
      aeroportArrivee: ['', Validators.required],
      villeArrivee: ['', Validators.required],
      dateArrivee: ['', Validators.required],
      
      // Capacité
      nbKilo: [5, [Validators.required, Validators.min(1), Validators.max(30)]]
    }, { 
      validators: this.dateRangeValidator 
    });
  }
  
  // Charger les colis de l'utilisateur
  loadUserColis(): void {
    this.loadingColis = true;
    
    if (!this.currentUser) {
      this.loadingColis = false;
      return;
    }
    
    // Utiliser la méthode getColisDiponibles pour ne récupérer que les colis qui ne sont pas déjà associés
    this.colisService.getColisDiponibles(this.currentUser.idUser)
      .pipe(finalize(() => {
        this.loadingColis = false;
      }))
      .subscribe({
        next: (colis) => {
          this.userColis = colis;
          console.log(`Colis disponibles chargés: ${this.userColis.length} colis disponibles`);
          
          // Si nous sommes déjà à l'étape 2, filtrer immédiatement les colis compatibles
          if (this.currentStep === 2) {
            const villeDepart = this.trajetForm.get('villeDepart')?.value;
            const villeArrivee = this.trajetForm.get('villeArrivee')?.value;
            if (villeDepart && villeArrivee) {
              this.applyColisFilter(villeDepart, villeArrivee);
            }
          }
        },
        error: (error) => {
          console.error('Erreur lors du chargement des colis:', error);
          this.snackBar.open('Erreur lors du chargement des colis', 'Fermer', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
            panelClass: ['error-snackbar']
          });
        }
      });
  }
  
  // Filtrer les colis compatibles avec le trajet
  filterCompatibleColis(): void {
    const villeDepart = this.trajetForm.get('villeDepart')?.value;
    const villeArrivee = this.trajetForm.get('villeArrivee')?.value;
    
    if (!villeDepart || !villeArrivee || !this.currentUser) {
      this.colisCompatibles = [];
      return;
    }
    
    // Charger directement les colis compatibles avec le trajet et disponibles (statut 1 - Créé)
    this.loadingColis = true;
    this.colisService.getColisByTrajetAndStatut(villeDepart, villeArrivee, 1, this.currentUser.idUser)
      .pipe(finalize(() => {
        this.loadingColis = false;
      }))
      .subscribe({
        next: (colis) => {
          console.log(`Colis compatibles chargés directement: ${colis.length} colis disponibles`);
          this.colisCompatibles = colis;
          
          // Si aucun colis compatible n'est trouvé, charger tous les colis de l'utilisateur
          // pour afficher un message approprié
          if (this.colisCompatibles.length === 0) {
            this.loadUserColis();
          }
        },
        error: (error) => {
          console.error('Erreur lors du chargement des colis compatibles:', error);
          this.snackBar.open('Erreur lors du chargement des colis compatibles', 'Fermer', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
            panelClass: ['error-snackbar']
          });
        }
      });
  }
  
  // Applique les filtres sur les colis
  private applyColisFilter(villeDepart: string, villeArrivee: string): void {
    console.log('Filtrage des colis - Trajet:', villeDepart, '->', villeArrivee);
    console.log('Nombre de colis disponibles:', this.userColis.length);
    
    // Filtrer les colis qui correspondent exactement au trajet
    let exactMatches = this.userColis.filter(colis => {
      return colis.villeDepart.toLowerCase() === villeDepart.toLowerCase() && 
             colis.villeArrivee.toLowerCase() === villeArrivee.toLowerCase();
    });
    
    // Si aucune correspondance exacte, utiliser une correspondance partielle
    if (exactMatches.length === 0) {
      exactMatches = this.userColis.filter(colis => {
        return colis.villeDepart.toLowerCase().includes(villeDepart.toLowerCase()) && 
               colis.villeArrivee.toLowerCase().includes(villeArrivee.toLowerCase());
      });
    }
    
    this.colisCompatibles = exactMatches;
    console.log('Colis compatibles trouvés:', this.colisCompatibles.length);
  }
  
  // Sélectionner un colis
  selectColis(colis: Colis): void {
    this.selectedColis = colis;
  }
  
  // Aller à l'étape suivante
  ngAfterViewInit() {
    setTimeout(() => {
      console.log("État du formulaire:", this.trajetForm.valid);
      console.log("Valeurs du formulaire:", this.trajetForm.value);
      console.log("Erreurs du formulaire:", this.trajetForm.errors);
    }, 2000);
  }

 nextStep(): void {
  console.log('Méthode nextStep appelée');
  
  if (this.trajetForm.invalid) {
    console.log("Formulaire invalide, valeurs:", this.trajetForm.value);
    // Marquer tous les champs comme touchés pour afficher les erreurs
    Object.keys(this.trajetForm.controls).forEach(key => {
      this.trajetForm.get(key)?.markAsTouched();
    });
    return;
  }
  
  console.log("Passage à l'étape 2");
  // Important: définir d'abord l'étape, puis filtrer les colis
  this.currentStep = 2;
  this.filterCompatibleColis();
}
  
  // Revenir à l'étape précédente
  previousStep(): void {
    if (this.currentStep === 2) {
      this.currentStep = 1;
    }
  }
  
  logAndNextStep(): void {
    console.log('Bouton cliqué');
    this.nextStep();
  }

  private loadAeroports(): void {
    this.trajetService.getAllAeroports().subscribe({
      next: (aeroports: Aeroport[]) => {
        this.aeroports = aeroports;
        
        // Configurer les filtres d'autocomplétion
        this.setupFilters();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des aéroports:', error);
      }
    });
  }
  
  private setupFilters(): void {
    // Filtre pour les aéroports de départ
    this.filteredDepartureAirports = this.trajetForm.get('aeroportDepart')!.valueChanges.pipe(
      startWith(''),
      map(value => {
        const name = typeof value === 'string' ? value : value?.aeroNom;
        return name ? this._filterAeroports(name) : this.aeroports.slice();
      })
    );
    
    // Filtre pour les aéroports d'arrivée
    this.filteredArrivalAirports = this.trajetForm.get('aeroportArrivee')!.valueChanges.pipe(
      startWith(''),
      map(value => {
        const name = typeof value === 'string' ? value : value?.aeroNom;
        return name ? this._filterAeroports(name) : this.aeroports.slice();
      })
    );
  }
  
  private _filterAeroports(value: string): Aeroport[] {
    const filterValue = value.toLowerCase();
    
    return this.aeroports.filter(aeroport => {
      const nameMatch = aeroport.aeroNom && aeroport.aeroNom.toLowerCase().includes(filterValue);
      const cityMatch = aeroport.aeroVille && aeroport.aeroVille.toLowerCase().includes(filterValue);
      return nameMatch || cityMatch;
    });
  }
  
  displayAeroport(aeroport: Aeroport): string {
    return aeroport && aeroport.aeroNom ? `${aeroport.aeroNom} (${aeroport.idAero})` : '';
  }
  
  onAeroportSelected(controlName: string, event: any): void {
    const aeroport = event.option.value as Aeroport;
    
    if (controlName === 'aeroportDepart') {
      this.trajetForm.get('villeDepart')?.setValue(aeroport.aeroVille);
    } else if (controlName === 'aeroportArrivee') {
      this.trajetForm.get('villeArrivee')?.setValue(aeroport.aeroVille);
    }
  }
  
  // Recherche de vols
  searchFlights(): void {
    const departureAeroport = this.trajetForm.get('aeroportDepart')?.value;
    const arrivalAeroport = this.trajetForm.get('aeroportArrivee')?.value;
    
    if (!departureAeroport || !arrivalAeroport) {
      this.snackBar.open('Veuillez sélectionner les aéroports de départ et d\'arrivée', 'Fermer', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom'
      });
      return;
    }
    
    this.searchingFlights = true;
    
    this.trajetService.searchFlights(departureAeroport.idAero, arrivalAeroport.idAero)
      .pipe(finalize(() => {
        this.searchingFlights = false;
      }))
      .subscribe({
        next: (vols: Vol[]) => {
          this.foundVols = vols;
          
          if (vols.length === 0) {
            this.snackBar.open('Aucun vol trouvé pour ce trajet', 'Fermer', {
              duration: 3000,
              horizontalPosition: 'center',
              verticalPosition: 'bottom'
            });
          }
        },
        error: (error) => {
          console.error('Erreur lors de la recherche de vols:', error);
          this.snackBar.open('Erreur lors de la recherche de vols', 'Fermer', {
            duration: 5000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
            panelClass: ['error-snackbar']
          });
        }
      });
  }
  
  // Sélection d'un vol
  selectVol(vol: Vol): void {
    this.selectedVol = vol;
    
    // Remplir les informations du formulaire
    this.trajetForm.patchValue({
      idVol: vol.numVol || vol.flight?.iata || '',
      dateDepart: new Date(vol.departure.scheduled),
      dateArrivee: new Date(vol.arrival.scheduled)
    });
  }
  
  // Créer un nouveau colis
  createNewColis(): void {
    // Rediriger vers la page de création de colis avec les paramètres du trajet
    const villeDepart = this.trajetForm.get('villeDepart')?.value;
    const villeArrivee = this.trajetForm.get('villeArrivee')?.value;
    
    this.router.navigate(['/colis/create'], {
      queryParams: {
        villeDepart,
        villeArrivee,
        fromTrajet: 'true'
      }
    });
  }
  
  // Soumettre le formulaire
  onSubmit(): void {
    if (this.trajetForm.invalid || !this.selectedColis) {
      // Afficher un message d'erreur si aucun colis n'est sélectionné
      if (!this.selectedColis) {
        this.snackBar.open('Veuillez sélectionner un colis à transporter', 'Fermer', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
          panelClass: ['error-snackbar']
        });
      }
      return;
    }
    
    if (!this.currentUser) {
      this.snackBar.open('Vous devez être connecté pour déclarer un trajet', 'Fermer', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom'
      });
      return;
    }
    
    this.loading = true;
    
    // Créer l'objet trajet (PriseEnCharge dans le backend)
    const trajet = {
      users: this.currentUser,
      colis: this.selectedColis, // Associer le colis sélectionné
      idVol: this.trajetForm.get('idVol')?.value,
      villeDepart: this.trajetForm.get('villeDepart')?.value,
      dateDepart: this.trajetForm.get('dateDepart')?.value,
      villeArrivee: this.trajetForm.get('villeArrivee')?.value,
      dateArrivee: this.trajetForm.get('dateArrivee')?.value,
      nbKiloDispo: this.trajetForm.get('nbKilo')?.value,
      statuts: {
        idStatut: 4, // Créé
        libelStatut: 'PRISE_CHARGE'
      }
    };

    // Mettre à jour le statut du colis
  this.selectedColis.statuts = { 
    idStatut: 4, // En attente 
    libelStatut: 'PRISE_CHARGE'
  };
    
    // Envoyer la requête
    this.priseEnChargeService.createPriseEnCharge(trajet)
      .pipe(finalize(() => {
        this.loading = false;
      }))
      .subscribe({
        next: () => {
          this.snackBar.open('Trajet déclaré avec succès', 'Fermer', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom'
          });
          
          // S'assurer que la redirection se fait vers la page de gestion des trajets
          this.router.navigate(['/trajet']);
        },
        error: (error) => {
          console.error('Erreur lors de la déclaration du trajet:', error);

           // Message d'erreur plus détaillé
      let errorMsg = 'Erreur lors de la déclaration du trajet';
      if (error.error?.message) {
        errorMsg += `: ${error.error.message}`;
      } else if (error.status === 400) {
        errorMsg += ': Données invalides';
      } else if (error.status === 401) {
        errorMsg += ': Authentification requise';
      }

          this.snackBar.open('Erreur lors de la déclaration du trajet', 'Fermer', {
            duration: 5000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
            panelClass: ['error-snackbar']
          });
        }
      });
  }

  
  dateRangeValidator(formGroup: FormGroup) {
    const depart = formGroup.get('dateDepart')?.value;
    const arrivee = formGroup.get('dateArrivee')?.value;
    
    if (depart && arrivee && new Date(depart) >= new Date(arrivee)) {
      formGroup.get('dateArrivee')?.setErrors({ dateInvalid: true });
      return { dateRange: true };
    }
    
    return null;
  }
  
}