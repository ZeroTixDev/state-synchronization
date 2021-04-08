window.simulation_rate = 120;
window.minRrt = 25;
window.jitter = 100;
window.otherBufferSize = 0;
window.localBuffer = 0;
window.tickOffset = null;
window.canOtherUpdate = false;
window.otherStartTime = null;

window.inputDecay = 1;

window.clientReceiveLocal = function (pack) {
	const serverState = pack.state;
	const serverInput = pack.input;
	const serverTick = pack.tick + tickOffset + localBuffer;

	if (states[serverTick]) {
		const myState = copy(states[serverTick]);

		if (!isSameStates(serverState, myState)) {

			// console.log('correction happened', serverTick, tick, 'compare', serverState, roundedState);
			states[serverTick] = copy(serverState);
			states[serverTick].ball = copy(serverState.ball);
			inputs[serverTick] = copy(serverInput);
			let currentTick = serverTick;
			while (currentTick < tick) {
				currentTick++;
				states[currentTick] = simulate(copy(states[currentTick - 1]),
					inputs[currentTick]);
			}
		}
	}
}
window.otherReceive = function (pack) {
	const serverState = pack.state;
	const serverInput = pack.input;
	const serverTick = pack.tick + otherBufferSize;
	let stateExists = true;
	if (otherStates[serverTick] === undefined) {
		otherStates[serverTick] = serverState;
		otherRefStates[serverTick] = serverState;
		otherInputs[serverTick] = serverInput;
		return;
	}
	let correction = false;
	if (!stateExists) {
		correction = true;
	}
	if (stateExists  && !isSameStates(serverState, otherRefStates[serverTick])) {
		correction = true;
	}

	if (correction) {
		otherStates[serverTick] = copy(serverState);
		otherRefStates[serverTick] = copy(serverState);
		otherInputs[serverTick] = copy(serverInput);
		console.log('corrected other', serverTick, otherTick);
		let currentTick = serverTick;
		while (currentTick < otherTick) {
			if (otherInputs[currentTick + 1] === undefined) {
				const oldState = copy(otherStates[otherTick]);
				const oldInput = copy(otherInputs[otherTick]);
				// for (const input of Object.values(oldInput.players)) {
				// 	input.up *= inputDecay;
				// 	input.down *= inputDecay;
				// 	input.left *= inputDecay;
				// 	input.right *= inputDecay;
				// }
				otherStates[otherTick] = simulate(oldState, oldInput);
				continue;
			}
			currentTick++;
			otherStates[currentTick] = simulate(copy(otherRefStates[currentTick - 1]), otherInputs[currentTick]);
			otherRefStates[currentTick] = copy(otherStates[currentTick]);
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
window.oid = '2';

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

const otherCurrentInput = {
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
		'2': {
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
	KeyI: { otherMovement: true, name: 'up' },
	KeyJ: { otherMovement: true, name: 'left' },
	KeyK: { otherMovement: true, name: 'down' },
	KeyL: { otherMovement: true, name: 'right' },
	KeyO: { lag: true, name: 'up' },
	KeyP: { lag: true, name: 'down' }
}


let server = null;
setTimeout(() => {
	server = new Server(copy(initialState), copy(initialInputs));
}, 50);

window.states = { 0: { ...copy(initialState) } }; //
window.inputs = { 0: { ...copy(initialInputs) } };
window.tick = 0;

window.otherStates = { 0: { ...copy(initialState) } }; //
window.otherRefStates = { 0: {...copy(initialState)} };
window.otherInputs = { 0: { ...copy(initialInputs) } };
window.otherTick = 0;
window.otherCounter = 0;

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
		if (!window.rrt) {
			window.rrt = window.minRrt + window.jitter / 2;
		}
		window.rrt += (Math.random() * (window.jitter * 2) - window.jitter) * 0.4;
		window.rrt = Math.max(window.rrt, window.minRrt);
		window.rrt = Math.min(window.rrt, window.minRrt + window.jitter);
	}
	const expectedTick = Math.ceil((Date.now() - startTime) * (simulation_rate / 1000));
	if (expectedTick - tick > simulation_rate * 2) {
		alert('Cannot simulate the game ticks. refresh')
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
	const otherInput = copy(otherCurrentInput);
	const inputPackages = [];
	while (tick < expectedTick) {
		if (window.tickOffset == null) {
			tick++;
			inputs[tick] = copy(inputs[tick - 1]);
			states[tick] = copy(states[tick - 1]);
		} else {
			// inputs[tick + 1] = copy(inputs[tick]);
			inputs[tick + 1 + localBuffer] = copy(inputs[tick]);
			inputs[tick + 1 + localBuffer].players[id] = copy(input);
			inputs[tick + 1 + localBuffer].players[oid] = copy(otherInput);
			inputPackages.push({ tick: tick - tickOffset + 1, input: copy(inputs[tick + 1 + localBuffer]) });
			if (inputs[tick + 1] === undefined) {
				inputs[tick + 1] = copy(inputs[tick]);
			}
			tick++;
			states[tick] = simulate(copy(states[tick - 1]), inputs[tick]);
		}
	}
	setTimeout(() => {
		if (server != null && window.tickOffset != null) {
			server.receiveInputs(inputPackages);
		}
	}, window.rrt / 2);
}

// window.amount = 0;

// setInterval(() => {
// 	console.log('other ticks extrap', amount);
// 	window.amount = 0;
// }, 1000)

function otherUpdate() {
	const expectedTick = Math.ceil((Date.now() - otherStartTime) * (simulation_rate / 1000));

	/*
		while (this.counter < expectedTick) {
			this.counter++;
			if (this.tick - 1 <= bufferSize - 1) {
				this.tick++;
				this.states[this.tick] = copy(this.initState);
				this.inputs[this.tick] = copy(this.initInput);
			} else {
				if (this.inputs[this.tick + 1] === undefined) {
					this.states[this.tick] = simulate(copy(this.states[this.tick]), copy(this.inputs[this.tick]));
					this.updated = true;
					continue;
				}
				this.tick++;
				const oldState = copy(this.states[this.tick - 1]);
				this.states[this.tick] = simulate(copy(oldState), this.inputs[this.tick]);
				this.updated = true;
			}
		}
	*/
	
	while (otherCounter < expectedTick) {
		otherCounter++;
		if (otherTick - 1 <= otherBufferSize - 1) {
			otherTick++;
			otherStates[otherTick] = copy(otherStates[otherTick - 1]);
			otherInputs[otherTick] = copy(otherInputs[otherTick - 1]);
			otherRefStates[otherTick] = copy(otherStates[otherTick - 1]);
		} else {
			if (otherInputs[otherTick + 1] === undefined) {
				const oldState = copy(otherStates[otherTick]);
				const oldInput = copy(otherInputs[otherTick]);
				// for (const input of Object.values(oldInput.players)) {
				// 	input.up *= inputDecay;
				// 	input.down *= inputDecay;
				// 	input.left *= inputDecay;
				// 	input.right *= inputDecay;
				// }
				otherStates[otherTick] = simulate(oldState, oldInput);
				continue;
			}
			otherTick++;
			if (window.tickOffset == null) {
				otherStates[otherTick] = copy(otherStates[otherTick - 1]);
				otherInputs[otherTick] = copy(otherInputs[otherTick - 1]);
				otherRefStates[otherTick] = copy(otherRefStates[otherTick - 1]);
				console.log('tick offset is null');
			} else {
				const oldState = copy(otherRefStates[otherTick - 1]);
				otherStates[otherTick] = simulate(copy(oldState), copy(otherInputs[otherTick]));
				otherRefStates[otherTick] = copy(otherStates[otherTick]);
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
	if (type === 'Client') {
		ctx.fillText(`[LocalBuffer: ${Math.round(((1 / simulation_rate) * localBuffer) * 1000)}ms]`, canvas.width / 2, 85);	
	}
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
	if (control.otherMovement) {
		otherCurrentInput[control.name] = event.type === 'keydown';
	}
	if (control.lag && event.type === 'keydown') {
		if (control.name === 'up') {
			jitter *= 1.5;
		} else {
			jitter /= 1.5;
		}
	}
}

function copy(obj) {
	const object = Object.create(null);
	for (const key of Object.keys(obj)) {
		object[key] = typeof obj[key] === 'object' ? copy(obj[key]) : obj[key];
	}
	return object;
}


window.isSameStates = function(state1, state2) {
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
		const distX = Math.abs(ball1.x - ball2.x);
		const distY = Math.abs(ball1.y - ball2.y);
		if (distX > 3 || distY > 3) {
			return false;
		}
	}
	return true;
}