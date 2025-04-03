// src/app/core/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { map, catchError, tap } from 'rxjs/operators';
import { User } from '../models/user.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private apiUrl = `${environment.apiUrl}/trade`;

  constructor(private http: HttpClient, private router: Router) {
    // Récupérer l'utilisateur depuis le localStorage
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      this.currentUserSubject.next(JSON.parse(storedUser));
    }
  }

  // Méthode de redirection vers login
  redirectToLogin(returnUrl: string = '/') {
    this.router.navigate(['/auth/login'], {
      queryParams: { returnUrl: returnUrl }
    });
  }
  
  // Obtenir l'utilisateur courant
  public get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  // Vérifier si l'utilisateur est connecté
  public get isLoggedIn(): boolean {
    return !!this.currentUserSubject.value;
  }

  // Vérifier si l'utilisateur est administrateur
  public get isAdmin(): boolean {
    const user = this.currentUserSubject.value;
    if (!user || !user.usersProfils) return false;
    
    // Vérifier si l'utilisateur a un profil d'administrateur (idProfil = 1 pour admin)
    return user.usersProfils.some(profile => profile.profil?.idProfil === 1);
  }

  // Connexion
  login(email: string, password: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/auth?mail=${email}&password=${password}`)
      .pipe(
        tap(user => {
          // Gestion de la compatibilité entre is_actif et isActive
          if (user.isActif === undefined && user.isActif !== undefined) {
            user.isActif = user.isActif;
          } else if (user.isActif === undefined) {
            user.isActif = true; // Valeur par défaut
          }
          
          // Vérifier si l'utilisateur est actif
          if (!user.isActif) {
            throw new Error('Votre compte a été désactivé. Veuillez contacter l\'administration.');
          }
          
          // Stocker l'utilisateur dans le localStorage
          localStorage.setItem('currentUser', JSON.stringify(user));
          this.currentUserSubject.next(user);
        }),
        catchError(error => {
          console.error('Erreur de connexion:', error);
          if (error.message === 'Votre compte a été désactivé. Veuillez contacter l\'administration.') {
            throw error;
          }
          throw new Error('Identifiants incorrects');
        })
      );
  }

  // Inscription
  register(user: User): Observable<any> {
    // Vérifier d'abord si le pseudo est disponible
    return this.checkPseudoAvailability(user.idUser).pipe(
      map(isAvailable => {
        if (!isAvailable) {
          throw new HttpErrorResponse({
            error: { 
              code: 'PSEUDO_ALREADY_EXISTS', 
              message: 'Ce pseudo est déjà utilisé. Veuillez en choisir un autre.' 
            },
            status: 400,
            statusText: 'Bad Request'
          });
        }
        // Si le pseudo est disponible, procéder à l'inscription
        return this.http.post(`${this.apiUrl}/users`, user);
      }),
      catchError(error => {
        if (error.error?.code === 'PSEUDO_ALREADY_EXISTS') {
          return throwError(() => error);
        }
        return this.http.post(`${this.apiUrl}/users`, user);
      })
    );
  }

  // Vérifier la disponibilité d'un pseudo
  checkPseudoAvailability(pseudo: string): Observable<boolean> {
    // Simulation de vérification jusqu'à ce que l'API backend soit implémentée
    // Vous devrez remplacer cette implémentation par un appel réel à votre API
    return this.http.get<boolean>(`${this.apiUrl}/users/check-pseudo/${pseudo}`)
      .pipe(
        catchError(error => {
          console.error('Erreur lors de la vérification du pseudo:', error);
          // En cas d'erreur, on retourne false par sécurité (considéré comme non disponible)
          return of(false);
        })
      );
  }

  // Déconnexion
  logout(): void {
    // Supprimer l'utilisateur du localStorage
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
  }

  // Mettre à jour le profil
  updateProfile(user: User): Observable<any> {
    return this.http.put(`${this.apiUrl}/users/${user.idUser}`, user)
      .pipe(
        tap(() => {
          // Mettre à jour l'utilisateur dans le localStorage
          localStorage.setItem('currentUser', JSON.stringify(user));
          this.currentUserSubject.next(user);
        })
      );
  }

  // Vérifier si le token est valide
  checkToken(): Observable<boolean> {
    const user = this.currentUser;
    if (!user) {
      return of(false);
    }

    // Dans un vrai scénario, on ferait une requête au serveur pour valider le token
    // Ici, on simule juste la vérification
    return of(true);
  }

  /**
   * Met à jour les informations de l'utilisateur actuellement connecté
   * @param user Les nouvelles informations de l'utilisateur
   */
  updateCurrentUser(user: User): void {
    this.currentUserSubject.next(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
  }

  // Activer/désactiver un compte utilisateur
  toggleUserActiveStatus(userId: string, isActive: boolean): Observable<any> {
    return this.http.patch(`${this.apiUrl}/users/${userId}/status`, { is_actif: isActive });
  }
}