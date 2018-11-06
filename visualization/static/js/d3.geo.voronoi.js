(function() {

var π = Math.PI,
    degrees = 180 / π,
    radians = π / 180,
    ε = 1e-15,
    circle = d3.geoCircle();

d3.geoVoronoi = function(points, triangles) {
  if (arguments.length < 2) triangles = d3.geoDelaunay(points);
  if (!triangles) triangles = [];

  var n = points.length;

  var edgeByStart = [];
  triangles.forEach(function(t) {
    var edges = t.edges;
    edges.reverse();
    for (var i = 0, prev = edges[2]; i < 3; ++i) {
      var e = edges[i];
      e.prev = prev;
      e.triangle = t;
      edgeByStart[e.b] = (prev = e);
    }
  });
  return {
    type: "GeometryCollection",
    geometries: n === 1 ? [{type: "Sphere"}]
      : n === 2 ? hemispheres(points[0], points[1])
      : points.map(function(_, i) {
        var cell = [],
            neighbors = [],
            o = {type: "Polygon", coordinates: [cell], neighbors: neighbors},
            e00 = edgeByStart[i],
            e0 = e00,
            e = e0,
            centre0 = e.triangle.centre;
        do {
          var centre = e.triangle.centre;
          if (dot(centre, centre0) < ε - 1) {
            var a = cartesian(points[e0.b]), b = cartesian(points[e.a]),
                c = normalise([a[0] + b[0], a[1] + b[1], a[2] + b[2]]);
            if (dot(centre, cross(a, b)) > 0) c[0] = -c[0], c[1] = -c[1], c[2] = -c[2];
            cell.push(spherical(c));
          }
          cell.push(spherical(centre));
          neighbors.push(e.a);
          centre0 = centre;
          if (e === e00 && e0 !== e00) break;
          e = (e0 = e).prev.neighbour;
        } while (1);
        return o;
      })
  };
};

d3.geoDelaunay = function(points) {
  var p = points.map(cartesian),
      n = points.length,
      triangles = convexhull3d(p);

  if (triangles.length) return triangles.forEach(function(t) {
    t.centre = circumcentre(t);
    // TODO reuse original points.
    t[0] = spherical(t[0]);
    t[1] = spherical(t[1]);
    t[2] = spherical(t[2]);
  }), triangles;

  if (n > 2) {
    var edgeByEnds = {},
        N = normalise(cross(subtract(p[1], p[0]), subtract(p[2], p[0]))),
        M = [-N[0], -N[1], -N[2]],
        p0 = p.shift(),
        reference = subtract(p[0], p0);
    p.sort(function(a, b) { return angle(reference, subtract(a, p0)) - angle(reference, subtract(b, p0)); });
    p.unshift(p0);
    var d = [0, 1, 2];
    for (var i = 2; i < n; ++i) {
      d[0] = 0, d[1] = i - 1, d[2] = i;
      var t = orient(p, d, N);
      t.edges = [
        edgeByEnds[d[0] + "," + d[1]] = new Edge(d[0], d[1]),
        edgeByEnds[d[1] + "," + d[2]] = new Edge(d[1], d[2]),
        edgeByEnds[d[2] + "," + d[0]] = new Edge(d[2], d[0])
      ];
      t.centre = circumcentre(t);
      triangles.push(t);
      t = orient(p, d, M);
      t.edges = [
        edgeByEnds[d[0] + "," + d[1]] = new Edge(d[0], d[1]),
        edgeByEnds[d[1] + "," + d[2]] = new Edge(d[1], d[2]),
        edgeByEnds[d[2] + "," + d[0]] = new Edge(d[2], d[0])
      ];
      t.centre = circumcentre(t);
      triangles.push(t);
    }
    for (var k in edgeByEnds) {
      var edge = edgeByEnds[k],
          ends = k.split(",");
      edge.neighbour = edgeByEnds[ends.reverse().join(",")];
    }
    return triangles;
  }
};

function hemispheres(a, b) {
  var c = d3.geoInterpolate(a, b)(.5),
      n = cross(cross(cartesian(a), cartesian(b)), cartesian(c)),
      m = 1 / norm(n);
  n[0] *= m, n[1] *= m, n[2] *= m;
  var ring = circle.origin(spherical(n))().coordinates[0];
  return [
    {type: "Polygon", coordinates: [ring]},
    {type: "Polygon", coordinates: [ring.slice().reverse()]}
  ];
}

function convexhull3d(points) {
  var n = points.length;

  if (n < 4) return []; // coplanar points

  var t = points.slice(0, 3);
  t.n = cross(subtract(t[1], t[0]), subtract(t[2], t[0]));
  for (var i3 = 3; i3 < n && coplanar(t, points[i3]); ++i3);

  if (i3 === n) return []; // coplanar points

  var triangles = [], edgeByEnds = {};

  // First find a tetrahedron.
  [[1, 2, i3, 0], [0, 2, 1, i3], [0, i3, 2, 1], [0, 1, i3, 2]].forEach(function(d) {
    var t = orient(points, d, points[d[3]]); // also sets normal
    t.edges = [
      edgeByEnds[d[0] + "," + d[1]] = new Edge(d[0], d[1]),
      edgeByEnds[d[1] + "," + d[2]] = new Edge(d[1], d[2]),
      edgeByEnds[d[2] + "," + d[0]] = new Edge(d[2], d[0])
    ];
    triangles.push(t);
  });
  for (var k in edgeByEnds) {
    var edge = edgeByEnds[k],
        ends = k.split(",");
    edge.neighbour = edgeByEnds[ends.reverse().join(",")];
  }
  for (var i = 3; i < n; ++i) {
    if (i === i3) continue;
    var p = points[i];
    var H = [];
    for (var j = 0, m = triangles.length; j < m; ++j) {
      var t = triangles[j];
      if (!t || !visible(t, p)) continue;
      // remove edges of t
      var e = t.edges;
      e[0].remove(H), e[1].remove(H), e[2].remove(H);
      triangles[j] = null;
    }
    edgeByEnds = {};
    for (var j = 0, m = H.length, e; j < m; ++j) {
      if ((e = H[j]).removed) continue;
      var t = [points[e.b], points[e.a], p];
      t.n = cross(subtract(t[1], t[0]), subtract(t[2], t[0]));
      t.edges = [
        new Edge(e.b, e.a),
        edgeByEnds[e.a + "," + i] = new Edge(e.a, i),
        edgeByEnds[i + "," + e.b] = new Edge(i, e.b)
      ];
      (e.neighbour = t.edges[0]).neighbour = e;
      triangles.push(t);
    }
    for (var k in edgeByEnds) {
      var edge = edgeByEnds[k],
          ends = k.split(",");
      edge.neighbour = edgeByEnds[ends.reverse().join(",")];
    }
  }
  return triangles.filter(Boolean);
}

function circumcentre(t) {
  var p0 = t[0],
      p1 = t[1],
      p2 = t[2],
      n = t.n,
      m2 = 1 / norm2(n),
      m = Math.sqrt(m2),
      radius = asin(.5 * m * norm(subtract(p0, p1)) * norm(subtract(p1, p2)) * norm(subtract(p2, p0))),
      α = .5 * m2 * norm2(subtract(p1, p2)) * dot(subtract(p0, p1), subtract(p0, p2)),
      β = .5 * m2 * norm2(subtract(p0, p2)) * dot(subtract(p1, p0), subtract(p1, p2)),
      γ = .5 * m2 * norm2(subtract(p0, p1)) * dot(subtract(p2, p0), subtract(p2, p1)),
      centre = [
        α * p0[0] + β * p1[0] + γ * p2[0],
        α * p0[1] + β * p1[1] + γ * p2[1],
        α * p0[2] + β * p1[2] + γ * p2[2]
      ],
      k = norm2(centre);
  if (k > ε) centre[0] *= (k = 1 / Math.sqrt(k)), centre[1] *= k, centre[2] *= k;
  else n[0] *= m, n[1] *= m, n[2] *= m, centre = n;
  if (!visible(t, centre)) centre[0] *= -1, centre[1] *= -1, centre[2] *= -1, radius = π - radius, centre.negative = true;
  centre.radius = radius;
  return centre;
}

function norm2(p) { return dot(p, p); }
function norm(p) { return Math.sqrt(norm2(p)); }

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1],
          a[2] * b[0] - a[0] * b[2],
          a[0] * b[1] - a[1] * b[0]];
}

