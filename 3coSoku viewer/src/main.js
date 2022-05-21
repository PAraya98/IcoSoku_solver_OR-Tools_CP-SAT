/*import * as THREE from '../vendor/three/build/three.module.js';
import { OrbitControls } from '../vendor/three/examples/jsm/controls/OrbitControls.js';
import { LineMaterial } from '../vendor/three/examples/jsm/lines/LineMaterial.js';
import { WireframeGeometry2 } from '../vendor/three/examples/jsm/lines/WireframeGeometry2.js';
import { Wireframe } from '../vendor/three/examples/jsm/lines/Wireframe.js';*/

// MATERIALS, COLORS
const playingfieldmaterial = new THREE.MeshLambertMaterial( { color: 0xffffb2 } );
const tilematerial = new THREE.MeshLambertMaterial( { color: 0xe5e5e5 } );
const linematerial = new LineMaterial( { color: 0x000000, linewidth: 2 } );
const backgroundcolor = new THREE.Color( 0xffffff );
const matcapacities = new THREE.MeshBasicMaterial( { color: 0x000000, side: THREE.DoubleSide } );
const matweights = new THREE.MeshBasicMaterial( { color: 0x333333, side: THREE.DoubleSide } );

// CONSTANTS
const mindistance = 6;  // OrbitControls min camera distance
const maxdistance = 40; // and max camera distance
const tileshrinkage = 0.8; // ratio between the size of the tiles and the faces
const magic_shrinktriangle = 1.01;  // to place the tiles ABOVE the faces
const magic_wireframe = 1.002;      // to draw the wireframe ABOVE the icosahedron
const magic_wireframetile = 1.001;  // to draw the wireframe AROUND the tiles

// ICOSOKU
const vertices = 12;
const faces = 20;
const input_cap = [1,2,8,12,10,11,6,3,7,4,5,9]; // initial instance

const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"; // alphabet for the naming of the vertices

/* the solution is modeled by arrays tile and rot: tile[f] = t if the t-th tile
 * is placed on the (f+1)-th face, and rot[t] = r if the (t+1)-th tile is rotated
 * by r*120° before being placed on the corresponding normalized face
 * (the faces where the first vertex involved is least lexicographically, so it
 * depends on vertexperm!) */

const tile = [2, 13, 1, 19, 3, 9, 6, 15, 14, 16, 20, 4, 17, 12, 18, 7, 8, 10, 5, 11];
const rot = [2, 0, 0, 1, 2, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 0, 2, 0];

// SCENE
const scene = new THREE.Scene();
scene.background = backgroundcolor;

let geometry, material;
let soluciones = [];
// the icosahedron, i.e. the playing field
geometry = new THREE.IcosahedronGeometry( 3 );
material = playingfieldmaterial;
const playingfield = new THREE.Mesh( geometry, material );
// rotate the icosahedron (or any given mesh) to its initial configuration
function icorotate ( mesh ) {
	mesh.geometry.rotateX( - Math.PI / 3.085 );
	mesh.updateMatrix();
}
icorotate( playingfield );
scene.add( playingfield );

// playingfield's BufferGeometry buffer, needed to find its faces and vertices
const pfpos = playingfield.geometry.getAttribute( 'position' );
// find the vertices of the icosahedron (THREE.Vector3) using its buffer
const playingfieldvertices = [];
for (let i = 0; i < pfpos.count; i++) {
	let v = new THREE.Vector3();
	v.fromBufferAttribute( pfpos, i );

	let flag = true;
	for (let j = 0; j < playingfieldvertices.length; j++) {
		if ( playingfieldvertices[j].equals( v ) ) {
			flag = false;
		}
	}

	if ( flag ) {
		playingfieldvertices.push( v );
	}
}

// the icosahedron's wireframe
material = linematerial;
geometry = new WireframeGeometry2( playingfield.geometry );
const wireframe = new Wireframe( geometry, material );
wireframe.computeLineDistances();
wireframe.scale.set( magic_wireframe, magic_wireframe, magic_wireframe );
linematerial.resolution.set( window.innerWidth, window.innerHeight );
scene.add( wireframe );

/* since the vertices and faces of the playingfield's geometry do not correspond
 * to our naming's order, we need the permutation telling us how to convert the
 * i-th vertex/face in our naming to the i-th vertex/face of the playing field
 * and viceversa */

