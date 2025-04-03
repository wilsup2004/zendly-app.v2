// src/app/core/services/prise-en-charge.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PriseEnCharge } from '../models/prise-en-charge.model';

@Injectable({
  providedIn: 'root'
})
export class PriseEnChargeService {
  private apiUrl = `${environment.apiUrl}/trade/priseEnCharge`;

  constructor(private http: HttpClient) { }

  /**
   * Crée une nouvelle prise en charge (avec un colis associé obligatoire)
   * @param priseEnCharge Les informations de la prise en charge
   * @returns Un Observable contenant la réponse de l'API
   */
  createPriseEnCharge(priseEnCharge: any): Observable<any> {
    // Validation: vérifier que le colis est bien présent
    if (!priseEnCharge.colis) {
      throw new Error('Un colis doit être associé à la prise en charge');
    }
    
    return this.http.post(this.apiUrl, priseEnCharge);
  }

  /**
   * Récupère toutes les prises en charge
   * @returns Un Observable contenant la liste des prises en charge
   */
  getAllPriseEnCharge(): Observable<PriseEnCharge[]> {
    return this.http.get<PriseEnCharge[]>(this.apiUrl);
  }

  /**
   * Récupère une prise en charge par son ID
   * @param id L'ID de la prise en charge
   * @returns Un Observable contenant la prise en charge
   */
  getPriseEnChargeById(id: number): Observable<PriseEnCharge> {
    return this.http.get<PriseEnCharge>(`${this.apiUrl}/${id}`);
  }

  /**
   * Récupère les prises en charge d'un utilisateur
   * @param userId L'ID de l'utilisateur
   * @param statut Le statut des prises en charge à récupérer (optionnel)
   * @returns Un Observable contenant la liste des prises en charge
   */
  getPriseEnChargeByUserAndStatut(userId: string, statut?: number): Observable<PriseEnCharge[]> {
    let url = `${this.apiUrl}/userstatut?userNom=${userId}`;
    
    if (statut) {
      url += `&statut=${statut}`;
    }
    
    return this.http.get<PriseEnCharge[]>(url);
  }

  /**
   * Met à jour une prise en charge
   * @param id L'ID de la prise en charge
   * @param priseEnCharge Les nouvelles informations de la prise en charge
   * @returns Un Observable contenant la réponse de l'API
   */
  updatePriseEnCharge(id: number, priseEnCharge: PriseEnCharge): Observable<any> {
    // Validation: vérifier que le colis est bien présent
    if (!priseEnCharge.colis) {
      throw new Error('Un colis doit être associé à la prise en charge');
    }
    
    return this.http.put(`${this.apiUrl}/${id}`, priseEnCharge);
  }

  /**
   * Annule une prise en charge
   * @param id L'ID de la prise en charge
   * @param priseEnCharge Les informations de la prise en charge
   * @returns Un Observable contenant la réponse de l'API
   */
  annulerPriseEnCharge(id: number, priseEnCharge: PriseEnCharge): Observable<any> {
    return this.http.put(`${this.apiUrl}/annule/${id}`, priseEnCharge);
  }
  
  /**
   * Récupère une prise en charge par son colis associé
   * @param colisId L'ID du colis
   * @returns Un Observable contenant la prise en charge
   */
  getPriseEnChargeByColis(colisId: number): Observable<PriseEnCharge> {
    return this.http.get<PriseEnCharge>(`${this.apiUrl}/colis/${colisId}`);
  }
}