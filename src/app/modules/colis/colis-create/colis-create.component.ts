// src/app/modules/colis/colis-create/colis-create.component.ts
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatStepper } from '@angular/material/stepper';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { ColisService } from '../../../core/services/colis.service';
import { TrajetService } from '../../../core/services/trajet.service';
import { AuthService } from '../../../core/services/auth.service';
import { Aeroport } from '../../../core/models/aeroport.model';
import { Statut } from '../../../core/models/colis.model';
import { User } from '../../../core/models/user.model';
import { STEPPER_GLOBAL_OPTIONS } from '@angular/cdk/stepper';
import { finalize } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { HttpEventType } from '@angular/common/http';

interface Colis {
    idStatut:any ,
    idUser:string ,
    longueur: any,
    largeur: any,
     hauteur: any,
    nbKilo: any,
    tarif: any,
    horodatage: Date,
    villeDepart: string,
    villeArrivee: string,
    description: string,
    photoPath: string,
    file :File
}

@Component({
  selector: 'app-colis-create',
  templateUrl: './colis-create.component.html',
  styleUrls: ['./colis-create.component.scss'],
  providers: [
    {
      provide: STEPPER_GLOBAL_OPTIONS,
      useValue: { showError: true }
    }
  ]
})
export class ColisCreateComponent implements OnInit {
  // FormControls individuels
  idStatut = new FormControl(1, Validators.required);
  villeDepart = new FormControl('', Validators.required);
  villeArrivee = new FormControl('', Validators.required);
  description = new FormControl('', Validators.required);
  longueur = new FormControl('', [Validators.required, Validators.min(1), Validators.max(150)]);
  largeur = new FormControl('', [Validators.required, Validators.min(1), Validators.max(150)]);
  hauteur = new FormControl('', [Validators.required, Validators.min(1), Validators.max(150)]);
  nbKilo = new FormControl('', [Validators.required, Validators.min(0.1), Validators.max(30)]);
  tarif = new FormControl('', [Validators.required, Validators.min(1)]);
  
  loading = false;
  acceptTerms = false;
  currentUser: User | null = null;

  public colis: Colis = {
    idStatut:'' ,
    idUser:'' ,
    longueur: '' ,
    largeur: '' ,
     hauteur: '' ,
    nbKilo: '' ,
    tarif: '' ,
    horodatage: new Date,
    villeDepart: '' ,
    villeArrivee: '' ,
    description: '' ,
    photoPath:'' ,
    file : new File([],'')
  };
  
  // Suggestions pour les villes
  filteredDepartureCities: Observable<string[]> | undefined;
  filteredArrivalCities: Observable<string[]> | undefined;
  villeOptions: string[] = [];
  
  // Image du colis
  selectedFile: File | null = null;
  
  // Statuts disponibles
  statuts: Statut[] = [
    { idStatut: 1, libelStatut: 'Créé' }
  ];
  
  constructor(
    private fb: FormBuilder,
    private router: Router,
    private snackBar: MatSnackBar,
    private colisService: ColisService,
    private trajetService: TrajetService,
    private authService: AuthService
  ) {}
  
  ngOnInit(): void {
    // Récupérer l'utilisateur actuel
    this.currentUser = this.authService.currentUser;
    
    // Charger les aéroports pour les suggestions de villes
    this.loadAeroports();
    
    // Configurer les filtres d'autocomplétion
    this.setupFilters();
  }
  
  private loadAeroports(): void {
    this.trajetService.getAllAeroports().subscribe({
      next: (aeroports: Aeroport[]) => {
        // Extraire toutes les villes uniques
        const villeSet = new Set<string>();
        aeroports.forEach(aeroport => {
          if (aeroport.aeroVille) {
            villeSet.add(aeroport.aeroVille);
          }
        });
        
        this.villeOptions = Array.from(villeSet).sort();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des aéroports:', error);
      }
    });
  }
  
  private setupFilters(): void {
    // Configurer l'autocomplétion pour la ville de départ
    this.filteredDepartureCities = this.villeDepart.valueChanges.pipe(
      startWith(''),
      map(value => this._filter(value || '', this.villeOptions))
    );
    
    // Configurer l'autocomplétion pour la ville d'arrivée
    this.filteredArrivalCities = this.villeArrivee.valueChanges.pipe(
      startWith(''),
      map(value => this._filter(value || '', this.villeOptions))
    );
  }
  
