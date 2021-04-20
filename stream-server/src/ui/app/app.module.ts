import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { MatCardModule, MatBadgeModule, MatChipsModule, MatButtonModule, MatExpansionModule, MatIconModule, MatInputModule } from '@angular/material';
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
