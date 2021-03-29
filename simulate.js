const accel = 1200;
const friction = 0.83;
const knock = 100;

window.radius = 20;

export default function simulate(state, inputs) {
	const delta = 1 / window.simulation_rate;
	const newState = copy(state);
	for (const id of Object.keys(newState.players)) {
		const player = newState.players[id];
		const input = inputs.players[id];
		if (input) {
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
		}
		player.xv *= Math.pow(friction, delta * 30);
		player.yv *= Math.pow(friction, delta * 30);
		player.x += player.xv * delta;
		player.y += player.yv * delta;
	}
	for (const i of Object.keys(newState.players)) {
		const player1 = newState.players[i];
		for (const j of Object.keys(newState.players)) {
			if (i === j) continue;
			const player2 = newState.players[j];
			const distX = player1.x - player2.x;
			const distY = player1.y - player2.y;
			if (distX * distX + distY * distY < (radius * 2) * (radius * 2)) {
				const magnitude = Math.sqrt(distX * distX + distY * distY) || 1;
				const xv = distX / magnitude;
				const yv = distY / magnitude;
				player1.xv += xv * knock;
				player1.yv += yv * knock;
				player2.xv += -xv * knock;
				player2.yv += -yv * knock;
			}
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
