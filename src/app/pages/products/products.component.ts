import { Component, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FirestoreService, CakeProduct } from '../../services/firestore.service';
import { CartService } from '../../services/cart.service';
import { NotificationService } from '../../services/notification.service';
import { SkeletonComponent } from '../../components/skeleton/skeleton.component';
import { ProductModalComponent } from '../../components/product-modal/product-modal.component';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonComponent, ProductModalComponent],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss'
})
export class ProductsComponent implements OnInit {
  private firestoreService = inject(FirestoreService);
  private cartService = inject(CartService);
  private notifications = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  // Data & State Signals
  public allProducts = signal<CakeProduct[]>([]);
  public isLoading = signal(true);
  public searchQuery = signal('');
  public selectedCategory = signal<string>('All');
  public sortBy = signal<'popular' | 'price_asc' | 'price_desc' | 'rating'>('popular');
  public activeModalProduct = signal<CakeProduct | null>(null);

  public categories = ['All', 'Chocolate', 'Fruit', 'Velvet', 'Specialty'];

  // Computed Filtered & Sorted Products
  public filteredProducts = computed(() => {
    let list = this.allProducts();
    const query = this.searchQuery().trim().toLowerCase();
    const cat = this.selectedCategory();
    const sort = this.sortBy();

    // Category filter
    if (cat !== 'All') {
      list = list.filter((p) => p.category.toLowerCase() === cat.toLowerCase());
    }

    // Search filter
    if (query) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query)
      );
    }

    // Sorting
    return [...list].sort((a, b) => {
      if (sort === 'price_asc') return a.price - b.price;
      if (sort === 'price_desc') return b.price - a.price;
      if (sort === 'rating') return b.rating - a.rating;
      return (b.reviewCount || 0) - (a.reviewCount || 0); // popular
    });
  });

  ngOnInit(): void {
    // 1. Sync state from URL Query Parameters
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const cat = params.get('category');
        if (cat && this.categories.includes(cat)) {
          this.selectedCategory.set(cat);
        }

        const search = params.get('search');
        if (search !== null) {
          this.searchQuery.set(search);
        }

        const sort = params.get('sort') as any;
        if (sort && ['popular', 'price_asc', 'price_desc', 'rating'].includes(sort)) {
          this.sortBy.set(sort);
        }

        const modalId = params.get('modal');
        if (modalId && this.allProducts().length > 0) {
          const match = this.allProducts().find((p) => String(p.id) === modalId);
          if (match) {
            this.activeModalProduct.set(match);
          }
        }
      });

    // 2. Fetch Catalog with SWR caching & offline resilience
    this.firestoreService.getCakes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (products) => {
          this.allProducts.set(products);
          this.isLoading.set(false);

          // Re-evaluate modal query parameter if opened directly
          const modalId = this.route.snapshot.queryParamMap.get('modal');
          if (modalId) {
            const match = products.find((p) => String(p.id) === modalId);
            if (match) {
              this.activeModalProduct.set(match);
            }
          }
        },
        error: (err) => {
          console.error('Error fetching catalog:', err);
          this.isLoading.set(false);
        }
      });
  }

  // Update query params without reloading
  private updateQueryParams(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        category: this.selectedCategory() !== 'All' ? this.selectedCategory() : null,
        search: this.searchQuery().trim() || null,
        sort: this.sortBy() !== 'popular' ? this.sortBy() : null
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  public setCategory(cat: string): void {
    this.selectedCategory.set(cat);
    this.updateQueryParams();
  }

  public onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.updateQueryParams();
  }

  public onSortChange(sortVal: any): void {
    this.sortBy.set(sortVal);
    this.updateQueryParams();
  }

  public openProductModal(product: CakeProduct): void {
    this.activeModalProduct.set(product);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { modal: product.id },
      queryParamsHandling: 'merge'
    });
  }

  public closeProductModal(): void {
    this.activeModalProduct.set(null);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { modal: null },
      queryParamsHandling: 'merge'
    });
  }

  public quickAddToCart(product: CakeProduct, event: Event): void {
    event.stopPropagation();
    this.cartService.addItem(product, 1);
    this.notifications.success('Added to Cart', `${product.name} added to your basket.`);
  }
}
