import simulate from './simulate.js';

window.bufferSize = 15;

export default class Server {
	constructor(state, inputs) {
		this.tick = 0;
		this.states = {};
		this.inputs = {};
		this.startTime = Date.now();
		this.initState = copy(state);
		this.initInput = copy(inputs);
		this.states[this.tick] = this.initState;
		this.inputs[this.tick] = this.initInput;
	}
	receiveInputs(packages) {
		setTimeout(() => {
			for (let i = 0; i < packages.length; i++) {
				const { input, tick } = packages[i];
				this.inputs[tick + bufferSize] = input;
			}
			setTimeout(() => {
				window.otherInputReceive(packages);
			}, window.rrt / 2 + Math.random() * window.jitter);
		}, window.rrt / 2 + Math.random() * window.jitter);
	}
	update() {
		const expectedTick = Math.ceil((Date.now() - this.startTime) * (simulation_rate / 1000));

		let updated = false;
		while (this.tick < expectedTick) {
			if (this.tick <= bufferSize - 1) {
				this.tick++;
				this.states[this.tick] = copy(this.initState);
				this.inputs[this.tick] = copy(this.initInput);
			} else {
				if (this.inputs[this.tick + 1] === undefined) {
					break;
				}
				this.tick++;
				const oldState = copy(this.states[this.tick - 1]);
				this.states[this.tick] = simulate(copy(oldState), this.inputs[this.tick]);
				updated = true;
			}
		}
		// ^^^this is hackable by sending more inputs so you can make your player go super fast
		// let updated = false;
		// while (true) {
		// 	if (this.inputs[this.tick + 1] === undefined) {
		// 		break;
		// 	}
		// 	this.tick++;
		// 	const oldState = copy(this.states[this.tick - 1]);
		// 	this.states[this.tick] = simulate(oldState, this.inputs[this.tick]);
		// 	updated = true;
		// }
		if (updated) {
			const sendState = copy(this.states[this.tick]);
			for (const key of Object.keys(sendState.players)) {
				sendState.players[key].x = Math.floor(sendState.players[key].x);
				sendState.players[key].y = Math.floor(sendState.players[key].y);
			}
			const pack = { state: {...sendState},
				input: {...copy(this.inputs[this.tick])},
				tick: this.tick - bufferSize};
			setTimeout(() => {
				window.clientReceiveLocal(pack);
			}, window.rrt / 2 + Math.random() * window.jitter);
			setTimeout(() => {
				window.otherReceive(pack);
			}, window.rrt / 2 + Math.random() * window.jitter);
		}
		// for (let i = this.inputBuffer.length - 1; i >= 1; i--) {
		// 	const { input, tick } = this.inputBuffer[i];
		// 	// run physics
		// 	const oldState = copy(this.states[this.tick]);
		// 	this.tick = tick;
		// 	this.inputs[this.tick] = copy(input);
		// 	this.states[this.tick] = simulate(copy(oldState), this.inputs[this.tick]);
		// 	// pack everything and send to client
		// 	const sendState = copy(this.states[this.tick]);
		// 	for (const key of Object.keys(sendState.players)) {
		// 		sendState.players[key].x = Math.floor(sendState.players[key].x);
		// 		sendState.players[key].y = Math.floor(sendState.players[key].y);
		// 	}
		// 	const pack = { state: {...sendState},
		// 		input: {...copy(this.inputs[this.tick])},
		// 		tick: this.tick};
		// 	setTimeout(() => {
		// 		window.clientReceiveLocal(pack);
		// 	}, window.rrt / 2 + Math.random() * window.jitter);
		// 	this.inputBuffer.splice(i, 1);
		// }
	}
}
function copy(obj) {
	const object = Object.create(null);
	for(const key of Object.keys(obj)) {
		object[key] = typeof obj[key] === 'object' ? copy(obj[key]): obj[key];
	}
	return object;
}
