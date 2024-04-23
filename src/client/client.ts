import { io } from "socket.io-client";
import * as PIXI from 'pixi.js';
import { Engine, World, Bodies, Body, Composite, IChamferableBodyDefinition, Render, Runner, MouseConstraint, Mouse, Events, Common, Sleeping } from "matter-js";
import { default_def, fruitSrc, fruitOrder, loadFruitTex } from './fruitcfg';
import { getKeyDown } from './inputs';
import { Connection } from "../server/rooms";
import { Update } from "../server/game";
import { Howl } from 'howler';

const room = new URLSearchParams(window.location.search).get("room");
const username = sessionStorage.getItem("username");
if (!room || !username) {
	window.location.href = "/index.html";
}

const socket = io();
socket.emit("joinRoom", { room, username });

let debug = false;

const app = new PIXI.Application();
const appWidth = 1920, appHeight = 1080;

const engine = Engine.create({
	gravity: { x: 0, y: 1, scale: 0.002 }
});

class Fruit {
	board: Board;
	id: number;
	graphic: PIXI.Graphics;
	body: Body;
	type: number;
};

const connections: Map<string, [Connection, Player]> = new Map();
const players: Player[] = [];
const boards: Board[] = [];
let randomBag: number[] = [];

const sounds = {
	drop: new Howl({
		src: ['./assets/drop.wav'],
		volume: 0.25
	}),
	merge: new Howl({
		src: ['./assets/pop.wav'],
		volume: 0.25
	}),
}

socket.on("bagUpdate", (data) => {
	randomBag = data;
});

let cloud_tex, box_tex, bubble_tex;

const common_text = new PIXI.TextStyle({
	dropShadow: {
		alpha: 0.3,
		angle: 0,
		blur: 26,
		color: "#705929",
		distance: 0,
	},
	fill: "#ffffff",
	fontFamily: "\"Comic Sans MS\", cursive, sans-serif",
	fontSize: 36,
	fontWeight: "bold",
	padding: 21,
	stroke: { color: "#8b5d0e", width: 8 },
});

class Player {
	constructor() { players.push(this); }

	initialized: boolean = false;
	board: Board;
	number: number;

	cloud: PIXI.Graphics;
	preview: PIXI.Graphics;
	sidebar: Map<string, (PIXI.Graphics | PIXI.Sprite | PIXI.Text)> = new Map();

	heldFruit: Fruit;
	index: number = 1;

	x: number = 0;

	/**
	 * Deletes the current object by removing it from the board, stage, and players array.
	 * @returns None
	 */
	delete() {
		this.board.delete();
		app.stage.removeChild(this.cloud, this.preview);
		players.splice(players.findIndex(function () { return this === players; }), 1);
	}

	/**
	 * Displays the next graphic element in the sidebar.
	 * Generates a graphic element based on the next item in the randomBag array and positions it at a specific location.
	 * Adds the generated graphic element to the sidebar and the app's stage.
	 * @returns None
	 */
	shownext() {
		let graphic = genGraphic(randomBag[this.index + 1], 25);
		graphic.position = this.sidebar.get("nextBubble").position;
		this.sidebar.set("nextfruit", graphic);
		app.stage.addChild(graphic);
	}

	/**
	 * Function to handle the spawning of a new fruit and setting it as static.
	 * Also generates a graphic for the next fruit in the sidebar.
	 * @returns None
	 */
	reload() {
		this.heldFruit = spawnFruit(this.board, this.x, this.board.box_body.position.y - 750, randomBag[this.index % randomBag.length]);
		Body.setStatic(this.heldFruit.body, true);

		if (!this.sidebar.get("nextfruit")) {
			let graphic = genGraphic(randomBag[this.index + 1], 25);
			graphic.position = this.sidebar.get("nextBubble").position;
			this.sidebar.set("nextfruit", graphic);
			app.stage.addChild(graphic);
		}
	}

