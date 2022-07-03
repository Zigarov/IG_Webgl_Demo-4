"use strict";

// Ambient Variables:
	var canvas;
	var gl;
	var program;

// Transformation Matrices:
	var projectionMatrix = ortho(-5.0,5.0,-5.0,5.0,-10,20);
	var modelViewMatrix;
  	var nMatrix;

// Uniform Variables:
	var modelViewMatrixLoc;
	var colorLoc;

// Camera Settings:
	var radius = 10.0;							        // 	Camera distance from Origin.
	var phi = [15,0];							        // 	[Angle between Y and XZ plane, (Z,X) Angle].
	const at = vec3(0.0, 0.0, 0.0); 	 				// 	Set where the camera is pointed in the object space.
	const up = vec3(0.0, 1.0, 0.0); 					// 	Set the up direction of the camera view.

	function eye(){								        
//	function that compute the camera coordinates.
		var Phi = [radians(phi[0]),radians(phi[1])];
		var eye = vec3(
			radius * Math.cos(Phi[0]) * Math.sin(Phi[1]),
			radius * Math.sin(Phi[0]),
			radius * Math.cos(Phi[0]) * Math.cos(Phi[1]),
		);
		return eye;
	}

//	Camera Rotarion Parameters:
	var flagCam = false;							// 	Flag to control the camera motion.
	var camPos = [0,0];							    // 	State variable to position of  the camera.
	var dPhi = [0,0];							    //	Camera angles increment.

// LIGHT:
	const lightPosition = vec4(5, 10, 10, 1.0);

//  GEOMETRY:
	var nVertices = 36;
	function cube() {
		var symbol = {
			Points: [],
			Normals: [],
			Tangents: [],
			Texture: []
	//		Colors: []
		};
	    quad( 1, 0, 3, 2 );
	    quad( 2, 3, 7, 6 );
	    quad( 3, 0, 4, 7 );
	    quad( 6, 5, 1, 2 );
	    quad( 4, 5, 6, 7 );
	    quad( 5, 4, 0, 1 );
		return symbol;

		function quad(a, b, c, d) {
			var vertices = [
				vec4( -0.5, -0.5,  0.5, 1.0 ),
				vec4( -0.5,  0.5,  0.5, 1.0 ),
				vec4( 0.5,  0.5,  0.5, 1.0 ),
				vec4( 0.5, -0.5,  0.5, 1.0 ),
				vec4( -0.5, -0.5, -0.5, 1.0 ),
				vec4( -0.5,  0.5, -0.5, 1.0 ),
				vec4( 0.5,  0.5, -0.5, 1.0 ),
				vec4( 0.5, -0.5, -0.5, 1.0 )
		];
			var texCoord = [
		  		vec2(0, 0),
		  		vec2(0, 1),
		  		vec2(1, 1),
		  		vec2(1, 0)
			];
			var quadIndex = [a,b,c, a,c,d];
			var texIndex = [0,1,2, 0,2,3];

			var t1 = subtract(vertices[b], vertices[a]);
			var t2 = subtract(vertices[c], vertices[b]);
			var normal = cross(t1, t2);
			normal = vec3(normal[0],normal[1],normal[2]);
			var tangent = vec3(t1[0],t1[1],t1[2]);

			for(var i = 0; i<6; i++){
				symbol.Points.push(vertices[quadIndex[i]]);
				symbol.Texture.push(texCoord[texIndex[i]]);
				symbol.Normals.push(normal);
				symbol.Tangents.push(tangent);
			}
		}
	}
	function vertexColors(color, n) {
		var colorsArray = []
		for(var i = 0; i<n; i++){
			colorsArray.push(color);
		}
		return colorsArray;
	}

