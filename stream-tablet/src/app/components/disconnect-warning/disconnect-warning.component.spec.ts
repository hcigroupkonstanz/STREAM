import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DisconnectWarningComponent } from './disconnect-warning.component';

describe('DisconnectWarningComponent', () => {
  let component: DisconnectWarningComponent;
  let fixture: ComponentFixture<DisconnectWarningComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DisconnectWarningComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DisconnectWarningComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
