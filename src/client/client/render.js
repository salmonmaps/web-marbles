import * as THREE from "three";
import "three/examples/js/objects/Water";
import "three/examples/js/objects/Sky";
import "three/examples/js/loaders/LoaderSupport";
import "three/examples/js/loaders/OBJLoader";
import "three/examples/js/nodes/THREE.Nodes";
import * as Stats from "stats-js";
import * as config from "../config";
import { net as networking } from "./networking";
import { CameraFlyControls } from "../cameras";

let viewport, camera, renderer, stats, controls,
	scene = new THREE.Scene();

function init() {
	viewport = document.getElementById("viewport");
	camera = new THREE.PerspectiveCamera(75, viewport.clientWidth / viewport.clientHeight, 0.1, 5000);

	renderer = new THREE.WebGLRenderer();
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
	renderer.setSize(viewport.clientWidth, viewport.clientHeight);
	viewport.appendChild(renderer.domElement);

	stats = new Stats();
	stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
	document.body.appendChild(stats.dom);

	updateSun();

	addMap();

	controls = new CameraFlyControls(scene, renderer, {
		pointerLockElement: viewport,
		camera,
		defaultPosition: {
			x: -25.3,
			y: 55,
			z: 19.7
		},
		defaultRotation: {
			x: -.3,
			y: 0,
			z: 0
		}
	});

	animate();
}

let ambientLight = new THREE.AmbientLight( 0x746070 );
scene.add( ambientLight );

let axesHelper = new THREE.AxesHelper( 3 );
scene.add( axesHelper );

// Sun
let light = new THREE.DirectionalLight( 0xf5d0d0, 1.5 );
light.castShadow = true;
scene.add( light );

// Water
let waterGeometry = new THREE.PlaneBufferGeometry( 10000, 10000 );

let water = new THREE.Water(
	waterGeometry,
	{
		textureWidth: 512,
		textureHeight: 512,
		waterNormals: new THREE.TextureLoader().load( "resources/textures/waternormals.jpg", function( texture ) {
			texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
		}),
		alpha: 1.0,
		sunDirection: light.position.clone().normalize(),
		sunColor: 0xffffff,
		waterColor: 0x001e0f,
		distortionScale: 3.7,
		fog: scene.fog !== undefined
	}
);

water.rotation.x = - Math.PI / 2;
water.position.y = -9;
water.material.uniforms.size.value = 8;

scene.add( water );

// Skybox

let sky = new THREE.Sky();
sky.scale.setScalar( 10000 );
scene.add( sky );

let uniforms = sky.material.uniforms;

uniforms.turbidity.value = 10;
uniforms.rayleigh.value = 2;
uniforms.luminance.value = 1;
uniforms.mieCoefficient.value = 0.005;
uniforms.mieDirectionalG.value = 0.8;

let parameters = {
	distance: 4000,
	inclination: 0.25,
	azimuth: 0.205
};

let cubeCamera = new THREE.CubeCamera( 1, 20000, 256 );
cubeCamera.renderTarget.texture.minFilter = THREE.LinearMipMapLinearFilter;

function updateSun() {
	let theta = Math.PI * ( parameters.inclination - 0.5 );
	let phi = 2 * Math.PI * ( parameters.azimuth - 0.5 );

	light.position.x = parameters.distance * Math.cos( phi );
	light.position.y = parameters.distance * Math.sin( phi ) * Math.sin( theta );
	light.position.z = parameters.distance * Math.sin( phi ) * Math.cos( theta );

	sky.material.uniforms.sunPosition.value = light.position.copy( light.position );
	// light.shadow.camera.position.copy(light.position);
	// light.shadow.camera.rotation.copy(light.rotation);
	light.shadow.mapSize.width = 2048; // default
	light.shadow.mapSize.height = 2048; // default
	light.shadow.camera.near = 3500;
	light.shadow.camera.far = 4200;
	light.shadow.camera.left = -60;
	light.shadow.camera.right = 60;
	light.shadow.camera.top = 50;
	light.shadow.camera.bottom = -30;
	water.material.uniforms.sunDirection.value.copy( light.position ).normalize();

	cubeCamera.update( renderer, scene );
}

