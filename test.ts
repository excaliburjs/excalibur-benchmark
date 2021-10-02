
export interface TestOptions {
    name: string;
    duration: number;
    setup: () => Promise<any>;
    cleanUp?: () => Promise<any>;
}

export interface Metric {
    name: string;
    value: number;
    time?: number;
}

export interface MetricSampler {
    sample(startTime: number): Metric;
    reset(): void;
}

export class ExcaliburFpsSampler implements MetricSampler {
    _beginTime = 0;
    _prevTime = 0;
    _frames = 0;
    _fps = 60;
    _engine: ex.Engine;
    _samplePeriod = 100;
    constructor(engine: ex.Engine) {
        this._engine = engine;
        engine.on('preframe', () => {
            this._beginTime = performance.now();
        });

        engine.on('postdraw', () => {
            this._frames++;
            const time = performance.now();

            if (time >= this._prevTime + this._samplePeriod) {
                this._fps = ( this._frames * 1000 ) / ( time - this._prevTime )
                this._prevTime = time;
                this._frames = 0;
            }
        });
    }

    public reset() {
        this._beginTime = performance.now();
        this._prevTime = performance.now();
        this._frames = 0;
        this._fps = 60;
    }

    public sample(startTime: number): Metric {
        return { name: 'fps', value: this._fps, time: performance.now() - startTime };
        // const fps = this._engine.stats.currFrame.fps;
        // return { name: 'fps', value: (fps === 1000 ? 0 : fps), time: performance.now() - startTime };
    }
}


export class Test {
    private static _ID = 0;
    public readonly id = Test._ID++;
    public name: string;
    public get duration() {
        return this._duration;
    }
    private _duration: number = 100;
    private _startTime: number = 0;
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

    public get startTime() {
        return this._startTime;
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
            this._startTime = performance.now();
            return new Promise<void>(resolve => {
                setTimeout(() => {
                    resolve();
                }, timeleft)
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