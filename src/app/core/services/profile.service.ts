// src/app/core/services/profile.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User, UserProfile } from '../models/user.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private apiUrl = `${environment.apiUrl}/trade/users`;

  constructor(private http: HttpClient) {}
/*
  getUserProfile(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/profile`);
  }
*/
  updateUserProfile(profileData: Partial<UserProfile>): Observable<any> {
    return this.http.patch(`${this.apiUrl}/profile`, { userProfile: profileData });
  }

  /*
  updateUser(userData: Partial<User>): Observable<any> {
    return this.http.patch(`${this.apiUrl}/profile`, userData);
  }
  */

  updateUser(idUser: String, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${idUser}`, data);
  }

  getProfilePhotoUrl(): Observable<string> {
    return this.http.get<string>(`${this.apiUrl}/profile/photo-url`);
  }

  // La méthode est définie pour accepter FormData
  uploadProfilePhoto(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/profile/photo`, formData);
  }

  deleteProfilePhoto(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/profile/photo`);
  }

  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/profile/change-password`, {
      currentPassword,
      newPassword
    });
  }
  
  // Méthode pour récupérer un utilisateur par son ID (pseudo)
  getUserById(userId: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${userId}`);
  }
  
  // Méthode pour désactiver/réactiver un compte utilisateur
  toggleUserStatus(userId: string, isActive: boolean): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${userId}/status`, {
      is_actif: isActive
    });
  }
}