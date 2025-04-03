// src/app/core/models/user.model.ts
export interface UserProfile {
  id: {
    idUser: string;
    idProfil: number;
  };
  profil: {
    idProfil: number;
    libelProfil: string;
  };
  dateInit: Date;
  note: number;
  // Added missing properties
   
}

export interface User {
  idUser: string;
  nom: string;
  prenom: string;
  mail: string;
  password: string;
  adresse: string;
  complementAdresse: string;
  codePostal: string;
  ville: string;
  pays: string;     
  usersProfils: UserProfile[];
  //isActive: boolean;
  // Added new properties
  telephone: string;      // Nouveau champ ajouté
  isActif: boolean;      // Nouveau champ ajouté
  // Other properties
  colis: any[];
  priseEnCharges: any[];
  usersTrades: any[];
}