import { ApplicationConfig, ErrorHandler, importProvidersFrom } from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { routes } from './app.routes';
import { GlobalErrorHandler } from './services/error-handler.service';

const firebaseConfig = {
  apiKey: "AIzaSyBysvq_56k58-RzPjPfm3pqvzi2sRckyvk",
  authDomain: "angappbackery-216fe.firebaseapp.com",
  projectId: "angappbackery-216fe",
  storageBucket: "angappbackery-216fe.firebasestorage.app",
  messagingSenderId: "434250655992",
  appId: "1:434250655992:web:0e4458efc44602671a730d",
  measurementId: "G-GBY79TFGQP"
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