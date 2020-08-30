import { Stats } from "./stats";
import { Test, MetricSampler, Metric } from "./test";
import { TypedEvent } from "./event";

export interface RunnerOptions {
    sampleInterval: number; // milliseconds
    samplers: MetricSampler[];
    tests: Test[];
    engine: ex.Engine
}

export class Runner {
    private _running: boolean = false;
    private _firstFrame: boolean = false;
    private _lastTime: number = 0;
    private _currentTimeAccum: number = 0;
    private _sampleInterval: number = 100;
    private _samplers: MetricSampler[] = [];
    private _fps: number = 60;
    public testChanged = new TypedEvent<Test | null>();
    public testCompleted = new TypedEvent<Test>();
    public metricEvents: TypedEvent<Metric[]> = new TypedEvent<Metric[]>();

    public stats: Stats = new Stats(10);
    public metrics: Metric[][] = []
    public engine: ex.Engine;

    private _currentTest: Test | null = null;
    private _currentTestNumber = 0;
    private _tests: Test[];
    public get currentTest(): Test | null {
        return this._currentTest;
    }

    constructor(options: RunnerOptions) {
        this._tests = options.tests;
        this.engine = options.engine;
        this._sampleInterval = options.sampleInterval;
        this._samplers = options.samplers;
    }

    public get fps() {
        return this._fps;
    }

    now(): number {
       return window.performance.now();
    }

    public sampleMetrics(elapsed: number): void {
        const frameMetrics: Metric[] = [];
        for (const sampler of this._samplers) {
            frameMetrics.push(sampler.sample(this.engine));
        }
        this.metrics.push(frameMetrics);
        this.metricEvents.emit(frameMetrics);
    }

    private _update(elapsed: number) {
        this._currentTimeAccum += elapsed;
        if (this._currentTimeAccum >= this._sampleInterval && this.currentTest?.ready) {
            this._currentTimeAccum = 0;
            this.sampleMetrics(elapsed);
        }

        if (!this._currentTest?.running) {
            this._currentTest?.start().then(() => {
                this.sampleMetrics(this.now() - this._lastTime);
                this._currentTest!.metrics = this.metrics;
                this._currentTest!.metricSummary = this.summarize(this.metrics);
                const oldTest = this._currentTest;
                this.testCompleted.emit(this._currentTest as Test);
                this.metrics = [];
                this._currentTest = null;
                oldTest?.cleanUp().then(() => {
                    this._currentTestNumber++;
                    if (this._currentTestNumber < this._tests.length) {
                        this._currentTest = this._tests[this._currentTestNumber];
                        this.testChanged.emit(this._currentTest as Test);
                    }
                });
            });
        }

        if (this._currentTestNumber >= this._tests.length) {
            console.log("[Tests Complete]");
            this._currentTest = null;
            this.testChanged.emit(null);
            // for (const test of this._tests) {
            //     console.log(`[Test: ${test.name}] Results:`);
            //     for (const metric of test.metricSummary) {
            //         console.log(`[${metric.name}]: ${metric.value}`);
            //     }
            // }
            this.stop();
        }
    }

    summarize(metrics: Metric[][]): Metric[] {
        const summary: {[name:string]: number } = {};
        const names = metrics[0].map(m => m.name);
        
        for (const name of names) {
            let sum = 0
            let count = 0;
            for (const sample of metrics) {
                count++
                sum += sample.find(m => m.name === name)?.value ?? 0;
            }
            let avg = sum / count;
            summary[name+' Average'] = avg;
        }

        const results: Metric[] = [];
        for (const name in summary) {
            results.push({name, value: summary[name]});
        }
        return results;
    }

    start(): void {
        this._running = true;
        this._firstFrame = true;
        this._currentTestNumber = 0;
        this._currentTimeAccum = 0;
        this._currentTest = this._tests[this._currentTestNumber];
        this.testChanged.emit(this.currentTest as Test);
        window.requestAnimationFrame(this._mainloop);
    }

    stop(): void {
        this._running = false;
    }

    private _mainloop = (timestamp: number) => {
        if (!this._running) return;
        window.requestAnimationFrame(this._mainloop);
        const elapsed = timestamp - this._lastTime;
        this._fps = 1 / (elapsed / 1000);
        this._lastTime = timestamp;
        if (this._firstFrame) {
            this._firstFrame = false;
            return;
        }
        this._update(elapsed);
    }
}