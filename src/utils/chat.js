const PubNub = require('pubnub');
const uuidv4 = require('uuid/v4');

import STTApi from 'sttapi';

function loadSubscriberDetails() {
	return STTApi.executeGetRequest("notification/subscriber_details");
}

function loadChannels() {
	return STTApi.executeGetRequest("notification/refresh_chat").then((data) => {
		let channelList = null;
		try {
			channelList = data.player.chats.chatInfoList;
		}
		catch (e) {
			return Promise.reject(e);
		}

		return Promise.resolve(channelList);
	});
}

export function publishChatMessage(token)
{
	//https://stt.disruptorbeam.com/notification/publish_chat
	//POST 

	//channel: subscribedChannels.fleet
	//message: string
	//chatType: FLEET.GENERAL
	//severity: 0
	//client_api:8
}

export function loginPubNub()
{
	return loadSubscriberDetails().then((data) => {
		let subscriberDetails = data;

		return loadChannels().then((data) => {
			let channelList = data;

			// Initialize pubnub
			var myUuid = uuidv4();
			var pubnub = new PubNub({
				subscribeKey: subscriberDetails.subscribeKey,
				publishKey: subscriberDetails.authenticationKey,
				uuid: myUuid,
				ssl: true
			});

			// Get list of channels
			var subscribedChannels = {
				player: subscriberDetails.playerForRealmChannel
			};

			channelList.forEach(function (channel) {
				if (channel.chatType == 'SQUAD.GENERAL')
					subscribedChannels.squad = channel.channel;

				if (channel.chatType == 'FLEET.GENERAL')
					subscribedChannels.fleet = channel.channel;
			});

			//console.log('Fleet ' + subscribedChannels.fleet);

			// verify we're connected
			return new Promise(function (resolve, reject) {
				pubnub.time(function (status, response) {
					if (status.error) {
						// handle error if something went wrong based on the status object
						reject(status.error);
					} else {
						/*pubnub.addListener({
							message: function (m) {
								// handle message
								var actualChannel = m.actualChannel;
								var channelName = m.channel; // The channel for which the message belongs
								var msg = m.message; // The Payload
								var publisher = m.publisher;
								var subscribedChannel = m.subscribedChannel;
								var channelGroup = m.subscription; // The channel group or wildcard subscription match (if exists)
								var pubTT = m.timetoken; // Publish timetoken
								console.log('message ' + JSON.stringify(m));
							},
							presence: function (p) {
								// handle presence
								var action = p.action; // Can be join, leave, state-change or timeout
								var channelName = p.channel; // The channel for which the message belongs
								var channelGroup = p.subscription; //  The channel group or wildcard subscription match (if exists)
								var presenceEventTime = p.timestamp; // Presence event timetoken
								var status = p.status; // 200
								var message = p.message; // OK
								var service = p.service; // service
								var uuids = p.uuids;  // UUIDs of users who are connected with the channel with their state
								var occupancy = p.occupancy; // No. of users connected with the channel
								console.log('presence ' + JSON.stringify(p));
							},
							status: function (s) {
								// handle status
								var category = s.category; // PNConnectedCategory
								var operation = s.operation; // PNSubscribeOperation
								var affectedChannels = s.affectedChannels; // The channels affected in the operation, of type array.
								var subscribedChannels = s.subscribedChannels; // All the current subscribed channels, of type array.
								var affectedChannelGroups = s.affectedChannelGroups; // The channel groups affected in the operation, of type array.
								var lastTimetoken = s.lastTimetoken; // The last timetoken used in the subscribe request, of type long.
								var currentTimetoken = s.currentTimetoken; // The current timetoken fetched in the subscribe response, which is going to be used in the next request, of type long.
								console.log('status ' + JSON.stringify(s));
							}
						});

						// Subscribe to channels
						pubnub.subscribe({
							channels: [Object.values(subscribedChannels)],
							withPresence: true
						});*/

						resolve({subscribedChannels, pubnub});
					}
				});
			});
		});
	});
}