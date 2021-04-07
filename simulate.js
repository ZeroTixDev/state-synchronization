const accel = 1000;
const friction = 0.76
const knock = 100;
window.ballRadius = 30;
window.radius = 20;

export default function simulate(oldState, inputs) {
	const delta = 1 / window.simulation_rate;
	const state = copy(oldState);
	for (const playerId of Object.keys(state.players)) {
		const player = state.players[playerId];
		if (!player) continue;
		if (inputs && inputs.players && inputs.players[playerId]) {
			const input = inputs.players[playerId];
			if (input !== undefined) {
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
		}
		player.xv *= Math.pow(friction, delta * 15);
		player.yv *= Math.pow(friction, delta * 15);
		player.x += player.xv * delta;
		player.y += player.yv * delta;
		if (player.x + radius > state.bound.width + state.bound.x) {
			player.x = state.bound.width + state.bound.x - radius;
			player.xv *= -0.9;
		}
		if (player.x - radius < state.bound.x) {
			player.x = state.bound.x + radius;
			player.xv *= -0.9;
		}
		if (player.y + radius > state.bound.y + state.bound.height) {
			player.y = state.bound.y + state.bound.height - radius;
			player.yv *= -0.9;
		}
		if (player.y - radius < state.bound.y) {
			player.y = state.bound.y + radius;
			player.yv *= -0.9;
		}
		// test for ball collision
		const distX = player.x - state.ball.x;
		const distY = player.y - state.ball.y;
		if (distX * distX + distY * distY < (radius + ballRadius) * (radius + ballRadius)) {
			const magnitude = Math.sqrt(distX * distX + distY * distY) || 1;
			const xv = distX / magnitude;
			const yv = distY / magnitude;
			player.xv += xv * knock * 0.5;
			player.yv += yv * knock * 0.5;
			state.ball.xv += -xv * knock * 1.2;
			state.ball.yv += -yv * knock * 1.2;
		}
	}
	// ball update
	// state.ball.xv += Math.random() * 4 - 2;
	// state.ball.yv += Math.random() * 4 - 2;
	state.ball.x += state.ball.xv * delta;
	state.ball.y += state.ball.yv * delta;
	state.ball.xv *= Math.pow(friction, delta * 10);
	state.ball.yv *= Math.pow(friction, delta * 10);
	if (state.ball.x + ballRadius > state.bound.width + state.bound.x) {
		state.ball.x = state.bound.width + state.bound.x - ballRadius;
		state.ball.xv *= -1;
	}
	if (state.ball.x - ballRadius < state.bound.x) {
		state.ball.x = state.bound.x + ballRadius;
		state.ball.xv *= -1;
	}
	if (state.ball.y + ballRadius > state.bound.y + state.bound.height) {
		state.ball.y = state.bound.y + state.bound.height - ballRadius;
		state.ball.yv *= -1;
	}
	if (state.ball.y - ballRadius < state.bound.y) {
		state.ball.y = state.bound.y + ballRadius;
		state.ball.yv *= -1;
	}
	// end of ball update
	for (const i of Object.keys(state.players)) {
		const player1 = state.players[i];
		for (const j of Object.keys(state.players)) {
			if (i === j) continue;
			const player2 = state.players[j];
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
	return state;
}

function copy(obj) {
	const object = Object.create(null);
	for(const key of Object.keys(obj)) {
		object[key] = typeof obj[key] === 'object' ? copy(obj[key]): obj[key];
	}
	return object;
}
