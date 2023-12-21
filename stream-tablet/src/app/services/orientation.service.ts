import { Injectable } from '@angular/core';

import * as _ from 'lodash';
import { BehaviorSubject, Subject } from 'rxjs';
import { DeviceOrientation } from '../models/web-client';

interface Rotation {
    alpha: number,
    beta: number,
    gamma: number
};

@Injectable({
    providedIn: 'root'
})
export class OrientationService {
    public isInitialized = false;

    // for debugging
    private readonly rawOrientationStream = new Subject<Rotation>();
    public readonly rawOrientation = this.rawOrientationStream.asObservable();

    private readonly stateStream = new BehaviorSubject<DeviceOrientation>('inbetween');
    public readonly state = this.stateStream.asObservable();

    constructor() {
        // devicemotion only works with https anyway -> ignore if not https
        if (location.protocol !== 'https:') {
            this.isInitialized = true;
        }

        this.rawOrientation.subscribe(orientation => {
            const angle = Math.abs(orientation.gamma);
            let nextState = this.stateStream.value;
            if (angle < 17) {
                nextState = 'horizontal';
            } else if (angle > 75) {
                nextState = 'vertical';
            } else { 
                nextState = 'inbetween';
            }

            if (nextState !== this.stateStream.value) {
                this.stateStream.next(nextState);
            }
        });
    }

    public initialize() {
        if (!(DeviceMotionEvent as any).requestPermission) {
            this.isInitialized = true;
        } else {
            (DeviceMotionEvent as any).requestPermission().then((response: string) => {
                if (response === 'granted') {
                    window.addEventListener('deviceorientation', (event) => this.onOrientationEvent(event));
                    this.isInitialized = true;
                }
            }).catch(() => {
                this.isInitialized = true;
                console.warn('Forcing orientation to horizontal because permission was denied.')
            });
        }
    }

    private onOrientationEvent(event: any): void {
        this.rawOrientationStream.next({
            alpha: event.alpha,
            beta: event.beta,
            gamma: event.gamma
        })
    } 
}
