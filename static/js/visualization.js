let width,
    height,
    projection,
    path,
    svg,
    fill,
    div,
    defs,
    g,
    gg,
    coordinates,
    labels,
    probs,
    voronoi;

let previousUs;
let previousMesh;
let probsToggle = false;
let probsSubsetToggle = false;
let cellsToggle = false;
let display = 'gradient boosted classifier';

function arrayMax(arr) {
    let len = arr.length, max = -Infinity;
    while (len--) {
        if (arr[len] > max) {
            max = arr[len];
        }
    }
    return max;
}

function indexOfMax(arr) {
    if (arr.length === 0) {
        return -1;
    }

    let max = arr[0];
    let maxIndex = 0;

    for (let i = 1; i < arr.length; i++) {
        if (arr[i] > max) {
            maxIndex = i;
            max = arr[i];
        }
    }

    return maxIndex;
}

let drawSvg = function () {
    width = 960;
    height = 550;

    projection = d3.geoAlbers().precision(0.1);
    path = d3.geoPath().projection(projection).pointRadius(1.5);

    svg = d3.selectAll("#map").append("svg")
        .attr("width", width)
        .attr("height", height);

    fill = d3.scaleOrdinal(d3.schemeCategory20c);

    div = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

};

// Note: doesn't use mesh parameter (should probably remove)
let drawTopo = function (error = undefined, us = previousUs) {
    previousUs = us;

    if (error) {
        console.log(error);
    }

    defs = svg.append("defs");
    defs.append("path")
        .datum(topojson.feature(us, us.objects.land))
        .attr("id", "land")
        .attr("d", path);

    defs.append("clipPath")
        .attr("id", "clip")
        .append("use")
        .attr("xlink:href", "#land");

    svg.append("use")
        .attr("xlink:href", "#land")
        .attr("class", "land");

    g = svg.append("g").attr("clip-path", "url(#clip)");

    g.append("path")
        .datum(topojson.mesh(us, us.objects.states, function (a, b) {
            return a !== b;
        }))
        .attr("class", "states")
        .attr("d", path);

};

let computeVoronoi = function (error = undefined, us = previousUs, mesh = previousMesh) {

    console.log('---------');
    console.log(us);
    console.log(mesh);
    console.log(display);


    coordinates = mesh.filter((d) => {
        return d.label === display
    }).map(function (d) {
        return [d.lon, d.lat]
    });

    labels = mesh.filter((d) => {
        return d.label === display
    }).map(function (d) {
        return d.place
    });

    probs = mesh.filter((d) => {
        return d.label === display
    }).map(function (d) {
        return d.prob
    });

    voronoi = d3.geoVoronoi(coordinates, d3.geoDelaunay(coordinates)).geometries;

    // console.log('voronoi result looks like:');
    // console.log(voronoi);
    //
    // console.log('labels looks liek:');
    // console.log(labels);
    // console.log('probs looks like:');
    // console.log(probs);

    for (let i = 0; i < labels.length; i++) {
        voronoi[i]['place'] = labels[i];
    }
    for (let i = 0; i < probs.length; i++) {
        voronoi[i]['prob'] = probs[i];
    }

    // filter out cells not in US 'bounding box'
    for (let i = voronoi.length - 1; i >= 0; i--) {
        let cur = voronoi[i];
        if (cur.coordinates[0].length !== 7) {
            // remove voronoi cell
            console.log('Removed voronoi cell - not in US bounding box.');
            voronoi.splice(i, 1);
        }
    }

};


let toggleProbabilities = function (toggle = false) {
    if (toggle === true) {
        probsToggle = !probsToggle;
        console.log('Show probabilities: ' + probsToggle);
    }
    if (probsSubsetToggle === true) {
        probsSubsetToggle = !probsSubsetToggle;
        drawVoronoi();
        let alert = document.getElementById('probability_subset');
        alert.style.opacity = "0";
    }

    g.selectAll(".voronoi-border-path")
        .transition()
        .duration(375)
        .ease(d3.easeSin)
        .style("opacity", function (d) {
            if (probsToggle === true) {
                return d.prob
            }
            else {
                return 1.
            }
        });
};


let toggleCells = function (toggle = false) {
    if (toggle === true) {
        cellsToggle = !cellsToggle;
        console.log('Show voronoi cells: ' + cellsToggle);
    }

    // if (probsToggle === true) {
    drawVoronoi();
    // }

    g.selectAll('.voronoi-border-path')
        .transition()
        .duration(375)
        .ease(d3.easeSin)
        .style("stroke", function (d) {
            if (cellsToggle === true) {
                return "#e7e7e7";
            }
            else {
                return fill(d.place);
            }
        })
};


let selectModel = function (selection) {

    display = selection;
    computeVoronoi();

    if (probsSubsetToggle === true) {

    }

    drawVoronoi();
    document.getElementById('title').innerText = "decision surface (" + display + ")";

    g.selectAll(".voronoi-border-path")
        .transition()
        .duration(375)
        .ease(d3.easeSin)
        .style("fill", function (d) {
            return fill(d.place);
        })
        .style("stroke", function (d) {
            if (cellsToggle === true) {
                return "#e7e7e7";
            }
            else {
                return fill(d.place);
            }
        })
        .style("opacity", function (d) {
            if (probsToggle === true) {
                return d.prob
            }
            else {
                return 1.
            }
        });

};

