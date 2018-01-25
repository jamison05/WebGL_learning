

var canvas = document.getElementById("main");
var gl = canvas.getContext('webgl');

var NUM_METABALLS = 10;
var WIDTH = canvas.width;
var HEIGHT = canvas.height;

/**
 * Shaders
 */

// Utility to fail loudly on shader compilation failure
function compileShader(shaderSource, shaderType) {
    var shader = gl.createShader(shaderType);
    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw "Shader compile failed with: " + gl.getShaderInfoLog(shader);
    }

    return shader;
}

var vertexShader = compileShader('\n\
attribute vec2 position;\n\
\n\
void main() {\n\
    // position specifies only x and y.\n\
    // We set z to be 0.0, and w to be 1.0\n\
    gl_Position = vec4(position, 0.0, 1.0);\n\
}\
', gl.VERTEX_SHADER);

var fragmentShader = compileShader('\n\
precision highp float;\n\
uniform vec3 metaballs[' + NUM_METABALLS + '];\n\
const float WIDTH = ' + WIDTH + '.0;\n\
const float HEIGHT = ' + HEIGHT + '.0;\n\
\n\
void main(){\n\
    float x = gl_FragCoord.x;\n\
    float y = gl_FragCoord.y;\n\
    for (int i = 0; i < ' + NUM_METABALLS + '; i++) {\n\
        vec3 mb = metaballs[i];\n\
        float dx = mb.x - x;\n\
        float dy = mb.y - y;\n\
        float r = mb.z;\n\
        if (dx*dx + dy*dy < r*r) {\n\
            gl_FragColor = vec4(x/WIDTH, y/HEIGHT,\n\
                                0.0, 1.0);\n\                               return;\n\
        }\n\
    }\n\
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);\n\
}\n\
', gl.FRAGMENT_SHADER);

var program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);
gl.useProgram(program);

/**
 * Geometry setup
 */

// Set up 4 vertices, which we'll draw as a rectangle
// via 2 triangles
//
//   A---C
//   |  /|
//   | / |
//   |/  |
//   B---D
//
// We order them like so, so that when we draw with
// gl.TRIANGLE_STRIP, we draw triangle ABC and BCD.
var vertexData = new Float32Array([
    -1.0,  1.0, // top left
    -1.0, -1.0, // bottom left
     1.0,  1.0, // top right
     1.0, -1.0, // bottom right
]);
var vertexDataBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexDataBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

/**
 * Attribute setup
 */

// Utility to complain loudly if we fail to find the attribute

function getAttribLocation(program, name) {
    var attributeLocation = gl.getAttribLocation(program, name);
    if (attributeLocation === -1) {
        throw 'Can not find attribute ' + name + '.';
    }
    return attributeLocation;
}

// To make the geometry information available in the shader as attributes, we
// need to tell WebGL what the layout of our data in the vertex buffer is.
var positionHandle = getAttribLocation(program, 'position');
gl.enableVertexAttribArray(positionHandle);
gl.vertexAttribPointer(positionHandle,
                       2, // position is a vec2
                       gl.FLOAT, // each component is a float
                       gl.FALSE, // don't normalize values
                       2 * 4, // two 4 byte float components per vertex
                       0 // offset into each span of vertex data
                       );

/**
 * Simulation setup
 */

var metaballs = [];

for (var i = 0; i < NUM_METABALLS; i++) {
  var radius = Math.random() * 60 + 10;
  metaballs.push({
    x: Math.random() * (WIDTH - 2 * radius) + radius,
    y: Math.random() * (HEIGHT - 2 * radius) + radius,
    r: radius
  });
}

/**
 * Uniform setup
 */

// Utility to complain loudly if we fail to find the uniform
function getUniformLocation(program, name) {
    var uniformLocation = gl.getUniformLocation(program, name);
    if (uniformLocation === -1) {
        throw 'Can not find uniform ' + name + '.';
    }
    return uniformLocation;
}

// To send the data to the GPU, we first need to
// flatten our data into a single array.
var dataToSendToGPU = new Float32Array(3 * NUM_METABALLS);
for (var i = 0; i < NUM_METABALLS; i++) {
  var baseIndex = 3 * i;
  var mb = metaballs[i];
  dataToSendToGPU[baseIndex + 0] = mb.x;
  dataToSendToGPU[baseIndex + 1] = mb.y;
  dataToSendToGPU[baseIndex + 2] = mb.r;
}
var metaballsHandle = getUniformLocation(program, 'metaballs');
gl.uniform3fv(metaballsHandle, dataToSendToGPU);

/**
 * Draw
 */

gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
