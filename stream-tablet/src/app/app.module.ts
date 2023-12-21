import { CommonModule } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

import { routes } from './routes';
import { AppComponent } from './app.component';

import * as Components from '@stream/components';
import * as Directives from '@stream/directives';

@NgModule({
    declarations: [
        AppComponent,
        Components.Chart2dComponent,
        Components.ClientSettingsComponent,
        Components.DimensionDialogComponent,
        Components.DisconnectWarningComponent,
        Components.FilterDialogComponent,
        Components.LinkViewComponent,
        Components.LiveComponent,
        Components.LiveMenuComponent,
        Components.OwnerSettingsComponent,
        Components.PlotDebugViewComponent,
        Components.PlotListComponent,
        Components.PlotPlacementComponent,
        Components.ScatterPlotComponent,
        Components.SettingsComponent,
        Components.StartMenuComponent,
        Components.VoiceOverlayComponent,
        Components.WebclientCalibrationComponent,
        Components.ZenModeComponent,

        Directives.ChartDirective,
        Directives.VoiceActivatorDirective,
    ],
    imports: [
        CommonModule,
        BrowserModule,
        HttpClientModule,
        FormsModule,
        RouterModule.forRoot(routes),
        BrowserAnimationsModule,

        MatIconModule,
        MatButtonModule,
        MatTabsModule,
        MatInputModule,
        MatMenuModule,
        MatListModule,
        MatExpansionModule,
        MatSelectModule,
        MatSliderModule,
        MatSlideToggleModule,
        MatCardModule,
        MatToolbarModule,
        MatButtonToggleModule
    ],
    providers: [],
    bootstrap: [AppComponent]
})
export class AppModule { }
