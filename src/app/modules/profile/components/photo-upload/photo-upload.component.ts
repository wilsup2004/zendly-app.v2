// src/app/modules/profile/components/photo-upload/photo-upload.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ProfileService } from '../../../../core/services/profile.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-photo-upload',
  templateUrl: './photo-upload.component.html',
  styleUrls: ['./photo-upload.component.scss']
})
export class PhotoUploadComponent {
  @Input() currentPhotoUrl: string = '';
  @Output() photoUploaded = new EventEmitter<boolean>();
  
  uploadProgress: number = 0;
  uploading: boolean = false;
  
  constructor(private profileService: ProfileService) {}
  
  openFileInput(): void {
    document.getElementById('profile-photo-input')?.click();
  }
  
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    
    if (!input.files || input.files.length === 0) {
      return;
    }
    
    const file = input.files[0];
    
    // Vérifier que c'est une image valide
    if (!file.type.match(/image\/(jpeg|jpg|png|gif)/)) {
      alert('Veuillez sélectionner une image valide (JPEG, PNG ou GIF).');
      return;
    }
    
    // Vérifier la taille du fichier (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('La taille de l\'image ne doit pas dépasser 5MB.');
      return;
    }
    
    this.uploadPhoto(file);
  }
  
  uploadPhoto(file: File): void {
    this.uploading = true;
    this.uploadProgress = 0;
    
    // Créer un FormData
    const formData = new FormData();
    formData.append('photo', file);
    
    // Simuler la progression (dans un cas réel, vous utiliseriez HttpEvent)
    const interval = setInterval(() => {
      if (this.uploadProgress < 90) {
        this.uploadProgress += 10;
      }
    }, 300);
    
    // Assurez-vous que vous passez formData et non file à la méthode
    this.profileService.uploadProfilePhoto(formData)
      .pipe(
        finalize(() => {
          clearInterval(interval);
          this.uploadProgress = 100;
          
          // Réinitialiser après 1 seconde
          setTimeout(() => {
            this.uploading = false;
            this.uploadProgress = 0;
          }, 1000);
        })
      )
      .subscribe({
        next: () => {
          this.photoUploaded.emit(true);
        },
        error: (err) => {
          console.error('Erreur lors du téléchargement de la photo', err);
          this.photoUploaded.emit(false);
        }
      });
  }
  
  removePhoto(): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer votre photo de profil ?')) {
      this.profileService.deleteProfilePhoto()
        .subscribe({
          next: () => {
            this.photoUploaded.emit(true);
          },
          error: (err) => {
            console.error('Erreur lors de la suppression de la photo', err);
            this.photoUploaded.emit(false);
          }
        });
    }
  }
}