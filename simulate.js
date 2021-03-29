const vel = 150;

export default function simulate(state, inputs) {
	const delta = 1 / window.simulation_rate;
	const newState = copy(state);
	for (const id of Object.keys(newState.players)) {
		const player = newState.players[id];
		const input = inputs.players[id];
		if (input.up) {
			player.y -= vel * delta * input.up;
		}
		if (input.down) {
			player.y += vel * delta * input.down;
		}
		if (input.left) {
			player.x -= vel * delta * input.left;
		}
		if (input.right) {
			player.x += vel * delta * input.right;
		}
	}
	return newState;
}

function copy(obj) {
	const object = Object.create(null);
	for(const key of Object.keys(obj)) {
		object[key] = typeof obj[key] === 'object' ? copy(obj[key]): obj[key];
	}
	return object;
}
