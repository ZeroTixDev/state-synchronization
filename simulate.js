const accel = 1200;
const friction = 0.83;

export default function simulate(state, inputs) {
	const delta = 1 / window.simulation_rate;
	const newState = copy(state);
	for (const id of Object.keys(newState.players)) {
		const player = newState.players[id];
		const input = inputs.players[id];
		if (input.up) {
			player.yv -= accel * delta * input.up;
		}
		if (input.down) {
			player.yv += accel * delta * input.down;
		}
		if (input.left) {
			player.xv -= accel * delta * input.left;
		}
		if (input.right) {
			player.xv += accel * delta * input.right;
		}
		player.xv *= Math.pow(friction, delta * 30);
		player.yv *= Math.pow(friction, delta * 30);
		player.x += player.xv * delta;
		player.y += player.yv * delta;
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
