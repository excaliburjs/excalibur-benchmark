
export interface TestOptions {
    name: string;
    duration: number;
    setup: () => Promise<any>;
    cleanUp?: () => Promise<any>;
}

export interface Metric {
    name: string;
    value: number;
}

export interface MetricSampler {
    sample(engine: ex.Engine): Metric;
}

export class ExcaliburFpsSampler implements MetricSampler {
    constructor() {}

    public sample(engine: ex.Engine): Metric {
        const fps = engine.stats.currFrame.fps;
        // if (fps > 60) {
        //     console.warn('FPS TOO HIGH', fps);
        // }
        return { name: 'fps', value: (fps === 1000 ? 0 : fps) };
    }
}


export class Test {
    private static _ID = 0;
    public readonly id = Test._ID++;
    public name: string;
    private _duration: number = 100;
    private _setup: () => Promise<any>;
    private _cleanUp: () => Promise<any>;
    private _running: boolean = false;
    private _setupComplete: boolean = false;
    public metrics: Metric[][] = [];
    public metricSummary: Metric[] = [];
    public get running() {
        return this._running;
    }

    public get ready() {
        return this._setupComplete;
    }

    constructor(options: TestOptions) {
        this._setup = options.setup;
        this._cleanUp = options.cleanUp ?? (() => { return Promise.resolve() });
        this._duration = options.duration;
        this.name = options.name;
    }

    public start(): Promise<void> {
        console.log(`[Test Started]: ${this.name}`)
        const testStartTime = performance.now();
        this._running = true;
        this._setupComplete = false;

        
        return this._setup().then(() => {
            const currentDuration = performance.now() - testStartTime;
            console.log(`[Test Setup Took]: ${currentDuration} msecs`);
            const timeleft = currentDuration < this._duration ? this._duration - currentDuration : 0;
            this._setupComplete = true;
            return new Promise(resolve => {
                setTimeout(resolve, timeleft)
            });
        }).then(() => {
            const testEndTime = performance.now();
            const diff = testEndTime - testStartTime;
            console.log(`[Test Complete]: ${this.name} in ${diff} msecs`);
            this._running = false;
        });
    }

    public cleanUp(): Promise<void> {
        return this._cleanUp();
    }
}