import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customers.component.html',
  styleUrl: './customers.component.scss'
})
export class CustomersComponent implements OnInit {
  private notifications = inject(NotificationService);

  public customer = {
    name: 'Anya Sen',
    email: 'anya.sen@example.com',
    phone: '9876543210',
    preferredFlavor: 'Chocolate',
    dietaryPreference: 'Eggless',
    savedAddress: '402, Lotus Heights, Indiranagar, Bengaluru - 560038'
  };

  public isSaving = signal(false);

  ngOnInit(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem('cakeheaven_profile');
        if (saved) {
          this.customer = JSON.parse(saved);
        }
      } catch (e) {}
    }
  }

  saveProfile(): void {
    this.isSaving.set(true);
    setTimeout(() => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('cakeheaven_profile', JSON.stringify(this.customer));
      }
      this.isSaving.set(false);
      this.notifications.success('Profile Updated', 'Your customer preferences have been saved.');
    }, 300);
  }
}
