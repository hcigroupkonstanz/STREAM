import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { Chart2dComponent } from './chart2d.component';

describe('Chart2dComponent', () => {
  let component: Chart2dComponent;
  let fixture: ComponentFixture<Chart2dComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ Chart2dComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(Chart2dComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
