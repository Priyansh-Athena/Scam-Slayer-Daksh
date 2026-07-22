/**
 * Scam Slayer question bank.
 *
 * The set is adapted from the user-provided "scam slayer.pdf" and lightly
 * edited where official guidance or website addresses have changed.
 */
const questions = [
	{
		id: 1,
		category: "Bank impersonation",
		question:
			"You get a call from someone who says he is from SBI. He says your account will be blocked and asks for your ATM PIN. What should you do?",
		options: [
			"Tell him your PIN immediately to save the account",
			"Hang up. A genuine bank will not ask for your ATM PIN.",
			"Give him only the last four digits of your PIN",
			"Call a family member first, then give the PIN",
		],
		correct: 1,
		tip:
			"Never share an ATM PIN, UPI PIN, OTP, password, or card security code with anyone - including a person claiming to be a bank employee. End the call and contact the bank through the number printed on your card or its official app.",
	},
	{
		id: 2,
		category: "KYC phishing",
		question:
			"You get a call saying: 'Your SBI account KYC has expired and the account will be blocked in 24 hours. Share your Aadhaar and bank details now.' What should you do?",
		options: [
			"Share the details quickly to avoid the account being blocked",
			"Ask the caller to call tomorrow",
			"Hang up and verify through the bank's official app, website, helpline, or branch.",
			"Share only your Aadhaar number",
		],
		correct: 2,
		tip:
			"Fraudsters create urgency around KYC to obtain personal details, OTPs, or remote access. Do not use a link or number supplied by an unsolicited caller. Use only a channel you independently know is official.",
	},
	{
		id: 3,
		category: "UPI and QR codes",
		question:
			"A stranger sends a QR code on WhatsApp and says, 'Scan this to receive Rs.2,000 from a government scheme.' What should you remember?",
		options: [
			"Scanning and entering a UPI PIN will credit Rs.2,000",
			"A payment QR can make you send money; receiving money does not require your UPI PIN.",
			"Every QR code from WhatsApp is safe",
			"A QR code can only install a virus",
		],
		correct: 1,
		tip:
			"Scanning a payment QR may open a pay screen. Money is sent only after you approve the transaction, and a UPI PIN is used to authorise a payment - not to receive money. Never enter a UPI PIN to claim a prize or refund.",
	},
	{
		id: 4,
		category: "OTP safety",
		question:
			"You receive a six-digit OTP. A caller claiming to be from TRAI asks for it to 'verify your SIM'. Should you share it?",
		options: [
			"Yes, because TRAI is a government body",
			"Yes, if the caller sounds official",
			"No. Never share an OTP with an unsolicited caller.",
			"Share it after checking the caller's employee ID",
		],
		correct: 2,
		tip:
			"An OTP can authorise a login, password reset, or transaction. A genuine bank, telecom company, or government agency will not ask you to read out an OTP received for a sensitive action.",
	},
	{
		id: 5,
		category: "Remote-access apps",
		question:
			"Someone asks you to install AnyDesk or TeamViewer so they can 'help fix your phone'. What is the main risk?",
		options: [
			"There is no risk",
			"The app will only slow down the phone",
			"The person may see or control your screen and steal sensitive information.",
			"The app always charges a download fee",
		],
		correct: 2,
		tip:
			"Remote-access tools are legitimate, but scammers misuse them. Never install one for an unexpected caller. Use remote help only with a trusted person and understand exactly what access you are granting.",
	},
	{
		id: 6,
		category: "Fake government schemes",
		question:
			"You see a Facebook post: 'Government of India is giving Rs.1,500 to every senior citizen. Click this link to apply.' What should you do?",
		options: [
			"Click and enter Aadhaar and bank details",
			"Share it so others can apply",
			"Do not use the link. Verify the scheme on an official government website or at an authorised service centre.",
			"Trust it if neighbours have shared it",
		],
		correct: 2,
		tip:
			"A post may copy official logos and still be fraudulent. Independently search for the scheme on a government domain or confirm it through an authorised government office before sharing any information.",
	},
	{
		id: 7,
		category: "Digital arrest",
		question:
			"A caller says your Aadhaar is linked to a criminal case and asks for Rs.10,000 by UPI to cancel an arrest warrant. What is this?",
		options: [
			"A real emergency - pay immediately",
			"A 'digital arrest' scam. Police and courts do not collect such payments by phone.",
			"A genuine warning if the caller knows your name",
			"A matter that can be settled by paying half",
		],
		correct: 1,
		tip:
			"There is no legal process called a digital arrest. End the call, do not transfer money, tell a trusted person, and report financial cyber fraud quickly on 1930 or cybercrime.gov.in.",
	},
	{
		id: 8,
		category: "Fake banking websites",
		question:
			"Which address is the current official SBI internet-banking portal?",
		options: [
			"www.sbi-india-bank.com",
			"https://onlinesbi.sbi.bank.in/",
			"www.sbi-customer-care.net",
			"Whichever result appears first in a search ad",
		],
		correct: 1,
		tip:
			"Type a known official address yourself or open the bank's official app. Lookalike domains and sponsored search results can lead to phishing pages. Check the complete domain before entering login details.",
	},
	{
		id: 9,
		category: "SMS phishing",
		question:
			"You receive an SMS: 'Your SBI account is suspended. Click bit.ly/SBI-KYC2024 immediately to update KYC.' What should you do?",
		options: [
			"Click the link quickly",
			"Call the number written in the SMS",
			"Do not use the link. Verify through SBI's official app, website, helpline, or branch.",
			"Forward the link to family members",
		],
		correct: 2,
		tip:
			"Shortened links hide the real destination. Do not sign in, install an app, or submit KYC documents through an unsolicited link. Open the bank's official channel independently.",
	},
	{
		id: 10,
		category: "Trading scams",
		question:
			"A neighbour says, 'I made Rs.50,000 in seven days on this trading app. Invest Rs.5,000 and it will double.' What should you think?",
		options: [
			"Invest before the offer closes",
			"Invest after seeing one bank statement",
			"Guaranteed fast returns are a major scam warning sign.",
			"Invest Rs.500 first as a test",
		],
		correct: 2,
		tip:
			"No legitimate investment can guarantee rapid, risk-free returns. Do not rely on screenshots or referrals. Verify the intermediary through official SEBI resources and seek advice from a properly registered professional.",
	},
	{
		id: 11,
		category: "Lookalike links",
		question:
			"An SMS says your PhonePe wallet will be deactivated and asks you to update PAN details at paytm-kyc-update.com. What is wrong?",
		options: [
			"Nothing - it looks official",
			"The message and domain do not match; the link is suspicious.",
			"It is safe if the wallet balance is low",
			"You should enter details and then contact support",
		],
		correct: 1,
		tip:
			"Scammers use familiar brand names inside unrelated domains. Open the payment app yourself and check notifications there. Never submit PAN, card, OTP, or password information through an unsolicited SMS link.",
	},
	{
		id: 12,
		category: "Lottery scams",
		question:
			"A WhatsApp message says: 'You won Rs.5,00,000 in a KBC lottery. Send a Rs.500 registration fee to claim it.' What should you do?",
		options: [
			"Pay before the offer expires",
			"Share it with family and then pay",
			"Delete and block it. You cannot win a lottery you did not enter.",
			"Call the unknown number to confirm",
		],
		correct: 2,
		tip:
			"Advance-fee scams begin with a small payment and then demand more for tax, processing, or release charges. Do not engage, pay, or share personal information.",
	},
	{
		id: 13,
		category: "Call forwarding",
		question:
			"A caller says your SIM will be blocked and asks you to enable call forwarding using a code or phone setting. What can happen?",
		options: [
			"Your SIM is renewed automatically",
			"Your incoming calls may be diverted to the scammer, helping them intercept verification calls.",
			"Nothing - call forwarding is only a network test",
			"Your phone bill is reduced",
		],
		correct: 1,
		tip:
			"Never activate call forwarding on instructions from an unknown caller. If you think it was enabled, check your phone's call settings and contact your telecom provider through its official support channel.",
	},
	{
		id: 14,
		category: "Fake police video calls",
		question:
			"A person in police uniform video-calls you and says you are under 'digital arrest' and must not tell anyone. What should you do?",
		options: [
			"Stay on the call and cooperate",
			"Pay the requested fine",
			"End the call. Government agencies do not arrest or investigate people this way.",
			"Stay on the call until an electronic warrant arrives",
		],
		correct: 2,
		tip:
			"Uniforms, fake offices, forged documents, and threats are used to create panic. Stop, think, end the call, tell someone you trust, and report the incident.",
	},
	{
		id: 15,
		category: "TRAI impersonation",
		question:
			"Someone claiming to be from 'TRAI Headquarters' says your number will be disconnected unless you share Aadhaar details. What is this?",
		options: [
			"A genuine TRAI verification call",
			"An impersonation scam. TRAI does not call individual customers to threaten disconnection.",
			"Safe after checking an employee ID",
			"Safe if you share Aadhaar but not an OTP",
		],
		correct: 1,
		tip:
			"Questions about your mobile connection should be verified with your telecom service provider using its official customer-care channel. Suspected fraud calls or messages can also be reported through Sanchar Saathi's Chakshu facility.",
	},
	{
		id: 16,
		category: "Customer-care impersonation",
		question:
			"A WhatsApp number claiming to be Amazon Customer Care asks for your address and debit-card number to process a refund. What should you do?",
		options: [
			"Share everything to receive the refund",
			"Share only the order ID",
			"Ignore the request and check the order inside the official Amazon app or website.",
			"Call the same number back",
		],
		correct: 2,
		tip:
			"A genuine company should not need your full card number, PIN, CVV, or OTP to issue a refund. Start support conversations from the official app or website rather than from an unsolicited message.",
	},
	{
		id: 17,
		category: "Ponzi schemes",
		question:
			"A YouTube ad promises: 'Invest Rs.10,000 and earn Rs.50,000 in 30 days - guaranteed.' A friend says he was paid. What should you think?",
		options: [
			"Invest before the slots fill",
			"Invest a small amount first",
			"This is likely a Ponzi or fake-investment scam. Do not invest.",
			"It is safe if the app is in an app store",
		],
		correct: 2,
		tip:
			"Early participants may be paid with money from newer victims to create trust. App-store availability, testimonials, and account screenshots do not prove that an investment is legitimate.",
	},
	{
		id: 18,
		category: "WhatsApp stock scams",
		question:
			"You are added to a WhatsApp group called 'SEBI Certified Stock Tips'. Members post huge-profit screenshots and ask you to invest through a private app. What is happening?",
		options: [
			"A genuine group because it says SEBI certified",
			"A likely fake-investment scam using staged members and screenshots.",
			"A safe opportunity if you invest only a little",
			"A safe opportunity after asking the group for a registration number",
		],
		correct: 1,
		tip:
			"Scam groups use fake experts, fake members, and fake dashboards to build confidence. Verify any adviser independently through official SEBI channels and never install or fund a private app sent through a chat group.",
	},
	{
		id: 19,
		category: "Sextortion",
		question:
			"After an unexpected WhatsApp video call, someone claims to have recorded an intimate video with your face and demands Rs.50,000. What should you do?",
		options: [
			"Pay immediately",
			"Negotiate and pay less",
			"Do not pay. Preserve evidence, block the account, tell a trusted person, and report it.",
			"Delete WhatsApp and say nothing",
		],
		correct: 2,
		tip:
			"Paying usually leads to repeated demands. Save screenshots, numbers, payment details, and messages without forwarding intimate content. Report at cybercrime.gov.in or call 1930 for financial cyber fraud, and contact local police if you are in immediate danger.",
	},
	{
		id: 20,
		category: "Loan-app harassment",
		question:
			"A loan app gave you Rs.5,000 and now demands Rs.25,000 in three days, threatening to send your photos to your contacts. What should you do?",
		options: [
			"Pay every amount demanded immediately",
			"Borrow from family to satisfy the callers",
			"Do not pay extortion demands. Preserve evidence, contact the lender through official channels, and report the harassment.",
			"Delete the app and ignore all evidence",
		],
		correct: 2,
		tip:
			"Threats, contact-list abuse, and morphed-photo blackmail should be reported. Keep records of the loan and payments, inform your bank, report the app and callers at cybercrime.gov.in or 1930, and seek local legal or police help when needed.",
	},
];

module.exports = questions;
