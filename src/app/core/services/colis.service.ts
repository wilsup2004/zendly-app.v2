// src/app/core/services/colis.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Colis } from '../models/colis.model';

@Injectable({
  providedIn: 'root'
})
export class ColisService {
  private apiUrl = `${environment.apiUrl}/trade/colis`;

  constructor(private http: HttpClient) { }

  /**
   * Récupère tous les colis
   * @returns Un Observable contenant la liste des colis
   */
  getAllColis(): Observable<Colis[]> {
    return this.http.get<Colis[]>(this.apiUrl);
  }

  /**
   * Récupère un colis par son ID
   * @param id L'ID du colis
   * @returns Un Observable contenant le colis
   */
  getColisById(id: number): Observable<Colis> {
    return this.http.get<Colis>(`${this.apiUrl}/${id}`);
  }

  /**
   * Récupère les colis d'un utilisateur avec un statut donné
   * @param statut Le statut des colis à récupérer
   * @param userId L'ID de l'utilisateur (optionnel)
   * @returns Un Observable contenant la liste des colis
   */
  getColisByUserAndStatut(statut: number, userId?: string): Observable<Colis[]> {
    let url = `${this.apiUrl}/userstatut?userNom=${userId}`;
    
    if (statut) {
      //url += `&userNom=${userId}`;
      url += `&statut=${statut}`;
    }
    
    return this.http.get<Colis[]>(url);
  }

  /**
   * Récupère les colis disponibles (non associés à une prise en charge) d'un utilisateur
   * @param userId L'ID de l'utilisateur
   * @returns Un Observable contenant la liste des colis disponibles
   */
  getColisDiponibles(userId: string): Observable<Colis[]> {
    // Utilise le statut 1 (Créé) qui correspond aux colis qui ne sont pas encore associés
    return this.getColisByUserAndStatut(1, userId);
  }

  /**
   * Récupère les colis compatibles avec un trajet
   * @param origine La ville de départ
   * @param destination La ville d'arrivée
   * @param statut Le statut des colis à récupérer
   * @param userId L'ID de l'utilisateur (optionnel)
   * @returns Un Observable contenant la liste des colis
   */
  getColisByTrajetAndStatut(origine: string, destination: string, statut: number, userId?: string): Observable<Colis[]> {
    let url = `${this.apiUrl}/trajet?origine=${origine}&destination=${destination}&statut=${statut}`;
    
    if (userId) {
      url += `&idUser=${userId}`;
    }
    
    return this.http.get<Colis[]>(url);
  }

  /**
   * Récupère l'image d'un colis
   * @param colisId L'ID du colis
   * @returns Un Observable contenant l'image du colis sous forme de Blob
   */
  getColisImage(colisId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/image/${colisId}`, {
      responseType: 'blob'
    });
  }

  /**
   * Crée un nouveau colis
   * @param formData Les données du formulaire contenant les informations du colis
   * @returns Un Observable contenant la réponse de l'API
   */
  createColis(formData: FormData): Observable<any> {
    return this.http.post(this.apiUrl, formData);
  }

  /**
   * Met à jour un colis existant
   * @param formData Les données du formulaire contenant les nouvelles informations du colis
   * @returns Un Observable contenant la réponse de l'API
   */
  updateColis(formData: FormData): Observable<any> {
    return this.http.put(this.apiUrl, formData);
  }

  /**
   * Annule un colis
   * @param colis Le colis à annuler
   * @returns Un Observable contenant la réponse de l'API
   */
  annulerColis(colis: Colis): Observable<any> {
    return this.http.put(`${this.apiUrl}/annule`, colis);
  }
}