// Texture Parameters:
	var textureColors = [
		vec4(0.5, 0.3, 0.2, 1.0),			// lightBrown
		vec4(0.5,0.3,0.2, 1.0), 			// brown
		vec4(0.4, 0.2, 0.1, 1.0),			// darkBrown
		vec4(0.0, 1.0, 0.0, 1.0),			// greenLand
		vec4(0.2, 0.8, 0.0, 1.0),			// greenHIll
		vec4(0.2, 0.6, 0.0, 1.0),			// greenH1
		vec4(0.2, 0.4, 0.0, 1.0),			// greenH2
	];
	var texSize = 64;

	function roughTextureMap(texSize){
	//  Bump Data:
	    var data = new Array()
	    for (var i = 0; i<= texSize; i++)  data[i] = new Array();
	    for (var i = 0; i<= texSize; i++) for (var j=0; j<=texSize; j++)
	        data[i][j] = Math.random();
	//  Bump Map Normals:
	    var normalst = new Array()
	    for (var i=0; i<texSize; i++)  normalst[i] = new Array();
	    for (var i=0; i<texSize; i++) for ( var j = 0; j < texSize; j++)
	        normalst[i][j] = new Array();
	    for (var i=0; i<texSize; i++) for ( var j = 0; j < texSize; j++) {
	        normalst[i][j][0] = data[i][j]-data[i+1][j];
	        normalst[i][j][1] = data[i][j]-data[i][j+1];
	        normalst[i][j][2] = 1;
		}
	// 	Scale to Texture Coordinates..
	    for (var i=0; i<texSize; i++) for (var j=0; j<texSize; j++) {
	        var d = 0;
	        for(k=0;k<3;k++) d+=normalst[i][j][k]*normalst[i][j][k];
	        d = Math.sqrt(d);
	        for(k=0;k<3;k++) normalst[i][j][k]= 0.5*normalst[i][j][k]/d + 0.5;
	    }
	    var normals = new Uint8Array(3*texSize*texSize);
	    for ( var i = 0; i < texSize; i++ ){
	        for ( var j = 0; j < texSize; j++ ) {
	              for(var k =0; k<3; k++){
	                  normals[3*texSize*i+3*j+k] = 255*normalst[i][j][k];
	              }
	        }
	    }
    	return normals;
	}

	function configureTexture(image, size) {
		var texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, size, size, 0, gl.RGB, gl.UNSIGNED_BYTE, image);
		gl.generateMipmap(gl.TEXTURE_2D);
		return texture;
	}

// 	Hierarchical Model:
	const nNodes = 20;
	var stack = [];
	var figure = [];

//  Nodes ID:
	const BODY = 0;
	const HEAD = 1;
	const TAIL = 2;
	const LEG_LAU = 3;
	const LEG_RAU = 4;
	const LEG_LPU = 5;
	const LEG_RPU = 6;
	const LEG_LAD = 7;
	const LEG_RAD = 8;
	const LEG_LPD = 9;
	const LEG_RPD = 10;
  const TAIL1 = 11;
  const TAIL2 = 12;
	const LAND = 13; 
	const HILL = 14;
	const HILL1 = 15;
	const HILL2 = 16;
	const NOSE = 17;
	const EAR_L = 18;
	const EAR_R = 19;     

//  Nodes Parameters:
//							[BODY,	HEAD,	TAIL,		LAU,		RAU,	LPU,	RPU,	LAD,	RAD,	LPD,	RPD,	T1,		T2,		LAND,	HILL,	H1,		H2		NOSE	EAR_L	EAR_R]
const l = 			[0.8,		0.2,	0.2,		0.1,		0.1,	0.16,	0.16,	.08,	.08,	0.3,	0.3,	.15,	0.2,	15,		5.0,	4.0,	3.0,	0.16,	0.2,	0.2];		// x
const h = 			[0.3,		0.2,	0.2,		0.3,		0.3,	0.5,	0.5,	0.2,	0.2,	.08,	.08,	0.3,	0.1,	0.2, 	1.0, 	0.8, 	0.6,	0.08, 0.03,	0.03];		// y
const w = 			[0.3,		0.15,	0.2,		0.1,		0.1,	0.1,	0.1,	.08,	.08,	.08,	.08,	.15,	0.15,	15,		5.0,	4.0,	3.0,	0.08,	0.05,	0.05]; 	// z
var theta = 		[0,			0, 		45, 			0, 			0, 		0, 		0, 		0, 		0, 	 15,   15, 		0, 		0,		0, 		0,		0, 		0,		30,		45,		45];		// alpha

