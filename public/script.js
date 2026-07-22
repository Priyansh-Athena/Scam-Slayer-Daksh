(() => {
	"use strict";

	const socket = io({
		reconnection: true,
		reconnectionAttempts: Infinity,
		reconnectionDelay: 700,
		reconnectionDelayMax: 4000,
		timeout: 10000,
	});

	const SESSION_KEY = "scamSlayerSessionV2";
	const NICKNAME_KEY = "scamSlayerNickname";
	const SOUND_KEY = "scamSlayerSound";
	const TIMER_CIRCUMFERENCE = 2 * Math.PI * 22;
	const optionLetters = ["A", "B", "C", "D"];

	const elements = {
		toastRegion: document.getElementById("toastRegion"),
		roomPill: document.getElementById("roomPill"),
		topRoomCode: document.getElementById("topRoomCode"),
		connectionBadge: document.getElementById("connectionBadge"),
		connectionText: document.getElementById("connectionText"),
		soundToggle: document.getElementById("soundToggle"),
		leaveRoomBtn: document.getElementById("leaveRoomBtn"),
		homeScreen: document.getElementById("homeScreen"),
		homeQuestionCount: document.getElementById("homeQuestionCount"),
		homeQuestionSeconds: document.getElementById("homeQuestionSeconds"),
		nicknameInput: document.getElementById("nicknameInput"),
		hostBtn: document.getElementById("hostBtn"),
		roomCodeInput: document.getElementById("roomCodeInput"),
		joinBtn: document.getElementById("joinBtn"),
		homeStatus: document.getElementById("homeStatus"),
		lobbyScreen: document.getElementById("lobbyScreen"),
		lobbyRoomCode: document.getElementById("lobbyRoomCode"),
		copyCodeBtn: document.getElementById("copyCodeBtn"),
		shareRoomBtn: document.getElementById("shareRoomBtn"),
		playerCountText: document.getElementById("playerCountText"),
		playersList: document.getElementById("playersList"),
		lobbyActionTitle: document.getElementById("lobbyActionTitle"),
		lobbyActionText: document.getElementById("lobbyActionText"),
		startGameBtn: document.getElementById("startGameBtn"),
		quizScreen: document.getElementById("quizScreen"),
		questionCounter: document.getElementById("questionCounter"),
		answerProgressText: document.getElementById("answerProgressText"),
		questionProgressFill: document.getElementById("questionProgressFill"),
		timerCard: document.getElementById("timerCard"),
		timerRingValue: document.getElementById("timerRingValue"),
		timerValue: document.getElementById("timerValue"),
		categoryBadge: document.getElementById("categoryBadge"),
		questionText: document.getElementById("questionText"),
		optionsContainer: document.getElementById("optionsContainer"),
		answerLockMessage: document.getElementById("answerLockMessage"),
		resultScreen: document.getElementById("resultScreen"),
		resultBanner: document.getElementById("resultBanner"),
		resultIcon: document.getElementById("resultIcon"),
		resultEyebrow: document.getElementById("resultEyebrow"),
		resultTitle: document.getElementById("resultTitle"),
		yourAnswerText: document.getElementById("yourAnswerText"),
		correctAnswerText: document.getElementById("correctAnswerText"),
		explanationText: document.getElementById("explanationText"),
		answerBreakdown: document.getElementById("answerBreakdown"),
		resultQuestionNumber: document.getElementById("resultQuestionNumber"),
		leaderboardContainer: document.getElementById("leaderboardContainer"),
		nextQuestionBtn: document.getElementById("nextQuestionBtn"),
		hostWaitingMessage: document.getElementById("hostWaitingMessage"),
		gameOverScreen: document.getElementById("gameOverScreen"),
		finalScore: document.getElementById("finalScore"),
		finalRank: document.getElementById("finalRank"),
		finalLeaderboard: document.getElementById("finalLeaderboard"),
		playAgainBtn: document.getElementById("playAgainBtn"),
		gameOverWaiting: document.getElementById("gameOverWaiting"),
	};

	const screens = [
		elements.homeScreen,
		elements.lobbyScreen,
		elements.quizScreen,
		elements.resultScreen,
		elements.gameOverScreen,
	];

	const state = {
		session: readJson(SESSION_KEY),
		room: null,
		config: {
			questionSeconds: 60,
			totalQuestions: 20,
			maxPlayers: 50,
		},
		question: null,
		result: null,
		selectedAnswer: null,
		hasAnswered: false,
		timerHandle: null,
		lastTimerSecond: null,
		resuming: false,
		leaving: false,
	};

	function readJson(key) {
		try {
			const value = localStorage.getItem(key);
			return value ? JSON.parse(value) : null;
		} catch (_error) {
			return null;
		}
	}

	function saveSession(session) {
		state.session = session;
		localStorage.setItem(SESSION_KEY, JSON.stringify(session));
		if (session && session.nickname) {
			localStorage.setItem(NICKNAME_KEY, session.nickname);
		}
		updateRoomChrome();
	}

	function clearSession() {
		state.session = null;
		state.room = null;
		state.question = null;
		state.result = null;
		state.selectedAnswer = null;
		state.hasAnswered = false;
		localStorage.removeItem(SESSION_KEY);
		stopTimer();
		updateRoomChrome();
		removeRoomFromUrl();
	}

	function isHost() {
		return Boolean(
			state.session &&
				state.room &&
				state.room.hostPlayerId === state.session.playerId
		);
	}

	function showScreen(screen) {
		for (const item of screens) {
			const isActive = item === screen;
			item.hidden = !isActive;
			item.classList.toggle("active", isActive);
		}
		window.scrollTo({ top: 0, behavior: "smooth" });
	}

	function showHome(message = "", tone = "") {
		showScreen(elements.homeScreen);
		setHomeStatus(message, tone);
	}

	function setHomeStatus(message, tone = "") {
		const hasMessage = Boolean(message);
		elements.homeStatus.hidden = !hasMessage;
		elements.homeStatus.textContent = message;
		elements.homeStatus.classList.remove("success", "error");
		if (tone) elements.homeStatus.classList.add(tone);
	}

	function setBusy(button, busy, busyLabel) {
		if (!button) return;
		if (busy) {
			if (!button.dataset.originalHtml) {
				button.dataset.originalHtml = button.innerHTML;
			}
			button.disabled = true;
			button.textContent = busyLabel;
		} else {
			button.disabled = false;
			if (button.dataset.originalHtml) {
				button.innerHTML = button.dataset.originalHtml;
				delete button.dataset.originalHtml;
			}
		}
	}

	function setConnectionStatus(kind, label) {
		elements.connectionBadge.classList.remove(
			"is-connecting",
			"is-online",
			"is-offline"
		);
		elements.connectionBadge.classList.add(`is-${kind}`);
		elements.connectionText.textContent = label;
	}

	function updateRoomChrome() {
		const roomCode = state.session && state.session.roomCode;
		elements.roomPill.hidden = !roomCode;
		elements.leaveRoomBtn.hidden = !roomCode;
		if (roomCode) {
			elements.topRoomCode.textContent = roomCode;
			elements.lobbyRoomCode.textContent = roomCode;
			document.title = `${roomCode} · Scam Slayer`;
		} else {
			document.title = "Scam Slayer - India's Cyber Safety Quiz";
		}
	}

	function setRoomInUrl(roomCode) {
		const url = new URL(window.location.href);
		url.searchParams.set("room", roomCode);
		window.history.replaceState({}, "", url);
	}

	function removeRoomFromUrl() {
		const url = new URL(window.location.href);
		url.searchParams.delete("room");
		window.history.replaceState({}, "", url);
	}

	function normalizedRoomCode(value) {
		return String(value || "")
			.toUpperCase()
			.replace(/[^A-Z0-9]/g, "")
			.slice(0, 6);
	}

	function normalizedNickname(value) {
		return String(value || "")
			.replace(/[\u0000-\u001f\u007f]/g, "")
			.replace(/\s+/g, " ")
			.trim()
			.slice(0, 24);
	}

	function emitWithAck(eventName, payload, timeoutMs = 9000) {
		return new Promise((resolve) => {
			socket.timeout(timeoutMs).emit(eventName, payload, (error, response) => {
				if (error) {
					resolve({
						ok: false,
						message: "The server did not respond. Check your connection and try again.",
					});
					return;
				}
				resolve(response || { ok: false, message: "Unexpected server response." });
			});
		});
	}

	function playSound(name) {
		if (window.soundSystem) window.soundSystem.play(name);
	}

	function showToast(message, tone = "") {
		if (!message) return;
		const toast = document.createElement("div");
		toast.className = "toast";
		if (tone) toast.classList.add(tone);
		toast.textContent = message;
		elements.toastRegion.appendChild(toast);
		window.setTimeout(() => {
			toast.classList.add("is-leaving");
			window.setTimeout(() => toast.remove(), 240);
		}, 3200);
	}

	function avatarLetters(nickname) {
		const parts = String(nickname || "?")
			.trim()
			.split(/\s+/)
			.filter(Boolean);
		return parts
			.slice(0, 2)
			.map((part) => part[0].toUpperCase())
			.join("") || "?";
	}

	function updateLobby(room) {
		const connectedCount = room.players.filter((player) => player.connected).length;
		elements.lobbyRoomCode.textContent = room.roomCode;
		elements.playerCountText.textContent = `${connectedCount} ${
			connectedCount === 1 ? "player" : "players"
		} connected`;
		elements.playersList.replaceChildren();

		for (const player of room.players) {
			const card = document.createElement("div");
			card.className = "player-card";
			if (!player.connected) card.classList.add("offline");
			if (state.session && player.id === state.session.playerId) {
				card.classList.add("you");
			}

			const avatar = document.createElement("div");
			avatar.className = "player-avatar";
			avatar.textContent = avatarLetters(player.nickname);

			const details = document.createElement("div");
			details.className = "player-details";
			const name = document.createElement("strong");
			name.textContent = player.nickname;
			const status = document.createElement("span");
			status.textContent = player.connected ? "Connected" : "Reconnecting...";
			details.append(name, status);

			const tags = document.createElement("div");
			tags.className = "player-tags";
			if (player.isHost) {
				const hostTag = document.createElement("span");
				hostTag.className = "host-tag";
				hostTag.textContent = "Host";
				tags.appendChild(hostTag);
			}
			if (state.session && player.id === state.session.playerId) {
				const youTag = document.createElement("span");
				youTag.className = "you-tag";
				youTag.textContent = "You";
				tags.appendChild(youTag);
			}
			card.append(avatar, details, tags);
			elements.playersList.appendChild(card);
		}

		if (isHost()) {
			elements.lobbyActionTitle.textContent = "Ready to begin?";
			elements.lobbyActionText.textContent =
				"Start when everyone has joined. Players can reconnect to this room if their network drops.";
			elements.startGameBtn.hidden = false;
			elements.startGameBtn.textContent = `Start the ${room.totalQuestions}-question quiz`;
		} else {
			const host = room.players.find((player) => player.id === room.hostPlayerId);
			elements.lobbyActionTitle.textContent = "Waiting for the host";
			elements.lobbyActionText.textContent = host
				? `${host.nickname} will start the quiz when everyone is ready.`
				: "A new host is being selected...";
			elements.startGameBtn.hidden = true;
		}
	}

	function updateAnswerProgress(data) {
		const answered = Number(data && data.answeredCount) || 0;
		const total = Number(data && data.totalPlayers) || 0;
		elements.answerProgressText.textContent = `${answered} of ${total} answered`;
	}

	function renderQuestion(data) {
		state.question = data;
		state.result = null;
		state.hasAnswered = Boolean(data.hasAnswered);
		state.selectedAnswer = Number.isInteger(data.selectedAnswer)
			? data.selectedAnswer
			: null;

		elements.questionCounter.textContent = `Question ${data.questionNumber} of ${data.totalQuestions}`;
		elements.categoryBadge.textContent = data.category;
		elements.questionText.textContent = data.question;
		elements.questionProgressFill.style.width = `${Math.max(
			0,
			Math.min(100, (data.questionNumber / data.totalQuestions) * 100)
		)}%`;
		updateAnswerProgress(data);

		elements.optionsContainer.replaceChildren();
		data.options.forEach((option, index) => {
			const button = document.createElement("button");
			button.type = "button";
			button.className = "option-button";
			button.dataset.answerIndex = String(index);
			button.dataset.index = String(index);
			button.setAttribute("aria-label", `Option ${optionLetters[index]}: ${option}`);

			const letter = document.createElement("span");
			letter.className = "option-letter";
			letter.textContent = optionLetters[index];
			const text = document.createElement("span");
			text.className = "option-text";
			text.textContent = option;
			button.append(letter, text);

			button.addEventListener("click", () => submitAnswer(index));
			elements.optionsContainer.appendChild(button);
		});

		if (state.hasAnswered) lockAnswerButtons(state.selectedAnswer);
		else unlockAnswerButtons();

		showScreen(elements.quizScreen);
		startTimer(data.deadline, data.durationMs);
	}

	function lockAnswerButtons(selectedIndex) {
		for (const button of elements.optionsContainer.querySelectorAll("button")) {
			const index = Number(button.dataset.answerIndex);
			button.disabled = true;
			button.classList.toggle("selected", index === selectedIndex);
		}
		elements.answerLockMessage.hidden = false;
	}

	function unlockAnswerButtons() {
		for (const button of elements.optionsContainer.querySelectorAll("button")) {
			button.disabled = false;
			button.classList.remove("selected");
		}
		elements.answerLockMessage.hidden = true;
	}

	async function submitAnswer(answerIndex) {
		if (state.hasAnswered || !state.question) return;
		state.hasAnswered = true;
		state.selectedAnswer = answerIndex;
		lockAnswerButtons(answerIndex);
		playSound("buttonClick");

		const response = await emitWithAck("submitAnswer", { answerIndex });
		if (!response.ok) {
			state.hasAnswered = false;
			state.selectedAnswer = null;
			unlockAnswerButtons();
			showToast(response.message || "Your answer could not be submitted.", "error");
		}
	}

	function startTimer(deadline, durationMs) {
		stopTimer();
		state.lastTimerSecond = null;
		elements.timerRingValue.style.strokeDasharray = String(TIMER_CIRCUMFERENCE);

		const update = () => {
			const total = Math.max(1000, Number(durationMs) || state.config.questionSeconds * 1000);
			const remaining = Math.max(0, Number(deadline) - Date.now());
			const seconds = Math.max(0, Math.ceil(remaining / 1000));
			const ratio = Math.max(0, Math.min(1, remaining / total));

			elements.timerValue.textContent = String(seconds);
			elements.timerRingValue.style.strokeDashoffset = String(
				TIMER_CIRCUMFERENCE * (1 - ratio)
			);
			elements.timerCard.classList.toggle("warning", seconds <= 10);

			if (
				seconds <= 10 &&
				seconds > 0 &&
				seconds !== state.lastTimerSecond
			) {
				playSound(seconds <= 3 ? "timerWarning" : "timer");
			}
			state.lastTimerSecond = seconds;

			if (remaining <= 0) stopTimer(false);
		};

		update();
		state.timerHandle = window.setInterval(update, 200);
	}

	function stopTimer(resetWarning = true) {
		if (state.timerHandle) {
			window.clearInterval(state.timerHandle);
			state.timerHandle = null;
		}
		if (resetWarning) elements.timerCard.classList.remove("warning");
	}

	function renderQuestionResult(data) {
		state.result = data;
		stopTimer();

		const unanswered = data.yourAnswer === null || data.yourAnswer === undefined;
		elements.resultBanner.classList.remove("correct", "incorrect", "unanswered");
		if (unanswered) {
			elements.resultBanner.classList.add("unanswered");
			elements.resultIcon.textContent = "⌛";
			elements.resultEyebrow.textContent = "Time expired";
			elements.resultTitle.textContent = "No answer submitted";
			elements.yourAnswerText.textContent = "The correct response is shown below.";
			playSound("incorrect");
		} else if (data.wasCorrect) {
			elements.resultBanner.classList.add("correct");
			elements.resultIcon.textContent = "✓";
			elements.resultEyebrow.textContent = "Your answer";
			elements.resultTitle.textContent = "Correct!";
			elements.yourAnswerText.textContent = `You chose ${optionLetters[data.yourAnswer]}: ${data.options[data.yourAnswer]}`;
			playSound("correct");
		} else {
			elements.resultBanner.classList.add("incorrect");
			elements.resultIcon.textContent = "×";
			elements.resultEyebrow.textContent = "Your answer";
			elements.resultTitle.textContent = "Not quite";
			elements.yourAnswerText.textContent = `You chose ${optionLetters[data.yourAnswer]}: ${data.options[data.yourAnswer]}`;
			playSound("incorrect");
		}

		elements.correctAnswerText.textContent = `${optionLetters[data.correctAnswer]}) ${data.correctAnswerText}`;
		elements.explanationText.textContent = data.tip;
		elements.resultQuestionNumber.textContent = `After question ${data.questionNumber}`;
		renderAnswerBreakdown(data.options, data.answerBreakdown, data.correctAnswer);
		renderLeaderboard(elements.leaderboardContainer, data.players);
		updateResultControls(Boolean(data.isLastQuestion));
		showScreen(elements.resultScreen);
	}

	function renderAnswerBreakdown(options, counts, correctIndex) {
		elements.answerBreakdown.replaceChildren();
		const total = Math.max(
			1,
			(Array.isArray(counts) ? counts : []).reduce(
				(sum, value) => sum + (Number(value) || 0),
				0
			)
		);
		options.forEach((_option, index) => {
			const count = Number(counts[index]) || 0;
			const row = document.createElement("div");
			row.className = "breakdown-row";
			if (index === correctIndex) row.classList.add("correct");

			const letter = document.createElement("span");
			letter.className = "breakdown-letter";
			letter.textContent = optionLetters[index];
			const track = document.createElement("div");
			track.className = "breakdown-track";
			const fill = document.createElement("div");
			fill.className = "breakdown-fill";
			fill.style.width = `${Math.max(0, Math.min(100, (count / total) * 100))}%`;
			track.appendChild(fill);
			const countLabel = document.createElement("span");
			countLabel.className = "breakdown-count";
			countLabel.textContent = String(count);
			row.append(letter, track, countLabel);
			elements.answerBreakdown.appendChild(row);
		});
	}

	function renderLeaderboard(container, players) {
		container.replaceChildren();
		(players || []).forEach((player, index) => {
			const item = document.createElement("div");
			item.className = "leaderboard-item";
			if (state.session && player.id === state.session.playerId) {
				item.classList.add("you");
			}

			const rank = document.createElement("span");
			rank.className = "leaderboard-rank";
			rank.textContent = index < 3 ? ["🥇", "🥈", "🥉"][index] : `#${index + 1}`;
			const name = document.createElement("div");
			name.className = "leaderboard-name";
			const strong = document.createElement("strong");
			strong.textContent = player.nickname;
			const meta = document.createElement("span");
			const labels = [];
			if (player.isHost) labels.push("Host");
			if (state.session && player.id === state.session.playerId) labels.push("You");
			if (!player.connected) labels.push("Reconnecting");
			meta.textContent = labels.join(" · ") || "Player";
			name.append(strong, meta);
			const score = document.createElement("strong");
			score.className = "leaderboard-score";
			score.textContent = `${player.score} ${player.score === 1 ? "point" : "points"}`;
			item.append(rank, name, score);
			container.appendChild(item);
		});
	}

	function updateResultControls(isLastQuestion) {
		if (isHost()) {
			elements.nextQuestionBtn.hidden = false;
			elements.nextQuestionBtn.textContent = isLastQuestion
				? "View final results"
				: "Next question";
			elements.hostWaitingMessage.hidden = true;
		} else {
			elements.nextQuestionBtn.hidden = true;
			elements.hostWaitingMessage.hidden = false;
		}
	}

	function renderGameOver(data) {
		stopTimer();
		elements.finalScore.textContent = `${data.yourScore} / ${data.totalQuestions}`;
		elements.finalRank.textContent = data.yourRank > 0 ? `#${data.yourRank}` : "—";
		renderLeaderboard(elements.finalLeaderboard, data.players);
		if (isHost()) {
			elements.playAgainBtn.hidden = false;
			elements.gameOverWaiting.hidden = true;
		} else {
			elements.playAgainBtn.hidden = true;
			elements.gameOverWaiting.hidden = false;
		}
		showScreen(elements.gameOverScreen);
		playSound("gameEnd");
	}

	async function createRoom() {
		const nickname = normalizedNickname(elements.nicknameInput.value);
		if (nickname.length < 2) {
			setHomeStatus("Please enter a nickname with at least 2 characters.", "error");
			elements.nicknameInput.focus();
			return;
		}
		if (!socket.connected) {
			setHomeStatus("Still connecting to the quiz server. Please try again in a moment.", "error");
			return;
		}

		setBusy(elements.hostBtn, true, "Creating room...");
		setHomeStatus("");
		playSound("buttonClick");
		const response = await emitWithAck("createRoom", { nickname });
		setBusy(elements.hostBtn, false);
		if (!response.ok) {
			setHomeStatus(response.message || "Could not create a room.", "error");
			return;
		}
		saveSession(response.session);
		setRoomInUrl(response.session.roomCode);
	}

	async function joinRoom() {
		const nickname = normalizedNickname(elements.nicknameInput.value);
		const roomCode = normalizedRoomCode(elements.roomCodeInput.value);
		if (nickname.length < 2) {
			setHomeStatus("Please enter a nickname with at least 2 characters.", "error");
			elements.nicknameInput.focus();
			return;
		}
		if (roomCode.length !== 6) {
			setHomeStatus("Enter the complete six-character room code.", "error");
			elements.roomCodeInput.focus();
			return;
		}
		if (!socket.connected) {
			setHomeStatus("Still connecting to the quiz server. Please try again in a moment.", "error");
			return;
		}

		setBusy(elements.joinBtn, true, "Joining...");
		setHomeStatus("");
		playSound("buttonClick");
		const response = await emitWithAck("joinRoom", { nickname, roomCode });
		setBusy(elements.joinBtn, false);
		if (!response.ok) {
			setHomeStatus(response.message || "Could not join that room.", "error");
			return;
		}
		saveSession(response.session);
		setRoomInUrl(response.session.roomCode);
	}

	async function resumeSession() {
		if (!state.session || state.resuming || state.leaving) return;
		state.resuming = true;
		setConnectionStatus("connecting", "Rejoining room");
		const response = await emitWithAck("resumeSession", state.session, 10000);
		state.resuming = false;
		if (!response.ok) {
			const nickname = state.session.nickname || "";
			clearSession();
			elements.nicknameInput.value = nickname;
			setConnectionStatus("online", "Connected");
			showHome(response.message || "Your saved room has expired.", "error");
			return;
		}
		saveSession(response.session);
		setRoomInUrl(response.session.roomCode);
		setConnectionStatus("online", "Connected");
	}

	async function startGame() {
		if (!isHost()) return;
		setBusy(elements.startGameBtn, true, "Starting...");
		playSound("gameStart");
		const response = await emitWithAck("startGame", {});
		setBusy(elements.startGameBtn, false);
		if (!response.ok) showToast(response.message || "Could not start the quiz.", "error");
	}

	async function nextQuestion() {
		if (!isHost()) return;
		setBusy(elements.nextQuestionBtn, true, "Loading...");
		playSound("buttonClick");
		const response = await emitWithAck("nextQuestion", {});
		setBusy(elements.nextQuestionBtn, false);
		if (!response.ok) showToast(response.message || "Could not continue.", "error");
	}

	async function resetGame() {
		if (!isHost()) return;
		setBusy(elements.playAgainBtn, true, "Resetting...");
		playSound("buttonClick");
		const response = await emitWithAck("resetGame", {});
		setBusy(elements.playAgainBtn, false);
		if (!response.ok) showToast(response.message || "Could not reset the room.", "error");
	}

	async function leaveRoom() {
		if (state.leaving) return;
		state.leaving = true;
		elements.leaveRoomBtn.disabled = true;
		elements.leaveRoomBtn.classList.add("is-leaving");
		if (socket.connected && state.session) {
			await emitWithAck("leaveRoom", {}, 5000);
		}
		const nickname = state.session ? state.session.nickname : elements.nicknameInput.value;
		clearSession();
		elements.nicknameInput.value = nickname || "";
		elements.leaveRoomBtn.disabled = false;
		elements.leaveRoomBtn.classList.remove("is-leaving");
		state.leaving = false;
		showHome("You left the room.", "success");
	}

	async function copyRoomCode() {
		const code = state.session && state.session.roomCode;
		if (!code) return;
		try {
			await navigator.clipboard.writeText(code);
			showToast(`Room code ${code} copied.`, "success");
		} catch (_error) {
			showToast(`Room code: ${code}`);
		}
	}

	async function shareRoom() {
		const code = state.session && state.session.roomCode;
		if (!code) return;
		const inviteUrl = new URL(window.location.href);
		inviteUrl.searchParams.set("room", code);
		const shareData = {
			title: "Join my Scam Slayer quiz",
			text: `Join room ${code} for the Scam Slayer cyber-safety quiz.`,
			url: inviteUrl.toString(),
		};
		try {
			if (navigator.share) await navigator.share(shareData);
			else {
				await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
				showToast("Invite link copied.", "success");
			}
		} catch (error) {
			if (error && error.name !== "AbortError") {
				showToast(`Share room code ${code}.`);
			}
		}
	}

	function initialiseSound() {
		const stored = localStorage.getItem(SOUND_KEY);
		const enabled = stored !== "off";
		if (window.soundSystem) window.soundSystem.enabled = enabled;
		updateSoundButton(enabled);
	}

	function updateSoundButton(enabled) {
		elements.soundToggle.setAttribute("aria-pressed", String(enabled));
		const icon = elements.soundToggle.querySelector("span[aria-hidden='true']");
		const label = elements.soundToggle.querySelector(".button-label");
		if (icon) icon.textContent = enabled ? "🔊" : "🔇";
		if (label) label.textContent = enabled ? "Sound on" : "Sound off";
	}

	function toggleSound() {
		const enabled = window.soundSystem ? window.soundSystem.toggle() : false;
		localStorage.setItem(SOUND_KEY, enabled ? "on" : "off");
		updateSoundButton(enabled);
		if (enabled) playSound("buttonClick");
	}

	function handleRoomState(room) {
		state.room = room;
		updateRoomChrome();
		setRoomInUrl(room.roomCode);
		updateLobby(room);

		if (room.state === "lobby") {
			showScreen(elements.lobbyScreen);
		} else if (room.state === "question") {
			updateAnswerProgress({
				answeredCount: room.players.filter((player) => player.hasAnswered && player.connected).length,
				totalPlayers: room.players.filter((player) => player.connected).length,
			});
		} else if (room.state === "results" && state.result) {
			updateResultControls(Boolean(state.result.isLastQuestion));
		} else if (room.state === "finished") {
			if (isHost()) {
				elements.playAgainBtn.hidden = false;
				elements.gameOverWaiting.hidden = true;
			}
		}
	}

	socket.on("connect", () => {
		setConnectionStatus("online", "Connected");
		if (state.session) resumeSession();
	});

	socket.on("disconnect", () => {
		setConnectionStatus("offline", "Reconnecting");
		if (state.session && !state.leaving) {
			showToast("Connection lost. Your room will be restored automatically.", "error");
		}
	});

	socket.on("connect_error", () => {
		setConnectionStatus("offline", "Server unavailable");
	});

	socket.on("appConfig", (config) => {
		state.config = { ...state.config, ...config };
		elements.homeQuestionCount.textContent = String(config.totalQuestions);
		elements.homeQuestionSeconds.textContent = `${config.questionSeconds}s`;
	});

	socket.on("roomState", handleRoomState);
	socket.on("newQuestion", renderQuestion);
	socket.on("answerProgress", updateAnswerProgress);
	socket.on("questionResult", renderQuestionResult);
	socket.on("gameOver", renderGameOver);
	socket.on("gameReset", () => {
		state.question = null;
		state.result = null;
		state.hasAnswered = false;
		state.selectedAnswer = null;
		if (state.room) {
			state.room.state = "lobby";
			updateLobby(state.room);
		}
		showScreen(elements.lobbyScreen);
		showToast("The room is ready for another round.", "success");
	});
	socket.on("playerJoined", (data) => {
		if (!state.session || data.playerId !== state.session.playerId) {
			playSound("playerJoin");
			showToast(`${data.nickname} joined the room.`, "success");
		}
	});
	socket.on("playerAnswered", (data) => {
		if (!state.session || data.playerId !== state.session.playerId) {
			showToast(`${data.nickname} locked an answer.`);
		}
	});

	elements.hostBtn.addEventListener("click", createRoom);
	elements.joinBtn.addEventListener("click", joinRoom);
	elements.startGameBtn.addEventListener("click", startGame);
	elements.nextQuestionBtn.addEventListener("click", nextQuestion);
	elements.playAgainBtn.addEventListener("click", resetGame);
	elements.leaveRoomBtn.addEventListener("click", leaveRoom);
	elements.copyCodeBtn.addEventListener("click", copyRoomCode);
	elements.shareRoomBtn.addEventListener("click", shareRoom);
	elements.soundToggle.addEventListener("click", toggleSound);

	elements.roomCodeInput.addEventListener("input", () => {
		const normalized = normalizedRoomCode(elements.roomCodeInput.value);
		if (elements.roomCodeInput.value !== normalized) {
			elements.roomCodeInput.value = normalized;
		}
	});

	elements.nicknameInput.addEventListener("keydown", (event) => {
		if (event.key === "Enter") {
			event.preventDefault();
			if (normalizedRoomCode(elements.roomCodeInput.value).length === 6) joinRoom();
			else createRoom();
		}
	});

	elements.roomCodeInput.addEventListener("keydown", (event) => {
		if (event.key === "Enter") {
			event.preventDefault();
			joinRoom();
		}
	});

	window.addEventListener("beforeunload", () => stopTimer());

	const savedNickname = localStorage.getItem(NICKNAME_KEY);
	if (state.session && state.session.nickname) {
		elements.nicknameInput.value = state.session.nickname;
	} else if (savedNickname) {
		elements.nicknameInput.value = savedNickname;
	}

	const roomFromUrl = normalizedRoomCode(
		new URL(window.location.href).searchParams.get("room")
	);
	if (roomFromUrl) elements.roomCodeInput.value = roomFromUrl;
	initialiseSound();
	updateRoomChrome();
	setConnectionStatus(socket.connected ? "online" : "connecting", socket.connected ? "Connected" : "Connecting");
})();