const icovertexperm = [1, 0, 2, 3, 6, 7, 5, 4, 10, 11, 8, 9];
const icofaceperm = [0, 1, 5, 15, 6, 16, 7, 4, 3, 2, 19, 9, 14, 10, 11, 17, 8, 18, 13, 12];



// vertexperm[i] is the index of the (i-1)-th vertex in playingfield's geometry
const vertexperm = icovertexperm;
// icofaceperm[i] is the index of the (i-1)-th face in playingfield's geometry
const faceperm = icofaceperm;

const meshes_cap = [];       // capacity of the vertices
const meshes_tiles = [];     // triangular tiles
const wireframes_tiles = []; // wireframes of the tiles
const meshes_weights = [];   // the weights of each tile

// the hemisphere light
const light = new THREE.HemisphereLight( 0xffffff, 0xcccccc, 1 );
light.position.x = 1;
light.position.y = 1;
scene.add( light );

// CAMERA and Orbitcontrols.js
const camera = new THREE.PerspectiveCamera( 25, window.innerWidth / window.innerHeight, 1, 50 );
// fov is constant but we move the camera just as far as to see the whole thing
if ( window.innerWidth > window.innerHeight ) {
	const dist = (3.75) / Math.tan( (camera.fov / 2) * Math.PI / 180 );
	camera.position.set( 0, 0, dist );
} else {
	const hfov = Math.atan( camera.aspect * Math.tan( camera.fov * Math.PI / 360 ) ) * 360 / Math.PI;
	const dist = (3.5) / Math.tan( (hfov / 2) * Math.PI / 180 );
	camera.position.set( 0, 0, dist );
}
camera.lookAt( 0, 0, 0 );

// RENDERER
let renderer, controls;  // replaced when we change the resolution
let needToRender = true; // global flag used to indicate if we want to refresh