var children =	[HEAD, EAR_L, TAIL1,	LEG_LAD, LEG_RAD, LEG_LPD, LEG_RPD,	null, null, null, null, TAIL2, null, HILL, HILL1, HILL2, null, null,  null];
var siblings =	[LAND, TAIL, LEG_LAU,	LEG_RAU, LEG_LPU, LEG_RPU, null, 		null, null, null, null, null,  null, null, null, 	null,	 null, EAR_R, NOSE];
var colors = [0, 1, 2, 1, 1, 1, 1, 2, 2, 2, 2, 0, 1, 3, 4, 5, 6, 2, 2, 2];

const root = vec3(0, 2.9, 0);		// Center point of the Sheep body, where the translation is computed.




var roots = [										// All the centers relative distances.
	vec3(root[0], root[1], root[2]),
	vec3(0.4, 0.15, 0.0),
	vec3(-0.4, 0.0, 0.0),
	vec3(0.3, -0.25, -0.15),
	vec3(0.3, -0.25, 0.15),
	vec3(-0.3, -0.3, -0.15),
	vec3(-0.3, -0.3, 0.15),
	vec3(0.0, -0.22, 0.0),
	vec3(0.0, -0.22, 0.0),
	vec3(0.14, -.20, 0.0),
	vec3(0.14, -.20, 0.0),
	vec3(0.0, -0.25, 0.0),
	vec3(-.1,-0.1, 0.0),
	vec3(0.0, -0.1, 0.0),
	vec3(0.0, 0.5, 0.0),
	vec3(0.0, 0.9, 0.0),
	vec3(0.0, 0.7, 0.0),
	vec3(0.15,-.06, 0.0),
	vec3(-.06, .08, 0.1),
	vec3(-.06, .08, -0.1),
];

	function createNode(Id){								// Create a node of the hierarchical model.
		var node = {
			id: Id,
		   	transform: null,
			child: children[Id],
			sibling: siblings[Id],
			render: function(){
// 				Scale ModelViewMatrix..
				var m = scale(l[Id],h[Id],w[Id]);
				m = mult(modelViewMatrix, m);
				gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(m));

//				Link the color..
				gl.uniform4fv(colorLoc, textureColors[colors[Id]]);

//				Draw..
				if (Id == HEAD){
					gl.drawArrays(gl.TRIANGLES, 0, 6);
					gl.uniform4fv(colorLoc, textureColors[1]);
					gl.uniform1i( gl.getUniformLocation(program, "uTextureMap"), 1);
					gl.uniform1i( gl.getUniformLocation(program, "uBump"), false);
					gl.drawArrays(gl.TRIANGLES, 6, 6);
					gl.uniform4fv(colorLoc, textureColors[colors[Id]]);
					// gl.activeTexture(gl.TEXTURE0);
					gl.uniform1i( gl.getUniformLocation(program, "uTextureMap"), 0);
					gl.uniform1i( gl.getUniformLocation(program, "uBump"), true);
					gl.drawArrays(gl.TRIANGLES, 12, 24);
				}
				if ((Id >= LAND)&&(Id<=HILL2)){
					// gl.activeTexture(gl.TEXTURE2);
					gl.uniform1i( gl.getUniformLocation(program, "uTextureMap"), 2);
					gl.uniform1i( gl.getUniformLocation(program, "uBump"), true);
					gl.drawArrays(gl.TRIANGLES, 0, nVertices);
					// gl.activeTexture(gl.TEXTURE0);
					// gl.uniform1i( gl.getUniformLocation(program, "uTextureMap"), 0);
				}
				else {
					gl.uniform1i( gl.getUniformLocation(program, "uTextureMap"), 0);
					gl.uniform1i( gl.getUniformLocation(program, "uBump"), true);
					gl.drawArrays(gl.TRIANGLES, 0, nVertices);
				} 
				
			},
	    }
	    return node;
	}
	function transformNode(ID) {
// 	Compute the current transformation Matrix for ID node.
		var m = translate(roots[ID][0]+joints[ID][0],roots[ID][1]+joints[ID][1],roots[ID][2]+joints[ID][2]);
		switch(ID) {
			case BODY:
				m = mult(m,rotate(theta[ID],vec3(0,1,0)))
				break;
			default:
				m = mult(m, rotate(theta[ID], vec3(0,0,1)))
		}
		m = mult(m, translate(-joints[ID][0],-joints[ID][1],-joints[ID][2]))
		figure[ID].transform = m;
	}
	function traverse(Id) {								// Traverse the tree structure.
	   if(Id == null) return;
	   stack.push(modelViewMatrix);
	   modelViewMatrix = mult(modelViewMatrix, figure[Id].transform);
	   figure[Id].render();
	   if(figure[Id].child != null) traverse(figure[Id].child);
	   modelViewMatrix = stack.pop();
	   if(figure[Id].sibling != null) traverse(figure[Id].sibling);
	}

