import { Injectable, inject, signal } from '@angular/core';
import { Firestore, collection, collectionData, addDoc, query, where, orderBy, doc, getDoc } from '@angular/fire/firestore';
import { Observable, from, of, catchError, map, tap } from 'rxjs';
import { generateIdempotencyKey } from '../lib/fetcher';

export interface CakeProduct {
  id: number | string;
  name: string;
  price: number;
  description: string;
  image: string;
  category: 'Chocolate' | 'Fruit' | 'Velvet' | 'Specialty';
  rating: number;
  reviewCount: number;
  isBestSeller?: boolean;
}

export interface CustomerOrder {
  id?: string;
  idempotencyKey: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  cakeName: string;
  quantity: number;
  totalAmount: number;
  specialNotes?: string;
  status: 'Pending' | 'Baking' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
  createdAt: string;
}

const DEFAULT_PRODUCTS: CakeProduct[] = [
  {
    id: 1,
    name: 'Artisan Chocolate Truffle',
    price: 550.00,
    description: 'Belgian 70% dark chocolate ganache infused with moist cocoa sponge & gold dust.',
    image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    category: 'Chocolate',
    rating: 4.9,
    reviewCount: 142,
    isBestSeller: true
  },
  {
    id: 2,
    name: 'Classic Red Velvet Royal',
    price: 600.00,
    description: 'Silky crimson sponge layered with Madagascar vanilla bean cream cheese frosting.',
    image: 'https://images.unsplash.com/photo-1616541823729-00fe0aacd32c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    category: 'Velvet',
    rating: 4.8,
    reviewCount: 98,
    isBestSeller: true
  },
  {
    id: 3,
    name: 'Wild Strawberry Blossom',
    price: 450.00,
    description: 'Farm-fresh hand-picked strawberries with whipped Chantilly cream and sponge cake.',
    image: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    category: 'Fruit',
    rating: 4.7,
    reviewCount: 84
  },
  {
    id: 4,
    name: 'Black Forest Symphony',
    price: 500.00,
    description: 'Authentic German recipe with maraschino cherries, dark chocolate shavings & fresh cream.',
    image: 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    category: 'Chocolate',
    rating: 4.9,
    reviewCount: 110
  },
  {
    id: 5,
    name: 'Rainbow Confetti Fantasy',
    price: 750.00,
    description: '6 vibrant pastel sponge tiers filled with sweet Madagascar buttercream frosting.',
    image: 'https://images.unsplash.com/photo-1535141192574-5d4897c12636?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    category: 'Specialty',
    rating: 4.8,
    reviewCount: 65,
    isBestSeller: true
  },
  {
    id: 6,
    name: 'Blueberry Glaze Cheesecake',
    price: 680.00,
    description: 'New York baked cheesecake topped with compote made of wild organic blueberries.',
    image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    category: 'Fruit',
    rating: 5.0,
    reviewCount: 156,
    isBestSeller: true
  }
];

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  private firestore = inject(Firestore);
  private cacheKey = 'cakeheaven_products_cache';

  // Processed submitted keys for client-side idempotency lock
  private submittedKeys = new Set<string>();

  /**
   * Get products with Stale-While-Revalidate (SWR) cache & offline resilience
   */
  getCakes(): Observable<CakeProduct[]> {
    // 1. Try to load cached data for instant render
    let cachedData: CakeProduct[] = DEFAULT_PRODUCTS;
    if (typeof localStorage !== 'undefined') {
      try {
        const local = localStorage.getItem(this.cacheKey);
        if (local) {
          cachedData = JSON.parse(local);
        }
      } catch (e) {
        console.warn('Could not read product cache', e);
      }
    }

    try {
      const cakeCollection = collection(this.firestore, 'cakes');
      return collectionData(cakeCollection, { idField: 'id' }).pipe(
        map((docs) => {
          if (!docs || docs.length === 0) {
            return cachedData;
          }
          return docs as CakeProduct[];
        }),
        tap((products) => {
          if (typeof localStorage !== 'undefined' && products.length > 0) {
            try {
              localStorage.setItem(this.cacheKey, JSON.stringify(products));
            } catch (e) {}
          }
        }),
        catchError((err) => {
          console.warn('[Firestore] Fallback to cached catalog due to network/rules constraint:', err);
          return of(cachedData);
        })
      );
    } catch (err) {
      console.warn('[Firestore] Initialization fallback:', err);
      return of(cachedData);
    }
  }

  /**
   * Add a new order with Idempotency protection against double submissions
   */
  async addOrder(orderData: Omit<CustomerOrder, 'createdAt' | 'status'>, customKey?: string): Promise<{ success: boolean; orderId: string }> {
    const key = customKey || orderData.idempotencyKey || generateIdempotencyKey();

    // Idempotency check: Reject duplicate in-flight / recently completed keys
    if (this.submittedKeys.has(key)) {
      console.warn(`[Idempotency] Blocked duplicate submission for key: ${key}`);
      return { success: true, orderId: 'idempotent-cached-submit' };
    }

    this.submittedKeys.add(key);

    const payload: CustomerOrder = {
      ...orderData,
      idempotencyKey: key,
      status: 'Pending',
      createdAt: new Date().toISOString()
    };

    try {
      const orderCollection = collection(this.firestore, 'orders');
      const docRef = await addDoc(orderCollection, payload);
      
      // Save order to local order history for user tracking
      this.saveLocalOrderHistory({ ...payload, id: docRef.id });

      return { success: true, orderId: docRef.id };
    } catch (error: any) {
      // Release key on error so user can retry
      this.submittedKeys.delete(key);
      throw error;
    }
  }

  private saveLocalOrderHistory(order: CustomerOrder): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const existing = JSON.parse(localStorage.getItem('cakeheaven_orders') || '[]');
        existing.unshift(order);
        localStorage.setItem('cakeheaven_orders', JSON.stringify(existing.slice(0, 20)));
      } catch (e) {}
    }
  }

  getLocalOrderHistory(): CustomerOrder[] {
    if (typeof localStorage !== 'undefined') {
      try {
        return JSON.parse(localStorage.getItem('cakeheaven_orders') || '[]');
      } catch (e) {
        return [];
      }
    }
    return [];
  }
}