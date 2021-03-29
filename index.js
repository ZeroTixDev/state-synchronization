window.simulation_rate = 120;
window.minRrt = 50;
window.rrt = 100;
window.jitter = 150;
window.otherBufferSize = 35;
window.tickOffset = null;
window.canOtherUpdate = false;
window.otherStartTime = null;

// window.inputDecay = 0.99;

window.clientReceiveLocal = function (pack) {
	const serverState = pack.state;
	const serverInput = pack.input;
	const serverTick = pack.tick + tickOffset;

	const roundedState = copy(states[serverTick]);
	for (const key of Object.keys(roundedState.players)) {
		roundedState.players[key].x = Math.round(roundedState.players[key].x);
		roundedState.players[key].y = Math.round(roundedState.players[key].y);
	}
	roundedState.ball.x = Math.round(roundedState.ball.x);
	roundedState.ball.y = Math.round(roundedState.ball.y);

	if (!isSameStates(serverState, roundedState)) {

		// console.log('correction happened', serverTick, tick, 'compare', serverState, roundedState);
		states[serverTick] = serverState;
		inputs[serverTick] = serverInput;
		let currentTick = serverTick;
		while (currentTick < tick) {
			currentTick++;
			states[currentTick] = simulate(copy(states[currentTick - 1]),
				inputs[currentTick]);
		}
	}
}
window.otherReceive = function (pack) {
	const serverState = pack.state;
	const serverInput = pack.input;
	const serverTick = pack.tick + tickOffset;
	let stateExists = true;
	if (otherStates[serverTick] === undefined) {
		stateExists = false;
	}
	let roundedState = null;
	if (stateExists) {
		roundedState = copy(otherStates[serverTick]);
		for (const key of Object.keys(roundedState.players)) {
			roundedState.players[key].x = Math.round(roundedState.players[key].x);
			roundedState.players[key].y = Math.round(roundedState.players[key].y);
		}
		roundedState.ball.x = Math.round(roundedState.ball.x);
		roundedState.ball.y = Math.round(roundedState.ball.y);
	}
	let correction = false;
	if (!stateExists) {
		correction = true;
	}
	if (stateExists && roundedState && !isSameStates(serverState, roundedState)) {
		correction = true;
	}

	if (correction) {
		otherStates[serverTick] = serverState;
		otherInputs[serverTick] = serverInput;
		let currentTick = serverTick;
		while (currentTick < otherTick) {
			if (otherInputs[currentTick] === undefined) {
				break;
			}
			currentTick++;
			if (!otherStates[currentTick]) {
				otherStates[currentTick] = simulate(copy(otherStates[currentTick - 1]), otherInputs[currentTick]);
			}
		}
	}

	// let currentTick = serverTick;
	// while (currentTick < otherTick) {
	// 	currentTick++;
	// 	// otherInputs[currentTick] = copy(otherInputs[currentTick - 1]);
	// 	delete otherStates[currentTick];
	// 	delete otherInputs[currentTick];
	// }
}

window.otherInputReceive = function (packages) {
	for (let i = 0; i < packages.length; i++) {
		const data = packages[i];
		if (!canOtherUpdate) {
			otherStartTime = Date.now();
		}
		canOtherUpdate = true;
		otherInputs[data.tick + otherBufferSize] = data.input;
	}
}

import Server from './server.js';
import simulate from './simulate.js';

const startTime = Date.now();
window.id = '1';

const initialState = {
	players: {
		'1': {
			x: 100,
			y: 200,
			xv: 0,
			yv: 0,
		},
		'2': {
			x: 100,
			y: 300,
			xv: 0,
			yv: 0,
		},
		'3': {
			x: 100,
			y: 100,
			xv: 0,
			yv: 0,
		},
		'4': {
			x: 100,
			y: 400,
			xv: 0,
			yv: 0,
		}
	},
	bound: {
		x: 0,
		y: 0,
		width: Math.round(window.innerWidth / 3),
		height: window.innerHeight
	},
	ball: {
		x: Math.round(window.innerWidth / 6),
		y: Math.round(window.innerHeight / 1.5),
		xv: 0,
		yv: 0,
	}
};

const currentInput = {
	up: false,
	down: false,
	right: false,
	left: false
};

const initialInputs = {
	players: {
		'1': {
			up: false,
			down: false,
			right: false,
			left: false
		},
	}
};


