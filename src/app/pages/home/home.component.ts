import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FirestoreService, CakeProduct } from '../../services/firestore.service';
import { CartService } from '../../services/cart.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  private cartService = inject(CartService);
  private notifications = inject(NotificationService);

  public featuredCakes: Partial<CakeProduct>[] = [
    {
      id: 1,
      name: 'Artisan Chocolate Truffle',
      price: 550.00,
      image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
      category: 'Chocolate',
      rating: 4.9
    },
    {
      id: 2,
      name: 'Classic Red Velvet Royal',
      price: 600.00,
      image: 'https://images.unsplash.com/photo-1616541823729-00fe0aacd32c?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
      category: 'Velvet',
      rating: 4.8
    },
    {
      id: 6,
      name: 'Blueberry Glaze Cheesecake',
      price: 680.00,
      image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
      category: 'Fruit',
      rating: 5.0
    }
  ];

  public testimonials = [
    {
      quote: "The Chocolate Truffle was pure decadence! Delivered right on time for our anniversary.",
      author: "Priya Sharma",
      location: "Mumbai",
      rating: 5
    },
    {
      quote: "Best Red Velvet cake in the city. The cream cheese frosting is light, velvety and not overly sweet.",
      author: "Rohit Verma",
      location: "Bengaluru",
      rating: 5
    },
    {
      quote: "Same-day express delivery saved my sister's birthday! Beautiful presentation and packaging.",
      author: "Ananya Iyer",
      location: "Delhi NCR",
      rating: 5
    }
  ];

  quickAdd(cake: any): void {
    this.cartService.addItem(cake, 1);
    this.notifications.success('Added to Cart', `${cake.name} is now in your basket!`);
  }
}
