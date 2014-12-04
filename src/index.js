define(function(require){
    var gl; 
    var canvas;
    
    function getContext() {
        canvas = document.querySelector('canvas');
        canvas.width  = 512;
        canvas.height = 512;

        try {
            gl = canvas.getContext("webgl");
            gl.viewportWidth = canvas.width;
            gl.viewportHeight = canvas.height;
        } catch (e) {
        }
        if (!gl) {
            alert("WebGL was not initialized");
        }
    }

    function getShader(gl, str, type) {
        var shader;
        if (type === "fragment") {
            shader = gl.createShader(gl.FRAGMENT_SHADER);
        } else if (type === "vertex") {
            shader = gl.createShader(gl.VERTEX_SHADER);
        } else {
            return null;
        }

        gl.shaderSource(shader, str);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.log(gl.getShaderInfoLog(shader, str));
            return null;
        }

        return shader;
    }

    /*
        This function takes the compile fragment and vertex shaders and links
        them to a new Shader program.  After a successful link this function
        retrieves new locations for the attributes and uniforms we want to use
        in our shaders.
    */

    var shaderProgram;
    function initShaders(shaders) {
        var fragmentShader = getShader(gl, shaders[0], 'fragment');
        var vertexShader   = getShader(gl, shaders[1], 'vertex');

        shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);

        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            // console.log(gl.LINK_STATUS)
            console.error('link error: ' + gl.getProgramInfoLog(shaderProgram));

            alert("Could not initialise shaders");
        }

        gl.useProgram(shaderProgram);

        shaderProgram.aPos = gl.getAttribLocation(shaderProgram, "a_pos");
        gl.enableVertexAttribArray(shaderProgram.aPos);

        shaderProgram.uTime = gl.getUniformLocation(shaderProgram, "u_time");

        // shaderProgram.uFB0 = gl.getUniformLocation(shaderProgram, "u_fb0");
        // shaderProgram.uFB1 = gl.getUniformLocation(shaderProgram, "u_fb1");
        // shaderProgram.uFB2 = gl.getUniformLocation(shaderProgram, "u_fb2");
        // shaderProgram.uFB3 = gl.getUniformLocation(shaderProgram, "u_fb3");
        shaderProgram.uTextures = gl.getUniformLocation(shaderProgram, "u_textures[0]");

        shaderProgram.rtc = gl.getUniformLocation(shaderProgram, "u_renderToCanvas");
    }

    /* 
        Helper function to flatten arrays
    */

    function flatten (array) {
        var flattened = [];
        for (var i = 0; i < array.length; i++) {
            if(Array.isArray(array[i])) {
                Array.prototype.push.apply(flattened, array[i]);
            } else {
                flattened.push(array[i]);
            }
        }

        return flattened;
    }

    /* 
        This function initializes the one buffer we will need - the vertex position buffer.
        Here we load
    */

    var frameBuffers   = [];
    var bufferTextures = [];
    function addFrameBuffer () {
        var rttFramebuffer;
        var rttTexture;

        rttFramebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, rttFramebuffer);
        rttFramebuffer.width = 512;
        rttFramebuffer.height = 512;

        frameBuffers.push(rttFramebuffer);

        rttTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, rttTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);

        bufferTextures.push(rttTexture);

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, rttFramebuffer.width, rttFramebuffer.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.generateMipmap(gl.TEXTURE_2D);

        var renderbuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, rttFramebuffer.width, rttFramebuffer.height);

        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, rttTexture, 0);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);

        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    /* 
        This function initializes the one buffer we will need - the vertex position buffer.
        Here we load
    */

    var posBuffer;
    function initBuffers() {
        var dotVerts = flatten([
            [0.0,  0.0,  0.0]
        ]);

        dotPosBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, dotPosBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(dotVerts), gl.STATIC_DRAW);
        dotPosBuffer.itemSize = 3;
        dotPosBuffer.numItems = dotVerts.length / 3;

        var quadVerts = flatten([
            [-1.0, -1.0,  0.0],
            [ 1.0, -1.0,  0.0],
            [-1.0,  1.0,  0.0],

            [ 1.0, -1.0,  0.0],
            [ 1.0,  1.0,  0.0],
            [-1.0,  1.0,  0.0],
        ]);

        quadPosBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quadPosBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(quadVerts), gl.STATIC_DRAW);
        quadPosBuffer.itemSize = 3;
        quadPosBuffer.numItems = quadVerts.length / 3;
    }

    function renderToTexture(index) {
        /* Bind current frame buffer before rendering */
        gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers[index]);

        /* Set rendering width and height to that of frameBuffer */
        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        /* Bind the pos of the point */
        gl.bindBuffer(gl.ARRAY_BUFFER, dotPosBuffer);
        gl.vertexAttribPointer(shaderProgram.aPos, dotPosBuffer.itemSize, gl.FLOAT, false, 0, 0);

        /* Set u_time and u_renderToCanvas uniforms */
        gl.uniform1f(shaderProgram.uTime, (Date.now() * 0.002) % 2 * Math.PI);
        gl.uniform1f(shaderProgram.rtc, 0);

        /* Render to texture */
        gl.drawArrays(gl.POINTS, 0, dotPosBuffer.numItems);

        gl.bindTexture(gl.TEXTURE_2D, bufferTextures[index]);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    function renderToCanvas(index) {
        /* Unbind framebuffer to render to canvas */
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        /* Reset rendering with and height to that of the canvas */
        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        /* Bind position of full-screen quad */
        gl.bindBuffer(gl.ARRAY_BUFFER, quadPosBuffer);
        gl.vertexAttribPointer(shaderProgram.aPos, quadPosBuffer.itemSize, gl.FLOAT, false, 0, 0);

        /* Set uniform to declare we are drawing to canvas */
        gl.uniform1f(shaderProgram.rtc, 1);

        /* Bind the drawn-to texture */
        var i = history;
        while(i--) {
            var tIndex = (i + index) % history;

            gl.activeTexture(gl['TEXTURE' + i]);
            gl.bindTexture(gl.TEXTURE_2D, bufferTextures[i]);
        }

        gl.uniform1iv(shaderProgram.uTextures, [
            index,
            (index + 1) % history,
            (index + 2) % history,
            (index + 3) % history
        ]);

        /* Draw to canvas */
        gl.drawArrays(gl.TRIANGLES, 0, quadPosBuffer.numItems)
    }

    function webGLStart(shaders) {
        context = getContext();
        
        for (var i = 0; i < history; i++) addFrameBuffer();

        initShaders(shaders);
        initBuffers();

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.viewport  (0.0, 0.0, gl.viewportWidth, gl.viewportHeight);

        gl.enable(gl.DEPTH_TEST);

        tick();
    }

    function loadShaders(urls, cb) {
        var i       = urls.length,
            shaders = [],
            loaded  = 0;

        while(i--) {
            var responseObj = {};

            var request = new XMLHttpRequest();
            request.open('GET', urls[i]);
            request.onreadystatechange = function(response){
                if(response.currentTarget.readyState === 4) {
                    shaders[this] = response.currentTarget.responseText;
                    if(++loaded === 2) cb(shaders);
                }
            }.bind(i)
            request.send();
        }
    }

    var history = 4;
    var index   = 0;
    function tick () {
        requestAnimationFrame(tick);

        index = ++index % history;

        renderToTexture(index);
        renderToCanvas(index);
    }

    loadShaders([
        "assets/shaders/fragmentShader.glsl",
        "assets/shaders/vertexShader.glsl"
    ], webGLStart);
});
