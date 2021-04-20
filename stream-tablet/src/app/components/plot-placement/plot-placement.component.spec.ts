import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PlotPlacementComponent } from './plot-placement.component';

describe('PlotPlacementComponent', () => {
  let component: PlotPlacementComponent;
  let fixture: ComponentFixture<PlotPlacementComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PlotPlacementComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PlotPlacementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
