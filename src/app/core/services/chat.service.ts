// Extension du ChatService avec les méthodes de marquage de messages comme lus
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, Subject } from 'rxjs';
import { Message } from '../models/message.model';
import { environment } from '../../../environments/environment';
import * as SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = `${environment.apiUrl}/chat`;
  private stompClient: Client | null = null;
  
  // Sujets pour diffuser les événements
  private newMessageSubject = new Subject<Message>();
  private notificationSubject = new Subject<any>();
  private messageReadSubject = new Subject<Message>();
  
  // Observables publics
  public newMessage$ = this.newMessageSubject.asObservable();
  public notification$ = this.notificationSubject.asObservable();
  public messageRead$ = this.messageReadSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Initialiser la connexion WebSocket
  initializeWebSocketConnection(userId: string): void {
    // Éviter de créer plusieurs connexions
    if (this.stompClient && this.stompClient.connected) {
      return;
    }
    
    // Créer une nouvelle instance de Client
    this.stompClient = new Client({
      webSocketFactory: () => new WebSocket(`${environment.socketUrl}/ws`),
      debug: function(str) {
        console.log('STOMP: ' + str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000
    });

    // Définir le callback de connexion
    this.stompClient.onConnect = (frame) => {
      console.log('Connected: ' + frame);
      
      // S'abonner au canal des messages pour chaque conversation active
      this.getActiveConversations(userId).subscribe(roomIds => {
        roomIds.forEach(roomId => {
          this.stompClient?.subscribe(`/topic/chat/${roomId}`, (message) => {
            // Traiter le message reçu
            const messageBody = JSON.parse(message.body);
            console.log('Message reçu:', messageBody);
            
            // Diffuser le message à tous les composants intéressés
            this.newMessageSubject.next(messageBody);
          });
        });
      });

      // S'abonner au canal des notifications
      this.stompClient?.subscribe(`/user/${userId}/queue/notifications`, (notification) => {
        // Traiter la notification reçue
        const notificationBody = JSON.parse(notification.body);
        console.log('Notification reçue:', notificationBody);
        
        // Diffuser la notification à tous les composants intéressés
        this.notificationSubject.next(notificationBody);
        
        // Si c'est une notification de lecture de message, informer les abonnés
        if (notificationBody.type === 'MESSAGE_READ') {
          this.messageReadSubject.next(notificationBody.message);
        }
      });
      
      // S'abonner au canal des lectures de messages
      this.stompClient?.subscribe(`/topic/read`, (message) => {
        const readInfo = JSON.parse(message.body);
        console.log('Message lu:', readInfo);
        
        // Informer les abonnés qu'un message a été lu
        if (readInfo.message) {
          this.messageReadSubject.next(readInfo.message);
        }
      });
    };

    // Gérer les erreurs de connexion
    this.stompClient.onStompError = (frame) => {
      console.error('Broker reported error: ' + frame.headers['message']);
      console.error('Additional details: ' + frame.body);
    };

    // Démarrer la connexion
    this.stompClient.activate();
  }

  // Fermer la connexion WebSocket
  disconnect(): void {
    if (this.stompClient) {
      this.stompClient.deactivate();
      this.stompClient = null;
    }
  }

  // Envoyer un message
  sendMessage(message: Message): Observable<any> {
    if (this.stompClient && this.stompClient.connected) {
      this.stompClient.publish({
        destination: `/app/chat/${message.idPrise}`,
        body: JSON.stringify(message)
      });
      return of({ success: true });
    } else {
      console.error('WebSocket non connecté');
      return of({ success: false, error: 'WebSocket non connecté' });
    }
  }

  // Récupérer l'historique des messages
  getMessageHistory(roomId: number): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.apiUrl}/history/${roomId}`);
  }

  // Marquer un message comme lu
  markMessageAsRead(roomId: number, messageDate: Date | string, userId: string): Observable<any> {
    // Convertir en format que le backend peut comprendre
    let formattedDate: string;
    
    if (messageDate instanceof Date) {
      // Format Java SimpleDateFormat: yyyy-MM-dd'T'HH:mm:ss.SSS
      formattedDate = messageDate.toISOString().split('Z')[0];
    } else if (typeof messageDate === 'string') {
      // Si c'est déjà une chaîne au format ISO
      if (messageDate.endsWith('Z')) {
        // Supprimer le 'Z' à la fin qui pose problème pour Java
        formattedDate = messageDate.split('Z')[0];
      } else {
        formattedDate = messageDate;
      }
    } else {
      // Pour tout autre type, créer une nouvelle date
      formattedDate = new Date().toISOString().split('Z')[0];
    }
    
    const params = new HttpParams()
      .set('messageDate', formattedDate)
      .set('userId', userId);
    
    console.log('Envoi de la requête markMessageAsRead avec date:', formattedDate);
    
    return this.http.put(`${this.apiUrl}/read/${roomId}`, null, { params });
  }

  // Marquer tous les messages d'une conversation comme lus
  markAllMessagesAsReadInRoom(roomId: number, userId: string): Observable<any> {
    // Cette méthode doit être implémentée côté serveur
    // Si ce n'est pas le cas, vous pouvez récupérer tous les messages non lus
    // et les marquer un par un
    return this.http.put(`${this.apiUrl}/read-all/${roomId}`, null, {
      params: new HttpParams().set('userId', userId)
    });
  }

  // Récupérer les messages non lus
  getUnreadMessages(userId: string): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.apiUrl}/unread/${userId}`);
  }

  // Compter les messages non lus
  countUnreadMessages(userId: string): Observable<{ unreadCount: number }> {
    return this.http.get<{ unreadCount: number }>(`${this.apiUrl}/unread/count/${userId}`);
  }

  // Récupérer les conversations actives
  getActiveConversations(userId: string): Observable<number[]> {
    return this.http.get<number[]>(`${this.apiUrl}/active/${userId}`);
  }

  // Envoyer une notification directe
  sendDirectNotification(userId: string, message: Message): Observable<any> {
    return this.http.post(`${this.apiUrl}/notify/${userId}`, message);
  }
}