	/**
	 * Drops the current fruit onto the game board.
	 * @returns None
	 */
	drop() {
		let nextfruit = this.sidebar.get("nextfruit");
		if (nextfruit) {
			app.stage.removeChild(nextfruit);
			this.sidebar.set("nextfruit", null)
		}

		this.index++;
		this.shownext();

		sounds.drop.play();
		Body.setStatic(this.heldFruit.body, false);
		this.board.fruits.push(this.heldFruit);
		this.heldFruit = null;
		this.preview.visible = false;
	}

	/**
	 * Save the fruits on the board by converting their bodies to JSON and filtering out
	 * unnecessary properties before returning an array of JSON strings.
	 * @returns An array of JSON strings representing the bodies of the fruits on the board.
	 */
	save(): string[] {
		let packet: string[] = [];
		for (let fruit of this.board.fruits) {
			let bodyAsJson = JSON.stringify(fruit.body, (key, value) =>
				(key === 'parent' || key === 'parts' || key === 'body') ? undefined : value);
			packet.push(bodyAsJson);
		}
		return packet;
	}

	/**
	 * Loads a packet of body data and creates corresponding bodies in the physics engine.
	 * @param {string[]} packet - An array of JSON strings representing body data.
	 * @returns None
	 */
	load(packet: string[]) {
		packet.forEach((body_json) => {
			const bodyData = JSON.parse(body_json, (key, value) =>
				key === 'parent' || key === 'parts' || key === 'body' ? undefined : value
			);
			let body = Bodies.circle(bodyData.position.x, bodyData.position.y, bodyData.circleRadius, {
				label: bodyData.label,
				angle: bodyData.angle,
				force: bodyData.force,
				torque: bodyData.torque,
			}, 15);
			Body.setVelocity(body, bodyData.velocity);
			Body.setAngularVelocity(body, bodyData.angularVelocity);
			Sleeping.set(body, false);

			Composite.add(engine.world, body);
			let fruit = new Fruit();
			fruit.body = body;
			fruit.board = this.board;
			fruit.board.fruits.push(fruit);
			fruit.type = Number.parseInt(body.label)
			fruit.graphic = genGraphic(fruit.type);
			app.stage.addChild(fruit.graphic);
		});
	}

