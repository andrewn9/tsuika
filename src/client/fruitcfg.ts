import { IChamferableBodyDefinition } from "matter-js";
import * as PIXI from 'pixi.js';

export const fruitOrder: string[] = [
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

export const pointValues: number[] = [
	1,
	3,
	6,
	10,
	15,
	21,
	28,
	36,
	45,
	55,
	66
];

export const default_def: IChamferableBodyDefinition = {
	slop: 0.3,
	restitution: 0.25,
	angle: -Math.PI/4,
	angularVelocity: 0,
	isStatic: false
};

export const fruitSrc: PIXI.TextureSource[] = [];

/**
 * Generates an array of random numbers between 0 and 4 of length n.
 * @param {number} n - The length of the array to generate.
 * @returns {number[]} An array of random numbers between 0 and 4.
 */
export function genBag(n: number) {
	return new Array(n).fill(0).map(() => Math.floor(Math.random() * 5));
}

/**
 * Asynchronously loads fruit textures using PIXI.js for each fruit in the fruitOrder array.
 * @returns None
 */
export async function loadFruitTex() {
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

// export const fruitProp: [string, IChamferableBodyDefinition][] = [
//	 ["cherry", {
		
//	 }],

// ];