function renderer_init( config ) {
	renderer = new THREE.WebGLRenderer( { antialias: config.antialias, autoSize: true } );
	renderer.setPixelRatio( config.pixelratio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild( renderer.domElement );

	controls = new OrbitControls( camera, renderer.domElement );
	controls.enablePan = false;
	controls.enableDamping = true;
	controls.update();
	controls.autoRotate = config.autorotate; // checks the GUI

	controls.minDistance = mindistance;
	controls.maxDistance = maxdistance;
	controls.addEventListener( 'change', function () { needToRender = true; } );
}
renderer_init( { antialias: true, pixelratio: window.devicePixelRatio, autorotate: false } );

// create the capacities of the vertices
let namingmode = false; // false -> instance capacities, true -> vertex names
//drawcapacities( input_cap ); // this is moved to AFTER we have loaded the font

// help vectors
const cameraposition = new THREE.Vector3(); // current position of the camera
const cameraup = new THREE.Vector3();       // current up vector of the camera

const stats = new Stats(); // will be appended to the document if needed
function animate() {
	stats.begin();
	controls.update();

	// rendering on demand
	if ( needToRender ) {
		// A. make all the numbers look at the camera
		cameraup.set(0, 1, 0)
		camera.getWorldPosition( cameraposition );
		cameraup.applyQuaternion( camera.quaternion );

		for (let i = 0; i < vertices; i++) {
			if ( typeof meshes_cap[i] !== 'undefined' ) {
				meshes_cap[i].up.copy( cameraup );
				meshes_cap[i].lookAt( cameraposition );
			}
		}
		for (let i = 0; i < faces; i++) {
			if ( typeof meshes_weights[i] === 'object' ) {
				for (let j = 0; j < 3; j++) {
					if ( typeof meshes_weights[i][j] !== 'undefined' ) {
						meshes_weights[i][j].up.copy( cameraup );
						meshes_weights[i][j].lookAt( cameraposition );
					}
				}
			}
		}

		// B. Render the scene
		renderer.render( scene, camera );
		needToRender = false;
	}
	stats.end();

	requestAnimationFrame( animate );
}

let font = new THREE.Font( myfont );
drawcapacities();
animate();

// EVENTS
window.addEventListener( 'resize', onWindowResize, false );
window.addEventListener( 'onfocusin', function () { needToRender = true; }, false );

// AUXILIARY FUNCTIONS
/* uncovertile covers the (i+1)-th face of the playingfield ((i+1)-th according
 * to its BufferGeometry) with the corresponding tile, looking at the solution
 * defined by arrays tile and rot */
function uncovertile( i ) {
	// if the face is already occupied, do nothing
	if ( typeof meshes_tiles[i] !== 'undefined' ) {
		return;
	}

	// the tile of the playingfield's BufferGeometry
	const tr = new THREE.Triangle( new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3() );
	tr.a.fromBufferAttribute( pfpos, 3 * i + 0 );
	tr.b.fromBufferAttribute( pfpos, 3 * i + 1 );
	tr.c.fromBufferAttribute( pfpos, 3 * i + 2 );

	// the indices of the vertices in playingfield's BufferGeometry
	const trindex = [
		equalsIndexOf( playingfieldvertices, tr.a ),
		equalsIndexOf( playingfieldvertices, tr.b ),
		equalsIndexOf( playingfieldvertices, tr.c ),
	];

	shrinktriangle( tr, tileshrinkage );
	tr.a.multiplyScalar( magic_shrinktriangle );
	tr.b.multiplyScalar( magic_shrinktriangle );
	tr.c.multiplyScalar( magic_shrinktriangle );

	// the midpoint of the tile
	const mid = new THREE.Vector3();
	tr.getMidpoint( mid );

	// A. add the tile and its wireframe
	geometry = new THREE.BufferGeometry();
	const vertices = new Float32Array( [
		tr.a.x, tr.a.y, tr.a.z,
		tr.b.x, tr.b.y, tr.b.z,
		tr.c.x, tr.c.y, tr.c.z,
	] );
	geometry.setAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
	geometry.computeVertexNormals();
	material = tilematerial;
	meshes_tiles[i] = new THREE.Mesh( geometry, material );
	scene.add( meshes_tiles[i] );

	geometry = new WireframeGeometry2( meshes_tiles[i].geometry );
	material = linematerial;
	wireframes_tiles[i] = new Wireframe( geometry, material );
	wireframes_tiles[i].computeLineDistances();
	wireframes_tiles[i].scale.set( magic_wireframetile, magic_wireframetile, magic_wireframetile );
	if ( panesettingsparams.wireframe === true ) { // check if the wireframe is on or off
		scene.add( wireframes_tiles[i] );
	}

	// B. add the tile's weights
	meshes_weights[i] = [];
	// v contains the three vertices (THREE.Vertex3) of the (i+1)-th face
	const v = [tr.a, tr.b, tr.c];

	// face is the index (starting from zero) of the (i+1)-th face of
	// playingfield's geometry according to the order of the naming
	let face = faceperm.indexOf( i );

	var w = [0,1,2]
	for (let j = 0; j < 3; j++) {
		// icosahedrongeometry -> IcoSoKu
		const weight = soluciones[face][j];
		w[j] = weight
		const shape = font.generateShapes( weight+"", 0.3 );
		const geometry = new THREE.ShapeBufferGeometry( shape );
		geometry.computeBoundingBox();
		geometry.center();

		meshes_weights[i][j] = new THREE.Mesh( geometry, matweights );
		meshes_weights[i][j].position.copy( v[j] );

		// direction towards the center of the triangle
		const dir = new THREE.Vector3();
		dir.copy( v[j] );
		dir.sub( mid );
		dir.multiplyScalar( 0.4 );

		meshes_weights[i][j].position.sub( dir );
		meshes_weights[i][j].position.multiplyScalar( 1.1 );

		scene.add( meshes_weights[i][j] );
	}
	console.log(alpha.charAt(vertexperm.indexOf(trindex[0])), alpha.charAt(vertexperm.indexOf(trindex[1])), alpha.charAt(vertexperm.indexOf(trindex[2])),w[0], w[1], w[2], "Tile: ", face)
	needToRender = true;
}

/* drawvertexnames and drawcapacities create the 3D text near each vertex of
 * the playing field corresponding to its name or its capacity, respectively */
function drawvertexnames() {
	const xaxis = new THREE.Vector3(1, 0, 0);

	for (let i = 0; i < vertices; i++) {
		const v = vertexperm[i];
		const shape = font.generateShapes(alpha.charAt(i), 0.5 );
		const geometry = new THREE.ShapeBufferGeometry( shape );
		geometry.computeBoundingBox();
		geometry.center();
		meshes_cap[i] = new THREE.Mesh( geometry, matcapacities );
		meshes_cap[i].position.copy( playingfieldvertices[v] );
		meshes_cap[i].position.multiplyScalar( 1.1 );
	}

	for (let i = 0; i < 12; i++) {
		scene.add(meshes_cap[i]);
	}

	needToRender = true;
}
function drawcapacities() {
	const xaxis = new THREE.Vector3(1, 0, 0);

	for (let i = 0; i < vertices; i++) {
		const v = vertexperm[i];
		const shape = font.generateShapes( "" + input_cap[i], 0.5 );
		const geometry = new THREE.ShapeBufferGeometry( shape );
		geometry.computeBoundingBox();
		geometry.center();
		meshes_cap[i] = new THREE.Mesh( geometry, matcapacities );
		meshes_cap[i].quaternion.copy( playingfield.quaternion );
		meshes_cap[i].position.copy( playingfieldvertices[v] );
		meshes_cap[i].position.multiplyScalar( 1.1 );
	}

	for (let i = 0; i < 12; i++) {
		scene.add(meshes_cap[i]);
	}

	needToRender = true;
}

/* togglevertexnaming switches the vertex names with the capacities of the
 * current instance and viceversa */
function togglevertexnaming() {
	clearvertices();
	if ( namingmode ) {
		drawcapacities( input_cap );
	} else {
		drawvertexnames();
	}

	namingmode = !namingmode;
}

/* shrinktriangle shrinks a given triangle t multiplying its size by the given
 * factor p, while keeping its midpoint and orientation in space */
function shrinktriangle( t, p ) {
	const m = new THREE.Vector3();
	t.getMidpoint( m );
	let dir;

	dir = t.a.clone();
	dir.sub( m );
	dir.multiplyScalar( 1 - p );
	t.a.sub( dir );

	dir = t.b.clone();
	dir.sub( m );
	dir.multiplyScalar( 1 - p );
	t.b.sub( dir );

	dir = t.c.clone();
	dir.sub( m );
	dir.multiplyScalar( 1 - p );
	t.c.sub( dir );
}

function equalsIndexOf( array, object ) {
	for (let i = 0; i < array.length; i++) {
		if ( array[i].equals( object ) ) {
			return i;
		}
	}
	return -1;
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
	linematerial.resolution.set( window.innerWidth, window.innerHeight );
	needToRender = true;
}

/* icorand creates and draws a random instance of IcoSoKu */
function icorand () {
	for (let i = 0; i < vertices; i++) {
		input_cap[i] = i + 1;
	}

	// Durstenfeld shuffle
	for (let i = input_cap.length - 1; i > 0; i--) {
		let j = Math.floor( Math.random() * (i + 1) );
		let t = input_cap[i];
		input_cap[i] = input_cap[j];
		input_cap[j] = t;
	}

	clearvertices();
	drawcapacities();
}

// cleartiles removes and disposes of the tile meshes, if they are defined
function cleartiles () {
	for (let i = 0; i < faces; i++) {
		if ( typeof meshes_tiles[i] == 'undefined' ) {
			continue;
		}

		scene.remove( meshes_tiles[i] );
		meshes_tiles[i].geometry.dispose();
		delete meshes_tiles[i];

		scene.remove( wireframes_tiles[i] );
		wireframes_tiles[i].geometry.dispose();
		delete wireframes_tiles[i];

		scene.remove( meshes_weights[i][0] );
		scene.remove( meshes_weights[i][1] );
		scene.remove( meshes_weights[i][2] );
		meshes_weights[i][0].geometry.dispose();
		meshes_weights[i][1].geometry.dispose();
		meshes_weights[i][2].geometry.dispose();
		delete meshes_weights[i];
	}

	needToRender = true;
}

// clearvertices removes and disposes of the vertex meshes, if they are defined
function clearvertices () {
	for (let i = 0; i < vertices; i++) {
		if ( typeof meshes_cap[i] == 'undefined' ) {
			continue;
		}

		scene.remove( meshes_cap[i] )
		meshes_cap[i].geometry.dispose();
		delete meshes_cap[i];
	}

	needToRender = true;
}

/* processoutput, given an attempted solution to the currenst instance of
 * the game, swaps this solution with the current one and draw the
 * corresponding tiles */
function processoutput() {
	cleartiles();

	for (let i = 0; i < faces; i++) {
		uncovertile( i );
	}
}

// GUI
const pane = new Tweakpane( { title: 'IcoSoKu visualisation tool' } );

// Tweakpane folder: Controls
const panecontrols = pane.addFolder( {
	title: 'Controls',
	expanded: true
} );
panecontrols.addButton( { title: 'Toggle vertex naming' } )
	.on( 'click', () => { togglevertexnaming(); } );

panecontrols.addButton( { title: 'Reset view' } )
	.on( 'click', () => {
		if ( window.innerWidth > window.innerHeight ) {
			const dist = (3.75) / Math.tan( (camera.fov / 2) * Math.PI / 180 );
			camera.position.set( 0, 0, dist );
		} else {
		const hfov = Math.atan( camera.aspect * Math.tan( camera.fov * Math.PI / 360 ) ) * 360 / Math.PI;
		const dist = (3.5) / Math.tan( (hfov / 2) * Math.PI / 180 );
		camera.position.set( 0, 0, dist );
		}

		camera.lookAt( 0, 0, 0 );
	} );

// Tweakpane subfolder: IcoSoKu Instance
const paneinput = panecontrols.addFolder( {
	title: 'IcoSoKu Instance',
	expanded: true
} );
paneinput.addButton( { title: 'Random instance' } )
	.on( 'click', () => {
		icorand();
		cleartiles(); 
		namingmode = false;
		console.log(input_cap)
	} );
const paneinputparams = { input: "1,2,3,4,5,6,7,8,9,10,11,12" };
paneinput.addInput( paneinputparams, 'input' );
paneinput.addButton( { title: 'Read input' } )
	.on( 'click', () => {
		cleartiles();
		if(paneinputparams.input.split(',').length == 12) processguiinput( paneinputparams.input );
		else alert("Se necesitan las 12 clavijas!")
	} );
// subfolder end

panecontrols.addButton( { title: 'Solve!' } )
	.on( 'click', () => {
		cleartiles();
		solve_ico_ortools(input_cap)
	} );

panecontrols.addButton( { title: 'Clear tiles' } )
	.on( 'click', () => {
		cleartiles();
	} );
// folder end

// Tweakpane folder: Clingo Output
const paneclingo = pane.addFolder( {
	title: 'Output',
	expanded: false
} );
const paneclingoparams = {
	output: ""
};
paneclingo.addMonitor( paneclingoparams, 'output', { multiline: true, lineCount: 5 } );
// folder end

// Tweakpane folder: Settings
const panesettings = pane.addFolder( {
	title: 'Settings',
	expanded: false,
} );
const panesettingsparams = {
	antialias: true,
	pxlratio: window.devicePixelRatio,
	wireframe: true,
	showmode: false,
	showfps: false,
	solid: {
		r: Math.round( playingfieldmaterial.color.r * 255 ),
		g: Math.round( playingfieldmaterial.color.g * 255 ),
		b: Math.round( playingfieldmaterial.color.b * 255 ),
	},
	tiles: {
		r: Math.round( tilematerial.color.r * 255 ),
		g: Math.round( tilematerial.color.g * 255 ),
		b: Math.round( tilematerial.color.b * 255 ),
	},
	lines: {
		r: Math.round( linematerial.color.r * 255 ),
		g: Math.round( linematerial.color.g * 255 ),
		b: Math.round( linematerial.color.b * 255 ),
	},
	bg: {
		r: Math.round( backgroundcolor.r * 255 ),
		g: Math.round( backgroundcolor.g * 255 ),
		b: Math.round( backgroundcolor.b * 255 ),
	},
	text1: {
		r: Math.round( matcapacities.color.r * 255 ),
		g: Math.round( matcapacities.color.g * 255 ),
		b: Math.round( matcapacities.color.b * 255 ),
	},
	text2: {
		r: Math.round( matweights.color.r * 255 ),
		g: Math.round( matweights.color.g * 255 ),
		b: Math.round( matweights.color.b * 255 ),
	}
};
// Tweakpane subfolder: Performance
const paneperformance = panesettings.addFolder( {
	title: 'Performance',
	expanded: true
} );
paneperformance.addInput( panesettingsparams, 'showfps' )
	.on( 'change', (ev) => {
		if ( ev.value ) {
			document.body.appendChild( stats.dom );
		} else {
			document.body.removeChild( stats.dom );
		}
	} );
paneperformance.addInput( panesettingsparams, 'antialias' )
	.on( 'change', (ev) => {
		document.body.removeChild( renderer.domElement );
		renderer.dispose();
		controls.dispose();

		renderer_init( {
			antialias: ev.value,
			pixelratio: panesettingsparams.pxlratio,
			autorotate: panesettingsparams.showmode
		} );

		needToRender = true;
	} );
paneperformance.addInput( panesettingsparams, 'pxlratio',
	{ step: 0.1, min: 0.1, max: window.devicePixelRatio * 2 } )
	.on( 'change', (ev) => {
		renderer.setPixelRatio( ev.value );
		needToRender = true;
	} );
paneperformance.addInput( panesettingsparams, 'wireframe' )
	.on( 'change', (ev) => {
		if ( ev.value === false ) {
			scene.remove( wireframe );
			for (let i = 0; i < faces; i++) {
				if ( typeof meshes_weights[i] == 'object' ) {
					scene.remove( wireframes_tiles[i] );
				}
			}
		} else {
			scene.add( wireframe );
			for (let i = 0; i < faces; i++) {
				if ( typeof meshes_weights[i] == 'object' ) {
					scene.add( wireframes_tiles[i] );
				}
			}
		}
		needToRender = true;
	} );
// end subfolder
// Tweakpane subfolder: Performance
const panecolors = panesettings.addFolder( {
	title: 'Colors',
	expanded: false
} );
panecolors.addInput( panesettingsparams, 'solid' )
	.on( 'change', (ev) => {
		playingfieldmaterial.color.setRGB(
			ev.value.r / 255,
			ev.value.g / 255,
			ev.value.b / 255 );
		playingfield.material.needsUpdate = true;
		needToRender = true;
	} );
panecolors.addInput( panesettingsparams, 'tiles' )
	.on( 'change', (ev) => {
		tilematerial.color.setRGB(
			ev.value.r / 255,
			ev.value.g / 255,
			ev.value.b / 255
		);
		tilematerial.needsUpdate = true;
		needToRender = true;
	} );
panecolors.addInput( panesettingsparams, 'bg' )
	.on( 'change', (ev) => {
		backgroundcolor.setRGB(
			ev.value.r / 255,
			ev.value.g / 255,
			ev.value.b / 255
		);
		needToRender = true;
	} );
panecolors.addInput( panesettingsparams, 'lines' )
	.on( 'change', (ev) => {
		linematerial.color.setRGB(
			ev.value.r / 255,
			ev.value.g / 255,
			ev.value.b / 255
		);
		needToRender = true;
	} );
panecolors.addSeparator();
panecolors.addInput( panesettingsparams, 'text1' )
	.on( 'change', (ev) => {
		matcapacities.color.setRGB(
			ev.value.r / 255,
			ev.value.g / 255,
			ev.value.b / 255
		);
		needToRender = true;
	} );
panecolors.addInput( panesettingsparams, 'text2' )
	.on( 'change', (ev) => {
		matweights.color.setRGB(
			ev.value.r / 255,
			ev.value.g / 255,
			ev.value.b / 255
		);
		needToRender = true;
	} );
// end subfolder 
const info = document.getElementById( "moreinfo" );
panesettings.addInput( panesettingsparams, 'showmode' )
	.on( 'change', (ev) => {
		controls.autoRotate = ev.value;
		if ( ev.value ) {
			info.style.visibility = 'hidden';
		} else {
			info.style.visibility= 'visible';
		}
	} );
// end folder

// GUI FUNCTIONS
/* processguiinput reads a string of the form [X,X,X,X,X,X,X,X,X,X,X,X]
 * corresponding to an instance of IcoSoKu and applies the specified instance
 * to the current game */
function processguiinput( input ) {
	// A. remove and dispose of the vertex capacity meshes
	clearvertices();

	// B. add the new capacity meshes
	// remove whitespace and parentheses
	input = input.replace( /[\[\]\ ]+/g, '' );
	const a = input.split( ',' );
	for (let i = 0; i < vertices; i++) {
		input_cap[i] = a[i];
	}

	drawcapacities();
}

function solve_ico_ortools(input_cap){
	let params = input_cap.toString()
	console.log(params)
	$.ajax({
			url: "http://127.0.0.1:4500/ico/" + params.toString() , 
			success: function(result){
			console.log(result.soluciones)	
			console.log(result.output)	
			// SE GRAFICA EL ICOSOKU
			if(!result.mensaje)
			{	soluciones = result.soluciones;
				paneclingoparams.output = result.output;
				processoutput();
			}
			else alert(result.mensaje)
		},
		error: function(err) {alert("Servidor no disponible.", err)}
		
	});
}