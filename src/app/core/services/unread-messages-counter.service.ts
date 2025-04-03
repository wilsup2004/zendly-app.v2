// src/app/core/services/unread-messages-counter.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subscription, interval } from 'rxjs';
import { filter, switchMap, tap } from 'rxjs/operators';
import { ChatService } from './chat.service';
import { AuthService } from './auth.service';
import { Message } from '../models/message.model';

@Injectable({
  providedIn: 'root'
})
export class UnreadMessagesCounterService implements OnDestroy {
  // Compteur global de messages non lus
  private totalUnreadCountSubject = new BehaviorSubject<number>(0);
  public totalUnreadCount$ = this.totalUnreadCountSubject.asObservable();
  
  // Compteurs par conversation
  private unreadByRoomSubject = new BehaviorSubject<Map<number, number>>(new Map());
  public unreadByRoom$ = this.unreadByRoomSubject.asObservable();
  
  private currentUserId: string | null = null;
  private subscriptions: Subscription[] = [];
  private initialized = false;

  constructor(
    private chatService: ChatService,
    private authService: AuthService
  ) {
    console.log('UnreadMessagesCounterService - Constructeur');
    
    // S'abonner aux changements d'utilisateur
    const authSub = this.authService.currentUser$.subscribe(user => {
      if (user) {
        console.log('UnreadMessagesCounterService - Utilisateur connecté:', user);
        this.currentUserId = user.idUser;
        
        if (!this.initialized) {
          this.initialize();
          this.initialized = true;
        }
      } else {
        this.currentUserId = null;
        this.reset();
      }
    });
    
    this.subscriptions.push(authSub);
  }
  
  ngOnDestroy(): void {
    console.log('UnreadMessagesCounterService - Destruction');
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
  }
  
  /**
   * Initialiser les compteurs et les abonnements
   */
  private initialize(): void {
    if (!this.currentUserId) return;
    
    console.log('UnreadMessagesCounterService - Initialisation');
    
    // S'assurer que la connexion WebSocket est établie
    this.chatService.initializeWebSocketConnection(this.currentUserId);
    
    // Charger le compteur initial
    this.updateUnreadCounts();
    
    // Configuration des mises à jour en temps réel
    this.setupRealtimeUpdates();
    
    // Configuration d'une synchronisation périodique
    this.setupPeriodicSync();
  }
  
  /**
   * Réinitialiser tous les compteurs
   */
  private reset(): void {
    console.log('UnreadMessagesCounterService - Réinitialisation');
    this.totalUnreadCountSubject.next(0);
    this.unreadByRoomSubject.next(new Map());
    this.initialized = false;
  }

  /**
   * Configurer les mises à jour en temps réel
   */
  private setupRealtimeUpdates(): void {
    if (!this.currentUserId) return;
    
    console.log('UnreadMessagesCounterService - Configuration des mises à jour en temps réel');
    
    // Écouter les nouveaux messages
    const messageSub = this.chatService.newMessage$
      .pipe(
        filter(message => message.sender !== this.currentUserId)
      )
      .subscribe(message => {
        console.log('UnreadMessagesCounterService - Nouveau message non lu:', message);
        this.incrementUnreadCount(message.idPrise);
      });
    
    this.subscriptions.push(messageSub);
    
    // Écouter les confirmations de lecture
    const readSub = this.chatService.messageRead$.subscribe(message => {
      console.log('UnreadMessagesCounterService - Message marqué comme lu:', message);
      this.updateUnreadCounts();
    });
    
    this.subscriptions.push(readSub);
  }
  
  /**
   * Configurer une synchronisation périodique
   */
  private setupPeriodicSync(): void {
    if (!this.currentUserId) return;
    
    console.log('UnreadMessagesCounterService - Configuration de la synchronisation périodique');
    
    // Synchroniser toutes les 60 secondes
    const syncSub = interval(60000)
      .pipe(
        tap(() => console.log('UnreadMessagesCounterService - Synchronisation périodique')),
        switchMap(() => this.updateUnreadCounts())
      )
      .subscribe();
    
    this.subscriptions.push(syncSub);
  }
  
  /**
   * Mettre à jour tous les compteurs de messages non lus
   */
  public updateUnreadCounts(): Observable<void> {
    return new Observable<void>(observer => {
      if (!this.currentUserId) {
        observer.next();
        observer.complete();
        return;
      }
      
      console.log('UnreadMessagesCounterService - Mise à jour des compteurs');
      
      // Récupérer toutes les conversations actives
      this.chatService.getActiveConversations(this.currentUserId).subscribe(
        roomIds => {
          console.log('UnreadMessagesCounterService - Conversations actives:', roomIds);
          
          // Map pour stocker les compteurs par salle
          const unreadByRoom = new Map<number, number>();
          let totalCount = 0;
          let loadedRooms = 0;
          
          // Si aucune conversation, terminer
          if (roomIds.length === 0) {
            this.totalUnreadCountSubject.next(0);
            this.unreadByRoomSubject.next(new Map());
            observer.next();
            observer.complete();
            return;
          }
          
          // Pour chaque salle, compter les messages non lus
          roomIds.forEach(roomId => {
            this.chatService.getMessageHistory(roomId).subscribe(
              messages => {
                // Compter les messages non lus dans cette salle
                const unreadCount = this.countUnreadMessages(messages);
                unreadByRoom.set(roomId, unreadCount);
                totalCount += unreadCount;
                
                loadedRooms++;
                
                // Si toutes les salles sont chargées, mettre à jour les sujets
                if (loadedRooms === roomIds.length) {
                  console.log('UnreadMessagesCounterService - Compteurs mis à jour:', 
                    { total: totalCount, byRoom: Object.fromEntries(unreadByRoom) });
                  
                  this.totalUnreadCountSubject.next(totalCount);
                  this.unreadByRoomSubject.next(unreadByRoom);
                  observer.next();
                  observer.complete();
                }
              },
              error => {
                console.error('UnreadMessagesCounterService - Erreur lors de la récupération des messages:', error);
                loadedRooms++;
                
                // Même en cas d'erreur, continuer
                if (loadedRooms === roomIds.length) {
                  this.totalUnreadCountSubject.next(totalCount);
                  this.unreadByRoomSubject.next(unreadByRoom);
                  observer.next();
                  observer.complete();
                }
              }
            );
          });
        },
        error => {
          console.error('UnreadMessagesCounterService - Erreur lors de la récupération des conversations:', error);
          observer.error(error);
        }
      );
    });
  }
  