// 	Animation Parameters:
	var animation = false;								// Flag to control the START/STOP of the animation.
	var t = 0;
	var joints = [];
	var nextKF = [];
	var nextKeyFrame = 1;
	var dTheta = [];
	const T   	= 1000.0        	// Number of frames for a single round.
	const nHops = 12           		// Number of Hops in a round.
	const lHop  = 1.0          		// Lenght of a single Hop.
	const hHop  = 0.5         		// Height of a single Hop.
	const THop 	= T/(nHops*lHop)	// Number of frames for a single hop

	function set_joint(i){
		// Set the joints:
		switch(i) {
			case LEG_LAU:
				joints.push(vec3(0.0,0.1,0.0))
				break;
			case LEG_RAU:
				joints.push(vec3(0.0,0.1,0.0))
				break;
			case LEG_LPU:
				joints.push(vec3(0.0,0.15,0.0))
				break;

			case LEG_RPU:
			joints.push(vec3(0.0,0.15,0.0))
				break;

			case LEG_RPD:
				joints.push(vec3(-0.15, 0.04, 0.0))
				break;
			case LEG_LPD:
				joints.push(vec3(-0.15, 0.04, 0.0))
				break;
			case TAIL2:
				joints.push(vec3(0.1,0.05, 0.0))
			default:
				joints.push(vec3(0.0,0.0,0.0))
		}
	}
	var times = [0, 10, 20, 30, 40]
	var keyTheta = [
		[0.6, 0.1+0.6, 0.5+0.6, 0.1+0.6, 0+0.6],
		[0, 0, 0, 0, 0],
		[15, 45, 60, 60, 15],
		[-15, 0, 15, 0, -15],
		[-15, 0, 15, 0, -15],
		[0, 30, 15, -15, 0],
		[0, 30, 15, -15, 0],	// [-15, 30, 0, -15, -15],	// [30, 45 , 0, -15,  30],
		[0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0],
		[15, 45, 45, 30, 0],
		[15, 45, 45, 30, 0],	// [0, 60, 45, 30, 0],
		[0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0],
	];	
						
	function delta(id) {							
		return (keyTheta[id][nextKF[id]] - keyTheta[id][nextKF[id]-1]) * (1/(THop/(keyTheta[id].length)))
	}
	function deltas(key) {		
		for (var id = 0; id<nNodes; id++) {
			if(id > 0){
				dTheta[id] = (keyTheta[id][key] - theta[id]) / (times[key]-times[key-1]) 
			}
			else{ 
				dTheta[id] = (keyTheta[id][key] - roots[id][1]) / (times[key]-times[key-1]) 
			}
		}		
	}