//

/* let shadowHelper = new THREE.CameraHelper( light.shadow.camera );
scene.add( shadowHelper ); */

//

uniforms = {
	time: { value: 1.0 }
};
let clock = new THREE.Clock();

//

/* let blueLight = new THREE.PointLight(0x0099ff);
scene.add( blueLight );
blueLight.position.x = 5;
blueLight.position.y = 70;
blueLight.position.z = 500;

let orangeLight = new THREE.PointLight(0xff9900);
scene.add( orangeLight );
orangeLight.position.x = 5;
orangeLight.position.y = 70;
orangeLight.position.z = -500; */

/* controls.update(); */

let marbleMeshes = [];

function animate() {
	requestAnimationFrame( animate );
	// Update marble positions
	for (let i = 0; i < marbleMeshes.length; i++) {
		marbleMeshes[i].position.x = THREE.Math.lerp(marbleMeshes[i].position.x || 0, networking.marblePositions[i * 3 + 0], networking.lastUpdate);
		marbleMeshes[i].position.y = THREE.Math.lerp(marbleMeshes[i].position.y || 0, networking.marblePositions[i * 3 + 2], networking.lastUpdate);
		marbleMeshes[i].position.z = THREE.Math.lerp(marbleMeshes[i].position.z || 0, networking.marblePositions[i * 3 + 1], networking.lastUpdate);

		marbleMeshes[i].quaternion.set(
			networking.marbleRotations[i * 4 + 0],
			networking.marbleRotations[i * 4 + 1],
			networking.marbleRotations[i * 4 + 2],
			networking.marbleRotations[i * 4 + 3]
		);
		/* marbleMeshes[i].quaternion.normalize(); */
	}

	if (networking.lastUpdate < 1.5) {
		// FPS assumed to be 60, replace with fps when possible, or better: base it on real time.
		networking.lastUpdate += (config.network.tickrate / 60 / config.network.ticksToLerp);
	}

	// Update controls
	if ( controls.enabled === true ) {
		controls.update();
	}

	// Update water material
	water.material.uniforms.time.value += 1.0 / 60.0;

	// Update stats in top left corner
	stats.update();

	let delta = clock.getDelta();

	uniforms.time.value += delta * 5;

	// Render the darn thing
	renderer.render( scene, camera );
}

let mapMesh;
function addMap() {
	fetch("/client?dlmap=map2")
		.then((response) => {
			return response.text();
		})
		.then((response) => {
			let mapName = response.substr(0, response.lastIndexOf("."));

			console.log(mapName);
			let manager = new THREE.LoadingManager();
			manager.onProgress = function(item, loaded, total) {
				console.log(item, loaded, total);
			};

			let loader = new THREE.OBJLoader(manager);
			loader.load(`/resources/${mapName}_optimized.obj`, function(object) {
				object.traverse(function(child) {
					if (child.name.indexOf("Terrain") !== -1) {
						mapMesh = child;

						scene.add(mapMesh);

						mapMesh.setRotationFromEuler(
							new THREE.Euler(-Math.PI * .5, 0, Math.PI * .5, "XYZ")
						);

						mapMesh.geometry.computeBoundingBox();
						mapMesh.geometry.center();
						mapMesh.material = createMapMaterial();
						mapMesh.receiveShadow = true;
					}
				});
			}, () => { }, () => { });
		});
}

function spawnMarbleMesh(tags) {
	console.log(tags);
	let size = tags.size;
	let color = tags.color;
	let name = tags.name;
	let useFancy = tags.useFancy;

	let fancyMaterial = new THREE.ShaderMaterial( {

		uniforms: uniforms,
		vertexShader: document.getElementById("vertexShader").textContent,
		fragmentShader: document.getElementById("fragmentShader").textContent

	} );

	let sphereGeometry = new THREE.SphereBufferGeometry(size, 9, 9);
	/* let sphereGeometry = new THREE.BoxGeometry(.2,.2,.2); */
	let materialColor = new THREE.Color(color);
	let sphereMaterial = new THREE.MeshStandardMaterial({ color: materialColor });
	let sphereMesh = new THREE.Mesh(sphereGeometry, (useFancy ? fancyMaterial : sphereMaterial));

	// Shadows
	sphereMesh.castShadow = config.graphics.castShadow.marbles;
	sphereMesh.receiveShadow = config.graphics.receiveShadow.marbles;

	// Add name sprite
	let nameSprite = makeTextSprite(name);

	// Add to collection
	marbleMeshes.push(sphereMesh);

	// Add objects to the scene
	scene.add(marbleMeshes[marbleMeshes.length - 1]);
	scene.add(nameSprite);
	marbleMeshes[marbleMeshes.length - 1].add(nameSprite);
}