  private _filter(value: string, options: string[]): string[] {
    const filterValue = value.toLowerCase();
    return options.filter(option => option.toLowerCase().includes(filterValue));
  }
  
  // Vérifier la validité du formulaire
  isFormValid(): boolean {
    return (
      this.villeDepart.valid &&
      this.villeArrivee.valid &&
      this.description.valid &&
      this.longueur.valid &&
      this.largeur.valid &&
      this.hauteur.valid &&
      this.nbKilo.valid &&
      this.tarif.valid
    );
  }
  
  // Gérer le changement d'état de la case à cocher des conditions générales
  onTermsChange(event: MatCheckboxChange): void {
    this.acceptTerms = event.checked;
  }
  
  // Gérer le fichier sélectionné
  onFileSelected(file: File | null): void {
    this.selectedFile = file;
  }
  
  // Soumettre le formulaire
  onSubmit(): void {
    if (!this.isFormValid() || !this.acceptTerms) {
      // Marquer tous les contrôles comme touchés pour afficher les erreurs
      this.villeDepart.markAsTouched();
      this.villeArrivee.markAsTouched();
      this.description.markAsTouched();
      this.longueur.markAsTouched();
      this.largeur.markAsTouched();
      this.hauteur.markAsTouched();
      this.nbKilo.markAsTouched();
      this.tarif.markAsTouched();
      return;
    }
    
    if (!this.currentUser) {
      this.snackBar.open('Vous devez être connecté pour créer un colis', 'Fermer', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom'
      });
      return;
    }
    
    this.loading = true;
    
    
    // Préparer les données du formulaire

    const formData = new FormData();
    
    // Ajouter les champs du formulaire
/*
    formData.append('idStatut', String(1)); // Convertir explicitement en chaîne
    formData.append('idUser', String(this.currentUser.idUser));
    formData.append('longueur', String(this.longueur.value));
    formData.append('largeur', String(this.largeur.value));
    formData.append('hauteur', String(this.hauteur.value));
    formData.append('nbKilo', String(this.nbKilo.value));
    formData.append('tarif', String(this.tarif.value));
    formData.append('villeDepart', String(this.villeDepart.value || ''));
    formData.append('villeArrivee', String(this.villeArrivee.value || ''));
    formData.append('description', String(this.description.value || ''));
*/

    formData.append('idStatut', '1');
    formData.append('idUser', this.currentUser.idUser);
    formData.append('longueur', this.longueur.value?.toString() || '');
    formData.append('largeur', this.largeur.value?.toString() || '');
    formData.append('hauteur', this.hauteur.value?.toString() || '');
    formData.append('nbKilo', this.nbKilo.value?.toString() || '');
    formData.append('tarif', this.tarif.value?.toString() || '');
    formData.append('villeDepart', this.villeDepart.value || '');
    formData.append('villeArrivee', this.villeArrivee.value || '');
    formData.append('description', this.description.value || '');
 

    // Ajouter le fichier s'il existe
    if (this.selectedFile) {
      formData.append('file', this.selectedFile, this.selectedFile.name);
    } else {
      // Ajouter un fichier vide pour satisfaire le backend
      const emptyBlob = new Blob([''], {  type: 'text/plain' });
      formData.append('file', emptyBlob, 'empty.txt');
    }

 
    // Envoi de la requête
    this.colisService.createColis(formData)
    .pipe(finalize(() => this.loading = false))
    .subscribe({
      next: (response) => {
        this.snackBar.open('Colis créé avec succès', 'Fermer', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
        this.router.navigate(['/colis']);
      },
      error: (error) => {
        console.error('Erreur détaillée:', error);
        const errorMessage = error.error || error.message || 'Erreur inconnue';
        this.snackBar.open(`Erreur lors de la création du colis: ${errorMessage}`, 'Fermer', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
          panelClass: ['error-snackbar']
        });
      }
    });
  }
  
  // Calculer le volume du colis
  calculateVolume(): number {
    const longueurVal = Number(this.longueur.value) || 0;
    const largeurVal = Number(this.largeur.value) || 0;
    const hauteurVal = Number(this.hauteur.value) || 0;
    
    return longueurVal * largeurVal * hauteurVal;
  }
}