const controls = {
	KeyW: { movement: true, name: 'up' },
	KeyA: { movement: true, name: 'left' },
	KeyS: { movement: true, name: 'down' },
	KeyD: { movement: true, name: 'right' },
}


let server = null;
setTimeout(() => {
	server = new Server(copy(initialState), copy(initialInputs));
}, 200);

let states = { 0: { ...copy(initialState) } }; //
let inputs = { 0: { ...copy(initialInputs) } };
let tick = 0;

let otherStates = { 0: { ...copy(initialState) } }; //
let otherInputs = { 0: { ...copy(initialInputs) } };
let otherTick = 0;

const canvas = {
	client: document.getElementById('client'),
	server: document.getElementById('server'),
	other: document.getElementById('other')
};
const ctx = {
	client: canvas.client.getContext('2d'),
	server: canvas.server.getContext('2d'),
	other: canvas.other.getContext('2d')
};

resize();
window.onresize = resize;

(function run() {
	update();
	render();
	requestAnimationFrame(run);
})();

function update() {
	if (Math.random() < 0.1) {
		window.rrt += (Math.random() * (window.jitter * 2) - window.jitter) * 0.4;
		window.rrt = Math.max(window.rrt, window.minRrt);
		window.rrt = Math.min(window.rrt, window.minRrt + window.jitter);
	}
	localUpdate();
	if (canOtherUpdate) {
		otherUpdate();
	}
	if (server) {
		server.update();
	}
	if (window.ping) {
		console.log("pinged client");
		window.ping = false;
		window.tickOffset = Math.ceil((Date.now() - startTime) * (simulation_rate / 1000));
	}
}

function localUpdate() {
	const expectedTick = Math.ceil((Date.now() - startTime) * (simulation_rate / 1000));
	const input = copy(currentInput);
	const inputPackages = [];
	while (tick < expectedTick) {
		tick++;
		if (window.tickOffset == null) {
			inputs[tick] = copy(inputs[tick - 1]);
			states[tick] = copy(states[tick - 1]);
		} else {
			inputs[tick] = copy(inputs[tick - 1]);
			inputs[tick].players[id] = input;
			inputPackages.push({ tick: tick - window.tickOffset, input: copy(inputs[tick]) });
			states[tick] = simulate(copy(states[tick - 1]), inputs[tick]);
		}
	}
	setTimeout(() => {
		if (server != null && window.tickOffset != null) {
			server.receiveInputs(inputPackages);
		}
	}, window.rrt / 2);
}

function otherUpdate() {
	const expectedTick = Math.ceil((Date.now() - otherStartTime) * (simulation_rate / 1000));

	while (otherTick < expectedTick) {
		if (otherTick <= otherBufferSize - 1) {
			otherTick++;
			otherStates[otherTick] = copy(otherStates[otherTick - 1]);
			otherInputs[otherTick] = copy(otherInputs[otherTick - 1]);
		} else {
			if (otherInputs[otherTick + 1] === undefined) {
				// otherInputs[otherTick + 1] = copy(otherInputs[otherTick]);
				break;
			}
			otherTick++;
			if (window.tickOffset == null) {
				otherStates[otherTick] = copy(otherStates[otherTick - 1]);
				otherInputs[otherTick] = copy(otherInputs[otherTick - 1]);
			} else {
				const oldState = copy(otherStates[otherTick - 1]);
				if (!otherStates[otherTick]) {
					otherStates[otherTick] = simulate(copy(oldState), copy(otherInputs[otherTick]));
				}
			}
		}
	}
	// while (otherTick < expectedTick) {
	// 	otherTick++;
	// 	otherInputs[otherTick] = copy(otherInputs[otherTick - 1]);
	// 	for (const id of Object.keys(otherInputs[otherTick].players)) {
	// 		const input = otherInputs[otherTick].players[id];
	// 		input.up *= inputDecay;
	// 		input.down *= inputDecay;
	// 		input.left *= inputDecay;
	// 		input.right *= inputDecay;
	// 	}
	// 	otherStates[otherTick] = simulate(copy(otherStates[otherTick - 1]), otherInputs[otherTick]);
	// }
}


function render() {
	renderCanvas(canvas.client, ctx.client, 'Client');
	renderCanvas(canvas.server, ctx.server, 'Server');
	renderCanvas(canvas.other, ctx.other, 'Other');
}

