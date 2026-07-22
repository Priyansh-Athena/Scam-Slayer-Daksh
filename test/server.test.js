"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const WebSocket = require("ws");
const { createQuizServer } = require("../server");

class SocketIoTestClient {
	constructor(httpUrl) {
		this.httpUrl = httpUrl;
		this.socket = null;
		this.nextAckId = 1;
		this.pendingAcks = new Map();
		this.eventWaiters = new Map();
		this.eventQueue = new Map();
	}

	async connect(timeoutMs = 5000) {
		const websocketUrl = this.httpUrl.replace(/^http/, "ws");
		this.socket = new WebSocket(
			`${websocketUrl}/socket.io/?EIO=4&transport=websocket`
		);

		await new Promise((resolve, reject) => {
			const timer = setTimeout(() => reject(new Error("Socket connect timeout")), timeoutMs);
			this.socket.once("error", reject);
			this.socket.on("message", (data) => {
				const packet = String(data);
				if (packet.startsWith("0")) {
					this.socket.send("40");
					return;
				}
				if (packet.startsWith("40")) {
					clearTimeout(timer);
					resolve();
					return;
				}
				this.handlePacket(packet);
			});
		});
		return this;
	}

	handlePacket(packet) {
		if (packet === "2") {
			this.socket.send("3");
			return;
		}

		if (packet.startsWith("42")) {
			const jsonStart = packet.indexOf("[");
			if (jsonStart < 0) return;
			const [eventName, payload] = JSON.parse(packet.slice(jsonStart));
			this.deliverEvent(eventName, payload);
			return;
		}

		if (packet.startsWith("43")) {
			const jsonStart = packet.indexOf("[");
			if (jsonStart < 0) return;
			const ackId = Number(packet.slice(2, jsonStart));
			const values = JSON.parse(packet.slice(jsonStart));
			const pending = this.pendingAcks.get(ackId);
			if (pending) {
				this.pendingAcks.delete(ackId);
				pending.resolve(values[0]);
			}
		}
	}

	deliverEvent(eventName, payload) {
		const waiters = this.eventWaiters.get(eventName);
		if (waiters && waiters.length > 0) {
			const waiter = waiters.shift();
			clearTimeout(waiter.timer);
			waiter.resolve(payload);
			return;
		}
		const queue = this.eventQueue.get(eventName) || [];
		queue.push(payload);
		this.eventQueue.set(eventName, queue);
	}

	waitFor(eventName, timeoutMs = 5000) {
		const queued = this.eventQueue.get(eventName);
		if (queued && queued.length > 0) return Promise.resolve(queued.shift());

		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				const waiters = this.eventWaiters.get(eventName) || [];
				this.eventWaiters.set(
					eventName,
					waiters.filter((item) => item.resolve !== resolve)
				);
				reject(new Error(`Timed out waiting for ${eventName}`));
			}, timeoutMs);
			const waiters = this.eventWaiters.get(eventName) || [];
			waiters.push({ resolve, reject, timer });
			this.eventWaiters.set(eventName, waiters);
		});
	}

	emitWithAck(eventName, payload = {}, timeoutMs = 5000) {
		const ackId = this.nextAckId++;
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				this.pendingAcks.delete(ackId);
				reject(new Error(`Timed out waiting for ack: ${eventName}`));
			}, timeoutMs);
			this.pendingAcks.set(ackId, {
				resolve: (value) => {
					clearTimeout(timer);
					resolve(value);
				},
				reject,
			});
			this.socket.send(`42${ackId}${JSON.stringify([eventName, payload])}`);
		});
	}

	close() {
		if (!this.socket) return;
		for (const pending of this.pendingAcks.values()) {
			pending.reject(new Error("Socket closed"));
		}
		this.pendingAcks.clear();
		this.socket.close();
	}
}

async function startTestServer() {
	const quiz = createQuizServer({ questionSeconds: 15, maxPlayers: 10 });
	await new Promise((resolve) => quiz.server.listen(0, "127.0.0.1", resolve));
	const address = quiz.server.address();
	return { quiz, url: `http://127.0.0.1:${address.port}` };
}

async function closeFixture(quiz, clients) {
	for (const client of clients) client.close();
	await quiz.close();
}

test("health endpoint reports a ready 20-question service", async () => {
	const { quiz, url } = await startTestServer();
	try {
		const response = await fetch(`${url}/health`);
		assert.equal(response.status, 200);
		const body = await response.json();
		assert.equal(body.status, "ok");
		assert.equal(body.questions, 20);
		assert.equal(body.rooms, 0);
	} finally {
		await closeFixture(quiz, []);
	}
});

