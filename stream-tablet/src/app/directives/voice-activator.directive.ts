import { Directive, OnInit, ElementRef, OnDestroy } from '@angular/core';
import { WebClient } from '@stream/models';
import { Router } from '@angular/router';

@Directive({
    selector: '[appVoiceActivator]'
})
export class VoiceActivatorDirective implements OnInit, OnDestroy {

    private client = WebClient.Instance;
    // TODO: more sophisticated touch detection?
    // private activeTouches: { [key: number]: { x: number, y: number } } = {};

    // quick & simple voice detection: two finger presses
    private touchAmount = 0;

    private touchStart = (ev: TouchEvent) => this.onTouchStart(ev);
    private touchMove = (ev: TouchEvent) => this.onTouchMove(ev);
    private touchEnd = (ev: TouchEvent) => this.onTouchEnd(ev);

    constructor (private elementRef: ElementRef, private router: Router) {
    }

    ngOnInit(): void {
        const el = <HTMLElement>this.elementRef.nativeElement;
        el.addEventListener('touchstart', this.touchStart, { capture: true });
        // el.addEventListener('touchmove', this.touchMove, { capture: true });
        // el.addEventListener('touchend', this.touchEnd, { capture: true });
        // el.addEventListener('touchcancel', this.touchEnd, { capture: true });
    }

    ngOnDestroy() {
    }

    private onTouchStart(ev: TouchEvent): void {
        this.touchAmount = ev.touches.length;
        this.client.isVoiceActive = this.touchAmount >= 2;


        // target may be destroyed after voice command (i.e. navigation), so touch up won't fire
        // unless listeneres are attached directly to target
        ev.target.addEventListener('touchmove', this.touchMove, { capture: true });
        ev.target.addEventListener('touchend', this.touchEnd, { capture: true });
        ev.target.addEventListener('touchcancel', this.touchEnd, { capture: true });

        // for (let i = 0; i < ev.changedTouches.length; i++) {
        //     const touch = ev.changedTouches[i];
        //     this.activeTouches[touch.identifier] = { x: touch.screenX, y: touch.screenY };
        // }
    }

    private onTouchMove(ev: TouchEvent): void {
        // TODO: cancel if (a) finger has moved too much, (b) too much delay between placing finger 1 and 2 (e.g. >1 second)

        // for (let i = 0; i < ev.changedTouches.length; i++) {
        //     const touch = ev.changedTouches[i];

        //     const currentX = this.activeTouches[touch.identifier].x
        // }
    }

    private onTouchEnd(ev: TouchEvent): void {
        this.touchAmount = ev.touches.length;
        this.client.isVoiceActive = this.touchAmount >= 2;

        ev.target.removeEventListener('touchmove', this.touchMove);
        ev.target.removeEventListener('touchend', this.touchEnd);
        ev.target.removeEventListener('touchcancel', this.touchEnd);

        // for (let i = 0; i < ev.changedTouches.length; i++) {
        //     const touch = ev.changedTouches[i];
        //     this.activeTouches[touch.identifier] += touch.;
        // }
    }
}
