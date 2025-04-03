// src/app/modules/messaging/components/conversation/conversation.component.ts
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { ChatService } from '../../../../core/services/chat.service';
import { UnreadMessagesService } from '../../../../core/services/unread-messages.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Message } from '../../../../core/models/message.model';

@Component({
  selector: 'app-conversation',
  templateUrl: './conversation.component.html',
  styleUrls: ['./conversation.component.scss']
})
export class ConversationComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesList') messagesList!: ElementRef;
  
  roomId: number | null = null;
  messages: Message[] = [];
  newMessage: string = '';
  loading: boolean = false;
  currentUserId: string | null = null;
  
  private subscriptions: Subscription[] = [];
  private shouldScrollToBottom = true;

  constructor(
    private route: ActivatedRoute,
    private chatService: ChatService,
    private unreadMessagesService: UnreadMessagesService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    console.log('Initialisation du ConversationComponent');
    
    // Récupérer l'ID de l'utilisateur actuel
    const userSub = this.authService.currentUser$.subscribe(user => {
      if (user) {
        console.log('Utilisateur connecté:', user);
        this.currentUserId = user.idUser;
        
        // Initialiser la connexion WebSocket
        this.chatService.initializeWebSocketConnection(user.idUser);
        
        // S'abonner aux changements de route pour récupérer l'ID de la conversation
        const routeSub = this.route.paramMap.subscribe(params => {
          const roomIdParam = params.get('id');
          if (roomIdParam) {
            this.roomId = parseInt(roomIdParam, 10);
            console.log('Conversation ouverte:', this.roomId);
            this.loadMessages();
            
            // Marquer tous les messages de cette conversation comme lus
            this.unreadMessagesService.markAllMessagesAsReadInRoom(this.roomId);
          }
        });
        
        this.subscriptions.push(routeSub);
        
        // S'abonner aux nouveaux messages
        const messageSub = this.chatService.newMessage$.subscribe(message => {
          if (message.idPrise === this.roomId) {
            console.log('Nouveau message reçu dans la conversation courante:', message);
            
            // Ajouter le message à la liste s'il n'est pas déjà présent
            // Vérification basée sur l'horodatage et l'expéditeur puisqu'il n'y a pas d'ID
            const isDuplicate = this.messages.some(m => 
              m.sender === message.sender && 
              new Date(m.horodatage).getTime() === new Date(message.horodatage).getTime() &&
              m.message === message.message
            );
            
            if (!isDuplicate) {
              this.messages.push(message);
              this.messages.sort((a, b) => 
                new Date(a.horodatage).getTime() - new Date(b.horodatage).getTime()
              );
              
              this.shouldScrollToBottom = true;
              
              // Si le message est d'un autre utilisateur, le marquer comme lu automatiquement
              // puisque l'utilisateur est dans la conversation
              if (message.sender !== this.currentUserId) {
                console.log('Marquage automatique du message comme lu');
                this.unreadMessagesService.markMessageAsRead(
                  this.roomId as number,
                  new Date(message.horodatage)
                );
              }
            }
          } else {
            // Message dans une autre conversation, mettre à jour le compteur
            console.log('Message reçu dans une autre conversation');
            this.unreadMessagesService.forceUpdate();
          }
        });
        
        this.subscriptions.push(messageSub);
      }
    });
    
    this.subscriptions.push(userSub);
  }
  
  ngAfterViewChecked(): void {
    // Faire défiler vers le bas lorsque de nouveaux messages sont ajoutés
    if (this.shouldScrollToBottom && this.messagesList) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }
  
  ngOnDestroy(): void {
    console.log('Destruction du ConversationComponent');
    
    // Nettoyer les abonnements
    this.subscriptions.forEach(sub => {
      if (sub) sub.unsubscribe();
    });
  }
  
  scrollToBottom(): void {
    try {
      const element = this.messagesList.nativeElement;
      element.scrollTop = element.scrollHeight;
    } catch (err) {
      console.error('Erreur lors du défilement vers le bas', err);
    }
  }

  loadMessages(): void {
    if (!this.roomId) return;
    
    console.log('Chargement des messages pour la conversation:', this.roomId);
    this.loading = true;
    
    const historySub = this.chatService.getMessageHistory(this.roomId).subscribe(
      messages => {
        console.log('Messages récupérés:', messages.length);
        this.messages = messages;
        this.loading = false;
        this.shouldScrollToBottom = true;
        
        // Marquer les messages non lus comme lus
        this.markUnreadMessagesAsRead();
      },
      error => {
        console.error('Erreur lors du chargement des messages', error);
        this.loading = false;
      }
    );
    
    this.subscriptions.push(historySub);
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || !this.roomId || !this.currentUserId) return;
    
    console.log('Envoi d\'un nouveau message');
    
    // Créer un nouveau message
    const message: Message = {
      idPrise: this.roomId,
      idUserPrise: this.getIdUserPrise(),
      idUserColis: this.getIdUserColis(),
      sender: this.currentUserId,
      horodatage: new Date(),
      message: this.newMessage.trim(),
      isRead: false,
      notificationSent: false
    };
    
    // Envoyer le message
    const sendSub = this.chatService.sendMessage(message).subscribe(
      response => {
        if (response.success) {
          console.log('Message envoyé avec succès');
          this.newMessage = '';
          
          // Optimistic UI update: ajouter le message à la liste localement
          this.messages.push(message);
          this.shouldScrollToBottom = true;
        } else {
          console.error('Erreur lors de l\'envoi du message', response.error);
        }
      },
      error => {
        console.error('Erreur lors de l\'envoi du message', error);
      }
    );
    
    this.subscriptions.push(sendSub);
  }