  /**
   * Compter les messages non lus dans une liste de messages
   */
  private countUnreadMessages(messages: Message[]): number {
    if (!this.currentUserId) return 0;
    
    return messages.filter(m => 
      !m.isRead && m.sender !== this.currentUserId
    ).length;
  }
  
  /**
   * Incrémenter le compteur de messages non lus pour une salle
   */
  private incrementUnreadCount(roomId: number): void {
    // Récupérer les compteurs actuels
    const currentByRoom = this.unreadByRoomSubject.value;
    const currentTotal = this.totalUnreadCountSubject.value;
    
    // Incrémenter le compteur de la salle
    const roomCount = (currentByRoom.get(roomId) || 0) + 1;
    currentByRoom.set(roomId, roomCount);
    
    // Mettre à jour les sujets
    this.unreadByRoomSubject.next(currentByRoom);
    this.totalUnreadCountSubject.next(currentTotal + 1);
    
    console.log('UnreadMessagesCounterService - Compteur incrémenté pour la salle', roomId, 
      { roomCount, totalCount: currentTotal + 1 });
  }
  
  /**
   * Réinitialiser le compteur pour une salle
   */
  public resetUnreadCount(roomId: number): void {
    if (!this.currentUserId) return;
    
    console.log('UnreadMessagesCounterService - Réinitialisation du compteur pour la salle', roomId);
    
    // Récupérer les compteurs actuels
    const currentByRoom = this.unreadByRoomSubject.value;
    const currentTotal = this.totalUnreadCountSubject.value;
    
    // Récupérer le compteur actuel de la salle
    const roomCount = currentByRoom.get(roomId) || 0;
    
    // Réinitialiser le compteur de la salle
    currentByRoom.set(roomId, 0);
    
    // Mettre à jour les sujets
    this.unreadByRoomSubject.next(currentByRoom);
    this.totalUnreadCountSubject.next(Math.max(0, currentTotal - roomCount));
    
    console.log('UnreadMessagesCounterService - Compteur réinitialisé pour la salle', roomId,
      { totalCount: Math.max(0, currentTotal - roomCount) });
  }
  
  /**
   * Marquer tous les messages d'une salle comme lus
   */
  public markAllMessagesAsReadInRoom(roomId: number): void {
    if (!this.currentUserId) return;
    
    console.log('UnreadMessagesCounterService - Marquage de tous les messages comme lus dans la salle', roomId);
    
    // Récupérer l'historique des messages
    this.chatService.getMessageHistory(roomId).subscribe(
      messages => {
        // Filtrer les messages non lus qui ne sont pas de l'utilisateur courant
        const unreadMessages = messages.filter(m => 
          !m.isRead && m.sender !== this.currentUserId
        );
        
        console.log('UnreadMessagesCounterService - Messages à marquer comme lus:', unreadMessages.length);
        
        // Marquer chaque message comme lu
        unreadMessages.forEach(message => {
          try {
            // Convertir horodatage en Date valide
            let messageDate: Date;
            
            if (message.horodatage instanceof Date) {
              messageDate = message.horodatage;
            } else if (typeof message.horodatage === 'string') {
              messageDate = new Date(message.horodatage);
            } else {
              messageDate = new Date();
              console.warn('UnreadMessagesCounterService - Format de date invalide:', message);
            }
            
            this.chatService.markMessageAsRead(roomId, messageDate, this.currentUserId).subscribe();
          } catch (error) {
            console.error('UnreadMessagesCounterService - Erreur lors du marquage du message:', error);
          }
        });
        
        // Réinitialiser le compteur pour cette salle
        this.resetUnreadCount(roomId);
      },
      error => {
        console.error('UnreadMessagesCounterService - Erreur lors de la récupération des messages:', error);
      }
    );
  }
  
  /**
   * Obtenir le compteur de messages non lus pour une salle
   */
  public getUnreadCountForRoom(roomId: number): Observable<number> {
    return new Observable<number>(observer => {
      // S'abonner aux changements de compteur par salle
      const sub = this.unreadByRoom$.subscribe(unreadByRoom => {
        const count = unreadByRoom.get(roomId) || 0;
        observer.next(count);
      });
      
      // Nettoyer l'abonnement quand l'observateur se désabonne
      return () => sub.unsubscribe();
    });
  }
}
