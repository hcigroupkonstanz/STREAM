import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatBadgeModule } from '@angular/material/badge';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { LogComponent } from './components/log/log.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { LogMessageComponent } from './components/log-message/log-message.component';
import { ClientListComponent } from './components/client-list/client-list.component';
import { NetworkCounterComponent } from './components/network-counter/network-counter.component';
import { ServerInputComponent } from './components/server-input/server-input.component';

@NgModule({
  declarations: [
    AppComponent,
    LogComponent,
    LogMessageComponent,
    ClientListComponent,
    NetworkCounterComponent,
    ServerInputComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,

    MatCardModule,
    MatBadgeModule,
    MatChipsModule,
    MatExpansionModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
