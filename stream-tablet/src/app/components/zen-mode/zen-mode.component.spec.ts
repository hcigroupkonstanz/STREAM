import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ZenModeComponent } from './zen-mode.component';

describe('ZenModeComponent', () => {
  let component: ZenModeComponent;
  let fixture: ComponentFixture<ZenModeComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ZenModeComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ZenModeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