function drawVoronoi(subset = false, d = undefined) {

    gg = g.selectAll(".voronoi-border-path")
        .data(voronoi.map(function (cell) {
            let probsString = cell.prob.substring(1, cell.prob.length - 1).split(' ');
            let probs = [];
            for (let p = 0; p < probsString.length; p++) {
                probs.push(parseFloat(probsString[p]));
            }
            if (subset === true) {
                return {
                    type: "LineString",
                    coordinates: cell.coordinates[0],
                    place: d.place,
                    places: d.places,
                    prob: probs[d.places.indexOf(d.place)],
                    probabilities: probs,
                }
            }
            else {
                let probMax = arrayMax(probs);
                let probMaxIdx = indexOfMax(probs);
                let placesString = cell.place.split("'");
                let places = [];
                for (let p = 0; p < placesString.length; p++) {
                    if (placesString[p].length > 3) {
                        places.push(placesString[p]);
                    }
                }
                return {
                    type: "LineString",
                    coordinates: cell.coordinates[0],
                    place: places[probMaxIdx],
                    places: places,
                    prob: probMax,
                    probabilities: probs,
                };
            }
        }));

    // SHOULD THIS BE MOVED OUTSIDE?
    gg.transition()
        .duration(375)
        .ease(d3.easeSin)
        .style("opacity", function (d) {
            return d.prob
        });

}



function enterView() {

    drawVoronoi();
    document.getElementById('title').innerText = "decision surface (" + display + ")";

    gg.enter()
        .append("path")
        .attr("class", "voronoi-border-path")
        .attr("d", path)
        .on("mouseover", function (d) {

            div.transition()
                .duration(200)
                .style("opacity", .9);
            div.html("<div><span class='tooltip_title'>State: </span>" + d.place +
                "<br><span class='tooltip_title'>Latitude: </span>" + d.coordinates[0][1].toFixed(2) +
                "<br><span class='tooltip_title'>Longitude: </span>" + d.coordinates[0][0].toFixed(2) +
                "<br><span class='tooltip_title'>Probability: </span>" + parseFloat(d.prob).toFixed(2) +
                "</div>")
                .style("color", "#666D76")
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");

            if (probsToggle === true) {
                drawVoronoi(true, d);
                let alert_text = document.getElementById('probability_subset_text');
                alert_text.innerText = 'filter: ' + d.place;
                let alert = document.getElementById('probability_subset');
                alert.style.opacity = "1";
            }
        })
        .on("mouseout", function () {

            div.transition()
                .duration(375)
                .style("opacity", 0);

            if (probsToggle === true) {
                drawVoronoi();
                let alert = document.getElementById('probability_subset');
                alert.style.opacity = "0";
            }

            gg.selectAll('path.voronoi-border-path')
                .style('opacity', function (d) {
                    if (probsToggle === true) {
                        return d.prob
                    }
                    else {
                        return 1.
                    }
                });

        })

        .on("click", function () {
            if ((probsToggle === true) && (probsSubsetToggle === false)) {
                gg = g.selectAll(".voronoi-border-path")
                    .on("mouseout", function () {
                        div.transition()
                            .duration(375)
                            .style("opacity", 0);
                        // THIS LOCKS THE VIEW BUT DOESN'T REALLY DO THAT WELL
                        // WHEN SWITCHING MODELS FROM LOCKED VIEW
                        // DOES ANIMATION THEN RESETS ON MOUSEOVER
                        console.log('VIEW LOCKED')
                    });
                probsSubsetToggle = true;
            }
            else if ((probsToggle === true) && (probsSubsetToggle === true)) {
                gg.on("mouseout", function () {
                    div.transition()
                        .duration(375)
                        .style("opacity", 0);

                    drawVoronoi();
                    let alert = document.getElementById('probability_subset');
                    alert.style.opacity = "0";
                    probsSubsetToggle = false;
                    gg.selectAll('path.voronoi-border-path')
                        .style('opacity', function (d) {
                            if (probsToggle === true) {
                                return d.prob
                            }
                            else {
                                return 1.
                            }
                        });
                })
            }
        })
        .transition()
        .duration(375)
        .ease(d3.easeSin)
        .style("fill", function (d) {
            return fill(d.place);
        })
        .style("stroke", function (d) {
            if (cellsToggle === true) {
                return "#e7e7e7";
            }
            else {
                return fill(d.place);
            }
        })
        .style("opacity", function (d) {
            if (probsToggle === true) {
                return d.prob
            }
            else {
                return 1.
            }
        });
}

function ready(error = undefined, us = previousUs, mesh = previousMesh) {

    // console.log('in ready... mesh and probs look like:');
    // console.log(mesh);

    previousUs = us;
    previousMesh = mesh;

    drawSvg();
    drawTopo(error, us, mesh);
    computeVoronoi(error, us, mesh);
    enterView();

}

queue()
    .defer(d3.json, "./static/data/us-10m.json")
    .defer(d3.csv, "./static/data/predicted-states-allprobas-4.csv")
    .await(ready);

