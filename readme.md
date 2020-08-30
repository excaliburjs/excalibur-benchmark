# Excalibur Benchmarking Tools

Goals:
* Baseline stats
  -  Chrome, Firefox, Hardware?
  - window.performance
    - https://developer.mozilla.org/en-US/docs/Web/API/Performance/memory
    - 
* CI/CD run
* API to benchmarking
  - Test


```typescript

const test = new Test({
    name: 'Actor Benchmark',
    duration: 100, // seconds,
    setup: () => {

    },
    run: () => {

    },
    cleanUp: () => {

    }
});

const runner = new Runner({
    tests: [test]
});

// Start the tests
runner.start();
// Stop the tests
runner.stop();
// Get the report
runner.report();

```

Ideas:
* [x] Do a rolling average with a ring buffer?
* [ ] Add excalibur hooks into major systems for https://developer.mozilla.org/en-US/docs/Web/API/Performance/measure
* GRAPHS of fps/frameduration/actors/entities over time