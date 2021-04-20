import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DimensionDialogComponent } from './dimension-dialog.component';

describe('DimensionDialogComponent', () => {
  let component: DimensionDialogComponent;
  let fixture: ComponentFixture<DimensionDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DimensionDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DimensionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
