// Writes public/demo/support-messages.csv, the demo dataset (SPEC.md, "Demo
// dataset"): 200 hand-written customer-support messages, each rated by five
// synthetic raters. Seeded, so every run writes the same file. Run with
// `node scripts/build-demo.mjs` after changing anything here, then rerun
// scripts/golden.py; the tests in src/demo/ check the story still holds.

import { mkdirSync, writeFileSync } from 'node:fs'

// Chosen among seeds that keep every story property so that nominal first-seen
// order reads Positive, Neutral, Negative, Sarcastic, with α nearest 0.6. A new
// seed or model must pass the tests in src/demo/ again.
const SEED = 20260937
const OUTPUT = new URL('../public/demo/support-messages.csv', import.meta.url)

// The share of ratings left out, as if the rater skipped the message.
const MISSING = 0.08

// Each message's true category. A rater reads the message against it.
const MESSAGES = {
  Positive: [
    'Thanks so much, the refund came through this morning.',
    'Your agent Maria was fantastic, problem solved in five minutes.',
    'The new update fixed the sync issue. Great work!',
    "Love the redesigned app, it's so much faster now.",
    'Just wanted to say the delivery arrived a day early. Thank you!',
    'Setup took two minutes. Really impressed.',
    'Appreciate you replacing the cracked screen at no charge.',
    "Best customer service I've had from any company this year.",
    'The dark mode is lovely, my eyes thank you.',
    'Order arrived well packed and exactly as described.',
    'Thank you for extending my trial, it made a real difference.',
    'Your help article on exporting data was perfectly clear.',
    'The chat support was quick and friendly.',
    'Everything works now. Thanks for your patience with me.',
    'Great to see the price stayed the same after the upgrade.',
    'The courier was polite and even carried it upstairs.',
    'Really happy with the headphones, sound is excellent.',
    'You went above and beyond sorting out my account. Thank you.',
    'The installer was on time and tidy. Five stars.',
    'My issue was escalated and fixed within the hour. Brilliant.',
    'Thanks for the quick reply over the weekend!',
    'The size exchange was painless, thank you.',
    'So glad you brought back the classic layout.',
    'Loving the new loyalty rewards.',
    'Kudos to the team, the outage was handled really well.',
    'The replacement part fit perfectly. Much appreciated.',
    'I was worried about the return, but it was easy.',
    'The tutorial videos are genuinely helpful.',
    'Thanks for refunding the duplicate charge without any fuss.',
    'My parcel was tracked every step of the way. Very reassuring.',
    "The app's new search finds everything instantly. Love it.",
    'Thank you, Sam, for staying on the line until it worked.',
    'Great product, great support, will buy again.',
    'The discount code worked perfectly, thanks!',
    'Impressed that you called back when you said you would.',
    'The battery lasts all week now. Fantastic update.',
    'Very smooth checkout, well done.',
    'The warranty claim was approved in a day. Thank you!',
    'Your team fixed a bug I reported within a week. Amazing.',
    'Cheers for the heads-up about the maintenance window.',
    'Delighted with the quality of the jacket.',
    'Thanks for making cancellation so straightforward.',
    'The engineer explained everything clearly. Really helpful.',
    'Wonderful experience from start to finish.',
    'The gift wrapping was beautiful, my mum loved it.',
    'Thank you for honouring the old price.',
    "Quick, polite and effective. Couldn't ask for more.",
    'The new invoice layout is much easier to read, thanks.',
    'Everything arrived in perfect condition. Happy customer here.',
    'Really appreciate the personal note in the box.',
  ],
  Neutral: [
    'What time does support open on Saturdays?',
    'Can I change the delivery address on order 4471?',
    'How do I export my data to CSV?',
    'Is the blue version still in stock?',
    'Please send me a copy of my last invoice.',
    'Does the premium plan include phone support?',
    "I'd like to update the email address on my account.",
    'When will the new model be available in Canada?',
    'Can I pay by bank transfer?',
    'Which charger is compatible with the X2?',
    'How long does a standard refund usually take?',
    'Please cancel my subscription at the end of this month.',
    'Is there a student discount?',
    "I've moved house; how do I update my billing address?",
    'Do you ship to Norway?',
    "What's the difference between the Basic and Plus plans?",
    'My order number is 88213, just confirming it was received.',
    'Can two people share one account?',
    'Where can I find the user manual?',
    'I need a VAT receipt for my purchase last week.',
    'Is the app available on tablets?',
    'Can I schedule a delivery for next Tuesday?',
    'What are your returns hours at the London store?',
    "I'm writing to confirm my appointment on the 14th.",
    'How do I reset my password?',
    'Does the warranty cover accidental damage?',
    'Could you tell me the dimensions of the large box?',
    "I'd like to switch to annual billing.",
    'Is there an API for the reporting feature?',
    'Please add my colleague to our team workspace.',
    'What payment methods do you accept?',
    'Can I pick up my order in store instead?',
    'Is the sale price applied automatically at checkout?',
    'How many devices can I use with one licence?',
    'I received the parcel today.',
    'Can you confirm whether my return has been processed?',
    "What's the weight limit for the standard courier?",
    'Do gift cards expire?',
    "I'd like to know the status of ticket 5520.",
    'Is the product made from recycled materials?',
    'Can I change my username?',
    'When does the summer sale end?',
    'Is there a phone number I can call instead of chat?',
    'Please remove my card details from the account.',
    'How do I turn off email notifications?',
    'Which languages does the app support?',
    'My contract renews in March; what will the price be?',
    'Can I add a second address for deliveries?',
    'Do you offer installation with the washing machine?',
    "I'll be away next week, so please hold the delivery.",
  ],
  Negative: [
    'My order is three weeks late and nobody replies to my emails.',
    'The app crashes every time I open the camera.',
    'I was charged twice for the same order.',
    'The replacement arrived broken, just like the first one.',
    "I've been on hold for forty minutes. This is unacceptable.",
    'The heater stopped working after two days.',
    'Your courier left my parcel in the rain.',
    'I want a refund. The product is nothing like the photos.',
    'I cancelled last month and you still took payment.',
    'The update deleted all my saved playlists.',
    'Nobody told me the store was closing early. Wasted trip.',
    'The zip broke the first time I wore the jacket.',
    "I've explained my problem to four different agents now.",
    'The login page has been down all morning.',
    'My discount code was rejected at checkout.',
    'The chair arrived with two missing screws and no instructions.',
    'Your agent hung up on me mid-conversation.',
    'The battery drains in under three hours.',
    "I'm still waiting for the refund you promised in May.",
    'The tracking link has said "in transit" for ten days.',
    'The food was cold and the order was wrong.',
    'Very disappointed with the quality of the print.',
    'You sent the wrong size again.',
    'The installer never showed up and never called.',
    "My account was locked and support won't unlock it.",
    'The new pricing is a rip-off.',
    'The headphones stopped charging after a week.',
    'I got a bill for a service I never ordered.',
    'The website keeps logging me out.',
    "Terrible experience, I won't be ordering again.",
    'The phone overheats when I use maps.',
    'Half my order was missing from the box.',
    "You changed the layout and now I can't find anything.",
    'The warranty claim was rejected with no explanation.',
    'The package was clearly opened before it reached me.',
    'Your chatbot just loops back to the main menu.',
    "I've been overcharged for three months in a row.",
    'The sofa has a tear in the fabric.',
    'Delivery slot missed twice this week.',
    "The instructions are wrong and the part doesn't fit.",
    "I'm really frustrated. Nothing has been fixed.",
    'The subscription renewed without any warning.',
    'The printer jams on every other page.',
    'My complaint from last month was simply closed.',
    'The noise from the fridge keeps me up at night.',
    "Cancelling my account shouldn't take six emails.",
    'Sync has been broken since the last update.',
    'The paint started peeling within a month.',
    'Your store staff were rude and unhelpful.',
    'The refund went to a card I no longer have.',
    'Customer service promised a callback that never came.',
    "The mattress smells of chemicals and won't air out.",
    'The app charged me in dollars instead of pounds.',
    'The screen has a dead pixel right in the centre.',
    "This is the third faulty unit you've sent me.",
  ],
  Sarcastic: [
    'Oh great, another update that breaks everything. Love it.',
    'Wow, only three weeks for a reply. Truly lightning fast.',
    'Thanks so much for charging me twice. Very generous.',
    'Nothing says quality like a handle that falls off on day one.',
    'Brilliant, the "express" delivery took eleven days.',
    'I just love spending my Saturday on hold with you.',
    'Fantastic, the replacement is broken too. Consistency!',
    'Oh sure, cancelling was super easy. Only took six emails.',
    'Really impressed that the tracking page says "delivered". It wasn\'t.',
    'Wonderful, my password reset email arrived a day later.',
    "Great job losing my order again. You're getting good at it.",
    'Oh joy, the app logged me out mid-payment. Again.',
    'Such a treat to explain my problem to a fifth agent.',
    'Amazing how the price goes up every time I look away.',
    'Love that the "waterproof" jacket soaked me through.',
    'Five stars for the box. Shame about what was inside.',
    'Oh good, the chatbot understood me perfectly. Said no one ever.',
    'Thanks for the survey about the call you never returned.',
    "Nice touch leaving my parcel in the neighbour's bin.",
    'Such fast support. I only aged a year waiting.',
    'Of course the sale ended the minute I checked out.',
    'Brilliant idea to hide the cancel button. Very user friendly.',
    'I\'m thrilled my "new" phone came with someone else\'s photos.',
    'Love paying premium prices for a beta product.',
    'Oh wonderful, another password rule. My favourite.',
    'Clearly the instructions were written by a genius.',
    'Thanks for the 40% off coupon on a product you no longer sell.',
    'What a surprise, the courier "tried to deliver" while I was home.',
    'So glad I paid extra for next-day delivery that came next week.',
    "Your hold music is lovely. I've heard it for an hour.",
    "Glad to see the outage page is up. Shame the service isn't.",
    'Wow, a refund in only four months. Record time.',
    'Really love how the app forgets my settings every day.',
    'Superb quality. It lasted almost a whole week.',
    'Great to know my complaint is "important to you". Very convincing.',
    'Excellent, the fix made it worse. Well done, team.',
    'Oh perfect, the store closed ten minutes before the posted time.',
    'Loving the surprise fees at checkout. Keeps life exciting.',
    'Of course the one item I needed was the one you forgot.',
    'Nothing like a 2 a.m. maintenance window during my deadline.',
    'Thanks for the "quick" fix. It only took three visits.',
    'Such a helpful answer: "have you tried turning it off?"',
    'I adore how every update moves the settings menu.',
    'Yes, please send me a fourth email about the same sale.',
    'Top marks for the packaging. The glass inside, not so much.',
  ],
}