	/**
	 * Initializes the graphics for the object, setting up various elements such as clouds, names, bubbles, and text.
	 * @returns None
	 */
	initGraphics() {
		this.x = this.board.box_body.position.x;

		let cloud = new PIXI.Graphics(cloud_tex);
		cloud.setSize(185, 135);
		cloud.position.set(this.x, this.board.box_body.position.y - 830);
		this.cloud = cloud;

		let bounds = cloud.getLocalBounds();
		cloud.pivot.set((bounds.x), (bounds.y + bounds.height) - (bounds.width / 2));

		let preview = new PIXI.Graphics();
		preview.visible = false;
		this.preview = preview;

		app.stage.addChild(cloud, preview);

		let name;
		for (let [connectionid, tuple] of connections) {
			if (this === tuple[1]) {
				name = new PIXI.Text({
					text: tuple[0].username,
					style: common_text
				});
			}
		}

		let side = 1;
		if (this.board.box_body.position.x > app.screen.width / 2)
			side = -1;

		app.stage.addChild(name);
		name.position = { x: this.board.box_sprite.x - name.width / 2, y: 1000 };

		let bubble = new PIXI.Sprite(bubble_tex);
		bubble.setSize(160, 160);
		bubble.anchor.set(0.5);
		bubble.position = { x: this.board.box_sprite.x + side * (box_width / 2 + bubble.width / 1.85), y: this.board.box_sprite.y - box_width - bubble.height / 4 };

		let text = new PIXI.Text({
			text: "Next",
			style: common_text
		});
		text.zIndex = 5;
		text.position = { x: bubble.position.x - text.width / 2, y: bubble.position.y - bubble.height / 1.5 };

		this.sidebar.set("username", name);
		this.sidebar.set("nextBubble", bubble);
		this.sidebar.set("nextText", text);

		app.stage.addChild(text);
		app.stage.addChild(bubble);

		this.initialized = true;
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

	/**
	 * Remove the box object from the game, along with its graphical components
	 * @returns None
	 */
	delete() {
		this.clear();
		Composite.remove(engine.world, this.box_body);
		app.stage.removeChild(this.box_sprite);
		boards.splice(boards.findIndex(function () { return this === boards; }), 1);
	}

	/**
	 * Creates a box at a specific position based on the player's number.
	 * @returns None
	 */
	init() {
		switch (this.player.number) {
			case 0: {
				createBox(this, appWidth / 4.5, 9 * appHeight / 10);
				break;
			}
			case 1: {
				createBox(this, appWidth - appWidth / 4.5, 9 * appHeight / 10);
				break;
			}
		}
	}

	/**
	 * Removes all fruits from the game by removing their graphics from the stage
	 * and their bodies from the physics world. It then clears the fruits array.
	 * @returns None
	 */
	clear() {
		for (let i = 0; i < this.fruits.length; i++) {
			app.stage.removeChild(this.fruits[i].graphic);
			World.remove(engine.world, this.fruits[i].body);
		}
		this.fruits.splice(0, this.fruits.length);
	}

	/**	
	 * Removes a fruit from the game by removing its graphic from the stage,
	 * removing its body from the physics engine world, and updating the fruits array.
	 * @param {Body} body - The body of the fruit to be removed.
	 * @returns {boolean} - Returns true if the fruit was successfully removed, false otherwise.
	 */
	removeFruit(body: Body) {
		for (let i = 0; i < this.fruits.length; i++) {
			if (this.fruits[i].body === body) {
				app.stage.removeChild(this.fruits[i].graphic);
				this.fruits.splice(i, 1);
				World.remove(engine.world, body);
				return true;
			}
		}
		return false;
	}
};

let me: Player;
let my_connection: string;

/**
 * Event listener for when a new connection is added to the socket.
 * It creates a new player and board for each new connection, assigns a player number,
 * sets the current player if the connection ID matches the socket ID, and emits an update event.
 * @param {Connection[]} data - An array of connection objects representing the new connections.
 * @returns None
 */
socket.on("connectionAdded", (data: Connection[]) => {
	for (let connection of data) {
		if (!connections.get(connection.id)) {
			let player: Player = new Player();
			player.board = new Board(player);
			player.number = connection.num;

			if (connection.id === socket.id) {
				me = player;
				my_connection = connection.id;
			}

			connections.set(connection.id, [connection, player]);
		}
	}
	let update: Update = {
		sender: my_connection,
		event: {
			type: "updateOthers",
			data: me.save()
		}
	};
	socket.emit("update", [room, update]);
});

/**
 * Event listener for when a connection is removed.
 * Removes the specified connections from the connections map.
 * @param {Connection[]} data - An array of connections to be removed.
 * @returns None
 */
socket.on("connectionRemoved", (data: Connection[]) => {
	const removedConnections = [];
	for (const [connectionId, connectionTuple] of connections.entries()) {
		const connection = connectionTuple[0];
		if (!data.some(newConnection => newConnection.id === connection.id)) {
			removedConnections.push(connectionId);
		}
	}
	removedConnections.forEach(connectionId => {
		connections.get(connectionId)[1].delete();
		connections.delete(connectionId);
	});
});

/**
 * Calculates the radius of a fruit based on the number of fruits.
 * @param {number} nfruit - The number of fruits.
 * @returns {number} The radius of the fruit.
 */
function getRadius(nfruit: number) {
	let radius = (Math.pow(nfruit, 1.36) * 15.45 + 46.52) / 2;
	return radius;
}

/**
 * Generates a PIXI.Graphics object representing a fruit with the given parameters.
 * @param {number} nfruit - The index of the fruit in the fruit source array.
 * @param {number} [radiusOverride] - Optional parameter to override the radius of the fruit.
 * @returns {PIXI.Graphics} A PIXI.Graphics object representing the fruit.
 */
function genGraphic(nfruit: number, radiusOverride?: number): PIXI.Graphics {
	let graphic = new PIXI.Graphics(fruitSrc[nfruit]);
	let ratio = graphic.height / graphic.width;
	let radius = getRadius(nfruit);
	if (radiusOverride)
		radius = radiusOverride
	graphic.height = radius * 2 * ratio;
	graphic.width = radius * 2;

	// Ensure pivot is at center of "round" part of fruit rather than including decorations
	let bounds = graphic.getLocalBounds();
	graphic.pivot.set((bounds.x + bounds.width) / 2, (bounds.y + bounds.height) - (bounds.width / 2));

	graphic.eventMode = 'none';
	return graphic;
}

/**
 * Spawns a fruit on the board at the specified coordinates with the given number of fruits.
 * @param {Board} board - The game board where the fruit will be spawned.
 * @param {number} x - The x-coordinate of the fruit on the board.
 * @param {number} y - The y-coordinate of the fruit on the board.
 * @param {number} nfruit - The number of fruits to spawn.
 * @returns {Fruit} The newly spawned fruit object.
 */
function spawnFruit(board: Board, x: number, y: number, nfruit: number) {
	// get fruit properties
	// let specific = Common.extend(default_def, ...)
	let options = default_def;

	// https://www.desmos.com/calculator/n5qdusnvzo
	let radius = getRadius(nfruit);
	let body = Bodies.circle(x, y, radius, options, 15);
	body.label = nfruit.toString();

	// Set up svg graphic
	let graphic = genGraphic(nfruit);
	app.stage.addChild(graphic);

	Composite.add(engine.world, body);
	let fruit = new Fruit();
	fruit.board = board;
	fruit.body = body;
	fruit.graphic = graphic;
	fruit.type = nfruit;

	return fruit;
}

const box_width = 675;
const box_height = 1000;
const box_stroke_thickness = 20;

/**
 * Creates a box object on the given board at the specified coordinates.
 * @param {Board} board - The board on which the box will be created.
 * @param {number} x - The x-coordinate of the box.
 * @param {number} y - The y-coordinate of the box.
 * @returns None
 */
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
	box_sprite.position = { x: x, y: y };
	app.stage.addChild(box_sprite);

