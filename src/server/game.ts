import { Engine, World, Bodies, Body, Detector } from "matter-js";

export function createEngine(room) {
	const engine = Engine.create();

	const worldBounds = {
		min: { x: 0, y: 0 },
		max: { x: 800, y: 600 },
	};

	console.log("World created");
};
