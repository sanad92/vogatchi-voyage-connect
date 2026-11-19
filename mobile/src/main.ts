import { bootstrapApplication } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import arabic from '@angular/common/locales/ar-EG';
import { MobileApp } from './app/mobile-app';

registerLocaleData(arabic);
bootstrapApplication(MobileApp).catch(error => console.error('Safar ERP failed to start', error));
