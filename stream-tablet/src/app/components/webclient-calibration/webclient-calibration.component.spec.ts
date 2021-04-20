import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { WebclientCalibrationComponent } from './webclient-calibration.component';

describe('WebclientCalibrationComponent', () => {
  let component: WebclientCalibrationComponent;
  let fixture: ComponentFixture<WebclientCalibrationComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ WebclientCalibrationComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(WebclientCalibrationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