//Animation:
	function hop() {
    const T   	= 1000.0        	// Number of frames for a single round.
    // const nHops = 12           		// Number of Hops in a round.
    // const lHop  = 1.0          		// Lenght of a single Hop.
    // const hHop  = 0.5         		// Height of a single Hop.
		// const THop 	= T/(nHops*lHop)	// Number of frames for a single hop
		const f = t/T
		const wt = (t/T) * 2 * Math.PI

//	Movement Around the Hill:
    roots[BODY][0] = 4*Math.sin(wt - Math.PI/2)
    // roots[BODY][1] = (root[1] + hHop) + hHop*Math.sin(wtH)
    roots[BODY][2] = 4*Math.cos(wt - Math.PI/2)

//  Hop Animation:		
		 theta[BODY] 		= - 360 * f + 90
		// theta[LEG_RPU] 	= 22.5 + 22.5 * Math.sin(wtH)
		// theta[LEG_LPU]	= 22.5 + 22.5 * Math.sin(wtH)
		// theta[TAIL] 		= 45 + 45 * Math.sin(wtH)
		// theta[TAIL2] 		= -22.5 + +22.5 * Math.cos(wtH)
		// theta[LEG_LAU] 	= 10 + 10 * Math.sin(wtH)
		// theta[LEG_RAU] 	= 10 + 10 * Math.sin(wtH)
		// theta[LEG_RPD] 	= 30 + 45 * Math.cos(wtH)
		// theta[LEG_LPD] 	= 22.5 + 7.5 * Math.cos(wtH)
		
    //		Update Nodes transformation matrices..
    for(var id=0; id<nNodes; id++) {
			// var current;
			if (id==BODY){
				roots[id][1] += dTheta[id]
				// current = roots[id][1]
			}
			else {
				theta[id] += dTheta[id]
				// current = theta[id]
			}

			// if (((current - keyTheta[id][nextKF[id]])*dTheta[id])>0) {
			// 	nextKF[id] = (nextKF[id]<=keyTheta[id].length-2) ? nextKF[id]+1 : 1
			// 	// dTheta[id] = delta(id)
			// }

      transformNode(id);
    }

		if(((roots[0][1] - keyTheta[0][nextKeyFrame]) * dTheta[0]) > 0 ){
			nextKeyFrame = (nextKeyFrame < times.length-1) ? nextKeyFrame+1 : 1
			deltas(nextKeyFrame)
		}

		if(f>=1){
			animation = false;
			t = 0;
		}
		else {
			t++;
		}
	}

