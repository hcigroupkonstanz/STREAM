import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NetworkCounterComponent } from './network-counter.component';

describe('NetworkCounterComponent', () => {
  let component: NetworkCounterComponent;
  let fixture: ComponentFixture<NetworkCounterComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NetworkCounterComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NetworkCounterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
