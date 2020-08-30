import { Runner } from "./runner";
import * as d3 from 'd3';
import { Test, ExcaliburFpsSampler } from "./test";
import * as ex from 'excalibur';

const resultsElement = document.getElementById('graph') as HTMLDivElement;
const currentTest = document.getElementById('currentTest') as HTMLParagraphElement;
const start = document.getElementById('start') as HTMLButtonElement;

let game = new ex.Engine({canvasElementId: 'game', width: 600, height: 400});
game.start();

let random = new ex.Random(1234);
const generateActors = (quantity: number) => {
    for (let i = 0; i < quantity; i++) {
        const actor = new ex.Actor({
            pos: new ex.Vector(game.halfDrawWidth, game.halfDrawHeight),
            width: 10,
            height: 10,
            collisionType: ex.CollisionType.PreventCollision,
            color: new ex.Color(random.integer(0, 255), random.integer(0, 255), random.integer(0, 255)),
            rx: random.floating(-2, 2),
            vel: new ex.Vector(ex.Util.randomInRange(-100, 100, random), ex.Util.randomInRange(-100, 100, random))
        });
        // actor.traits = [];
        (actor.body.collider as any)._shape.recalc = () => {};
        game.add(actor);
    }
};

const runner = new Runner({
    engine: game,
    sampleInterval: 100,
    samplers: [new ExcaliburFpsSampler()],
    tests: [
        new Test({
            name: '100 Actors (no sprites, no collisions)',
            duration: 20000,
            setup: () => {
                generateActors(100);
                return Promise.resolve();
            },
            cleanUp: () => {
                return new Promise(resolve => {
                    game.currentScene.actors.forEach(a => game.currentScene.remove(a));
                    resolve();
                })
            }
        }),
        new Test({
            name: '1000 Actors (no sprites, no collisions)',
            duration: 10000,
            setup: () => {
                generateActors(1000);
                return Promise.resolve();
            },
            cleanUp: () => {
                return new Promise(resolve => {
                    game.currentScene.actors.forEach(a => game.currentScene.remove(a));
                    resolve();
                })
            }
        }),
        new Test({
            name: '2000 Actors (no sprites, no collisions)',
            duration: 10000,
            setup: () => {
                generateActors(2000);
                return Promise.resolve();
            },
            cleanUp: () => {
                return new Promise(resolve => {
                    game.currentScene.actors.forEach(a => game.currentScene.remove(a));
                    resolve();
                })
            }
        }),
        new Test({
            name: '4000 Actors (no sprites, no collisions)',
            duration: 10000,
            setup: () => {
                generateActors(4000);
                return Promise.resolve();
            },
            cleanUp: () => {
                return new Promise(resolve => {
                    game.currentScene.actors.forEach(a => game.currentScene.remove(a));
                    resolve();
                })
            }
        }),
        new Test({
            name: 'Idle with no Actors',
            duration: 10000,
            setup: () => {
                return Promise.resolve();
            }
        })
    ]
});


const liveData: { y: number }[] = []
runner.metricEvents.on(metric => {

});

runner.testChanged.on(test => {
  currentTest.innerText = test?.name ?? "NONE";
});

runner.testCompleted.on(test => {
    const results = document.createElement('div');
    results.id = "results" + test.id.toString();
    results.innerText = `[Excalibur @ ${ex.EX_VERSION}] ${test.name} Summary`;

    for (const metric of test.metricSummary) {
       const result = document.createElement('div');
       result.innerText = `[${metric.name}]: ${metric.value}`
       results.appendChild(result);
    }

    resultsElement.appendChild(results);

    const width = 600;
    const height = 300;
    const margin = 50;

    const xScale = d3.scaleLinear()
        .domain([0, test.metrics.length - 1])
        .range([0, width]);
    
    const yScale = d3.scaleLinear()
        .domain([0, 100])
        .range([height, 0]);

    const line = d3.line<{y: number}>()
        .x((d, i) => xScale(i))
        .y(d => yScale(d.y));

    const dataset = test.metrics.map(m => ({ y: m.find(m => m.name === 'fps')!.value }));

    const svg = d3.select("#graph")
        .append("svg")
            .attr("width", width + margin + margin)
            .attr("height", height + margin + margin)
        .append("g")
            .attr("transform", "translate(" + margin + "," + margin + ")");

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0, " + height + ")")
        .call(d3.axisBottom(xScale));

    svg.append("text")
        .attr("transform",
              "translate(" + (width/2) + " ," + 
                             (height + 20) + ")")
        .style("text-anchor", "middle")
        .text("Time");

    svg.append("g")
        .attr("class", "y axis")
        .call(d3.axisLeft(yScale));
    
      // text label for the y axis
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin)
        .attr("x",0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("FPS"); 

    svg.append("path")
      .datum(dataset)
        .attr("class", "line")
        .attr("d", line as any);

    svg.selectAll(".dot")
        .data(dataset)
      .enter().append("circle") // Uses the enter().append() method
        .attr("class", "dot") // Assign a class for styling
        .attr("cx", function(d, i) { return xScale(i) })
        .attr("cy", function(d) { return yScale(d.y) })
        .attr("r", 5)

});

start.addEventListener('click', () => {
    runner.start();
});

// set the dimensions and margins of the graph
// const margin = {top: 10, right: 30, bottom: 30, left: 60},
// width = 460 - margin.left - margin.right,
// height = 400 - margin.top - margin.bottom;

// // TODO charting should be a separate file/type
// append the svg object to the body of the page
// const graph = d3.select("#graph")
// .append("svg")
// .attr("width", width + margin.left + margin.right)
// .attr("height", height + margin.top + margin.bottom)
// .append("g")
// .attr("transform",
//     "translate(" + margin.left + "," + margin.top + ")");

// // // Add the line
// graph.append("path")
//     .datum(runner.stats)
//     .attr("fill", "none")
//     .attr("stroke", "steelblue")
//     .attr("stroke-width", 1.5)

// const extent = d3.extent(runner.stats.stats, (d) => {
//     return d!.timestamp;
// }) as [number, number];

// const x = d3.scaleLinear()
//     .domain(extent)
//     .range([ 0, width ]);
// graph.append("g")
//     .attr("transform", "translate(0," + height + ")")
//     .call(d3.axisBottom(x));

//   // Add Y axis
// const y = d3.scaleLinear()
//     .domain([0, d3.max(runner.stats.stats, function(d) { return (+d.fps as any); })])    
//     .range([ height, 0 ]);
// graph.append("g")
//     .call(d3.axisLeft(y));

// const line = d3.line<Stat>()
//     .x(function(d) {
//         return x(d.timestamp || 0)
//     })
//     .y(function(d) {
//         return y(d.fps)
//     })

// graph.append("path")
//     .datum(runner.stats.stats)
//     .attr("fill", "none")
//     .attr("stroke", "steelblue")
//     .attr("stroke-width", 1.5)
//     .attr("d", line);

// setInterval(() => {
//     fps.innerText = runner.stats.avg.fps.toFixed(2);
//     frameDuration.innerText = runner.stats.avg.frameDuration.toFixed(2);
//     memory.innerText = runner.stats.avg.memory.toFixed(2);
//     currentTest.innerText = runner.currentTest?.name ?? 'Not running';

// }, 100)