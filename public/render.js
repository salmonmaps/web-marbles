var map;

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 5000 );

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

var stats = new Stats();
stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild( stats.dom );

var controls = new THREE.OrbitControls( camera, renderer.domElement );
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.enableZoom = true;

var ambientLight = new THREE.AmbientLight( 0xb49090 );
scene.add( ambientLight );

var axesHelper = new THREE.AxesHelper( 3 );
scene.add( axesHelper );

//

light = new THREE.DirectionalLight( 0xffffff, 0.8 );
scene.add( light );
				
// Water
var waterGeometry = new THREE.PlaneBufferGeometry( 10000, 10000 );

water = new THREE.Water(
	waterGeometry,
	{
		textureWidth: 512,
		textureHeight: 512,
		waterNormals: new THREE.TextureLoader().load( "threejs/textures/waternormals.jpg", function ( texture ) {
			texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
		}),
		alpha: 1.0,
		sunDirection: light.position.clone().normalize(),
		sunColor: 0xffffff,
		waterColor: 0x001e0f,
		distortionScale:  3.7,
		fog: scene.fog !== undefined
	}
);

water.rotation.x = - Math.PI / 2;
water.position.y = -9
water.material.uniforms.size.value = 8;

scene.add( water );

// Skybox

var sky = new THREE.Sky();
sky.scale.setScalar( 10000 );
scene.add( sky );

var uniforms = sky.material.uniforms;

uniforms.turbidity.value = 10;
uniforms.rayleigh.value = 2;
uniforms.luminance.value = 1;
uniforms.mieCoefficient.value = 0.005;
uniforms.mieDirectionalG.value = 0.8;

var parameters = {
	distance: 4000,
	inclination: 0.25,
	azimuth: 0.205
};

var cubeCamera = new THREE.CubeCamera( 1, 20000, 256 );
cubeCamera.renderTarget.texture.minFilter = THREE.LinearMipMapLinearFilter;

function updateSun() {

	var theta = Math.PI * ( parameters.inclination - 0.5 );
	var phi = 2 * Math.PI * ( parameters.azimuth - 0.5 );

	light.position.x = parameters.distance * Math.cos( phi );
	light.position.y = parameters.distance * Math.sin( phi ) * Math.sin( theta );
	light.position.z = parameters.distance * Math.sin( phi ) * Math.cos( theta );

	sky.material.uniforms.sunPosition.value = light.position.copy( light.position );
	water.material.uniforms.sunDirection.value.copy( light.position ).normalize();

	cubeCamera.update( renderer, scene );

}

updateSun();

//

var uniforms = {
	time: { value: 1.0 }
};
var clock = new THREE.Clock();

//

/* var blueLight = new THREE.PointLight(0x0099ff);
scene.add( blueLight );
blueLight.position.x = 5;
blueLight.position.y = 70;
blueLight.position.z = 500;

var orangeLight = new THREE.PointLight(0xff9900);
scene.add( orangeLight );
orangeLight.position.x = 5;
orangeLight.position.y = 70;
orangeLight.position.z = -500; */

camera.position.x = 40;
camera.position.y = 80;
camera.position.z = 40;

camera.rotation.x = -.6;
camera.rotation.y = .3;
camera.rotation.z = 0;
controls.update();

var marbleMeshes = [];

function animate() {
	requestAnimationFrame( animate );
	
	// Update marble positions
	for (i = 0; i < marbleMeshes.length; i++){
		marbleMeshes[i].position.x = THREE.Math.lerp(marbleMeshes[i].position.x || 0, net.marblePositions[i*3+0], net.lastUpdate);
		marbleMeshes[i].position.y = THREE.Math.lerp(marbleMeshes[i].position.y || 0, net.marblePositions[i*3+2], net.lastUpdate);
		marbleMeshes[i].position.z = THREE.Math.lerp(marbleMeshes[i].position.z || 0, net.marblePositions[i*3+1], net.lastUpdate);
		
		
		marbleMeshes[i].quaternion.set(
			net.marbleRotations[i*3+0],
			net.marbleRotations[i*3+1],
			net.marbleRotations[i*3+2],
			net.marbleRotations[i*3+3]
		);
		marbleMeshes[i].quaternion.normalize();
	}
	
	if (net.lastUpdate < 1.5){
		net.lastUpdate += net.tickrate/60/net.ticksToLerp; //FPS assumed to be 60, replace with fps when possible, or better base it on real time.
	}
	

	// Update water material
	water.material.uniforms.time.value += 1.0 / 60.0;
	
	// Update stats in top left corner
	stats.update();

	var delta = clock.getDelta();

	uniforms.time.value += delta * 5;
	
	renderer.render( scene, camera );
}

var mapMesh;

