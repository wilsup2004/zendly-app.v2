// src/app/modules/layout/layout.component.ts
import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable, Subscription } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { ChatService } from '../../core/services/chat.service';
import { UnreadMessagesCounterService } from '../../core/services/unread-messages-counter.service';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent implements OnInit, OnDestroy {
  @ViewChild('drawer') drawer!: MatSidenav;
  
  isHandset$: Observable<boolean> = this.breakpointObserver.observe(Breakpoints.Handset)
    .pipe(
      map(result => result.matches),
      shareReplay()
    );
  
  currentUser: User | null = null;
  unreadMessagesCount = 0;
  
  private subscriptions: Subscription[] = [];

  constructor(
    private breakpointObserver: BreakpointObserver,
    private authService: AuthService,
    private chatService: ChatService,
    private unreadMessagesCounterService: UnreadMessagesCounterService
  ) {}

  ngOnInit(): void {
    console.log('LayoutComponent - Initialisation');
    
    // Récupérer l'utilisateur courant
    const userSub = this.authService.currentUser$.subscribe(user => {
      console.log('LayoutComponent - Utilisateur récupéré:', user);
      this.currentUser = user;
    });
    
    this.subscriptions.push(userSub);
    
    // S'abonner au compteur total de messages non lus
    const unreadSub = this.unreadMessagesCounterService.totalUnreadCount$.subscribe(count => {
      console.log('LayoutComponent - Compteur de messages non lus mis à jour:', count);
      this.unreadMessagesCount = count;
    });
    
    this.subscriptions.push(unreadSub);
  }
  
  ngOnDestroy(): void {
    console.log('LayoutComponent - Destruction');
    
    // Nettoyer les abonnements
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  toggleSidenav(): void {
    this.drawer.toggle();
  }
}