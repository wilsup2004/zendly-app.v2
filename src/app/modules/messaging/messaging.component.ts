// src/app/modules/messaging/messaging.component.ts
import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ChatService } from '../../core/services/chat.service';
import { AuthService } from '../../core/services/auth.service';
import { ColisService } from '../../core/services/colis.service';
import { PriseEnChargeService } from '../../core/services/prise-en-charge.service';
import { User } from '../../core/models/user.model';
import { Colis } from '../../core/models/colis.model';
import { PriseEnCharge } from '../../core/models/prise-en-charge.model';
import { Message } from '../../core/models/message.model';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { UnreadMessagesCounterService } from '../../core/services/unread-messages-counter.service';


interface ChatRoom {
  id: number;
  name: string;
  lastMessage?: string;
  lastMessageDate?: Date;
  unreadCount: number;
  users: {
    id: string;
    name: string;
  }[];
  relatedColis?: Colis;
  relatedTrajet?: PriseEnCharge;
}

@Component({
  selector: 'app-messaging',
  templateUrl: './messaging.component.html',
  styleUrls: ['./messaging.component.scss']
})
export class MessagingComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('chatMessages') private chatMessagesRef!: ElementRef;
  
  currentUser: User | null = null;
  currentUserId: string | null = null;
  
  // État de l'interface
  loading = true;
  loadingMessages = false;
  selectedRoomId: number | null = null;
  
  // Données
  chatRooms: ChatRoom[] = [];
  messages: Message[] = [];
  
  // Formulaire
  messageForm: FormGroup;
  
  // Abonnements
  private subscriptions: Subscription[] = [];
  
  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private chatService: ChatService,
    private authService: AuthService,
    private colisService: ColisService,
    private priseEnChargeService: PriseEnChargeService,
    private unreadMessagesCounterService: UnreadMessagesCounterService
  ) {
    this.messageForm = this.fb.group({
      message: ['', [Validators.required]]
    });
  }
  
  ngOnInit(): void {
    this.currentUser = this.authService.currentUser;
    
    if (this.currentUser) {
      this.currentUserId = this.currentUser.idUser;
      
      // Initialiser la connexion WebSocket
      this.chatService.initializeWebSocketConnection(this.currentUser.idUser);
      
      // Charger les conversations actives
      this.loadActiveConversations();
      
      // Vérifier les paramètres de l'URL pour une conversation spécifique
      this.route.queryParams.subscribe(params => {
        if (params['userId']) {
          // Créer une nouvelle conversation ou ouvrir une existante
          this.openOrCreateConversation(params['userId'], params['colisId'], params['trajetId']);
        }
      });
      
      // S'abonner aux messages
      this.subscribeToMessages();
    }
  }
  
  ngOnDestroy(): void {
    // Se désabonner de tous les abonnements
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    // Fermer la connexion WebSocket
    this.chatService.disconnect();
  }
  
  ngAfterViewChecked(): void {
    // Faire défiler automatiquement vers le bas quand de nouveaux messages sont chargés
    this.scrollToBottom();
  }
  
  loadActiveConversations(): void {
    if (!this.currentUser) return;
    
    this.loading = true;
    
    this.chatService.getActiveConversations(this.currentUser.idUser)
      .pipe(finalize(() => {
        this.loading = false;
      }))
      .subscribe({
        next: (roomIds) => {
          // Pour chaque salle, charger les détails
          roomIds.forEach(roomId => {
            this.loadRoomDetails(roomId);
          });
        },
        error: (error) => {
          console.error('Erreur lors du chargement des conversations:', error);
        }
      });
  }
  
  loadRoomDetails(roomId: number): void {
    // Charger les détails de la prise en charge
    this.priseEnChargeService.getPriseEnChargeById(roomId)
      .subscribe({
        next: (priseEnCharge) => {
          // Créer une salle de chat
          const room: ChatRoom = {
            id: roomId,
            name: `${priseEnCharge.villeDepart} → ${priseEnCharge.villeArrivee}`,
            unreadCount: 0, // Initialiser à 0, sera mis à jour plus tard
            users: [
              {
                id: priseEnCharge.users.idUser,
                name: `${priseEnCharge.users.prenom} ${priseEnCharge.users.nom}`
              }
            ],
            relatedTrajet: priseEnCharge
          };
          
          // Si la prise en charge a un colis associé
          if (priseEnCharge.colis) {
            room.relatedColis = priseEnCharge.colis;
            
            // Ajouter l'utilisateur du colis
            room.users.push({
              id: priseEnCharge.colis.users.idUser,
              name: `${priseEnCharge.colis.users.prenom} ${priseEnCharge.colis.users.nom}`
            });
          }
          
          // Ajouter la salle au tableau
          this.chatRooms.push(room);
          
          // Charger le dernier message et le compteur non lu
          this.chatService.getMessageHistory(roomId)
            .subscribe({
              next: (messages) => {
                if (messages.length > 0) {
                  const lastMessage = messages[messages.length - 1];
                  room.lastMessage = lastMessage.message;
                  room.lastMessageDate = lastMessage.horodatage;
                }
                
                // Utiliser le service pour obtenir le compteur de messages non lus
                this.unreadMessagesCounterService.getUnreadCountForRoom(roomId)
                  .subscribe(count => {
                    room.unreadCount = count;
                    
                    // Trier les salles par date de dernier message
                    this.sortRooms();
                  });
              }
            });
        }
      });
  }
  
  openOrCreateConversation(userId: string, colisId?: string, trajetId?: string): void {
    if (!this.currentUser) return;
    
    // Vérifier si une conversation existe déjà
    const existingRoom = this.chatRooms.find(room => 
      room.users.some(user => user.id === userId)
    );
    
    if (existingRoom) {
      // Ouvrir la conversation existante
      this.selectRoom(existingRoom.id);
    } else if (colisId) {
      // Créer une nouvelle conversation basée sur un colis
      this.colisService.getColisById(parseInt(colisId))
        .subscribe({
          next: (colis) => {
            // TODO: Créer une prise en charge et une conversation
            // Pour l'instant, on simule une nouvelle salle
            const newRoom: ChatRoom = {
              id: Date.now(), // Temporaire, devrait être l'ID de la prise en charge
              name: `${colis.villeDepart} → ${colis.villeArrivee}`,
              unreadCount: 0,
              users: [
                {
                  id: this.currentUser!.idUser,
                  name: `${this.currentUser!.prenom} ${this.currentUser!.nom}`
                },
                {
                  id: userId,
                  name: 'Autre utilisateur' // À remplacer par le nom réel
                }
              ],
              relatedColis: colis
            };
            
            this.chatRooms.push(newRoom);
            this.selectRoom(newRoom.id);
          }
        });
    } else if (trajetId) {
      // Créer une nouvelle conversation basée sur un trajet
      this.priseEnChargeService.getPriseEnChargeById(parseInt(trajetId))
        .subscribe({
          next: (trajet) => {
            // TODO: Créer une conversation
            // Pour l'instant, on simule une nouvelle salle
            const newRoom: ChatRoom = {
              id: parseInt(trajetId),
              name: `${trajet.villeDepart} → ${trajet.villeArrivee}`,
              unreadCount: 0,
              users: [
                {
                  id: this.currentUser!.idUser,
                  name: `${this.currentUser!.prenom} ${this.currentUser!.nom}`
                },
                {
                  id: userId,
                  name: 'Autre utilisateur' // À remplacer par le nom réel
                }
              ],
              relatedTrajet: trajet
            };
            
            this.chatRooms.push(newRoom);
            this.selectRoom(newRoom.id);
          }
        });
    }
  }
  
  selectRoom(roomId: number): void {
    this.selectedRoomId = roomId;
    this.loadingMessages = true;
    this.messages = [];
    
    console.log('Sélection de la salle:', roomId);
    
    // Charger l'historique des messages
    this.chatService.getMessageHistory(roomId)
      .pipe(finalize(() => {
        this.loadingMessages = false;
      }))
      .subscribe({
        next: (messages) => {
          this.messages = messages;
          
          // Marquer tous les messages comme lus via le service
          this.unreadMessagesCounterService.markAllMessagesAsReadInRoom(roomId);
          
          // Mettre à jour le compteur local dans la liste des salles
          const room = this.chatRooms.find(r => r.id === roomId);
          if (room) {
            room.unreadCount = 0;
          }
        },
        error: (error) => {
          console.error('Erreur lors du chargement des messages:', error);
        }
      });
  }
  
  sendMessage(): void {
    if (!this.currentUser || !this.selectedRoomId || this.messageForm.invalid) return;
    
    const messageText = this.messageForm.get('message')?.value.trim();
    if (!messageText) return;
    
    // Trouver la salle sélectionnée
    const room = this.chatRooms.find(r => r.id === this.selectedRoomId);
    if (!room) return;
    
    // Créer un message
    const message: Message = {
      idPrise: this.selectedRoomId,
      idUserPrise: room.users.find(u => u.id !== this.currentUser?.idUser)?.id || '',
      idUserColis: this.currentUser.idUser,
      sender: this.currentUser.idUser,
      horodatage: new Date(),
      message: messageText,
      isRead: false,
      notificationSent: false
    };
    
    // Envoyer le message
    this.chatService.sendMessage(message)
      .subscribe({
        next: () => {
          // Réinitialiser le formulaire
          this.messageForm.reset();
          
          // Ajouter le message à la liste locale
          this.messages.push(message);
          
          // Mettre à jour le dernier message de la salle
          if (room) {
            room.lastMessage = messageText;
            room.lastMessageDate = new Date();
          }
          
          // Trier les salles
          this.sortRooms();
        },
        error: (error) => {
          console.error('Erreur lors de l\'envoi du message:', error);
        }
      });
  }
  
  // Méthode pour marquer les messages comme lus
  markMessagesAsRead(messages: Message[]): void {
    if (!this.currentUserId || !this.selectedRoomId) return;
    
    // Le compteur sera mis à jour automatiquement par le service
    // lorsqu'un message est marqué comme lu
    const unreadMessages = messages.filter(
      m => !m.isRead && m.sender !== this.currentUserId
    );
    
    // Si pas de messages non lus, rien à faire
    if (unreadMessages.length === 0) return;
    
    console.log('Marquage de messages comme lus:', unreadMessages.length);
    
    // Pour chaque message non lu
    unreadMessages.forEach(message => {
      try {
        // Convertir en Date valide
        let messageDate: Date;
        
        if (message.horodatage instanceof Date) {
          messageDate = message.horodatage;
        } else if (typeof message.horodatage === 'string') {
          messageDate = new Date(message.horodatage);
        } else {
          messageDate = new Date();
          console.warn('Format de date invalide:', message);
        }
        
        // Marquer comme lu via ChatService (le service de compteur s'en occupe)
        this.chatService.markMessageAsRead(
          this.selectedRoomId as number, 
          messageDate,
          this.currentUserId
        ).subscribe();
      } catch (error) {
        console.error('Erreur lors du marquage du message comme lu:', error);
      }
    });
  }
  
  // Méthode pour mettre à jour le compteur de messages non lus
  updateUnreadCount(): void {
    if (!this.currentUserId) return;
    
    // Pour chaque salle, compter les messages non lus
    this.chatRooms.forEach(room => {
      this.chatService.getMessageHistory(room.id)
        .subscribe({
          next: (messages) => {
            room.unreadCount = messages.filter(m => 
              !m.isRead && 
              m.sender !== this.currentUserId
            ).length;
          }
        });
    });
  }
  
  subscribeToMessages(): void {
    if (!this.currentUserId) return;
    
    // S'abonner aux nouveaux messages via WebSocket
    const messageSub = this.chatService.newMessage$.subscribe(message => {
      // Si le message appartient à la conversation actuelle
      if (message.idPrise === this.selectedRoomId) {
        // Vérifier si le message est déjà présent
        const isDuplicate = this.messages.some(m => 
          m.sender === message.sender && 
          new Date(m.horodatage).getTime() === new Date(message.horodatage).getTime() &&
          m.message === message.message
        );
        
        if (!isDuplicate) {
          // Ajouter le message à la liste
          this.messages.push(message);
          
          // Si c'est un message reçu et que l'utilisateur est dans la conversation, le marquer comme lu
          if (message.sender !== this.currentUserId) {
            this.markMessagesAsRead([message]);
          }
        }
      }
      
      // Mettre à jour le dernier message de la salle concernée
      const room = this.chatRooms.find(r => r.id === message.idPrise);
      if (room) {
        room.lastMessage = message.message;
        room.lastMessageDate = message.horodatage;
        
        // Mettre à jour le compteur non lu (sera géré par le service)
        this.unreadMessagesCounterService.getUnreadCountForRoom(message.idPrise)
          .subscribe(count => {
            room.unreadCount = count;
            
            // Trier les salles
            this.sortRooms();
          });
      }
    });
    
    this.subscriptions.push(messageSub);
  }
  
  scrollToBottom(): void {
    try {
      if (this.chatMessagesRef && this.chatMessagesRef.nativeElement) {
        this.chatMessagesRef.nativeElement.scrollTop = this.chatMessagesRef.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error('Erreur lors du défilement:', err);
    }
  }
  
  sortRooms(): void {
    // Trier les salles par date de dernier message (plus récent en premier)
    this.chatRooms.sort((a, b) => {
      const dateA = a.lastMessageDate ? new Date(a.lastMessageDate).getTime() : 0;
      const dateB = b.lastMessageDate ? new Date(b.lastMessageDate).getTime() : 0;
      return dateB - dateA;
    });
  }
  
  isOwnMessage(message: Message): boolean {
    return message.sender === this.currentUser?.idUser;
  }
  
  getOtherUser(room: ChatRoom): { id: string, name: string } | undefined {
    if (!this.currentUser) return undefined;
    return room.users.find(u => u.id !== this.currentUser?.idUser);
  }

  /**
   * Récupère le colis associé à la conversation sélectionnée
   * @returns Le colis associé ou undefined si aucun colis n'est associé
   */
  getSelectedRelatedColis(): Colis | undefined {
    if (!this.selectedRoomId) return undefined;
    const room = this.chatRooms.find(r => r.id === this.selectedRoomId);
    return room?.relatedColis;
  }
  
  getFormattedDate(date: Date): string {
    const now = new Date();
    const messageDate = new Date(date);
    
    // Si c'est aujourd'hui, afficher seulement l'heure
    if (messageDate.toDateString() === now.toDateString()) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Si c'est cette année, afficher le jour et le mois
    if (messageDate.getFullYear() === now.getFullYear()) {
      return messageDate.toLocaleDateString([], { day: '2-digit', month: '2-digit' }) + 
        ' ' + messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Sinon, afficher la date complète
    return messageDate.toLocaleDateString() + 
      ' ' + messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  /**
   * Récupère le nom de la salle de chat sélectionnée
   */
  getSelectedRoomName(): string {
    if (!this.selectedRoomId) return '';
    
    const room = this.chatRooms.find(r => r.id === this.selectedRoomId);
    return room?.name || '';
  }

  /**
   * Récupère le nom de l'autre utilisateur dans la salle de chat sélectionnée
   */
  getSelectedRoomOtherUserName(): string {
    if (!this.selectedRoomId) return '';
    
    const room = this.chatRooms.find(r => r.id === this.selectedRoomId);
    if (!room) return '';
    
    const otherUser = this.getOtherUser(room);
    return otherUser?.name || '';
  }
}