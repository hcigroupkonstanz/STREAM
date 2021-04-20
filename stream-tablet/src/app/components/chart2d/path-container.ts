import { HtmlChartElement, ChartElement } from '@stream/directives';
import { PathSelection } from './path-selection';
import { BehaviorSubject } from 'rxjs';
import { first } from 'rxjs/operators';

export class PathContainer extends ChartElement {

    private container: HtmlChartElement;
    private width: number;
    private height: number;
    private paths: PathSelection[] = [];
    private readonly registered = new BehaviorSubject<boolean>(false);

    public register(root: HtmlChartElement, width: number, height: number): void {
        this.container = root.append('g');
        this.width = width;
        this.height = height;

        for (const path of this.paths) {
            path.register(this.container, this.width, this.height);
        }

        this.registered.next(true);
    }

    public unregister(): void {
        this.container.remove();
        for (const path of this.paths) {
            path.unregister();
        }

        this.registered.next(false);
    }

    public async getElement() {
        await this.registered.pipe(first(x => x)).toPromise();
        return this.container.node();
    }

    public async addPath(path: PathSelection) {
        await this.registered.pipe(first(x => x)).toPromise();
        path.register(this.container, this.width, this.height);
        this.paths.push(path);
    }

    public removePath(path: PathSelection): void {
        path.unregister();
    }

    public clear(): void {
        for (const path of this.paths) {
            this.removePath(path);
        }
        this.paths = [];
    }

    public getPaths(): PathSelection[] {
        return this.paths;
    }
}