// Stuff that can only be rendered after network data has been received
function renderInit(){ 
	for (i = 0; i < net.marblePositions.length/3; i++){
		spawnMarble(marbleData[i].tags);
	}
	
	/* var cubeGeometry = new THREE.BoxGeometry(.3, .3, .3);
	var red = new THREE.MeshStandardMaterial({ color: 0xff0000 });
	cube = new THREE.Mesh(cubeGeometry, red);	
	scene.add( cube ); */
	
	// var controls = new THREE.OrbitControls(camera, renderer.domElement);
	
	getXMLDoc("/client?dlmap=map2",(response)=>{
		
		var mapName = response.substr(0,response.lastIndexOf("."));
		
		console.log(mapName);
		var manager = new THREE.LoadingManager();
		manager.onProgress = function ( item, loaded, total ) {
			console.log( item, loaded, total );
		};
		
		var loader = new THREE.OBJLoader( manager );
		loader.load( "/resources/"+mapName+"_optimized.obj", function ( object ) {
			object.traverse( function ( child ) {
				if ( child.name.indexOf("Terrain") !== -1) {
					mapMesh = child;
					
					scene.add( child );
					
					child.setRotationFromEuler( new THREE.Euler( -Math.PI*.5, 0, Math.PI*.5, 'XYZ' ) );
					
					child.geometry.computeBoundingBox();
					child.geometry.center();
					child.material = createMapMaterial();
				}
			} );
		}, ()=>{}, ()=>{} );
	});
	
	animate();
}

function spawnMarble(tags){
	let size = tags.size;
	let color = tags.color;
	let name = tags.name;
	let useFancy = tags.useFancy;

	let fancyMaterial = new THREE.ShaderMaterial( {

		uniforms: uniforms,
		vertexShader: document.getElementById( 'vertexShader' ).textContent,
		fragmentShader: document.getElementById( 'fragmentShader' ).textContent

	} );
	
	let sphereGeometry = new THREE.SphereBufferGeometry(size,9,9);
	/* let sphereGeometry = new THREE.BoxGeometry(.2,.2,.2); */
	let materialColor = new THREE.Color(color);
	/* console.log(materialColor); */
	let sphereMaterial = new THREE.MeshStandardMaterial({ color: materialColor });
	let sphereMesh = new THREE.Mesh(sphereGeometry, (useFancy ? fancyMaterial : sphereMaterial));
	let nameSprite = makeTextSprite(name);
	marbleMeshes.push(sphereMesh);
	scene.add(marbleMeshes[marbleMeshes.length-1]);
	scene.add(nameSprite);
	nameSprite.parent = marbleMeshes[marbleMeshes.length-1];
}

var textures = {
	dirt: { url: 'threejs/textures/dirt.jpg' },
	dirtNormal: { url: 'threejs/textures/dirt_n.jpg' },
	grass: { url: 'threejs/textures/grasslight-big.jpg' },
	grassNormal: { url: 'threejs/textures/grasslight-big-nm.jpg' },
	mask: { url: 'threejs/textures/mask_alpha.png' }
};

function getTexture( name ) {
	var texture = textures[ name ].texture;
	if ( ! texture ) {
		texture = textures[ name ].texture = new THREE.TextureLoader().load( textures[ name ].url );
		texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
	}
	return texture;
}

function createMapMaterial(){
	var mtl;
	
	// MATERIAL
	mtl = new THREE.StandardNodeMaterial();
	mtl.roughness = new THREE.FloatNode( .9 );
	mtl.metalness = new THREE.FloatNode( 0 );
	
	function createUv(scale,offset){
		
		var uvOffset = new THREE.FloatNode( offset || 0 );
		var uvScale = new THREE.FloatNode( scale || 1 );
		
		var uvNode = new THREE.UVNode();
		var offsetNode = new THREE.OperatorNode(
			uvOffset,
			uvNode,
			THREE.OperatorNode.ADD
		);
		var scaleNode = new THREE.OperatorNode(
			offsetNode,
			uvScale,
			THREE.OperatorNode.MUL
		);
		
		return scaleNode;
	}
	
	var grass = new THREE.TextureNode( getTexture( "grass" ), createUv(35) );
	var dirt = new THREE.TextureNode( getTexture( "dirt" ), createUv(35) );
	var mask = new THREE.TextureNode( getTexture( "mask" ), createUv() );
	var maskAlphaChannel = new THREE.SwitchNode( mask, 'w' );
	var blend = new THREE.Math3Node(
		grass,
		dirt,
		maskAlphaChannel,
		THREE.Math3Node.MIX
	);
	mtl.color = blend;
	mtl.normal = new THREE.TextureNode( getTexture( "dirtNormal" ), createUv(35) );

	var normalScale = new THREE.FloatNode( 1 );
	var normalMask = new THREE.OperatorNode(
		new THREE.TextureNode( getTexture( "mask" ), createUv() ),
		normalScale,
		THREE.OperatorNode.MUL
	);
	
	mtl.normalScale = normalMask;
	
	// build shader
	mtl.build();
	
	// set material
	return mtl;
}

//

function makeTextSprite( message )
{
	var parameters = {};
	
	var fontface = "Courier New";
	var fontsize = 24;
		
	var canvas = document.createElement('canvas');
	var width = canvas.width = 256;
	var height = canvas.height = 64;
	var context = canvas.getContext('2d');
	context.font = "Bold " + fontsize + "px " + fontface;
	context.textAlign = "center"; 
    
	// get size data (height depends only on font size)
	var metrics = context.measureText( message );
	var textWidth = metrics.width;
	
	// text color
	context.fillStyle = "#ffffff";

	context.fillText(message, 128, fontsize);
	
	// canvas contents will be used for a texture
	var texture = new THREE.Texture(canvas) 
	texture.needsUpdate = true;
	var spriteMaterial = new THREE.SpriteMaterial({map: texture});
	var sprite = new THREE.Sprite( spriteMaterial );
	sprite.scale.set(4,1,1.0);
	return sprite;	
}