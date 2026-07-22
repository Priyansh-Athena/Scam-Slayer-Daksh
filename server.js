const crypto = require("crypto");
const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const questions = require("./questions");

const DEFAULT_QUESTION_SECONDS = 60;
const DEFAULT_MAX_PLAYERS = 50;
const RECONNECT_WINDOW_MS = 5 * 60 * 1000;
const EMPTY_ROOM_TTL_MS = 10 * 60 * 1000;
const HOST_RECONNECT_GRACE_MS = 12 * 1000;
const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function integerFrom(value, fallback, minimum, maximum) {
	const parsed = Number.parseInt(value, 10);
	if (!Number.isFinite(parsed)) return fallback;
	return Math.min(maximum, Math.max(minimum, parsed));
}

function cleanNickname(value) {
	return String(value || "")
		.replace(/[\u0000-\u001f\u007f]/g, "")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 24);
}

function cleanRoomCode(value) {
	return String(value || "")
		.toUpperCase()
		.replace(/[^A-Z0-9]/g, "")
		.slice(0, 6);
}

function createQuizServer(options = {}) {
	const questionSeconds = integerFrom(
		options.questionSeconds ?? process.env.QUESTION_TIME_SECONDS,
		DEFAULT_QUESTION_SECONDS,
		15,
		180
	);
	const maxPlayers = integerFrom(
		options.maxPlayers ?? process.env.MAX_PLAYERS_PER_ROOM,
		DEFAULT_MAX_PLAYERS,
		2,
		200
	);

	const app = express();
	app.disable("x-powered-by");
	app.use((req, res, next) => {
		res.setHeader("X-Content-Type-Options", "nosniff");
		res.setHeader("Referrer-Policy", "no-referrer");
		res.setHeader(
			"Permissions-Policy",
			"camera=(), microphone=(), geolocation=()"
		);
		res.setHeader(
			"Content-Security-Policy",
			"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' ws: wss:"
		);
		next();
	});

	app.get("/health", (req, res) => {
		res.setHeader("Cache-Control", "no-store");
		res.status(200).json({
			status: "ok",
			rooms: rooms.size,
			questions: questions.length,
			uptimeSeconds: Math.round(process.uptime()),
		});
	});

	app.get("/api/config", (req, res) => {
		res.setHeader("Cache-Control", "no-store");
		res.json({
			questionSeconds,
			totalQuestions: questions.length,
			maxPlayers,
		});
	});

	app.use(express.static(path.join(__dirname, "public")));

	const server = http.createServer(app);
	const socketOptions = {
		connectionStateRecovery: {
			maxDisconnectionDuration: RECONNECT_WINDOW_MS,
			skipMiddlewares: true,
		},
		pingInterval: 25_000,
		pingTimeout: 20_000,
	};

	const allowedOrigins = String(process.env.FRONTEND_URL || "")
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
	if (allowedOrigins.length > 0) {
		socketOptions.cors = {
			origin: allowedOrigins,
			methods: ["GET", "POST"],
		};
	}

	const io = new Server(server, socketOptions);
	const rooms = new Map();

	function generateRoomCode() {
		for (let attempt = 0; attempt < 100; attempt += 1) {
			let code = "";
			for (let index = 0; index < 6; index += 1) {
				code += ROOM_ALPHABET[crypto.randomInt(ROOM_ALPHABET.length)];
			}
			if (!rooms.has(code)) return code;
		}
		throw new Error("Unable to generate a unique room code");
	}

	function makeRoom() {
		return {
			code: generateRoomCode(),
			state: "lobby",
			hostPlayerId: null,
			players: new Map(),
			currentQuestion: -1,
			questionStartedAt: null,
			questionEndsAt: null,
			questionTimer: null,
			hostTransferTimer: null,
			cleanupTimer: null,
			createdAt: Date.now(),
		};
	}

	function makePlayer(nickname) {
		return {
			id: crypto.randomUUID(),
			token: crypto.randomBytes(24).toString("hex"),
			nickname,
			score: 0,
			correctAnswers: 0,
			hasAnswered: false,
			answerIndex: null,
			answeredAt: null,
			connected: false,
			socketId: null,
			joinedAt: Date.now(),
			disconnectTimer: null,
		};
	}

	function sessionFor(room, player) {
		return {
			roomCode: room.code,
			playerId: player.id,
			playerToken: player.token,
			nickname: player.nickname,
		};
	}

	function publicPlayer(room, player) {
		return {
			id: player.id,
			nickname: player.nickname,
			score: player.score,
			connected: player.connected,
			isHost: room.hostPlayerId === player.id,
			hasAnswered: Boolean(player.hasAnswered),
		};
	}

	function sortedPlayers(room) {
		return [...room.players.values()].sort((a, b) => {
			if (b.score !== a.score) return b.score - a.score;
			if (b.correctAnswers !== a.correctAnswers) {
				return b.correctAnswers - a.correctAnswers;
			}
			return a.joinedAt - b.joinedAt;
		});
	}

	function publicRoom(room) {
		return {
			roomCode: room.code,
			state: room.state,
			hostPlayerId: room.hostPlayerId,
			players: [...room.players.values()]
				.sort((a, b) => {
					if (a.id === room.hostPlayerId) return -1;
					if (b.id === room.hostPlayerId) return 1;
					return a.joinedAt - b.joinedAt;
				})
				.map((player) => publicPlayer(room, player)),
			currentQuestion:
				room.currentQuestion >= 0 ? room.currentQuestion + 1 : 0,
			totalQuestions: questions.length,
			questionSeconds,
		};
	}

	function emitRoomState(room) {
		io.to(room.code).emit("roomState", publicRoom(room));
	}

	function findPlayerByToken(room, token) {
		if (!token || typeof token !== "string") return null;
		return (
			[...room.players.values()].find((player) => player.token === token) ||
			null
		);
	}

	function contextFor(socket) {
		const roomCode = socket.data.roomCode;
		const playerId = socket.data.playerId;
		const room = roomCode ? rooms.get(roomCode) : null;
		const player = room && playerId ? room.players.get(playerId) : null;
		return { room, player };
	}

	function acknowledge(callback, response) {
		if (typeof callback === "function") callback(response);
	}

	function clearRoomCleanup(room) {
		if (room.cleanupTimer) {
			clearTimeout(room.cleanupTimer);
			room.cleanupTimer = null;
		}
	}

	function scheduleRoomCleanup(room) {
		if (room.cleanupTimer) return;
		room.cleanupTimer = setTimeout(() => {
			const currentRoom = rooms.get(room.code);
			if (!currentRoom) return;
			const hasConnectedPlayer = [...currentRoom.players.values()].some(
				(player) => player.connected
			);
			if (!hasConnectedPlayer) destroyRoom(currentRoom);
		}, EMPTY_ROOM_TTL_MS);
	}

	function clearQuestionTimer(room) {
		if (room.questionTimer) {
			clearTimeout(room.questionTimer);
			room.questionTimer = null;
		}
	}

	function destroyRoom(room) {
		clearQuestionTimer(room);
		clearRoomCleanup(room);
		if (room.hostTransferTimer) clearTimeout(room.hostTransferTimer);
		for (const player of room.players.values()) {
			if (player.disconnectTimer) clearTimeout(player.disconnectTimer);
		}
		rooms.delete(room.code);
	}

	function chooseNewHost(room) {
		const nextHost = [...room.players.values()]
			.filter((player) => player.connected)
			.sort((a, b) => a.joinedAt - b.joinedAt)[0];
		room.hostPlayerId = nextHost ? nextHost.id : null;
		room.hostTransferTimer = null;
		emitRoomState(room);
	}

	function scheduleHostTransfer(room, disconnectedHostId) {
		if (room.hostTransferTimer) clearTimeout(room.hostTransferTimer);
		room.hostTransferTimer = setTimeout(() => {
			const currentRoom = rooms.get(room.code);
			if (!currentRoom || currentRoom.hostPlayerId !== disconnectedHostId) {
				return;
			}
			const host = currentRoom.players.get(disconnectedHostId);
			if (host && host.connected) return;
			chooseNewHost(currentRoom);
		}, HOST_RECONNECT_GRACE_MS);
	}

	function attachSocket(room, player, socket) {
		clearRoomCleanup(room);
		if (player.disconnectTimer) {
			clearTimeout(player.disconnectTimer);
			player.disconnectTimer = null;
		}

		const previousSocketId = player.socketId;
		player.socketId = socket.id;
		player.connected = true;
		socket.data.roomCode = room.code;
		socket.data.playerId = player.id;
		socket.join(room.code);

		if (previousSocketId && previousSocketId !== socket.id) {
			const previousSocket = io.sockets.sockets.get(previousSocketId);
			if (previousSocket) previousSocket.disconnect(true);
		}

		if (room.hostPlayerId === player.id && room.hostTransferTimer) {
			clearTimeout(room.hostTransferTimer);
			room.hostTransferTimer = null;
		}
		if (!room.hostPlayerId) room.hostPlayerId = player.id;
	}

	function removePlayer(room, playerId) {
		const player = room.players.get(playerId);
		if (!player) return;
		if (player.disconnectTimer) clearTimeout(player.disconnectTimer);
		room.players.delete(playerId);

		if (room.hostPlayerId === playerId) chooseNewHost(room);
		if (room.players.size === 0) {
			destroyRoom(room);
			return;
		}

		emitRoomState(room);
		if (room.state === "question") maybeFinishQuestion(room);
	}

	function connectedPlayers(room) {
		return [...room.players.values()].filter((player) => player.connected);
	}

	function answerProgress(room) {
		const activePlayers = connectedPlayers(room);
		return {
			answeredCount: activePlayers.filter((player) => player.hasAnswered)
				.length,
			totalPlayers: activePlayers.length,
		};
	}

	function allConnectedPlayersAnswered(room) {
		const activePlayers = connectedPlayers(room);
		return (
			activePlayers.length > 0 &&
			activePlayers.every((player) => player.hasAnswered)
		);
	}

	function questionPayload(room, player = null) {
		const question = questions[room.currentQuestion];
		return {
			questionNumber: room.currentQuestion + 1,
			totalQuestions: questions.length,
			category: question.category,
			question: question.question,
			options: question.options,
			deadline: room.questionEndsAt,
			durationMs: questionSeconds * 1000,
			hasAnswered: player ? player.hasAnswered : false,
			selectedAnswer: player ? player.answerIndex : null,
			...answerProgress(room),
		};
	}

	function startNextQuestion(room) {
		clearQuestionTimer(room);
		room.currentQuestion += 1;
		if (room.currentQuestion >= questions.length) {
			finishGame(room);
			return;
		}

		room.state = "question";
		room.questionStartedAt = Date.now();
		room.questionEndsAt = room.questionStartedAt + questionSeconds * 1000;

		for (const player of room.players.values()) {
			player.hasAnswered = false;
			player.answerIndex = null;
			player.answeredAt = null;
		}

		io.to(room.code).emit("newQuestion", questionPayload(room));
		emitRoomState(room);
		room.questionTimer = setTimeout(
			() => showQuestionResult(room),
			questionSeconds * 1000
		);
	}

	function resultPayload(room, player) {
		const question = questions[room.currentQuestion];
		const leaderboard = sortedPlayers(room).map((item) =>
			publicPlayer(room, item)
		);
		const answerBreakdown = question.options.map((_, index) =>
			[...room.players.values()].filter(
				(item) => item.answerIndex === index
			).length
		);
		return {
			questionNumber: room.currentQuestion + 1,
			totalQuestions: questions.length,
			category: question.category,
			correctAnswer: question.correct,
			correctAnswerText: question.options[question.correct],
			tip: question.tip,
			options: question.options,
			answerBreakdown,
			players: leaderboard,
			yourAnswer: player ? player.answerIndex : null,
			wasCorrect: player
				? player.answerIndex === question.correct
				: false,
			yourScore: player ? player.score : 0,
			isLastQuestion: room.currentQuestion === questions.length - 1,
		};
	}

	function showQuestionResult(room) {
		if (!rooms.has(room.code) || room.state !== "question") return;
		clearQuestionTimer(room);
		room.state = "results";
		room.questionEndsAt = null;

		for (const player of room.players.values()) {
			if (player.connected && player.socketId) {
				io.to(player.socketId).emit(
					"questionResult",
					resultPayload(room, player)
				);
			}
		}
		emitRoomState(room);
	}

	function maybeFinishQuestion(room) {
		if (room.state !== "question" || !allConnectedPlayersAnswered(room)) {
			return;
		}
		clearQuestionTimer(room);
		room.questionTimer = setTimeout(() => showQuestionResult(room), 650);
	}

	function gameOverPayload(room, player) {
		const leaderboard = sortedPlayers(room).map((item) =>
			publicPlayer(room, item)
		);
		const rank = player
			? leaderboard.findIndex((item) => item.id === player.id) + 1
			: 0;
		return {
			players: leaderboard,
			yourScore: player ? player.score : 0,
			yourRank: rank,
			totalQuestions: questions.length,
		};
	}

	function finishGame(room) {
		clearQuestionTimer(room);
		room.state = "finished";
		room.questionEndsAt = null;
		for (const player of room.players.values()) {
			if (player.connected && player.socketId) {
				io.to(player.socketId).emit("gameOver", gameOverPayload(room, player));
			}
		}
		emitRoomState(room);
	}

	function syncSocketToRoom(room, player, socket) {
		socket.emit("roomState", publicRoom(room));
		if (room.state === "question") {
			socket.emit("newQuestion", questionPayload(room, player));
		} else if (room.state === "results") {
			socket.emit("questionResult", resultPayload(room, player));
		} else if (room.state === "finished") {
			socket.emit("gameOver", gameOverPayload(room, player));
		}
	}

	io.on("connection", (socket) => {
		socket.emit("appConfig", {
			questionSeconds,
			totalQuestions: questions.length,
			maxPlayers,
		});

		socket.on("createRoom", (payload, callback) => {
			const nickname = cleanNickname(payload && payload.nickname);
			if (nickname.length < 2) {
				acknowledge(callback, {
					ok: false,
					message: "Please enter a nickname with at least 2 characters.",
				});
				return;
			}

			const room = makeRoom();
			const player = makePlayer(nickname);
			room.players.set(player.id, player);
			room.hostPlayerId = player.id;
			rooms.set(room.code, room);
			attachSocket(room, player, socket);
			acknowledge(callback, {
				ok: true,
				session: sessionFor(room, player),
			});
			emitRoomState(room);
		});

		socket.on("joinRoom", (payload, callback) => {
			const nickname = cleanNickname(payload && payload.nickname);
			const roomCode = cleanRoomCode(payload && payload.roomCode);
			const room = rooms.get(roomCode);

			if (nickname.length < 2) {
				acknowledge(callback, {
					ok: false,
					message: "Please enter a nickname with at least 2 characters.",
				});
				return;
			}
			if (!room) {
				acknowledge(callback, {
					ok: false,
					message: "Room not found. Check the six-character code.",
				});
				return;
			}
			if (room.state !== "lobby") {
				acknowledge(callback, {
					ok: false,
					message: "This quiz has already started.",
				});
				return;
			}
			if (room.players.size >= maxPlayers) {
				acknowledge(callback, {
					ok: false,
					message: "This room is full.",
				});
				return;
			}
			const duplicateName = [...room.players.values()].some(
				(player) =>
					player.nickname.localeCompare(nickname, undefined, {
						sensitivity: "accent",
					}) === 0
			);
			if (duplicateName) {
				acknowledge(callback, {
					ok: false,
					message: "That nickname is already being used in this room.",
				});
				return;
			}

			const player = makePlayer(nickname);
			room.players.set(player.id, player);
			attachSocket(room, player, socket);
			acknowledge(callback, {
				ok: true,
				session: sessionFor(room, player),
			});
			emitRoomState(room);
			io.to(room.code).emit("playerJoined", {
				playerId: player.id,
				nickname: player.nickname,
			});
		});

		socket.on("resumeSession", (payload, callback) => {
			const roomCode = cleanRoomCode(payload && payload.roomCode);
			const room = rooms.get(roomCode);
			const player = room
				? findPlayerByToken(room, payload && payload.playerToken)
				: null;
			if (!room || !player) {
				acknowledge(callback, {
					ok: false,
					message: "That saved quiz session has expired.",
				});
				return;
			}

			attachSocket(room, player, socket);
			acknowledge(callback, {
				ok: true,
				session: sessionFor(room, player),
			});
			emitRoomState(room);
			syncSocketToRoom(room, player, socket);
		});

		socket.on("startGame", (payload, callback) => {
			const { room, player } = contextFor(socket);
			if (!room || !player || room.hostPlayerId !== player.id) {
				acknowledge(callback, {
					ok: false,
					message: "Only the host can start the quiz.",
				});
				return;
			}
			if (room.state !== "lobby") {
				acknowledge(callback, {
					ok: false,
					message: "The quiz is not in the lobby.",
				});
				return;
			}

			for (const item of room.players.values()) {
				item.score = 0;
				item.correctAnswers = 0;
				item.hasAnswered = false;
				item.answerIndex = null;
			}
			room.currentQuestion = -1;
			acknowledge(callback, { ok: true });
			startNextQuestion(room);
		});

		socket.on("submitAnswer", (payload, callback) => {
			const { room, player } = contextFor(socket);
			const answerIndex = Number(payload && payload.answerIndex);
			if (!room || !player || room.state !== "question") {
				acknowledge(callback, {
					ok: false,
					message: "There is no active question.",
				});
				return;
			}
			if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex > 3) {
				acknowledge(callback, {
					ok: false,
					message: "Invalid answer.",
				});
				return;
			}
			if (player.hasAnswered) {
				acknowledge(callback, {
					ok: false,
					message: "Your answer is already locked.",
				});
				return;
			}
			if (room.questionEndsAt && Date.now() > room.questionEndsAt + 1000) {
				acknowledge(callback, {
					ok: false,
					message: "Time is up for this question.",
				});
				showQuestionResult(room);
				return;
			}

			player.hasAnswered = true;
			player.answerIndex = answerIndex;
			player.answeredAt = Date.now();
			const question = questions[room.currentQuestion];
			if (answerIndex === question.correct) {
				player.score += 1;
				player.correctAnswers += 1;
			}

			acknowledge(callback, { ok: true });
			io.to(room.code).emit("playerAnswered", {
				playerId: player.id,
				nickname: player.nickname,
			});
			io.to(room.code).emit("answerProgress", answerProgress(room));
			maybeFinishQuestion(room);
		});

		socket.on("nextQuestion", (payload, callback) => {
			const { room, player } = contextFor(socket);
			if (
				!room ||
				!player ||
				room.hostPlayerId !== player.id ||
				room.state !== "results"
			) {
				acknowledge(callback, {
					ok: false,
					message: "Only the host can continue from the results screen.",
				});
				return;
			}

			acknowledge(callback, { ok: true });
			if (room.currentQuestion >= questions.length - 1) finishGame(room);
			else startNextQuestion(room);
		});

		socket.on("resetGame", (payload, callback) => {
			const { room, player } = contextFor(socket);
			if (!room || !player || room.hostPlayerId !== player.id) {
				acknowledge(callback, {
					ok: false,
					message: "Only the host can start another round.",
				});
				return;
			}

			clearQuestionTimer(room);
			room.state = "lobby";
			room.currentQuestion = -1;
			room.questionStartedAt = null;
			room.questionEndsAt = null;
			for (const item of room.players.values()) {
				item.score = 0;
				item.correctAnswers = 0;
				item.hasAnswered = false;
				item.answerIndex = null;
				item.answeredAt = null;
			}
			acknowledge(callback, { ok: true });
			io.to(room.code).emit("gameReset", { roomCode: room.code });
			emitRoomState(room);
		});

		socket.on("leaveRoom", (payload, callback) => {
			const { room, player } = contextFor(socket);
			if (!room || !player) {
				acknowledge(callback, { ok: true });
				return;
			}
			socket.leave(room.code);
			socket.data.roomCode = null;
			socket.data.playerId = null;
			removePlayer(room, player.id);
			acknowledge(callback, { ok: true });
		});

		socket.on("disconnect", () => {
			const { room, player } = contextFor(socket);
			if (!room || !player || player.socketId !== socket.id) return;

			player.connected = false;
			player.socketId = null;
			emitRoomState(room);

			if (room.hostPlayerId === player.id) {
				scheduleHostTransfer(room, player.id);
			}
			if (player.disconnectTimer) clearTimeout(player.disconnectTimer);
			player.disconnectTimer = setTimeout(
				() => removePlayer(room, player.id),
				RECONNECT_WINDOW_MS
			);

			if (connectedPlayers(room).length === 0) scheduleRoomCleanup(room);
			else if (room.state === "question") {
				setTimeout(() => maybeFinishQuestion(room), 1500);
			}
		});
	});

	async function close() {
		for (const room of rooms.values()) destroyRoom(room);
		await new Promise((resolve) => {
			io.close(() => {
				if (server.listening) server.close(resolve);
				else resolve();
			});
		});
	}

	return {
		app,
		server,
		io,
		rooms,
		close,
		config: { questionSeconds, maxPlayers },
	};
}

if (require.main === module) {
	const port = integerFrom(process.env.PORT, 3000, 1, 65535);
	const quizServer = createQuizServer();
	quizServer.server.listen(port, "0.0.0.0", () => {
		console.log(`Scam Slayer is running on port ${port}`);
	});

	let shuttingDown = false;
	const shutdown = async (signal) => {
		if (shuttingDown) return;
		shuttingDown = true;
		console.log(`${signal} received. Closing server...`);
		await quizServer.close();
		process.exit(0);
	};
	process.on("SIGTERM", () => shutdown("SIGTERM"));
	process.on("SIGINT", () => shutdown("SIGINT"));
}

module.exports = { createQuizServer };
