'use strict';

let lib = require('./lib/lib');


/**
 * Asynchronous Operations
 */

/*
//
// recursive call sample
//
function doAsync(arr) 
{
	if (!arr.length) {
		return;
	}

	let top = arr.shift();
	if (typeof top != 'object') {
		top = [top]; // convert to array
	}

	let tasks = top.map((a) => {
		return lib.asyncOp(a);
	});

	return Promise.all(tasks).then(() => {
		doAsync(arr);
	});
}
*/

function doAsync(arr) 
{
	function _async(v) {
		if (typeof v == 'object') {
			// do parallel calls
			let tasks = v.map((a) => {
				return lib.asyncOp(a);
			});

			Promise.all(tasks).then(() => {
				task.next(arr);
			});
		}
		else lib.asyncOp(v, () => {
			task.next(arr);
		});
	}

	function* runner(arr) {
		while (arr && arr.length) {
			let top = arr.shift();
			yield _async(top);
		}
	}

	let task = runner(arr);
	task.next();
}



/**
 * Streams
 */
let events = require('events');

class RandStringSource extends events.EventEmitter
{
	constructor(rs)
	{
		super();

		if (rs instanceof lib.RandStream === false) {
			throw new Error('Parameter should be an instance of RandStream');
		}

		let self = this;
		rs.on('data', (data) => {
			// we want with dots and dots alone!
			if (!/\./.test(data)) {
				return;
			}

			data = data
				.replace(/\.+/g, '.') 		// reduce repeated dot instances to 1
				.replace(/^\.|\.$/g, '') 	// trim leading/trailing dots
				.replace(/\./g, "\n"); 		// convert dots to newline

			// fire!
			self.emit('data', data);
		});
	}
}



/**
 * Resource Pooling
 */
class ResourceManager
{
	constructor(n)
	{
		this.total = n;
		this.resources = [];
		this.queue = [];

		// initialise resources
		let self = this;
		while (n) {
			this.resources.push({
				id: n,
				release: function() {
					self.release(this);
				}
			})

			n--;
		}
	}

	borrow(callback)
	{
		// no available resource? queue borrower
		if (!this.resources.length) {
			this.queue.push(callback);

			return false;
		}

		let res = this.resources.shift();

		// apply callback
		if (typeof callback == 'function') {
			callback.call(null, res)				
		}
	}

	release(resource)
	{
		// push back to list
		this.resources.push(resource);

		// call next queued borrower
		let queue = this.queue.shift();
		if (queue) {
			queue.call(null);
		}
	}
}