window.onload = function init() {
//  Inizialization..
    canvas = document.getElementById("gl-canvas");
    gl = canvas.getContext('webgl2');
    if (!gl) { alert( "WebGL 2.0 isn't available");}
    gl.viewport( 0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.enable(gl.DEPTH_TEST);

//	Load Shaders..
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

// 	Set the Camera..
	modelViewMatrix = lookAt(eye(),at,up);

//	Initialize Uniform/Attribute Variables..
	modelViewMatrixLoc = gl.getUniformLocation(program, "uModelViewMatrix");
	colorLoc = gl.getUniformLocation(program, "uColor");
	gl.uniformMatrix4fv(gl.getUniformLocation( program, "uProjectionMatrix"), false, flatten(projectionMatrix));
	gl.uniform4fv(gl.getUniformLocation( program, "uLightPosition"), lightPosition);

// 	Initialize buffers..
	var myCube = cube();
	initBuffers();

//Configure Textures:
	var textures = []
	textures.push(configureTexture(roughTextureMap(texSize), texSize))
	textures.push(configureTexture(document.getElementById("texImage"), 64))
	textures.push(configureTexture(roughTextureMap(texSize*8), texSize*8))

// Bind Textures:
	for (var i =0; i<3; i++){
		gl.activeTexture(gl.TEXTURE0 + i)
		gl.bindTexture(gl.TEXTURE_2D, textures[i])
	}

// 	Configure the scene..
  for(var i=0; i<nNodes; i++) {
		set_joint(i)
		nextKF.push(1)
		// dTheta.push(delta(i))
		dTheta.push(keyTheta[i][1] - keyTheta[i][0]) * (times[1]-times[0]) 
		figure[i] = createNode(i);
		transformNode(i);
	}
	// deltas(nextKeyFrame)

// 	Configure Interactions:
	initInteractions();

//	Draw the scene..
    render();

	function render() {
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
//	Update Camera Position..
		if (flagCam){
			phi[0] += dPhi[0];
			phi[1] += dPhi[1];
		}
		modelViewMatrix = lookAt(eye(),at,up);

//	Animation..:
		if (animation) {
			// step();
			hop();
		}

//	Update Matrices..
		gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
		nMatrix = normalMatrix(modelViewMatrix, true);
		gl.uniformMatrix3fv( gl.getUniformLocation(program, "uNormalMatrix"), false, flatten(nMatrix));

//		Draw the scene..
		traverse(BODY);

		requestAnimationFrame(render);
	}

	function initBuffers(){
// 		VerticesBuffers:
		var vBuffer = gl.createBuffer();
		gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, flatten(myCube.Points), gl.STATIC_DRAW);

		var positionLoc = gl.getAttribLocation(program, "aPosition");
		gl.vertexAttribPointer( positionLoc, 4, gl.FLOAT, false, 0, 0 );
		gl.enableVertexAttribArray( positionLoc );

//		NormalsBuffer:
		var nBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, flatten(myCube.Normals), gl.STATIC_DRAW);

		var normalLoc = gl.getAttribLocation(program, "aNormal");
		gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(normalLoc);

//		TangentsBuffer:
		var tBuffer = gl.createBuffer();
		gl.bindBuffer( gl.ARRAY_BUFFER, tBuffer);
		gl.bufferData( gl.ARRAY_BUFFER, flatten(myCube.Tangents), gl.STATIC_DRAW);

		var tangentLoc = gl.getAttribLocation( program, "aTangent");
		gl.vertexAttribPointer(tangentLoc, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(tangentLoc);

// 		TextureBuffer:
		var texBuffer = gl.createBuffer();
		gl.bindBuffer( gl.ARRAY_BUFFER, texBuffer);
		gl.bufferData( gl.ARRAY_BUFFER, flatten(myCube.Texture), gl.STATIC_DRAW);

		var texCoordLoc = gl.getAttribLocation( program, "aTexCoord");
		gl.vertexAttribPointer( texCoordLoc, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(texCoordLoc);
	}

	function initInteractions() {
		document.getElementById("Animation").onclick = function() {animation = !animation;};

		document.getElementById("radius").onchange = function(event) {radius = event.target.value;}

		document.getElementById("buttonL").onmouseup =  function() { flagCam = false;};
		document.getElementById("buttonL").onmousedown = function() { flagCam = true; dPhi = [0,-1]};

		document.getElementById("buttonR").onmouseup =  function() {flagCam = false;}
		document.getElementById("buttonR").onmousedown =  function() {flagCam = true; dPhi = [0,+1]};

		document.getElementById("buttonU").onmouseup =  function() {flagCam = false;}
		document.getElementById("buttonU").onmousedown =  function() {flagCam = true; dPhi = [1,0]};

		document.getElementById("buttonD").onmouseup =  function() { flagCam = false;}
		document.getElementById("buttonD").onmousedown =  function() {flagCam = true; dPhi = [-1,0]};

		canvas.addEventListener("mousedown",
			function(event) {
				var x = 2*event.clientX/canvas.width-1;
				var y = 2*(canvas.height-event.clientY)/canvas.height-1;
				flagCam = true;
				camPos = [x,y];
			}
		);
		canvas.addEventListener("mouseup",
			function(event){
				flagCam = false;
				
			}
		);
		canvas.addEventListener("mousemove",
			function(event){
				var x = 2*event.clientX/canvas.width-1;
				var y = 2*(canvas.height-event.clientY)/canvas.height-1;
				if (flagCam) {
					dPhi[1] = 45*(x - camPos[0]);
					dPhi[0] = 45*(y - camPos[1]);
					camPos = [x,y];
				}
			}
		);
	}
}
