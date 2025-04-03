// src/app/core/services/theme.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ThemeOption = 'light-theme' | 'dark-theme' | 'cyber-neon-theme' | 'sugar-candy-theme' | 'emerald-ocean-theme' | 'cosmic-purple-theme';

export interface Theme {
  name: string;
  className: ThemeOption;
}

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private themes: Theme[] = [
    { name: 'Clair', className: 'light-theme' },
    { name: 'Sombre', className: 'dark-theme' },
    { name: 'Cyber Néon', className: 'cyber-neon-theme' },
    { name: 'Sugar Candy', className: 'sugar-candy-theme' },
    { name: 'Océan Émeraude', className: 'emerald-ocean-theme' },
    { name: 'Violet Cosmique', className: 'cosmic-purple-theme' }
  ];
  
  private activeThemeSubject = new BehaviorSubject<Theme>(this.getDefaultTheme());
  activeTheme$ = this.activeThemeSubject.asObservable();

  constructor() {
    // Initialiser le thème au démarrage
    const savedTheme = this.getSavedTheme();
    if (savedTheme) {
      this.setActiveTheme(savedTheme);
    } else {
      // Si aucun thème n'est sauvegardé, appliquer les styles pour le thème par défaut
      this.applyThemeSpecificAdjustments('light-theme');
      document.body.setAttribute('data-theme', 'light-theme');
    }
  }

  getThemes(): Theme[] {
    return [...this.themes];
  }

  getActiveTheme(): Theme {
    return this.activeThemeSubject.value;
  }

  setActiveTheme(theme: Theme): void {
    if (!this.isValidTheme(theme.className)) {
      theme = this.getDefaultTheme();
    }
    
    // Supprimer toutes les classes de thème du body
    document.body.classList.remove('dark-theme', 'cyber-neon-theme', 'sugar-candy-theme', 'emerald-ocean-theme', 'cosmic-purple-theme');
    
    // Appliquer la nouvelle classe de thème si ce n'est pas le thème clair (qui est le défaut)
    if (theme.className !== 'light-theme') {
      document.body.classList.add(theme.className);
    }
    
    // Mettre à jour localStorage et le sujet BehaviorSubject
    localStorage.setItem('theme', theme.className);
    this.activeThemeSubject.next(theme);
    
    // Ajouter un attribut data-theme pour faciliter le ciblage CSS
    document.body.setAttribute('data-theme', theme.className);
    
    // Appliquer des ajustements spécifiques au thème
    this.applyThemeSpecificAdjustments(theme.className);
  }

  private getSavedTheme(): Theme | null {
    const savedThemeClass = localStorage.getItem('theme') as ThemeOption;
    if (savedThemeClass && this.isValidTheme(savedThemeClass)) {
      const foundTheme = this.themes.find(theme => theme.className === savedThemeClass);
      return foundTheme || null;
    }
    return null;
  }

  private getDefaultTheme(): Theme {
    return { name: 'Clair', className: 'light-theme' };
  }

  private isValidTheme(theme: string): theme is ThemeOption {
    return ['light-theme', 'dark-theme', 'cyber-neon-theme', 'sugar-candy-theme', 'emerald-ocean-theme', 'cosmic-purple-theme'].includes(theme);
  }
  
  private applyThemeSpecificAdjustments(themeClass: ThemeOption): void {
    // Appliquer des ajustements spécifiques selon le thème
    const htmlRoot = document.documentElement;
    
    // Réinitialiser les propriétés personnalisées
    htmlRoot.style.removeProperty('--tab-label-shadow');
    htmlRoot.style.removeProperty('--text-contrast-boost');
    htmlRoot.style.removeProperty('--sidenav-text-color');
    htmlRoot.style.removeProperty('--sidenav-active-color');
    htmlRoot.style.removeProperty('--form-label-color');
    htmlRoot.style.removeProperty('--form-input-color');
    htmlRoot.style.removeProperty('--profile-text-color');
    htmlRoot.style.removeProperty('--profile-text-shadow');
    
    // Appliquer des ajustements selon le thème
    switch (themeClass) {
      case 'dark-theme':
        // Augmenter le contraste pour le thème sombre
        htmlRoot.style.setProperty('--tab-label-shadow', '0 0 3px rgba(0, 0, 0, 0.7)');
        htmlRoot.style.setProperty('--text-contrast-boost', '0 0 2px rgba(0, 0, 0, 0.8)');
        // Couleur du texte et des icônes du sidenav
        htmlRoot.style.setProperty('--sidenav-text-color', '#ffffff');
        htmlRoot.style.setProperty('--sidenav-active-color', '#ff4081'); // Rose
        // Couleurs pour les formulaires et le profil
        htmlRoot.style.setProperty('--form-label-color', '#ffffff');
        htmlRoot.style.setProperty('--form-input-color', '#ffffff');
        htmlRoot.style.setProperty('--profile-text-color', '#ffffff');
        htmlRoot.style.setProperty('--profile-text-shadow', '0 0 3px rgba(0, 0, 0, 0.7)');
        break;
        
      case 'cyber-neon-theme':
        // Ajustements pour le thème Cyber Neon
        htmlRoot.style.setProperty('--tab-label-shadow', '0 0 3px rgba(0, 0, 0, 0.7)');
        htmlRoot.style.setProperty('--text-contrast-boost', '0 0 2px rgba(0, 0, 0, 0.8)');
        // Couleur du texte et des icônes neon
        htmlRoot.style.setProperty('--sidenav-text-color', '#A0AEC0');
        htmlRoot.style.setProperty('--sidenav-active-color', 'rgb(6, 182, 212)'); // Cyan
        htmlRoot.style.setProperty('--form-label-color', '#ffffff');
        htmlRoot.style.setProperty('--form-input-color', '#ffffff');
        htmlRoot.style.setProperty('--profile-text-color', '#ffffff');
        htmlRoot.style.setProperty('--profile-text-shadow', '0 0 4px rgba(6, 182, 212, 0.7)');
        break;
        
      case 'emerald-ocean-theme':
        // Ajustements pour le thème Océan Émeraude
        htmlRoot.style.setProperty('--tab-label-shadow', '0 0 3px rgba(0, 0, 0, 0.7)');
        htmlRoot.style.setProperty('--text-contrast-boost', '0 0 2px rgba(0, 0, 0, 0.8)');
        // Couleur du texte et des icônes émeraude
        htmlRoot.style.setProperty('--sidenav-text-color', '#A7F3D0');
        htmlRoot.style.setProperty('--sidenav-active-color', '#10B981'); // Vert
        htmlRoot.style.setProperty('--form-label-color', '#ffffff');
        htmlRoot.style.setProperty('--form-input-color', '#ffffff');
        htmlRoot.style.setProperty('--profile-text-color', '#ffffff');
        htmlRoot.style.setProperty('--profile-text-shadow', '0 0 4px rgba(20, 184, 166, 0.7)');
        break;
        
      case 'cosmic-purple-theme':
        // Ajustements pour le thème Violet Cosmique
        htmlRoot.style.setProperty('--tab-label-shadow', '0 0 3px rgba(0, 0, 0, 0.7)');
        htmlRoot.style.setProperty('--text-contrast-boost', '0 0 2px rgba(0, 0, 0, 0.8)');
        // Couleur du texte et des icônes violet cosmique
        htmlRoot.style.setProperty('--sidenav-text-color', '#CBD5E1');
        htmlRoot.style.setProperty('--sidenav-active-color', '#A855F7'); // Violet
        htmlRoot.style.setProperty('--form-label-color', '#ffffff');
        htmlRoot.style.setProperty('--form-input-color', '#ffffff');
        htmlRoot.style.setProperty('--profile-text-color', '#ffffff');
        htmlRoot.style.setProperty('--profile-text-shadow', '0 0 4px rgba(168, 85, 247, 0.7)');
        break;
        
      case 'sugar-candy-theme':
        // Ajustements pour le thème Sugar Candy
        // Couleur du texte et des icônes sugar candy
        htmlRoot.style.setProperty('--sidenav-text-color', '#718096');
        htmlRoot.style.setProperty('--sidenav-active-color', '#D53F8C'); // Rose
        htmlRoot.style.setProperty('--form-label-color', '#2D3748');
        htmlRoot.style.setProperty('--form-input-color', '#2D3748');
        htmlRoot.style.setProperty('--profile-text-color', '#2D3748');
        htmlRoot.style.setProperty('--profile-text-shadow', '0 0 3px rgba(255, 255, 255, 0.7)');
        break;
        
      default:
        // Thème clair par défaut
        htmlRoot.style.setProperty('--sidenav-text-color', '#666666');
        htmlRoot.style.setProperty('--sidenav-active-color', '#3f51b5'); // Bleu
        htmlRoot.style.setProperty('--form-label-color', '#333333');
        htmlRoot.style.setProperty('--form-input-color', '#333333');
        htmlRoot.style.setProperty('--profile-text-color', '#333333');
        htmlRoot.style.setProperty('--profile-text-shadow', 'none');
        break;
    }
    
    // Ajouter les balises de style pour appliquer les couleurs
    this.updateSidenavStyles();
    this.updateProfileStyles();
  }
  
  private updateSidenavStyles(): void {
    // Supprimer l'ancien style s'il existe
    const existingStyle = document.getElementById('sidenav-custom-style');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    // Créer une balise style pour assurer que les icônes et les textes du sidenav ont la bonne couleur
    const styleElement = document.createElement('style');
    styleElement.id = 'sidenav-custom-style';
    styleElement.textContent = `
      /* Style pour le texte et les icônes du sidenav */
      .sidenav-container .mat-mdc-list-item .mdc-list-item__primary-text,
      .sidenav-container .mdc-list-item__start,
      .sidenav-container .mat-icon,
      .sidenav-container .mat-nav-list .mat-list-item,
      .sidenav-container .mat-mdc-list .mat-mdc-list-item {
        color: var(--sidenav-text-color) !important;
      }
      
      /* Style pour les éléments actifs du sidenav */
      .sidenav-container .active-link .mdc-list-item__primary-text,
      .sidenav-container .active-link .mdc-list-item__start,
      .sidenav-container .active-link .mat-icon {
        color: var(--sidenav-active-color) !important;
        font-weight: 500;
        text-shadow: 0 0 1px rgba(0, 0, 0, 0.3);
      }
      
      /* Ajout d'une bordure latérale pour les éléments actifs */
      .sidenav-container .active-link {
        border-left: 3px solid var(--sidenav-active-color) !important;
        background-color: rgba(0, 0, 0, 0.05);
      }
      
      /* Effet de survol pour les éléments du sidenav */
      .sidenav-container .mat-mdc-list-item:hover:not(.active-link) {
        background-color: rgba(0, 0, 0, 0.03);
      }
      
      /* Transition fluide pour les changements d'état */
      .sidenav-container .mat-mdc-list-item,
      .sidenav-container .mat-mdc-list-item .mdc-list-item__primary-text,
      .sidenav-container .mat-mdc-list-item .mdc-list-item__start,
      .sidenav-container .mat-mdc-list-item .mat-icon {
        transition: all 0.3s ease;
      }
    `;
    
    // Ajouter le style au head du document
    document.head.appendChild(styleElement);
  }
  
  private updateProfileStyles(): void {
    // Supprimer l'ancien style s'il existe
    const existingStyle = document.getElementById('profile-custom-style');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    // Créer une balise style pour assurer que tous les textes du profil sont visibles
    const styleElement = document.createElement('style');
    styleElement.id = 'profile-custom-style';
    styleElement.textContent = `
      /* Styles généraux pour les textes dans le profil */
      .profile-container h1,
      .profile-container h2,
      .profile-container h3,
      .personal-info-container h3,
      .security-container h3,
      .profile-user-info h2,
      .form-actions button span,
      .stat-value,
      .stat-label {
        color: var(--profile-text-color) !important;
        text-shadow: var(--profile-text-shadow) !important;
      }
      
      /* Styles pour le contenu des formulaires */
      .mat-mdc-form-field-infix,
      .mat-mdc-select-value-text {
        color: var(--form-input-color) !important;
      }
      
      /* Style pour les label des formulaires */
      .mat-mdc-form-field-label,
      .mat-mdc-form-field-required-marker {
        color: var(--form-label-color) !important;
      }
      
      /* Style pour les zones de texte des formulaires Material */
      .mat-mdc-text-field-wrapper input,
      .mat-mdc-text-field-wrapper textarea,
      .mat-mdc-select-value {
        color: var(--form-input-color) !important;
      }
      
      /* Styles pour les onglets - même style que le sidenav */
      .mat-tab-label {
        opacity: 1 !important;
      }
      
      .mat-tab-label-content {
        color: var(--sidenav-text-color) !important;
        font-weight: normal;
        transition: all 0.3s ease;
      }
      
      .mat-tab-label-active .mat-tab-label-content {
        color: var(--sidenav-active-color) !important;
        font-weight: 500;
      }
      
      /* Style personnalisé pour les onglets actifs */
      .mat-tab-label-active::after {
        background-color: var(--sidenav-active-color) !important;
        box-shadow: 0 0 4px var(--sidenav-active-color);
      }
      
      /* Styles pour les boutons de visibilité des mots de passe */
      .mat-form-field-suffix .mat-icon,
      .mat-form-field-suffix .mat-icon-button {
        color: var(--form-label-color) !important;
      }
      
      /* Style pour les libellés dans les champs de mot de passe */
      .mat-mdc-floating-label {
        color: var(--form-label-color) !important;
      }
      
      /* Style pour les bordures des champs */
      .mdc-notched-outline__leading,
      .mdc-notched-outline__notch,
      .mdc-notched-outline__trailing {
        border-color: var(--form-label-color) !important;
        opacity: 0.7;
      }
      
      /* Style pour les bordures des champs quand focus */
      .mat-mdc-form-field.mat-focused .mdc-notched-outline__leading,
      .mat-mdc-form-field.mat-focused .mdc-notched-outline__notch,
      .mat-mdc-form-field.mat-focused .mdc-notched-outline__trailing {
        border-color: var(--sidenav-active-color) !important;
        opacity: 1;
      }
      
      /* Augmentation du contraste pour les boutons */
      .profile-container .mat-raised-button.mat-primary,
      .profile-container .mat-flat-button.mat-primary {
        background-color: var(--sidenav-active-color) !important;
        color: white !important;
      }
    `;
    
    // Ajouter le style au head du document
    document.head.appendChild(styleElement);
  }
}