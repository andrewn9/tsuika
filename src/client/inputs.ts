const keys: { [index: string]: boolean | undefined } = {};

/**
 * Adds an event listener to the window for keydown events.
 * If the key is not being held down (not a repeat event), 
 * it adds the lowercase key to the keys object.
 * @param {Event} e - The keydown event object.
 * @returns None
 */
window.addEventListener("keydown", (e) => {
	if (!e.repeat) {
		const key = e.key.toLowerCase();
		keys[key] = true;
	}
});

/**
 * Adds an event listener to the window that listens for a keyup event. When a key is released,
 * it deletes the corresponding key from the 'keys' object after converting the key to lowercase.
 * @param {Event} e - The keyup event object.
 * @returns None
 */
window.addEventListener("keyup", (e) => {
	delete keys[e.key.toLowerCase()];
});

/**
 * Check if a key is currently pressed down.
 * @param {string} key - The key to check if it is pressed down.
 * @returns {boolean} True if the key is pressed down, false otherwise.
 */
export function getKeyDown(key: string): boolean {
	return keys[key.toLowerCase()] !== undefined;
}

/**
 * Returns a boolean value indicating whether the specified key is currently pressed.
 * @param {string} key - The key to check if it is pressed.
 * @returns {boolean} A boolean value indicating whether the key is pressed.
 */
export function getKeyPressed(key: string): boolean {
	return keys[key.toLowerCase()] === true;
}

/**
 * Resets all keys in the keys object to false.
 * @returns None
 */
export function reset() {
	for (const key in keys) {
		keys[key] = false;
	}
}