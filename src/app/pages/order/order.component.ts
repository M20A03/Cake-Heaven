import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FirestoreService, CakeProduct } from '../../services/firestore.service';
import { CartService } from '../../services/cart.service';
import { NotificationService } from '../../services/notification.service';
import { generateIdempotencyKey } from '../../lib/fetcher';

@Component({
  selector: 'app-order',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './order.component.html',
  styleUrls: ['./order.component.scss']
})
export class OrderComponent implements OnInit {
  private firestoreService = inject(FirestoreService);
  public cartService = inject(CartService);
  private notifications = inject(NotificationService);
  private router = inject(Router);

  public availableCakes: string[] = [
    'Artisan Chocolate Truffle',
    'Classic Red Velvet Royal',
    'Wild Strawberry Blossom',
    'Black Forest Symphony',
    'Rainbow Confetti Fantasy',
    'Blueberry Glaze Cheesecake'
  ];

  // Form State
  public order = {
    name: '',
    phone: '',
    address: '',
    cake: 'Artisan Chocolate Truffle',
    quantity: 1,
    notes: ''
  };

  // Submission / Idempotency State
  public isSubmitting = signal(false);
  public isOrderSuccess = signal(false);
  public lastOrderId = signal('');
  public currentIdempotencyKey = signal('');

  ngOnInit(): void {
    this.refreshIdempotencyKey();

    // If cart has items, pre-populate the cake selection
    const cartItems = this.cartService.items();
    if (cartItems.length > 0) {
      this.order.cake = cartItems[0].name;
      this.order.quantity = cartItems[0].quantity;
    }
  }

  private refreshIdempotencyKey(): void {
    this.currentIdempotencyKey.set(generateIdempotencyKey());
  }

  async submitOrder(): Promise<void> {
    if (this.isSubmitting()) return;

    // Validate inputs
    if (!this.order.name.trim() || !this.order.phone.trim() || !this.order.address.trim()) {
      this.notifications.warning('Incomplete Details', 'Please fill in all mandatory fields.');
      return;
    }

    if (this.order.phone.trim().length < 10) {
      this.notifications.warning('Invalid Phone Number', 'Please enter a valid 10-digit phone number.');
      return;
    }

    this.isSubmitting.set(true);

    const unitPrice = 550; // default estimated price per cake
    const calculatedTotal = this.cartService.isEmpty()
      ? this.order.quantity * unitPrice
      : this.cartService.total();

    const orderPayload = {
      idempotencyKey: this.currentIdempotencyKey(),
      customerName: this.order.name.trim(),
      customerPhone: this.order.phone.trim(),
      deliveryAddress: this.order.address.trim(),
      cakeName: this.cartService.isEmpty()
        ? this.order.cake
        : this.cartService.items().map((i) => `${i.quantity}x ${i.name}`).join(', '),
      quantity: this.cartService.isEmpty() ? this.order.quantity : this.cartService.itemCount(),
      totalAmount: calculatedTotal,
      specialNotes: this.order.notes.trim()
    };

    try {
      const result = await this.firestoreService.addOrder(orderPayload, this.currentIdempotencyKey());

      this.lastOrderId.set(result.orderId);
      this.isOrderSuccess.set(true);
      this.cartService.clearCart();
      this.notifications.success(
        'Order Confirmed! 🎉',
        `Your order #${result.orderId.substring(0, 8)} is now being prepared by our bakers.`
      );

      // Reset form
      this.order = {
        name: '',
        phone: '',
        address: '',
        cake: this.availableCakes[0],
        quantity: 1,
        notes: ''
      };
      this.refreshIdempotencyKey();
    } catch (err: any) {
      console.error('[Order Submission Error]:', err);
      this.notifications.error(
        'Order Submission Failed',
        'Could not save your order. Please check your network and try again.'
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }

  trackOrder(): void {
    this.router.navigate(['/history']);
  }
}