test("rooms are isolated and answers stay private until results", async () => {
	const { quiz, url } = await startTestServer();
	const clients = [];
	try {
		const host = await new SocketIoTestClient(url).connect();
		const guest = await new SocketIoTestClient(url).connect();
		const otherHost = await new SocketIoTestClient(url).connect();
		clients.push(host, guest, otherHost);

		const createResponse = await host.emitWithAck("createRoom", { nickname: "Daksh" });
		assert.equal(createResponse.ok, true);
		assert.match(createResponse.session.roomCode, /^[A-Z0-9]{6}$/);
		const roomCode = createResponse.session.roomCode;
		const initialRoom = await host.waitFor("roomState");
		assert.equal(initialRoom.players.length, 1);

		const joinResponse = await guest.emitWithAck("joinRoom", {
			nickname: "Nani",
			roomCode,
		});
		assert.equal(joinResponse.ok, true);
		const roomAfterJoin = await host.waitFor("roomState");
		const guestRoom = await guest.waitFor("roomState");
		assert.equal(roomAfterJoin.players.length, 2);
		assert.equal(guestRoom.players.length, 2);

		const otherResponse = await otherHost.emitWithAck("createRoom", {
			nickname: "Other host",
		});
		assert.equal(otherResponse.ok, true);
		const otherRoom = await otherHost.waitFor("roomState");
		assert.notEqual(otherRoom.roomCode, roomCode);
		assert.equal(otherRoom.players.length, 1);

		const startResponse = await host.emitWithAck("startGame", {});
		assert.equal(startResponse.ok, true);
		const [hostQuestion, guestQuestion] = await Promise.all([
			host.waitFor("newQuestion"),
			guest.waitFor("newQuestion"),
		]);
		assert.equal(hostQuestion.questionNumber, 1);
		assert.equal(hostQuestion.totalQuestions, 20);
		assert.match(hostQuestion.question, /SBI|ATM PIN/i);
		assert.deepEqual(hostQuestion.options, guestQuestion.options);
		assert.equal(Object.hasOwn(hostQuestion, "correctAnswer"), false);
		assert.equal(Object.hasOwn(hostQuestion, "correct"), false);

		const guestAnswer = await guest.emitWithAck("submitAnswer", { answerIndex: 0 });
		assert.equal(guestAnswer.ok, true);
		const answerNotice = await host.waitFor("playerAnswered");
		assert.equal(answerNotice.nickname, "Nani");
		assert.equal(Object.hasOwn(answerNotice, "answerIndex"), false);
		assert.equal(Object.hasOwn(answerNotice, "selectedAnswer"), false);

		const hostAnswer = await host.emitWithAck("submitAnswer", { answerIndex: 1 });
		assert.equal(hostAnswer.ok, true);
		const [hostResult, guestResult] = await Promise.all([
			host.waitFor("questionResult", 7000),
			guest.waitFor("questionResult", 7000),
		]);
		assert.equal(hostResult.correctAnswer, 1);
		assert.equal(hostResult.wasCorrect, true);
		assert.equal(guestResult.wasCorrect, false);
		assert.equal(hostResult.answerBreakdown[0], 1);
		assert.equal(hostResult.answerBreakdown[1], 1);
		assert.equal(hostResult.players[0].nickname, "Daksh");
		assert.equal(hostResult.players[0].score, 1);
		assert.match(hostResult.tip, /PIN|bank/i);
	} finally {
		await closeFixture(quiz, clients);
	}
});

test("a saved player token restores the same room and host role", async () => {
	const { quiz, url } = await startTestServer();
	const clients = [];
	try {
		const firstClient = await new SocketIoTestClient(url).connect();
		clients.push(firstClient);
		const createResponse = await firstClient.emitWithAck("createRoom", {
			nickname: "Reconnect test",
		});
		assert.equal(createResponse.ok, true);
		await firstClient.waitFor("roomState");
		firstClient.close();

		const resumedClient = await new SocketIoTestClient(url).connect();
		clients.push(resumedClient);
		const resumeResponse = await resumedClient.emitWithAck(
			"resumeSession",
			createResponse.session
		);
		assert.equal(resumeResponse.ok, true);
		assert.equal(resumeResponse.session.playerId, createResponse.session.playerId);
		const resumedRoom = await resumedClient.waitFor("roomState");
		const player = resumedRoom.players.find(
			(item) => item.id === createResponse.session.playerId
		);
		assert.ok(player);
		assert.equal(player.connected, true);
		assert.equal(player.isHost, true);
	} finally {
		await closeFixture(quiz, clients);
	}
});
