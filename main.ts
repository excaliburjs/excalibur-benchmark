import { Runner } from "./runner";
import * as d3 from 'd3';
import { Test, ExcaliburFpsSampler } from "./test";
import * as ex from 'excalibur';
import playerSrc from './player.png'

const resultsElement = document.getElementById('graph') as HTMLDivElement;
const currentTest = document.getElementById('currentTest') as HTMLParagraphElement;
const start = document.getElementById('start') as HTMLButtonElement;
let game = new ex.Engine({canvasElementId: 'game', width: 600, height: 400});
game.start();

let random = new ex.Random(1234);
// const graphic = new ex.Rectangle({
//     width: 10,
//     height: 10,
//     color: ex.Color.Red
// });
const image = new ex.ImageSource(playerSrc);
image.load();
const graphic = image.toSprite();

const generateActors = (quantity: number) => {
    for (let i = 0; i < quantity; i++) {
        const actor = new ex.Actor({
            pos: new ex.Vector(game.halfDrawWidth, game.halfDrawHeight),
            collisionType: ex.CollisionType.PreventCollision,
            color: new ex.Color(random.integer(0, 255), random.integer(0, 255), random.integer(0, 255)),
            angularVelocity: random.floating(-2, 2),
            vel: new ex.Vector(ex.Util.randomInRange(-100, 100, random), ex.Util.randomInRange(-100, 100, random))
        });
        actor.removeComponent(actor.collider, true);
        actor.graphics.use(graphic);
        game.add(actor);
    }
};

const runner = new Runner({
    engine: game,
    sampleInterval: 100,
    samplers: [new ExcaliburFpsSampler(game)],
    tests: [
        new Test({
            name: '100 Actors (no sprites, no collisions)',
            duration: 5_000,
            setup: () => {
                generateActors(100);
                return Promise.resolve();
            },
            cleanUp: () => {
                return new Promise<void>(resolve => {
                    game.currentScene.actors.forEach(a => game.currentScene.remove(a));
                    resolve();
                })
            }
        }),
        new Test({
            name: '1000 Actors (no sprites, no collisions)',
            duration: 10_000,
            setup: () => {
                generateActors(1000);
                return Promise.resolve();
            },
            cleanUp: () => {
                return new Promise<void>(resolve => {
                    game.currentScene.actors.forEach(a => game.currentScene.remove(a));
                    resolve();
                })
            }
        }),
        new Test({
            name: '2000 Actors (no sprites, no collisions)',
            duration: 10_000,
            setup: () => {
                generateActors(2000);
                return Promise.resolve();
            },
            cleanUp: () => {
                return new Promise<void>(resolve => {
                    game.currentScene.actors.forEach(a => game.currentScene.remove(a));
                    resolve();
                })
            }
        }),
        new Test({
            name: '4000 Actors (no sprites, no collisions)',
            duration: 10_000,
            setup: () => {
                generateActors(4000);
                return Promise.resolve();
            },
            cleanUp: () => {
                return new Promise<void>(resolve => {
                    game.currentScene.actors.forEach(a => game.currentScene.remove(a));
                    resolve();
                })
            }
        }),
        new Test({
            name: 'Idle with no Actors',
            duration: 10_000,
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
       result.innerText = `[${metric.name}]: ${metric.value.toFixed(2)}`
       results.appendChild(result);
    }

    resultsElement.appendChild(results);

    const width = 600;
    const height = 300;
    const margin = 50;

    const xScale = d3.scaleLinear()
        .domain([0, test.duration/1000])
        .range([0, width]);
    
    const yScale = d3.scaleLinear()
        .domain([0, 100])
        .range([height, 0]);

    const dataset = test.metrics.map(m => ({
        x: (m.find(m => m.name === 'fps')!.time ?? 0) / 1000,
        y: m.find(m => m.name === 'fps')!.value
    }));

    const line = d3.line<{x: number, y: number}>()
        .x((d, i) => xScale(d.x))
        .y(d => yScale(d.y));

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
                             (height + 40) + ")")
        .style("text-anchor", "middle")
        .text("Time (seconds)");

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
        .attr("cx", function(d, i) { return xScale((d.x ?? 0)) })
        .attr("cy", function(d) { return yScale(d.y) })
        .attr("r", 5)

});

start.addEventListener('click', () => {
    runner.start();
});
