import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LiveMenuComponent } from './live-menu.component';

describe('LiveMenuComponent', () => {
  let component: LiveMenuComponent;
  let fixture: ComponentFixture<LiveMenuComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ LiveMenuComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LiveMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
