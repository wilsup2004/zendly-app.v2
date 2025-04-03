// src/app/core/guards/auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}
/*
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | boolean {
    
    if (this.authService.isLoggedIn) {
      // Vérifier si le token est valide
      return this.authService.checkToken().pipe(
        map(isValid => {
          if (isValid) {
            return true;
          } else {
            this.handleAuthError();
            return false;
          }
        }),
        catchError(() => {
          this.handleAuthError();
          return of(false);
        })
      );
    } else {
      this.handleAuthError();
      return false;
    }
  }
*/
canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
  // Vérifiez si l'utilisateur est connecté
  if (this.authService.isLoggedIn) {
    return true;
  }
  
  // Rediriger vers /auth/login au lieu de /login
  this.router.navigate(['/auth/login'], {
    queryParams: { returnUrl: state.url }
  });
  return false;
}


  private handleAuthError(): void {
    this.authService.logout();
    this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
  }
}
