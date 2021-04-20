import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { VoiceOverlayComponent } from './voice-overlay.component';

describe('VoiceOverlayComponent', () => {
  let component: VoiceOverlayComponent;
  let fixture: ComponentFixture<VoiceOverlayComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ VoiceOverlayComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VoiceOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
