import { ApplicationConfig, ErrorHandler, importProvidersFrom } from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { routes } from './app.routes';
import { GlobalErrorHandler } from './services/error-handler.service';

const firebaseConfig = {
  apiKey: "AIzaSyCEvNo9AtgHfib034izKeOLgWTAptfS780",
  authDomain: "angappbackery-a2e42.firebaseapp.com",
  projectId: "angappbackery-a2e42",
  storageBucket: "angappbackery-a2e42.firebasestorage.app",
  messagingSenderId: "659870441846",
  appId: "1:659870441846:web:a1637fcb89b7639d641a57",
  measurementId: "G-ZNBWDGBHCP"
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding(), withViewTransitions()),
    provideAnimations(),
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideFirestore(() => getFirestore()),
    {
      provide: ErrorHandler,
      useClass: GlobalErrorHandler
    }
  ]
};