function subtract(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function planeDistance(t, p) {
  return dot(t.n, p) - dot(t.n, t[0]);
}

function visible(t, p) {
  return dot(t.n, p) - dot(t.n, t[0]) > ε;
}

function coplanar(t, p) {
  return Math.abs(dot(t.n, p) - dot(t.n, t[0])) < ε;
}

function asin(x) {
  return Math.asin(Math.max(-1, Math.min(1, x)));
}

function spherical(cartesian) {
  return [
    Math.atan2(cartesian[1], cartesian[0]) * degrees,
    asin(cartesian[2]) * degrees
  ];
}

function cartesian(spherical) {
  var λ = spherical[0] * radians,
      φ = spherical[1] * radians,
      cosφ = Math.cos(φ);
  return [
    cosφ * Math.cos(λ),
    cosφ * Math.sin(λ),
    Math.sin(φ)
  ];
}

// Construct triangle from first three points, with last point behind.
function orient(points, d, p) {
  var triangle = [points[d[0]], points[d[1]], points[d[2]]];
  triangle.n = cross(subtract(triangle[1], triangle[0]), subtract(triangle[2], triangle[0]));
  if (visible(triangle, p)) {
    triangle.reverse();
    var t = d[0];
    d[0] = d[2];
    d[2] = t;
    triangle.n[0] *= -1, triangle.n[1] *= -1, triangle.n[2] *= -1;
  }
  return triangle;
}

function Edge(a, b) {
  this.a = a;
  this.b = b;
  this.neighbour = this.prev = this.triangle = null;
  this.removed = false;
}

Edge.prototype.remove = function(horizon) {
  var neighbour = this.neighbour;
  if (neighbour) {
    horizon.push(neighbour);
    neighbour.neighbour = null;
    this.neighbour = null;
  }
  this.removed = true;
};

function normalise(d) {
  var m = 1 / norm(d);
  d[0] *= m, d[1] *= m, d[2] *= m;
  return d;
}

function angle(a, b) {
  return Math.acos(dot(a, b) / (norm(a) * norm(b)));
}

})();