// import { io } from "socket.io-client";

// const room = new URLSearchParams(window.location.search).get("room");
// if (!room) {
// 	window.location.href = "/index.html";
// }

// const username = sessionStorage.getItem("username");

// if (!username && room) { // Meh
// 	window.location.href = "/index.html";
// }

// const socket = io();
// socket.emit("joinRoom", { room, username });

import * as PIXI from 'pixi.js';
import { Engine, World, Bodies, Body, Detector, Composite, IChamferableBodyDefinition, Render, Runner, MouseConstraint, Mouse, Common } from "matter-js";
import { spawn } from 'child_process';

let debug = false;

(async () => {
	const app = new PIXI.Application();
	const appWidth = 1920, appHeight = 1080;
	await app.init({ antialias: true, backgroundAlpha: 0, width: appWidth, height: appHeight });

	const engine = Engine.create({
		gravity: { x: 0, y: 1, scale: 0.002 }
	});

	if (debug) {
		var render = Render.create({
			element: document.body,
			engine: engine,
			options: {
				width: appWidth,
				height: appHeight,
				showAngleIndicator: true,
				showVelocity: true,
				showCollisions: true
			}
		});

		var mouse = Mouse.create(render.canvas),
			mouseConstraint = MouseConstraint.create(engine, {
				mouse: mouse,
				constraint: {
					stiffness: 0.2,
					render: {
						visible: false
					}
				}
			});

		Composite.add(engine.world, mouseConstraint)
		Render.run(render);

		render.mouse = mouse;
	} else {
		document.body.appendChild(app.canvas);
	}

	type Tags = {
		fruit?: string;
	}

	const bodies: [PIXI.Graphics | PIXI.Sprite, Body, Tags?][] = [];

	const fruitOrder: string[] = [
		"cherry",
		"strawberry",
		"grapes",
		"dekopon",
		"orange",
		"apple",
		"pear",
		"peach",
		"pineapple",
		"melon",
		"watermelon"
	];

	// const fruitProp: [string, IChamferableBodyDefinition][] = [
	// 	["cherry", {
			
	// 	}],

	// ];

	const default_def: IChamferableBodyDefinition = {
		slop: 0,
		isStatic: false,
		restitution: 0.1
	};

	const fruitSrc: PIXI.TextureSource[] = [];

	function spawnFruit(x: number, y: number, nfruit: number) {	
		// get fruit properties
		// let specific = Common.extend(default_def, ...)
		let options = default_def;

		// https://www.desmos.com/calculator/n5qdusnvzo
		let radius = (Math.pow(nfruit, 1.36) * 15.45 + 46.52) / 2
		const body = Bodies.circle(x, y, radius, options, 15);
		console.log(radius);

		// Set up svg graphic
		let graphic = new PIXI.Graphics(fruitSrc[nfruit]);
		console.log(graphic);
		let ratio = graphic.height / graphic.width;
		graphic.height = radius * 2 * ratio;
		graphic.width = radius * 2;

		// Ensure pivot is at center of "round" part of fruit rather than including decorations
		let bounds = graphic.getLocalBounds();
		graphic.pivot.set((bounds.x + bounds.width) / 2, (bounds.y + bounds.height) - (bounds.width / 2));
		graphic.x = x;
		graphic.y = y;

		app.stage.addChild(graphic);
		graphic.eventMode = 'none';

		Composite.add(engine.world, body);
		bodies.push([graphic, body]);
		return body;
	}

	// Parse and load all svgs
	async function loadFruits() {
		for (const fruit of fruitOrder) {
			const text = await PIXI.Assets.load({
				src: './assets/suika_' + fruit + '.svg',
				data: {
					parseAsGraphicsContext: true,
				},
			});
			fruitSrc.push(text);
		}
	}

	const box_tex = await PIXI.Assets.load({
		src: './assets/suika_box.png',
		data: {
			parseAsGraphicsContext: false,
		},
	});

	// Arena function
	function createBox(x: number, y: number) {
		let width = 675;
		let height = 735;
		let thickness = 255;
		let stroke_thickness = 20;

		let options: IChamferableBodyDefinition = {
			density: 1,
			friction: 0.5,
			restitution: 1,
			velocity: { x: 0, y: 0 },
			isStatic: true
		};

		const leftWall = Bodies.rectangle(x - width / 2 - thickness / 2 + stroke_thickness, y - height / 2, thickness, height, options);
		const rightWall = Bodies.rectangle(x + width / 2 + thickness / 2 - stroke_thickness, y - height / 2, thickness, height, options);
		const bottom = Bodies.rectangle(x, y + thickness / 2, width, thickness, options);
		const box = Body.create({
			parts: [bottom, leftWall, rightWall],
			isStatic: true
		});

		box.position = { x: x, y: y };

		const box_sprite = new PIXI.Sprite(box_tex);
		box_sprite.width = width;
		box_sprite.height = 815 / 735 * width;
		app.stage.addChild(box_sprite);

		let bounds = box_sprite.getLocalBounds();
		box_sprite.pivot.set((bounds.x + bounds.width / 2), (bounds.y + bounds.height) - stroke_thickness); // 20 is thickness of walls in px

		Composite.add(engine.world, box);
		box_sprite.eventMode = 'none';
		bodies.push([box_sprite, box]);

		return box;
	}

	const box1 = createBox(appWidth / 4.5, 9 * appHeight / 10);
	Body.setVelocity(box1, { x: 0, y: 0 });

	const box2 = createBox(appWidth - appWidth / 4.5, 9 * appHeight / 10);
	Body.setVelocity(box2, { x: 0, y: 0 });

	loadFruits();

	app.ticker.add((time) => {
		bodies.forEach((tuple) => {
			const graphic = tuple[0];
			const body = tuple[1];
			graphic.position.set(body.position.x, body.position.y);
			graphic.angle = body.angle * 180 / Math.PI;
		});
	});

	window.addEventListener("keydown", (e) => {
		switch (e.key.toUpperCase()) {
			case "A":
				{
					let nfruit = Math.floor(Math.random() * 11);
					spawnFruit(appWidth / 4.5, 9 * appHeight / 10 - 800, nfruit);
				}
			case " ":
				{
					Engine.update(engine, 16);
				}
		}
	});

	Runner.create({ isFixed: true })
	Runner.run(engine);
})();
