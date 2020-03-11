const canvas = document.createElement('canvas');
let gl = canvas.getContext('webgl');

let InitModel = function () {
    // load vertex shader
    loadTextResource('/shader.vs.glsl', function (vsErr, vsText) {
        if (vsErr) {
            alert('Error getting vertex shader');
            console.error(vsErr);
        } else {
            // load fragment shader
            loadTextResource('/shader.fs.glsl', function (fsErr, fsText) {
                if (fsErr) {
                    alert('Error getting fragment shader');
                    console.error(fsErr);
                } else {
                    // load json model
                    loadJSONResource('/Blender/wrpm33.json', function (modelErr, modelObj) {
                        if (modelErr) {
                            alert('Error getting model');
                            console.error(fsErr);
                        } else {
                            // load texture
                            loadImage('/Blender/wrpm33-texture.jpg', function (imgErr, img) {
                                if (imgErr) {
                                    alert('Error getting texture');
                                    console.error(imgErr);
                                } else {
                                    Run(vsText, fsText, img, modelObj);
                                }
                            });
                        }
                    });
                }
            });
        }
    });
};




let Run = function (vertexShaderText, fragmentShaderText, modelImage, model) {

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.id = 'modelDisplay';
    canvas.width = 800;
    canvas.height = 600;
    gl = WebGLDebugUtils.makeDebugContext(canvas.getContext('webgl'));
    document.body.append(canvas);

    if (!gl) {
        console.log('Unable to initialize WebGL. Your browser or machine may not support it ... Running on experimental-webgl');
        gl = canvas.getContext('experimental-webgl');
    }

    if (!gl) {
        alert('Error, Unable to initialize experimental WebGL. Your browser or machine may not support it.');
    }

    gl.clearColor(0.75, 0.85, 0.8, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.frontFace(gl.CCW);
    gl.cullFace(gl.BACK);

    // Create Shaders
    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

    gl.shaderSource(vertexShader, vertexShaderText);
    gl.shaderSource(fragmentShader, fragmentShaderText);

    gl.compileShader(vertexShader);
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        console.error('ERROR compiling vertex shader!', gl.getShaderInfoLog(vertexShader));
        return;
    }

    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        console.error('ERROR compiling fragment shader!', gl.getShaderInfoLog(fragmentShader));
        return;
    }

    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('ERROR linking program!', gl.getProgramInfoLog(program));
        return;
    }
    gl.validateProgram(program);
    if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
        console.error('ERROR validating program!', gl.getProgramInfoLog(program));
        return;
    }

    // Get vertices, Indices, Normals and Texture Coordinates
    var object = [];

    var modelVertices = [];
    var modelIndices = [];
    var modelTexCoords = [];
    var modelNormals = [];

    // Loop through every mesh
    for (var i = 0; i < model.meshes.length; i++) {

        // Define new buffers for mesh
        const buffers = {
            vertexBuffer: new gl.createBuffer(),
            indexBuffer: new gl.createBuffer(),
            textureBuffer: new gl.createBuffer(),
            normalBuffer: new gl.createBuffer(),
        };

        modelVertices.push(model.meshes[i].vertices);
        modelIndices.push([].concat.apply([], model.meshes[i].faces));
        modelNormals.push(model.meshes[i].normals);

        object.push(buffers);

        // Bind vertex, index and normals data to buffers
        gl.bindBuffer(gl.ARRAY_BUFFER, object[i].vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(modelVertices[i]), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, object[i].indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(modelIndices[i]), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, object[i].normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(modelNormals[i]), gl.STATIC_DRAW);

        // Check if model has a texture
        if (model.meshes[i].texturecoords != undefined) {
            modelTexCoords.push(model.meshes[i].texturecoords[0]);
            gl.bindBuffer(gl.ARRAY_BUFFER, object[i].textureBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(modelTexCoords[i]), gl.STATIC_DRAW);
        } else {
            modelTexCoords.push(null);
        }
    }

    // Create texture
    for (let i = 0; i < object.length; i++) {

        var modelTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, modelTexture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(
            gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
            gl.UNSIGNED_BYTE,
            modelImage
        );
        gl.bindTexture(gl.TEXTURE_2D, null);
    };

    gl.useProgram(program);

    var matWorldUniformLocation = gl.getUniformLocation(program, 'mWorld');
    var matViewUniformLocation = gl.getUniformLocation(program, 'mView');
    var matProjUniformLocation = gl.getUniformLocation(program, 'mProj');

    var worldMatrix = new Float32Array(16);
    var viewMatrix = new Float32Array(16);
    var projMatrix = new Float32Array(16);
    mat4.identity(worldMatrix);
    mat4.lookAt(viewMatrix, [-15, -3.5, 5], [0, 0, 0.3], [0, 1, 20]);
    mat4.perspective(projMatrix, glMatrix.toRadian(4), canvas.width / canvas.height, 0.1, 1000.0);

    gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix);
    gl.uniformMatrix4fv(matViewUniformLocation, gl.FALSE, viewMatrix);
    gl.uniformMatrix4fv(matProjUniformLocation, gl.FALSE, projMatrix);

    var xRotationMatrix = new Float32Array(16);
    var yRotationMatrix = new Float32Array(16);


    // Lighting
    gl.useProgram(program);
    var ambientIntensityUL = gl.getUniformLocation(program, 'ambientIntensity');
    var sunDirectionUL = gl.getUniformLocation(program, 'sunDirection');
    var sunIntensityUL = gl.getUniformLocation(program, 'sunIntensity');

    gl.uniform3f(ambientIntensityUL, 1, 0.8, 0.8);
    gl.uniform3f(sunIntensityUL, 0.2, 0.2, 0.1);
    gl.uniform3f(sunDirectionUL, 5.0, -10.0, 10);


    // Render Loop
    var identityMatrix = new Float32Array(16);
    mat4.identity(identityMatrix);
    var angle = 0;

    var loop = function () {
        angle = performance.now() / 6000;
        mat4.rotate(yRotationMatrix, identityMatrix, angle, [0, 0, 1]);
        mat4.rotate(xRotationMatrix, identityMatrix, 0, [1, 0, 0]);

        mat4.mul(worldMatrix, yRotationMatrix, xRotationMatrix);

        gl.clearColor(0.75, 0.85, 0.8, 1.0);
        gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);

        for (var i = 0; i < object.length; i++) {
            gl.useProgram(program);
            mat4.translate(worldMatrix, worldMatrix, [i, i, i, i]);
            gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix);
            gl.bindBuffer(gl.ARRAY_BUFFER, object[i].vertexBuffer);

            var positionAttribLocation = gl.getAttribLocation(program, 'vertPosition');
            gl.vertexAttribPointer(
                positionAttribLocation,
                3,
                gl.FLOAT,
                gl.FALSE,
                3 * Float32Array.BYTES_PER_ELEMENT,
                0
            );
            gl.enableVertexAttribArray(positionAttribLocation);


            gl.bindBuffer(gl.ARRAY_BUFFER, object[i].normalBuffer);
            var normalAttribLocation = gl.getAttribLocation(program, 'vertNormal');
            gl.vertexAttribPointer(
                normalAttribLocation,
                3, gl.FLOAT,
                gl.TRUE,
                3 * Float32Array.BYTES_PER_ELEMENT,
                0
            );
            gl.enableVertexAttribArray(normalAttribLocation);


            if (object[i].textureBuffer) {
                gl.bindBuffer(gl.ARRAY_BUFFER, object[i].textureBuffer);
                var texCoordAttribLocation = gl.getAttribLocation(program, 'vertTexCoord');
                gl.vertexAttribPointer(
                    texCoordAttribLocation,
                    2,
                    gl.FLOAT,
                    gl.FALSE,
                    2 * Float32Array.BYTES_PER_ELEMENT,
                    0
                );
                gl.enableVertexAttribArray(texCoordAttribLocation);

                gl.bindTexture(gl.TEXTURE_2D, modelTexture);
                gl.activeTexture(gl.TEXTURE0);
            }

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, object[i].indexBuffer);
            gl.drawElements(gl.TRIANGLES, modelIndices[i].length, gl.UNSIGNED_SHORT, 0);
        }
        requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
};