import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { OwnerSettingsComponent } from './owner-settings.component';

describe('OwnerSettingsComponent', () => {
  let component: OwnerSettingsComponent;
  let fixture: ComponentFixture<OwnerSettingsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ OwnerSettingsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(OwnerSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
