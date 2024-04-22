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

export const default_def: IChamferableBodyDefinition = {
	slop: 0.1,
	restitution: 0.25,
    angle: -Math.PI/4,
    angularVelocity: 0,
    isStatic: false
};

export const fruitSrc: PIXI.TextureSource[] = [];

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
// 	["cherry", {
		
// 	}],

// ];