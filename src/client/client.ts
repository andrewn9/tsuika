import { io } from "socket.io-client";
import * as PIXI from 'pixi.js';
import { Engine, World, Bodies, Body, Composite, IChamferableBodyDefinition, Render, Runner, MouseConstraint, Mouse, Events } from "matter-js";
import { default_def, fruitSrc, fruitOrder, loadFruitTex } from './fruitcfg';
import { getKeyDown } from './inputs';

const room = new URLSearchParams(window.location.search).get("room");
const username = sessionStorage.getItem("username");
if (!room || !username ) {
	window.location.href = "/index.html";
}

const socket = io();
socket.emit("joinRoom", { room, username });

socket.on("roomInfo", (data) => {
	console.log(data);
});

let debug = false;

const app = new PIXI.Application();
const appWidth = 1920, appHeight = 1080;

const engine = Engine.create({
	gravity: { x: 0, y: 1, scale: 0.002 }
});

(async () => {
	await app.init({ antialias: true, backgroundAlpha: 0, width: appWidth, height: appHeight });
	loadFruitTex();

	class Fruit {
		board: Board;
		id: number;
		graphic: PIXI.Graphics;
		body: Body;
		type: number;
	};

	const players: Player[] = [];
	const boards: Board[] = [];

	const randomBag: number[] = new Array(10).fill(0).map(() => Math.floor(Math.random() * 5));

	class Player {
		constructor() { players.push(this); }

		id: number;
		board: Board;

		cloud: PIXI.Graphics;
		preview: PIXI.Graphics;

		heldFruit: Fruit; 
		index: number = 1;

		x: number = 0;

		reload() {
			this.heldFruit = spawnFruit(me.board, me.x, me.board.box_body.position.y - 820, randomBag[this.index % randomBag.length]);
			this.index++;
			Body.setStatic(this.heldFruit.body, true);
		}

		drop() {
			Body.setStatic(this.heldFruit.body, false);
			this.heldFruit = null;
			this.preview.visible = false;
		}

		initAvatar() {
			this.x = this.board.box_body.position.x;

			let cloud = new PIXI.Graphics(cloud_tex);
			cloud.setSize(185, 135);
			cloud.position.set(me.x, me.board.box_body.position.y - 830);
			this.cloud = cloud;
			
			let bounds = cloud.getLocalBounds();
			cloud.pivot.set((bounds.x), (bounds.y + bounds.height) - (bounds.width / 2));

			let preview = new PIXI.Graphics();
			preview.visible = false;
			this.preview = preview;
		
			app.stage.addChild(cloud, preview);
		}
	};

	class Board {
		player: Player;

		fruits: Fruit[] = [];

		box_body: Body;
		box_sprite: PIXI.Sprite;

		constructor(player: Player) {
			boards.push(this);
			this.player = player;
		}

		init() {
			createBox(this, appWidth / 4.5, 9 * appHeight / 10);
		}

		removeFruit(body: Body) {
			for (let i = 0; i < this.fruits.length; i++) {
				if (this.fruits[i].body === body) {
					app.stage.removeChild(this.fruits[i].graphic);
					this.fruits.splice(i, 1);
					World.remove(engine.world, body);
					return;
				}
			}
		}
	};

	const box_tex = await PIXI.Assets.load({
		src: "./assets/suika_box.png",
		data: {
			parseAsGraphicsContext: false,
		},
	});
	const cloud_tex = await PIXI.Assets.load({
		src: "./assets/suika_cloud.svg",
		data: {
			parseAsGraphicsContext: true,
		},
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
				showCollisions: true,
				background: 'transparent',
				wireframeBackground: 'transparent',

			}
		});
		render.canvas.setAttribute("id", "debug");

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
	}

	document.body.appendChild(app.canvas);
	app.canvas.setAttribute("id", "svg");

	function getRadius(nfruit: number) {
		let radius = (Math.pow(nfruit, 1.36) * 15.45 + 46.52) / 2;
		return radius;
	}

	function spawnFruit(board: Board, x: number, y: number, nfruit: number) {
		// get fruit properties
		// let specific = Common.extend(default_def, ...)
		let options = default_def;

		// https://www.desmos.com/calculator/n5qdusnvzo
		let radius = getRadius(nfruit);
		let body = Bodies.circle(x, y, radius, options, 15);
		body.label = nfruit.toString();

		// Set up svg graphic
		let graphic = new PIXI.Graphics(fruitSrc[nfruit]);
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
		let fruit = new Fruit();
		fruit.board = board;
		fruit.body = body;
		fruit.graphic = graphic;
		fruit.type = nfruit;
		fruit.id = 1; // TODO

		board.fruits.push(fruit);
		return fruit;
	}

	const box_width = 675;
	const box_height = 1000;
	const box_stroke_thickness = 20;
	function createBox(board: Board, x: number, y: number) {
		let thickness = 255;

		let options: IChamferableBodyDefinition = {
			density: 1,
			friction: 0.5,
			restitution: 1,
			velocity: { x: 0, y: 0 },
			isStatic: true
		};

		const leftWall = Bodies.rectangle(x - box_width / 2 - thickness / 2 + box_stroke_thickness, y - box_height / 2, thickness, box_height, options);
		const rightWall = Bodies.rectangle(x + box_width / 2 + thickness / 2 - box_stroke_thickness, y - box_height / 2, thickness, box_height, options);
		const bottom = Bodies.rectangle(x, y + thickness / 2, box_width, thickness, options);
		const box = Body.create({
			parts: [bottom, leftWall, rightWall],
			isStatic: true,
			label: "box"
		});

		box.position = { x: x, y: y };

		const box_sprite = new PIXI.Sprite(box_tex);
		box_sprite.width = box_width;
		box_sprite.height = 815 / 735 * box_width;
		box_sprite.position = {x: x, y: y};
		app.stage.addChild(box_sprite);

		let bounds = box_sprite.getLocalBounds();
		box_sprite.pivot.set((bounds.x + bounds.width / 2), (bounds.y + bounds.height) - box_stroke_thickness);

		Composite.add(engine.world, box);
		box_sprite.eventMode = 'none';

		board.box_body = box;
		board.box_sprite = box_sprite;
		Body.setVelocity(box, { x: 0, y: 0 });
	}

	function draw(body: Body, graphic: PIXI.Sprite | PIXI.Graphics) {
		graphic.position.set(body.position.x, body.position.y);
		graphic.angle = body.angle * 180 / Math.PI;
	}

	const me: Player = new Player();
	me.board = new Board(me);
	me.board.init();
	me.initAvatar();

	window.addEventListener("keydown", (e) => {
		switch (e.key.toUpperCase()) {
			case "A":
			{
				me.reload();
				break;
			}
			case " ":
			{
				me.drop();
				break;
			}
		}
	});

	Events.on(engine, 'collisionStart', function (event) {
		var pairs = event.pairs;

		for (var i = 0, j = pairs.length; i != j; ++i) {
			var pair = pairs[i];

			let body1 = pair.bodyA;
			let body2 = pair.bodyB;

			if (body1.label === body2.label && body1.label !== "Body") {
				let mp = {
					x: (body1.position.x + body2.position.x) / 2,
					y: (body1.position.y + body2.position.y) / 2,
				};

				let nfruit = Number.parseInt(body1.label);
				if (nfruit < fruitOrder.length - 1) {
					spawnFruit(me.board, mp.x, mp.y, nfruit + 1);
				}

				// Prevent fruit from being included in multiple pair merges in 1 collision interval
				body1.label = "Body"
				body2.label = "Body"

				me.board.removeFruit(body1);
				me.board.removeFruit(body2);
			}
		}
	});

	function clamp(n, min, max) {
		return Math.min(Math.max(n, min), max);
	}

	const bounds = me.board.box_sprite.getBounds()
	
	app.ticker.stop();
	app.ticker.add((time) => {
		for (let board of boards) {
			board.player.cloud.position.x = board.player.x;
			// draw(board.box_body, board.box_sprite);

			for (let fruit of board.fruits) {
				if (board.player.heldFruit && fruit === board.player.heldFruit) {
					Body.setPosition(fruit.body, {x: me.x, y: me.board.box_body.position.y - 750});

					let preview = board.player.preview;
					preview.clear();
					preview.moveTo(fruit.body.position.x, fruit.body.position.y);
					preview.lineTo(fruit.body.position.x, board.box_body.parts[0].position.y);
					preview.stroke({ width: 5, color: 0xffffff});
					preview.visible = true;
				}
				draw(fruit.body, fruit.graphic);
			}
		};

		let speed = 5;
		if (getKeyDown("Shift")) {
			speed = 10;
		}
		if (getKeyDown("ArrowLeft")) {
			me.x -= speed * time.deltaTime;
		}
		if (getKeyDown("ArrowRight")) {
			me.x += speed * time.deltaTime;
		}

		let min = bounds.minX + box_stroke_thickness;
		let max = bounds.maxX - box_stroke_thickness;
		if (me.heldFruit) {
			min += me.heldFruit.body.circleRadius;
			max -= me.heldFruit.body.circleRadius;
		} else {
			min += getRadius(0);
			max -= getRadius(0);
		}
		me.x = clamp(me.x, min, max);
		console.log(bounds.maxX);
	});
	
	const runner = Runner.create({ isFixed: true })
	Runner.run(engine);

})();
