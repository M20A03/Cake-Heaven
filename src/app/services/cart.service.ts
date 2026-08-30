import { Injectable, signal, computed, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface CartItem {
  id: number | string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  size?: string;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private platformId = inject(PLATFORM_ID);
  private storageKey = 'cakeheaven_cart';

  public items = signal<CartItem[]>([]);

  // Computed signals
  public itemCount = computed(() =>
    this.items().reduce((total, item) => total + item.quantity, 0)
  );

  public subtotal = computed(() =>
    this.items().reduce((total, item) => total + item.price * item.quantity, 0)
  );

  public deliveryFee = computed(() => (this.subtotal() > 0 && this.subtotal() < 1000 ? 50 : 0));

  public total = computed(() => this.subtotal() + this.deliveryFee());

  public isEmpty = computed(() => this.items().length === 0);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadFromStorage();
    }
  }

  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        this.items.set(JSON.parse(data));
      }
    } catch (e) {
      console.warn('Failed to hydrate cart from localStorage', e);
    }
  }

  private saveToStorage(): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(this.items()));
      } catch (e) {
        console.warn('Failed to save cart to localStorage', e);
      }
    }
  }

  public addItem(item: Omit<CartItem, 'quantity'>, quantity = 1): void {
    const qty = Math.max(1, Math.min(10, quantity));
    this.items.update((current) => {
      const existingIndex = current.findIndex((i) => i.id === item.id);
      if (existingIndex > -1) {
        const updated = [...current];
        const newQty = Math.min(10, updated[existingIndex].quantity + qty);
        updated[existingIndex] = { ...updated[existingIndex], quantity: newQty };
        return updated;
      }
      return [...current, { ...item, quantity: qty }];
    });
    this.saveToStorage();
  }

  public updateQuantity(id: number | string, delta: number): void {
    this.items.update((current) => {
      return current
        .map((item) => {
          if (item.id === id) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 && nextQty <= 10 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null);
    });
    this.saveToStorage();
  }

  public removeItem(id: number | string): void {
    this.items.update((current) => current.filter((i) => i.id !== id));
    this.saveToStorage();
  }

  public clearCart(): void {
    this.items.set([]);
    this.saveToStorage();
  }
}