function renderCanvas(canvas, ctx, type) {
	ctx.fillStyle = '#43434f';
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.fillStyle = 'black';
	ctx.strokeStyle = 'white';
	ctx.lineWidth = 4;
	if (type === 'Client') {
		ctx.strokeRect(states[tick].bound.x, states[tick].bound.y, states[tick].bound.width, states[tick].bound.height)
		ctx.strokeStyle = 'red';
		for (const i of Object.keys(states[tick].players)) {
			ctx.beginPath();
			ctx.arc(states[tick].players[i].x, states[tick].players[i].y, radius, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();
		}
		ctx.fillStyle = 'white';
		ctx.beginPath();
		ctx.arc(states[tick].ball.x, states[tick].ball.y, ballRadius, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();
	} else if (type === 'Server') {
		if (server) {
			ctx.strokeRect(server.states[server.tick].bound.x, server.states[server.tick].bound.y, server.states[server.tick].bound.width, server.states[server.tick].bound.height);
			ctx.strokeStyle = 'green';
			for (const i of Object.keys(server.states[server.tick].players)) {
				ctx.beginPath();
				ctx.arc(server.states[server.tick].players[i].x, server.states[server.tick].players[i].y, radius, 0, Math.PI * 2);
				ctx.fill();
				ctx.stroke();
			}
			ctx.fillStyle = 'white';
			ctx.beginPath();
			ctx.arc(server.states[server.tick].ball.x, server.states[server.tick].ball.y, ballRadius, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();
		}
	} else if (type === 'Other') {
		ctx.strokeRect(otherStates[otherTick].bound.x, otherStates[otherTick].bound.y, otherStates[otherTick].bound.width, otherStates[otherTick].bound.height)
		ctx.strokeStyle = 'yellow';
		for (const i of Object.keys(otherStates[otherTick].players)) {
			ctx.beginPath();
			ctx.arc(otherStates[otherTick].players[i].x, otherStates[otherTick].players[i].y, radius, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();
		}
		ctx.fillStyle = 'white';
		ctx.beginPath();
		ctx.arc(otherStates[otherTick].ball.x, otherStates[otherTick].ball.y, ballRadius, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();
	}
	ctx.font = '20px Arial';
	ctx.textAlign = 'center';
	ctx.fillStyle = 'white';
	ctx.fillText(type + ` [RRT: ${Math.round(window.rrt)}ms]`, canvas.width / 2, 25);
	ctx.fillText(`[Jitter: ${window.jitter}ms]`, canvas.width / 2, 55);
	if (type === 'Server') {
		ctx.fillText(`[Buffer: ${Math.round(((1 / simulation_rate) * bufferSize) * 1000)}ms]`, canvas.width / 2, 85);
		ctx.fillText(`[Tickrate: ${Math.round(window.tickRate)}]`, canvas.width / 2, 115);
	}
	if (type === 'Other') {
		ctx.fillText(`[Buffer: ${Math.round(((1 / simulation_rate) * otherBufferSize) * 1000)}ms]`, canvas.width / 2, 85);
	}
}

function resize() {
	const width = window.innerWidth;
	const height = window.innerHeight;
	for (const key of Object.keys(canvas)) {
		const element = canvas[key];
		element.width = window.innerWidth / 3;
		element.height = window.innerHeight;
	}
}

window.addEventListener('keydown', trackKeys);
window.addEventListener('keyup', trackKeys);

function trackKeys(event) {
	if (event.repeat) return;
	if (!controls[event.code]) return;
	const control = controls[event.code];
	if (control.movement) {
		currentInput[control.name] = event.type === 'keydown';
	}
}

function copy(obj) {
	const object = Object.create(null);
	for (const key of Object.keys(obj)) {
		object[key] = typeof obj[key] === 'object' ? copy(obj[key]) : obj[key];
	}
	return object;
}


function isSameStates(state1, state2) {
	if (JSON.stringify(state1) !== JSON.stringify(state2)) {
		for (const key of Object.keys(state1.players)) {
			const player1 = state1.players[key];
			const player2 = state2.players[key];
			const distX = Math.abs(player1.x - player2.x);
			const distY = Math.abs(player1.y - player2.y);
			if (distX > 3 || distY > 3) {
				return false;
			}
		}
		const ball1 = state1.ball;
		const ball2 = state2.ball;
		const distX = ball1.x - ball2.x;
		const distY = ball1.y - ball2.y;
		if (distX > 3 || distY > 3) {
			return false;
		}
	}
	return true;
}