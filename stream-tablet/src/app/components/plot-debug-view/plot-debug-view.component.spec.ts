import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PlotDebugViewComponent } from './plot-debug-view.component';

describe('PlotDebugViewComponent', () => {
  let component: PlotDebugViewComponent;
  let fixture: ComponentFixture<PlotDebugViewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PlotDebugViewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PlotDebugViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
