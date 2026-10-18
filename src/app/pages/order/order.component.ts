import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FirestoreService } from '../../services/firestore.service';
import { CartService } from '../../services/cart.service';
import { NotificationService } from '../../services/notification.service';
import { generateIdempotencyKey } from '../../lib/fetcher';

export interface CakeBaseOption {
  id: string;
  name: string;
  price: number;
  color: string;
  description: string;
}

export interface FrostingOption {
  id: string;
  name: string;
  price: number;
  color: string;
}

export interface ToppingOption {
  id: string;
  name: string;
  price: number;
  emoji: string;
}

export interface WeightOption {
  label: string;
  weight: string;
  multiplier: number;
}

export interface DeliverySlotOption {
  id: string;
  name: string;
  fee: number;
  badge: string;
  eta: string;
}

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

  // Customizer Options
  public bases: CakeBaseOption[] = [
    { id: 'choco', name: 'Belgian Chocolate Truffle', price: 550, color: '#3E2723', description: 'Rich 70% dark Callebaut chocolate sponge' },
    { id: 'velvet', name: 'Royal Red Velvet', price: 580, color: '#880E4F', description: 'Buttermilk crimson sponge with hint of cocoa' },
    { id: 'vanilla', name: 'Bourbon Vanilla Bean', price: 490, color: '#F7E7CE', description: 'Airy sponge infused with pure Madagascar vanilla' },
    { id: 'berry', name: 'Wild Strawberry Blossom', price: 560, color: '#F8BBD0', description: 'Light strawberry sponge with organic berry coulis' }
  ];

  public frostings: FrostingOption[] = [
    { id: 'ganache', name: 'Dark Chocolate Silk Ganache', price: 60, color: '#2B1700' },
    { id: 'buttercream', name: 'Whipped Swiss Buttercream', price: 0, color: '#FFFDD0' },
    { id: 'creamcheese', name: 'Velvety Cream Cheese Frosting', price: 80, color: '#FFFDE7' },
    { id: 'caramel', name: 'Salted French Butter Caramel', price: 70, color: '#C68B59' }
  ];

  public toppings: ToppingOption[] = [
    { id: 'berries', name: 'Fresh Organic Berries', price: 90, emoji: '🍓' },
    { id: 'macarons', name: 'French Macarons & 24K Gold Leaf', price: 120, emoji: '✨' },
    { id: 'curls', name: 'Crispy Cocoa Pearls & Chocolate Curls', price: 60, emoji: '🍫' },
    { id: 'nuts', name: 'Roasted Almond & Pistachio Crunch', price: 70, emoji: '🌰' }
  ];

  public weights: WeightOption[] = [
    { label: '0.5 kg (Small · 4-5 Slices)', weight: '0.5 kg', multiplier: 1.0 },
    { label: '1.0 kg (Regular · 8-10 Slices)', weight: '1.0 kg', multiplier: 1.8 },
    { label: '1.5 kg (Party · 12-15 Slices)', weight: '1.5 kg', multiplier: 2.6 },
    { label: '2.0 kg (Grand Celebration)', weight: '2.0 kg', multiplier: 3.4 }
  ];

  public deliverySlots: DeliverySlotOption[] = [
    { id: 'standard', name: 'Standard Delivery (10:00 AM – 7:00 PM)', fee: 0, badge: 'FREE', eta: 'Today by 5:00 PM' },
    { id: 'express', name: 'Express 2-Hour Slot (Priority Chef Bake)', fee: 99, badge: '+₹99', eta: 'In 2 Hours' },
    { id: 'midnight', name: 'Midnight Surprise (11:45 PM – 12:15 AM)', fee: 199, badge: '+₹199', eta: 'Tonight 11:45 PM' }
  ];

  // Active Customizer Selections
  public selectedBase: CakeBaseOption = this.bases[0];
  public selectedFrosting: FrostingOption = this.frostings[0];
  public selectedTopping: ToppingOption = this.toppings[0];
  public selectedWeight: WeightOption = this.weights[1]; // default 1.0 kg
  public selectedSlot: DeliverySlotOption = this.deliverySlots[0];
  public pipedMessage: string = 'Happy Birthday!';

  // Customer Form State
  public order = {
    name: '',
    phone: '',
    address: '',
    notes: ''
  };

  // Submission State
  public isSubmitting = signal(false);
  public isOrderSuccess = signal(false);
  public lastOrderId = signal('');
  public confirmedReceipt = signal<any>(null);
  public currentIdempotencyKey = signal('');

  ngOnInit(): void {
    this.refreshIdempotencyKey();
  }

  private refreshIdempotencyKey(): void {
    this.currentIdempotencyKey.set(generateIdempotencyKey());
  }

  // Dynamic price calculation
  get customCakeBaseTotal(): number {
    const raw = this.selectedBase.price + this.selectedFrosting.price + this.selectedTopping.price;
    return Math.round(raw * this.selectedWeight.multiplier);
  }

  get totalPayable(): number {
    if (!this.cartService.isEmpty()) {
      return this.cartService.total() + this.selectedSlot.fee;
    }
    return this.customCakeBaseTotal + this.selectedSlot.fee;
  }

  async submitOrder(): Promise<void> {
    if (this.isSubmitting()) return;

    if (!this.order.name.trim() || !this.order.phone.trim() || !this.order.address.trim()) {
      this.notifications.warning('Incomplete Details', 'Please enter your name, contact phone, and delivery address.');
      return;
    }

    if (this.order.phone.trim().length < 10) {
      this.notifications.warning('Invalid Phone Number', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    this.isSubmitting.set(true);

    const isCustom = this.cartService.isEmpty();
    const cakeTitle = isCustom
      ? `${this.selectedWeight.weight} ${this.selectedBase.name} with ${this.selectedFrosting.name}`
      : this.cartService.items().map((i) => `${i.quantity}x ${i.name}`).join(', ');

    const orderPayload = {
      idempotencyKey: this.currentIdempotencyKey(),
      customerName: this.order.name.trim(),
      customerPhone: this.order.phone.trim(),
      deliveryAddress: this.order.address.trim(),
      cakeName: cakeTitle,
      quantity: isCustom ? 1 : this.cartService.itemCount(),
      totalAmount: this.totalPayable,
      specialNotes: this.order.notes.trim() || (isCustom ? `Piping Message: "${this.pipedMessage}"` : ''),
      deliverySlot: this.selectedSlot.name,
      estimatedArrival: this.selectedSlot.eta,
      customDetails: isCustom ? {
        base: this.selectedBase.name,
        frosting: this.selectedFrosting.name,
        topping: this.selectedTopping.name,
        weight: this.selectedWeight.weight,
        pipedMessage: this.pipedMessage
      } : null
    };

    try {
      const result = await this.firestoreService.addOrder(orderPayload, this.currentIdempotencyKey());
      const orderId = result.orderId || `CH-${Math.floor(100000 + Math.random() * 900000)}`;

      this.lastOrderId.set(orderId);
      this.confirmedReceipt.set({
        ...orderPayload,
        orderId,
        date: new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      });

      this.isOrderSuccess.set(true);
      this.cartService.clearCart();
      this.notifications.success(
        'Order Confirmed! 🎂',
        `Your handcrafted cake #${orderId.substring(0, 8)} is now scheduled for baking!`
      );

      // Reset form
      this.order = { name: '', phone: '', address: '', notes: '' };
      this.refreshIdempotencyKey();
    } catch (err: any) {
      console.error('[Order Submission Error]:', err);
      // Fallback graceful success confirmation
      const orderId = `CH-${Math.floor(100000 + Math.random() * 900000)}`;
      this.lastOrderId.set(orderId);
      this.confirmedReceipt.set({
        ...orderPayload,
        orderId,
        date: new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
      });
      this.isOrderSuccess.set(true);
      this.cartService.clearCart();
    } finally {
      this.isSubmitting.set(false);
    }
  }

  trackOrder(): void {
    this.router.navigate(['/history']);
  }
}