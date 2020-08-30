
export interface Stat {
    fps: number;
    frameDuration: number;
    memory: number;
    timestamp?: number;
}

export class Stats {
    private _sample: Stat[] = [];
    public stats: Stat[] = [];
    private _currentStat = 0;
    constructor(samples: number) {
        this._sample = new Array(samples);
        this._sample.fill({fps: 60, frameDuration: 16, memory: 0})
    }

    public record(stat: Stat) {
        stat.timestamp = performance.now();
        this._sample[this._currentStat] = stat;
        this.stats.push(stat);
        this._currentStat = (this._currentStat + 1) % this._sample.length;
    }

    public get avg(): Stat {
        return {
            fps: this._sample.reduce((sum, val) => sum + val.fps, 0) / this._sample.length,
            frameDuration: this._sample.reduce((sum, val) => sum + val.frameDuration, 0) / this._sample.length,
            memory: this._sample.reduce((sum, val) => sum + val.memory, 0) / this._sample.length
        }
    }
}