	let bounds = box_sprite.getLocalBounds();
	box_sprite.pivot.set((bounds.x + bounds.width / 2), (bounds.y + bounds.height) - box_stroke_thickness);

	Composite.add(engine.world, box);
	box_sprite.eventMode = 'none';

	board.box_body = box;
	board.box_sprite = box_sprite;
	Body.setVelocity(box, { x: 0, y: 0 });
}

/**
 * Update the position and angle of a PIXI graphic based on a physics body.
 * @param {Body} body - The physics body to get position and angle from.
 * @param {PIXI.Sprite | PIXI.Graphics} graphic - The PIXI graphic to update.
 * @returns None
 */
function draw(body: Body, graphic: PIXI.Sprite | PIXI.Graphics) {
	graphic.position.set(body.position.x, body.position.y);
	graphic.angle = body.angle * 180 / Math.PI;
}

(async () => {
	await app.init({ antialias: true, backgroundAlpha: 0, width: appWidth, height: appHeight });
	loadFruitTex();
	box_tex = await PIXI.Assets.load({
		src: "./assets/suika_box.png",
		data: {
			parseAsGraphicsContext: false,
		},
	}), cloud_tex = await PIXI.Assets.load({
		src: "./assets/suika_cloud.svg",
		data: {
			parseAsGraphicsContext: true,
		},
	}), bubble_tex = await PIXI.Assets.load({
		src: "./assets/suika_bubble.png",
		data: {
			parseAsGraphicsContext: false,
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

	window.addEventListener("keydown", (e) => {
		switch (e.key.toUpperCase()) {
			case "A":
				{
					me.reload();
					let update: Update = {
						sender: my_connection,
						event: {
							type: "reload"
						}
					};
					socket.emit("update", [room, update]);
					break;
				}
			case " ":
				{
					me.drop();
					let update: Update = {
						sender: my_connection,
						event: {
							type: "drop"
						}
					};
					socket.emit("update", [room, update]);
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

				let board: Board;
				for (let b of boards) {
					if (mp.x > b.box_body.bounds.min.x && mp.x < b.box_body.bounds.max.x) {
						board = b;
					}
				}

				if (board) {
					let nfruit = Number.parseInt(body1.label);
					if (nfruit < fruitOrder.length - 1) {
						board.fruits.push(spawnFruit(board, mp.x, mp.y, nfruit + 1));
					}

					sounds.merge.play();
					// Prevent fruit from being included in multiple pair merges in 1 collision interval
					body1.label = "Body"
					body2.label = "Body"

					board.removeFruit(body1);
					board.removeFruit(body2);

					let update: Update = {
						sender: my_connection,
						event: {
							type: "updateOthers",
							data: me.save()
						}
					};
					socket.emit("update", [room, update]);
				}
			}
		}
	});

	socket.on("update", (update: Update) => {
		let player = connections.get(update.sender)[1];
		switch (update.event.type) {
			case "playermove": {
				player.x = update.event.data;
				break;
			}
			case "reload": {
				player.reload();
				break;
			}
			case "drop": {
				player.drop();
				break;
			}
			case "updateOthers": {
				player.board.clear();
				player.load(update.event.data);
				// setTimeout(() => player.load(update.event.data), 10);
			}
		}
	});

	app.ticker.add((time) => {
		for (let player of players) {
			if (!player.initialized) {
				player.board.init();
				player.initGraphics();
			}
		}
		for (let board of boards) {
			board.player.cloud.position.x = board.player.x;
			// draw(board.box_body, board.box_sprite);

			for (let fruit of board.fruits) {
				draw(fruit.body, fruit.graphic);
			}

			if (board.player.heldFruit) {
				draw(board.player.heldFruit.body, board.player.heldFruit.graphic)
				let preview = board.player.preview;
				preview.clear();
				preview.moveTo(board.player.heldFruit.body.position.x, board.player.heldFruit.body.position.y);
				preview.lineTo(board.player.heldFruit.body.position.x, board.box_body.parts[0].position.y);
				preview.stroke({ width: 5, color: 0xffffff });
				preview.visible = true;
			}
		};
	});

	Runner.create({ isFixed: true });
	Runner.run(engine);

	Events.on(engine, "beforeUpdate", () => {
		if (me && me.initialized) {
			let before = me.x
			let speed = 5;
			if (getKeyDown("Shift")) {
				speed = 10;
			}
			if (getKeyDown("ArrowLeft")) {
				me.x -= speed;
			}
			if (getKeyDown("ArrowRight")) {
				me.x += speed;
			}
			let bounds = me.board.box_sprite.getBounds();
			let min = bounds.minX + box_stroke_thickness;
			let max = bounds.maxX - box_stroke_thickness;
			if (me.heldFruit) {
				min += me.heldFruit.body.circleRadius;
				max -= me.heldFruit.body.circleRadius;
			} else {
				min += getRadius(0);
				max -= getRadius(0);
			}
			me.x = Common.clamp(me.x, min, max);
			if (me.x !== before) {
				let update: Update = {
					sender: my_connection,
					event: {
						type: "playermove",
						data: me.x
					}
				};
				socket.emit("update", [room, update]);
			}
		}

		for (let player of players) {
			if (player.heldFruit) {
				Body.setPosition(player.heldFruit.body, { x: player.x, y: player.board.box_body.position.y - 750 });
			}
		}
	});
})();
