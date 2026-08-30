import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FirestoreService, CustomerOrder } from '../../services/firestore.service';
import { NotificationService } from '../../services/notification.service';
import { SkeletonComponent } from '../../components/skeleton/skeleton.component';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, RouterLink, SkeletonComponent],
  templateUrl: './history.component.html',
  styleUrl: './history.component.scss'
})
export class HistoryComponent implements OnInit {
  private firestoreService = inject(FirestoreService);
  private notifications = inject(NotificationService);

  public orders = signal<CustomerOrder[]>([]);
  public isLoading = signal(true);

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.isLoading.set(true);
    setTimeout(() => {
      const local = this.firestoreService.getLocalOrderHistory();
      this.orders.set(local);
      this.isLoading.set(false);
    }, 400);
  }

  refresh(): void {
    this.loadOrders();
    this.notifications.info('Status Refreshed', 'Checking latest bakery order statuses.');
  }
}
