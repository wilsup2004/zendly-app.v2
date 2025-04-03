// src/app/core/models/prise-en-charge.model.ts
import { User } from './user.model';
import { Statuts } from './statuts.model';
import { Colis } from './colis.model';

export interface PriseEnCharge {
  idPrise: number;
  users: User;
  statuts: Statuts;
  colis: Colis; // Maintenant obligatoire
  idVol?: string;
  villeDepart: string;
  dateDepart: Date | string;
  villeArrivee: string;
  dateArrivee: Date | string;
}