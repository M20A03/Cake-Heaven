import { Component, EventEmitter, HostListener, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CakeProduct } from '../../services/firestore.service';
import { CartService } from '../../services/cart.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-product-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-modal.component.html',
  styleUrl: './product-modal.component.scss'
})
export class ProductModalComponent {
  @Input() product: CakeProduct | null = null;
  @Output() close = new EventEmitter<void>();

  private cartService = inject(CartService);
  private notifications = inject(NotificationService);

  public selectedQuantity = 1;
  public isAdding = false;

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeModal();
  }

  closeModal(): void {
    this.close.emit();
  }

  increment(): void {
    if (this.selectedQuantity < 10) {
      this.selectedQuantity++;
    }
  }

  decrement(): void {
    if (this.selectedQuantity > 1) {
      this.selectedQuantity--;
    }
  }

  addToCart(): void {
    if (!this.product) return;
    this.isAdding = true;
    this.cartService.addItem(this.product, this.selectedQuantity);
    this.notifications.success(
      'Added to Cart!',
      `${this.selectedQuantity}x ${this.product.name} added to your basket.`
    );
    setTimeout(() => {
      this.isAdding = false;
      this.closeModal();
    }, 400);
  }
}