// Méthode pour marquer les messages non lus comme lus
private markUnreadMessagesAsRead(): void {
  if (!this.roomId || !this.currentUserId) return;
  
  console.log('Marquage des messages non lus comme lus');
  
  // Filtrer les messages non lus provenant d'autres utilisateurs
  const unreadMessages = this.messages.filter(
    m => !m.isRead && m.sender !== this.currentUserId
  );
  
  console.log('Nombre de messages à marquer comme lus:', unreadMessages.length);
  
  // Marquer chaque message comme lu
  unreadMessages.forEach(message => {
    try {
      // S'assurer que horodatage est traité correctement
      let messageDate: Date | string = message.horodatage;
      
      // Si on reçoit un message pour lequel horodatage n'est pas une Date
      if (typeof messageDate !== 'object' || !(messageDate instanceof Date)) {
        // On essaie de le convertir en Date
        messageDate = new Date(messageDate);
        
        // Si la conversion échoue, on utilise la date actuelle
        if (isNaN(messageDate.getTime())) {
          console.warn('Date invalide pour le message, utilisation de la date actuelle', message);
          messageDate = new Date();
        }
      }
      
      // Appel au service avec une date valide
      this.unreadMessagesService.markMessageAsRead(
        this.roomId as number,
        messageDate
      );
    } catch (error) {
      console.error('Erreur lors du marquage du message comme lu', error, message);
    }
  });
  
  // Forcer une mise à jour du compteur global
  if (unreadMessages.length > 0) {
    this.unreadMessagesService.forceUpdate();
  }
}
  
  // Méthodes utilitaires pour récupérer les IDs des utilisateurs impliqués dans la conversation
  // Ces méthodes doivent être adaptées selon votre logique métier
  private getIdUserPrise(): string {
    // Dans une implémentation réelle, cette méthode récupérerait l'ID de l'utilisateur Prise
    // à partir des informations de la conversation
    // Pour l'exemple, on retourne une valeur fictive
    return 'user_prise_id';
  }
  
  private getIdUserColis(): string {
    // Dans une implémentation réelle, cette méthode récupérerait l'ID de l'utilisateur Colis
    // à partir des informations de la conversation
    // Pour l'exemple, on retourne une valeur fictive
    return 'user_colis_id';
  }
  
  // Méthode utilitaire pour vérifier si un message est de l'utilisateur courant
  isCurrentUserMessage(message: Message): boolean {
    return message.sender === this.currentUserId;
  }
  
  // Formatage de la date pour l'affichage
  formatMessageDate(date: Date): string {
    return new Date(date).toLocaleString();
  }
}