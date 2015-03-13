/**
 * Created by FeikoLai on 2/1/15.
 */

var Promise = require('bluebird');
var _ = require('lodash');
var Sender = require('./bigquery-sender');

function Scheduler(params) {

	this.sender_registry = {};

	this.params = params;
}

Scheduler.prototype.start = function () {
	this.scan();
}

Scheduler.prototype.scan = function () {
	var that = this;
	var promisified_redis_client = this.params.promisified_redis_client;


	promisified_redis_client.keysAsync(this.params.redis_namespace + ':*')
		.then(function (keys) {

			//add new senders
			var current_keys = _.keys(that.sender_registry);
			var new_keys = _.filter(keys, function (k) {
				return !(_.contains(current_keys, k))
			});//can be optimize, use sorted list
			_.forEach(new_keys,function (key) {
				var params = _.clone(that.params);
				params.key = key;
				var sender = new Sender(params);
				that.sender_registry[key] = sender;
				sender.start();
				console.log('add new sender of key: ', key);
			});
		}).then(function () {
			return Promise.delay(that.params.schedule_interval);
		}).catch(function (e) {
			console.error(e);
		})
		.then(function () {
			process.nextTick(function () {
				that.scan();
			});
		});
};

module.exports = Scheduler;