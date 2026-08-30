import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { ProductsComponent } from './pages/products/products.component';
import { OrderComponent } from './pages/order/order.component';
import { HistoryComponent } from './pages/history/history.component';
import { CustomersComponent } from './pages/customers/customers.component';
import { authGuard } from './guards/auth.guard';
import { geoGuard } from './guards/geo.guard';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    canActivate: [geoGuard],
    title: 'Cake Heaven | Artisanal Gourmet Bakery'
  },
  {
    path: 'products',
    component: ProductsComponent,
    canActivate: [geoGuard],
    title: 'Cake Menu & Fresh Bakes | Cake Heaven'
  },
  {
    path: 'order',
    component: OrderComponent,
    title: 'Express Order & Checkout | Cake Heaven'
  },
  {
    path: 'history',
    component: HistoryComponent,
    title: 'Live Order Tracking | Cake Heaven'
  },
  {
    path: 'customers',
    component: CustomersComponent,
    canActivate: [authGuard],
    title: 'Customer Profile | Cake Heaven'
  },
  {
    path: '**',
    redirectTo: ''
  }
];
