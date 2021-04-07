import simulate from './simulate.js';

window.bufferSize = 0;
window.tickRate = 60;
window.ping = false;

export default class Server {
	constructor(state, inputs) {
		this.tick = 0;
		this.counter = 0;
		this.states = {};
		this.inputs = {};
		this.refStates = {};
		this.startTime = Date.now();
		this.initState = copy(state);
		this.initInput = copy(inputs);
		this.states[this.tick] = this.initState;
		this.inputs[this.tick] = this.initInput;
		this.refStates[this.tick] = copy(this.initState);
		this.updated = false;
		this.inputPackages = [];
		// let now = new Date();
		// this.time = Date.UTC(now.getFullYear(),
		// 	now.getMonth(), 
		// 	(new Date()).getDate(), 
		// 	(new Date()).getHours(), 
		// 	now.getMinutes(), 
		// 	now.getSeconds(), 
		// 	now.getMilliseconds()
		// );
		// console.log(this.startTime);
		this.startSending();
		this.pingClients();
	}
	pingClients() {
		setTimeout(() => {
			window.ping = true;
		}, 50);
	}
	receiveInputs(packages) {
		setTimeout(() => {
			for (let i = 0; i < packages.length; i++) {
				const { input, tick } = packages[i];
				this.inputs[tick + bufferSize] = input;

				if (tick + bufferSize <= this.tick) {
					// // rollback/ lag comp
					let counter = tick + bufferSize - 1;
					while (counter < this.counter) {
						counter++;
						if (this.inputs[this.tick + 1] === undefined) {
							this.states[this.tick] = simulate(copy(this.states[this.tick]), copy(this.inputs[this.tick]));
							this.updated = true;
							// console.log('server extrap');
							continue;
						}
						this.tick++;
						const oldState = copy(this.refStates[this.tick - 1]);
						this.states[this.tick] = simulate(copy(oldState), this.inputs[this.tick]);
						this.refStates[this.tick] = copy(this.states[this.tick]);
						this.updated = true;
					}

					// let currentTick = tick + bufferSize - 1;
					// while (currentTick < this.tick) {
					// 	if (this.inputs[currentTick + 1] === undefined) {
					// 		this.states[currentTick] = simulate(copy(this.states[currentTick]), copy(this.inputs[currentTick]));
					// 		this.updated = true;
					// 		continue;
					// 	}
					// 	currentTick++;
					// 	const oldState = copy(this.states[currentTick - 1]);
					// 	this.states[currentTick] = simulate(copy(oldState), this.inputs[currentTick]);
					// 	this.updated = true;
					// }
				}
				this.inputPackages.push(copy({ input, tick }));
			}
		}, window.rrt / 2);
	}
	startSending() {
		setInterval(this.send.bind(this), Math.round(1000 / tickRate));
	}
	send() {
		if (this.updated) {
			const sendState = copy(this.refStates[this.tick]);
			const pack = {
				state: { ...sendState },
				input: { ...copy(this.inputs[this.tick]) },
				tick: this.tick - bufferSize
			};
			setTimeout(() => {
				window.clientReceiveLocal(pack);
			}, window.rrt / 2);
			setTimeout(() => {
				window.otherReceive(pack);
			}, window.rrt / 2);
		}
		if (this.inputPackages.length > 0) {
			setTimeout(() => {
				window.otherInputReceive(this.inputPackages);
				this.inputPackages = [];
			}, window.rrt / 2);
		}
		this.updated = false;
	}
	update() {
		const expectedTick = Math.ceil((Date.now() - this.startTime) * (simulation_rate / 1000));

		while (this.counter < expectedTick) {
			this.counter++;
			if (this.tick - 1 <= bufferSize - 1) {
				this.tick++;
				this.states[this.tick] = copy(this.initState);
				this.inputs[this.tick] = copy(this.initInput);
				this.refStates[this.tick] = copy(this.initState);
			} else {
				if (this.inputs[this.tick + 1] === undefined) {
					this.states[this.tick] = simulate(copy(this.states[this.tick]), copy(this.inputs[this.tick]));
					this.updated = true;
					// console.log('server extrap');
					continue;
				}
				this.tick++;
				const oldState = copy(this.refStates[this.tick - 1]);
				this.states[this.tick] = simulate(copy(oldState), this.inputs[this.tick]);
				this.refStates[this.tick] = copy(this.states[this.tick]);
				this.updated = true;
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
	}
}
function copy(obj) {
	const object = Object.create(null);
	for (const key of Object.keys(obj)) {
		object[key] = typeof obj[key] === 'object' ? copy(obj[key]) : obj[key];
	}
	return object;
}
