// src/app/core/services/unread-messages.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subscription, interval } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { ChatService } from './chat.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class UnreadMessagesService implements OnDestroy {
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();
  
  private currentUserId: string | null = null;
  private subscriptions: Subscription[] = [];


  private pollingInterval: Subscription | null = null;

  constructor(
    private chatService: ChatService,
    private authService: AuthService
  ) {
    // Initialiser le compteur quand un utilisateur est connecté
    const userSub = this.authService.currentUser$.subscribe(user => {
      if (user) {
        console.log('User connecté:', user);
        this.currentUserId = user.idUser; // Assurez-vous que c'est la bonne propriété
        
        // Récupération initiale du compte
        this.updateUnreadCount();
        
        // Configuration de la mise à jour en temps réel
        this.setupRealtimeUpdates();
        
        // Configuration d'une synchronisation périodique (toutes les 30 secondes)
        // pour s'assurer que le compteur reste à jour
        this.setupPeriodicSync();
      } else {
        this.currentUserId = null;
        this.unreadCountSubject.next(0);
        this.cleanupSubscriptions();
      }
    });
    
    this.subscriptions.push(userSub);
  }
  
  ngOnDestroy(): void {
    this.cleanupSubscriptions();
  }
  
  private cleanupSubscriptions(): void {
    // Nettoyer tous les abonnements
    this.subscriptions.forEach(sub => {
      if (sub) sub.unsubscribe();
    });
    this.subscriptions = [];
    
    if (this.pollingInterval) {
      this.pollingInterval.unsubscribe();
      this.pollingInterval = null;
    }
  }

  /**
   * Met à jour le compteur de messages non lus
   */
  updateUnreadCount(): void {
    if (this.currentUserId) {
      console.log('Mise à jour du compteur de messages non lus pour', this.currentUserId);
      
      const countSub = this.chatService.countUnreadMessages(this.currentUserId).subscribe(
        response => {
          console.log('Nombre de messages non lus:', response.unreadCount);
          this.unreadCountSubject.next(response.unreadCount);
        },
        error => {
          console.error('Erreur lors de la récupération des messages non lus', error);
        }
      );
      
      this.subscriptions.push(countSub);
    }
  }

  /**
   * Configure les mises à jour en temps réel via WebSocket
   */
  private setupRealtimeUpdates(): void {
    if (this.currentUserId) {
      console.log('Configuration des mises à jour en temps réel pour', this.currentUserId);
      
      // S'assurer que la connexion WebSocket est établie
      this.chatService.initializeWebSocketConnection(this.currentUserId);
      
      // Écouter les nouveaux messages
      const newMessageSub = this.chatService.newMessage$.subscribe(message => {
        console.log('Nouveau message reçu:', message);
        // Vérifier si le message n'est pas de l'utilisateur actuel
        if (message.sender !== this.currentUserId) {
          // Mettre à jour le compteur
          this.updateUnreadCount();
        }
      });
      
      this.subscriptions.push(newMessageSub);
      
      // Écouter les notifications
      const notificationSub = this.chatService.notification$.subscribe(notification => {
        console.log('Notification reçue:', notification);
        if (notification.type === 'NEW_MESSAGE' || notification.type === 'MESSAGE_READ') {
          this.updateUnreadCount();
        }
      });
      
      this.subscriptions.push(notificationSub);
      
      // Écouter les messages lus
      const messageReadSub = this.chatService.messageRead$.subscribe(message => {
        console.log('Message marqué comme lu:', message);
        this.updateUnreadCount();
      });
      
      this.subscriptions.push(messageReadSub);
    }
  }
  
  /**
   * Configure une synchronisation périodique pour s'assurer
   * que le compteur reste à jour
   */
  private setupPeriodicSync(): void {
    if (this.currentUserId) {
      console.log('Configuration de la synchronisation périodique pour', this.currentUserId);
      
      // Mettre à jour le compteur toutes les 30 secondes
      this.pollingInterval = interval(30000).pipe(
        switchMap(() => {
          console.log('Synchronisation périodique du compteur');
          if (this.currentUserId) {
            return this.chatService.countUnreadMessages(this.currentUserId);
          }
          return new Observable<{ unreadCount: number }>(observer => {
            observer.next({ unreadCount: 0 });
            observer.complete();
          });
        })
      ).subscribe(
        response => {
          console.log('Nombre de messages non lus (sync):', response.unreadCount);
          this.unreadCountSubject.next(response.unreadCount);
        },
        error => {
          console.error('Erreur lors de la synchronisation du compteur', error);
        }
      );
    }
  }

  /**
   * Marque un message comme lu et met à jour le compteur
   */
  markMessageAsRead(roomId: number, messageDate: Date): void {
    if (!this.currentUserId) return;
    
    console.log('Marquage du message comme lu:', roomId, messageDate);
    
    try {
      const markSub = this.chatService.markMessageAsRead(roomId, messageDate, this.currentUserId)
        .subscribe(
          () => {
            console.log('Message marqué comme lu avec succès');
            this.updateUnreadCount();
          },
          error => {
            console.error('Erreur lors du marquage du message comme lu', error);
          }
        );
      
      this.subscriptions.push(markSub);
    } catch (error) {
      console.error('Erreur lors de l\'appel à markMessageAsRead', error);
      // Mettre à jour le compteur malgré l'erreur
      this.updateUnreadCount();
    }
  }

  
  /**
   * Marque tous les messages d'une conversation comme lus
   */
  markAllMessagesAsReadInRoom(roomId: number): void {
    if (this.currentUserId) {
      console.log('Marquage de tous les messages comme lus dans la conversation:', roomId);
      
      // Utiliser la méthode ajoutée au ChatService
      const markAllSub = this.chatService.markAllMessagesAsReadInRoom(roomId, this.currentUserId)
        .subscribe(
          () => {
            console.log('Tous les messages marqués comme lus avec succès');
            this.updateUnreadCount();
          },
          error => {
            console.error('Erreur lors du marquage des messages comme lus', error);
            
            // En cas d'erreur, mettre à jour le compteur quand même
            this.updateUnreadCount();
          }
        );
      
      this.subscriptions.push(markAllSub);
    }
  }
  
  /**
   * Force une mise à jour immédiate du compteur
   */
  forceUpdate(): void {
    console.log('Forçage de la mise à jour du compteur');
    this.updateUnreadCount();
  }
}