// How each rater misreads a message. `sarcasm` scales how often they take
// sarcasm at face value, as Negative; `unsure` is how often they fall back on
// Neutral for a message that isn't. Everyone also makes the occasional slip.
const RATERS = [
  { name: 'ana', sarcasm: 0.9, unsure: 0 },
  { name: 'ben', sarcasm: 1.1, unsure: 0 },
  { name: 'chloe', sarcasm: 0.8, unsure: 0 },
  { name: 'dana', sarcasm: 1, unsure: 0.35 },
  { name: 'eli', sarcasm: 1.2, unsure: 0 },
]

// A slip: any other category, at random.
const SLIP = 0.04

// At full ambiguity and a sarcasm factor of 1: how often sarcasm reads as
// Negative, and how often a plain complaint reads as Sarcastic.
const SARCASM_AS_NEGATIVE = 0.75
const NEGATIVE_AS_SARCASM = 0.3

// mulberry32: a small, well-mixed 32-bit PRNG, so the file needs no dependency.
function mulberry32(seed) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const random = mulberry32(SEED)
const CATEGORIES = Object.keys(MESSAGES)

function pick(values) {
  return values[Math.floor(random() * values.length)]
}

function shuffle(values) {
  const shuffled = [...values]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// One rater's label for a message. `ambiguity`, drawn once per message, is how
// easily its tone is misread: the same sarcastic message trips most raters.
function rate(rater, truth, ambiguity) {
  if (truth !== 'Neutral' && random() < rater.unsure) return 'Neutral'
  const misread = rater.sarcasm * ambiguity
  if (truth === 'Sarcastic' && random() < misread * SARCASM_AS_NEGATIVE) return 'Negative'
  if (truth === 'Negative' && random() < misread * NEGATIVE_AS_SARCASM) return 'Sarcastic'
  if (random() < SLIP) return pick(CATEGORIES.filter((category) => category !== truth))
  return truth
}

function csvField(value) {
  return /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

const messages = shuffle(
  Object.entries(MESSAGES).flatMap(([truth, texts]) => texts.map((text) => ({ truth, text }))),
)

const lines = ['item,rater,label,text']
messages.forEach(({ truth, text }, index) => {
  const item = `m${String(index + 1).padStart(3, '0')}`
  const ambiguity = random()
  for (const rater of RATERS) {
    // Drawn for every rating, missing or not, so tuning MISSING leaves the
    // labels alone.
    const label = rate(rater, truth, ambiguity)
    if (random() < MISSING) continue
    lines.push([item, rater.name, label, text].map(csvField).join(','))
  }
})

mkdirSync(new URL('.', OUTPUT), { recursive: true })
writeFileSync(OUTPUT, `${lines.join('\n')}\n`)
console.log(`Wrote ${messages.length} messages, ${lines.length - 1} ratings.`)