let textures = {
	dirt: { url: "resources/textures/dirt.jpg" },
	dirtNormal: { url: "resources/textures/dirt_n.jpg" },
	grass: { url: "resources/textures/grasslight-big.jpg" },
	grassNormal: { url: "resources/textures/grasslight-big-nm.jpg" },
	mask: { url: "resources/textures/mask_alpha.png" }
};

function getTexture( name ) {
	let texture = textures[ name ].texture;
	if ( ! texture ) {
		texture = textures[ name ].texture = new THREE.TextureLoader().load( textures[ name ].url );
		texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
	}
	return texture;
}

function createMapMaterial() {
	let mtl;

	// MATERIAL
	mtl = new THREE.StandardNodeMaterial();
	mtl.roughness = new THREE.FloatNode( .9 );
	mtl.metalness = new THREE.FloatNode( 0 );

	function createUv(scale, offset) {
		let uvOffset = new THREE.FloatNode( offset || 0 );
		let uvScale = new THREE.FloatNode( scale || 1 );

		let uvNode = new THREE.UVNode();
		let offsetNode = new THREE.OperatorNode(
			uvOffset,
			uvNode,
			THREE.OperatorNode.ADD
		);
		let scaleNode = new THREE.OperatorNode(
			offsetNode,
			uvScale,
			THREE.OperatorNode.MUL
		);

		return scaleNode;
	}

	let grass = new THREE.TextureNode( getTexture("grass"), createUv(35) );
	let dirt = new THREE.TextureNode( getTexture("dirt"), createUv(35) );
	let mask = new THREE.TextureNode( getTexture("mask"), createUv() );
	let maskAlphaChannel = new THREE.SwitchNode(mask, "w");
	let blend = new THREE.Math3Node(
		grass,
		dirt,
		maskAlphaChannel,
		THREE.Math3Node.MIX
	);
	mtl.color = blend;
	mtl.normal = new THREE.NormalMapNode(
		new THREE.TextureNode( getTexture("dirtNormal"), createUv(35) )
	);

	let normalMask = new THREE.OperatorNode(
		new THREE.TextureNode( getTexture("mask"), createUv() ),
		new THREE.FloatNode(1),
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
	let fontface = "Courier New";
	let fontsize = 24;

	let canvas = document.createElement("canvas");
	canvas.width = 256;
	canvas.height = 64;
	let context = canvas.getContext("2d");
	context.font = `Bold ${fontsize}px ${fontface}`;
	context.textAlign = "center";

	// get size data (height depends only on font size)
	// let metrics = context.measureText( message );
	// let textWidth = metrics.width;

	// text color
	context.fillStyle = "#ffffff";

	context.fillText(message, 128, fontsize);

	// canvas contents will be used for a texture
	let texture = new THREE.Texture(canvas);
	texture.needsUpdate = true;
	let spriteMaterial = new THREE.SpriteMaterial({map: texture});
	let sprite = new THREE.Sprite( spriteMaterial );
	sprite.scale.set(4, 1, 1.0);
	return sprite;
}

let clearMarbleMeshes = function() {
	for (let mesh of marbleMeshes) {
		for (let i = mesh.children.length; i >= 0; i--) {
			scene.remove(mesh.children[i]);
		}
		scene.remove(mesh);
	}

	marbleMeshes = [];
};

export {
	scene,
	marbleMeshes,
	spawnMarbleMesh,
	clearMarbleMeshes,
	init
};