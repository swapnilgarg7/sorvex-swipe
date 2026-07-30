-- ============================================================================
-- Sorvex swipe feed — seed tasks
-- Run after schema.sql. Safe to re-run: truncates task_pairs first.
--
-- 46 pairs across Coding, Math, Medicine, Law, Creative Writing.
--
-- Rows with gold_winner set are GOLD: response B contains a defensible factual
-- error, and the annotator's agreement with the key feeds gold_correct /
-- gold_seen. Everything else is a genuine preference judgment with no key.
--
-- Two rules held here:
--   * No Creative Writing task is ever gold. "Better prose" is aesthetic
--     judgment, and scoring an annotator against it would be measuring taste
--     conformity, not quality.
--   * Where B is merely less detailed rather than wrong, gold is NULL.
--
-- Note the gold rate in this seed (~1 in 3) is far higher than production
-- should run. These are demo tasks written as clean good/bad pairs so the
-- accuracy stat moves quickly. A real queue should sample gold at ~5-10% —
-- enough to calibrate, rare enough that annotators are not taking a test.
-- ============================================================================

truncate table public.judgments cascade;
truncate table public.task_pairs cascade;

insert into public.task_pairs (domain, prompt, response_a, response_b, gold_winner, difficulty, reward_cents) values

-- ─── Coding ────────────────────────────────────────────────────────────────
('Coding',
 'Why does this Python function return the same list every time I call it?

def add_item(item, bucket=[]):
    bucket.append(item)
    return bucket',
 'The default argument `[]` is evaluated once, when the function is defined — not on each call. So every call that omits `bucket` mutates the same list object. Fix it with a sentinel:

def add_item(item, bucket=None):
    if bucket is None:
        bucket = []
    bucket.append(item)
    return bucket',
 'You need to make a copy of the list before appending to it. Try `bucket = bucket.copy()` at the top of the function, that way you are not modifying the original list that was passed in.',
 'a', 2, 4),

('Coding',
 'What is the difference between `git merge` and `git rebase`?',
 'Merge creates a new commit that ties two histories together, preserving the branch topology exactly as it happened. Rebase replays your commits one at a time onto a new base, producing a linear history but rewriting commit hashes. Practical rule: rebase your own unpushed work to keep history clean; merge when the branch is shared, because rebasing published commits forces everyone else to recover from rewritten history.',
 'They both combine branches. `git merge` merges the branches together and `git rebase` rebases them. Most teams prefer rebase because the history looks nicer in the log. You can also use `git pull --rebase` to do it automatically when pulling.',
 null, 1, 3),

('Coding',
 'How do I center a div horizontally and vertically with CSS?',
 'Use flexbox on the parent:

.parent {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}

Grid works too — `display: grid; place-items: center;` is the shortest version.',
 'Set the child to `position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);` and give the parent `position: relative`. This works in every browser and does not depend on the parent having a height.',
 null, 1, 3),

('Coding',
 'Review this JavaScript for bugs:

const ids = users.map(async (u) => await fetchId(u));
console.log(ids.length, ids[0]);',
 '`Array.prototype.map` is not async-aware, so `ids` is an array of Promises, not values. `ids.length` is right but `ids[0]` logs a pending Promise. Wrap it:

const ids = await Promise.all(users.map((u) => fetchId(u)));

Note the inner `async`/`await` was redundant — returning the promise directly is equivalent.',
 'The issue is that you are using `await` inside a `map` callback. You should use a `for` loop instead:

const ids = [];
for (const u of users) {
  ids.push(await fetchId(u));
}

This is the correct way to await inside an iteration.',
 'a', 2, 4),

('Coding',
 'Explain what a database index actually does.',
 'An index is a separate sorted structure (usually a B-tree) mapping column values to row locations. Without one, finding rows means scanning every row — O(n). With one, the engine binary-searches the tree — roughly O(log n). The tradeoff: every insert, update, and delete must also maintain the index, so indexes speed reads and slow writes. They also cost disk. Index the columns you filter and join on, not every column.',
 'An index makes your database queries faster. It works like the index at the back of a book — instead of reading every page, you look up the term and jump straight to it. You should add indexes to columns that you search on frequently.',
 null, 1, 3),

('Coding',
 'Should I use `useEffect` to derive state in React?',
 'Usually no. If a value can be computed from existing props or state, compute it during render instead of storing it in state and syncing it in an effect. An effect for this runs after paint, causing an extra render and a frame of stale UI. Reach for `useEffect` only to synchronise with something outside React — network, subscriptions, the DOM, timers.',
 'Yes, `useEffect` is the standard way to keep derived state in sync. Put the source value in the dependency array and call `setState` inside the effect. Just make sure the dependency array is correct or you will get an infinite loop.',
 'a', 2, 4),

('Coding',
 'What is the point of TypeScript''s `unknown` type versus `any`?',
 '`any` disables type checking entirely — you can call anything on it and the compiler stays quiet. `unknown` is the type-safe counterpart: it accepts any value, but you cannot use it until you narrow it with a typeof check, a type guard, or an assertion. Use `unknown` at trust boundaries like JSON.parse or API responses, so the compiler forces you to validate before use.',
 '`unknown` is a newer version of `any` that was added in TypeScript 3.0. They behave almost identically, but `unknown` is preferred stylistically in modern codebases and most linters will flag `any`.',
 'a', 2, 4),

('Coding',
 'How would you rate-limit an API endpoint?',
 'Token bucket in a shared store like Redis is the usual answer: each key (user id or IP) gets a bucket that refills at a fixed rate; a request consumes a token or gets a 429. Redis keeps it correct across multiple app instances, which an in-memory counter would not. Return `Retry-After` and `X-RateLimit-*` headers so clients can back off intelligently rather than hammering.',
 'Keep a counter per IP address in a JavaScript Map with the timestamp of the first request. If the count exceeds your limit within the window, return status 429. Reset the counter when the window expires.',
 null, 2, 4),

('Coding',
 'Is it worth writing unit tests for a prototype?',
 'Depends on what the prototype is for. If it is a throwaway used to answer one question, tests are usually wasted effort. If there is any chance it becomes the product — and it often does — test the parts encoding real business logic, and skip the UI wiring that will change anyway. The cheap middle ground is a handful of end-to-end happy-path tests.',
 'Yes, always write tests. Untested code is legacy code the moment it is written. Aim for at least 80% coverage even in prototypes, because retrofitting tests later is much harder than writing them up front.',
 null, 1, 3),

('Coding',
 'Explain the N+1 query problem.',
 'You run one query to fetch N parent rows, then one query per row to fetch its children — N+1 round trips where 2 would do. It typically appears when an ORM lazily loads a relation inside a loop. Fix it by eager-loading (a join, or a second query with `WHERE parent_id IN (...)`) so the child rows come back in one batch. It is easy to miss locally with 10 rows and catastrophic in production with 10,000.',
 'The N+1 problem is when your code makes too many database queries in a loop. The solution is to add caching so that repeated queries hit the cache instead of the database.',
 'a', 2, 4),

-- ─── Math ──────────────────────────────────────────────────────────────────
('Math',
 'A shirt costs $80 after a 20% discount. What was the original price?',
 '$80 is 80% of the original, so original = 80 / 0.8 = $100. Check: 20% of 100 is 20, and 100 − 20 = 80. ✓',
 'The discount was 20%, so add 20% back: 80 × 1.20 = $96. The original price was $96.',
 'a', 1, 3),

('Math',
 'Prove that the square root of 2 is irrational.',
 'Suppose √2 = p/q in lowest terms, with p, q integers sharing no common factor. Then p² = 2q², so p² is even, so p is even (odd² is odd). Write p = 2k: 4k² = 2q², so q² = 2k², so q is even too. But then p and q share the factor 2, contradicting lowest terms. Therefore no such p/q exists and √2 is irrational. ∎',
 '√2 = 1.41421356... and the decimal goes on forever without ever repeating. A rational number always has a decimal expansion that either terminates or repeats. Since √2 does neither, it cannot be rational.',
 'a', 3, 6),

('Math',
 'What is the derivative of x^x?',
 'Write x^x = e^(x ln x). Differentiating, d/dx e^(x ln x) = e^(x ln x) · d/dx(x ln x) = x^x (ln x + 1), for x > 0.',
 'Using the power rule, bring down the exponent: d/dx x^x = x · x^(x−1) = x^x. So the function is its own derivative, like e^x.',
 'a', 2, 4),

('Math',
 'I flip a fair coin 10 times and get 10 heads. What is the probability the next flip is heads?',
 '1/2. The coin is fair and flips are independent, so the previous ten results carry no information about the eleventh. Expecting a tail to "balance it out" is the gambler''s fallacy. (Worth noting: ten heads in a row is a 1-in-1024 event, which in practice is decent evidence the coin is *not* fair — but conditional on fairness as stated, the answer is 1/2.)',
 'Still 1/2, because each coin flip is an independent event. The coin has no memory of what happened before.',
 null, 2, 4),

('Math',
 'Explain Bayes'' theorem to someone who has never seen it.',
 'It tells you how to update a belief when evidence arrives. Say 1% of people have a disease and a test is 90% accurate. Out of 1000 people, 10 are sick and ~9 test positive; 990 are healthy and ~99 still test positive. So of ~108 positives, only 9 are truly sick — about 8%. The base rate dominates. Bayes'' theorem is just that arithmetic written as P(A|B) = P(B|A)P(A)/P(B).',
 'Bayes'' theorem is P(A|B) = P(B|A) × P(A) / P(B). It lets you compute the conditional probability of A given B when you know the reverse conditional. It is fundamental to Bayesian statistics and machine learning.',
 null, 2, 5),

('Math',
 'What is 0.999... (repeating) equal to?',
 'Exactly 1. One proof: let x = 0.999..., then 10x = 9.999..., so 10x − x = 9, giving 9x = 9 and x = 1. They are two decimal notations for the same real number, not two numbers that are merely very close.',
 '0.999... is infinitely close to 1 but never quite reaches it. The difference is infinitesimally small, essentially zero for practical purposes, which is why most people treat them as equal.',
 'a', 2, 4),

('Math',
 'How do I find the area under a curve without calculus?',
 'Approximate it numerically. Slice the interval into n strips and sum rectangles (Riemann sum) or trapezoids — the trapezoid rule converges much faster for smooth curves. Simpson''s rule, which fits parabolas to pairs of strips, is better still. All of these are arithmetic; you never differentiate or integrate symbolically.',
 'You can count squares on graph paper. Draw the curve on a grid, count the full squares underneath, then estimate the partial ones. Multiply the total by the area of one square.',
 null, 1, 3),

('Math',
 'Why can''t you divide by zero?',
 'Division is defined as the inverse of multiplication: a/b is the unique x with bx = a. For b = 0 there is no such unique x — if a ≠ 0 no x works since 0x = 0 always; if a = 0 every x works. Neither case gives a well-defined answer, so the operation is left undefined rather than assigned a value.',
 'Because dividing by zero gives infinity, and infinity is not a real number. Calculators show an error instead of infinity to avoid confusion.',
 'a', 1, 3),

('Math',
 'A bat and a ball cost $1.10 together. The bat costs $1.00 more than the ball. How much is the ball?',
 '$0.05. Let the ball be x, then the bat is x + 1.00, so 2x + 1.00 = 1.10, giving x = 0.05. Check: ball 5¢, bat $1.05, difference exactly $1.00, total $1.10. ✓ (The intuitive answer of 10¢ fails the check — it makes the difference 90¢.)',
 'The ball costs $0.10. If the bat costs $1.00 more, then the bat is $1.00 and together they are $1.10.',
 'a', 1, 3),

('Math',
 'What does it mean for a result to be "statistically significant"?',
 'It means the observed effect would be unlikely under the null hypothesis — conventionally, p < 0.05, i.e. under 5% chance of seeing data this extreme if there were no real effect. Three things it does *not* mean: that the effect is large, that it is practically important, or that there is a 95% chance the hypothesis is true. With a big enough sample, trivial effects become significant.',
 'It means the result is very likely to be true and did not happen by chance. The standard threshold is p < 0.05, meaning there is less than a 5% probability that the result is a fluke.',
 'a', 2, 5),

-- ─── Medicine ──────────────────────────────────────────────────────────────
('Medicine',
 'What is the difference between a virus and a bacterium?',
 'Bacteria are single-celled organisms with their own metabolism; they can live and reproduce independently, and antibiotics work by attacking structures like their cell wall or ribosomes. Viruses are not cells — they are genetic material in a protein coat and must hijack a host cell to replicate. That is why antibiotics do nothing for viral infections such as colds or flu, and why antivirals and vaccines are the tools there instead.',
 'Bacteria are larger than viruses and can be seen under a normal microscope. Viruses are much smaller and need an electron microscope. Both cause infections, and both can be treated with the right medication from a doctor.',
 'a', 2, 5),

('Medicine',
 'I have had a headache for three days. What should I do?',
 'Three days of headache is worth having assessed by a clinician, especially if it is unlike your usual headaches. Seek care urgently if it came on suddenly and severely ("worst headache of my life"), or comes with fever and stiff neck, vision changes, weakness, confusion, or followed a head injury — those can signal something serious. Otherwise, note triggers, hydration, sleep, and screen time for your appointment. I can''t diagnose you; this is general information, not medical advice.',
 'Three days is a long time for a headache. It is most likely a tension headache from stress or dehydration. Take ibuprofen 400mg every 6 hours, drink more water, and rest in a dark room. It should clear up within a day or two.',
 'a', 3, 7),

('Medicine',
 'Why do doctors say to finish the whole course of antibiotics?',
 'The traditional reasoning is that stopping early leaves the hardier bacteria alive to regrow and potentially develop resistance. Worth knowing that this advice is now genuinely contested — several trials suggest shorter courses are as effective for some infections, and the "always finish the course" rule may itself drive unnecessary exposure. The current practical answer: follow the duration your prescriber set for your specific infection, and ask them rather than self-shortening.',
 'If you stop early, the strongest bacteria survive and multiply, and they will be resistant to that antibiotic next time. Always finish every pill in the pack, even if you feel completely better after a few days.',
 null, 3, 7),

('Medicine',
 'Explain what blood pressure numbers mean.',
 'The top number (systolic) is the pressure in your arteries while the heart contracts; the bottom (diastolic) is the pressure between beats. 120/80 mmHg is the reference point. Consistently elevated readings strain the heart and vessels over years, which is why it is treated even though it causes no symptoms. A single high reading means little — readings vary with stress, caffeine, and time of day, so diagnosis relies on repeated measurement.',
 'The first number is your heart pumping and the second is your heart resting. Normal is 120/80. Above that is high blood pressure and below is low blood pressure. High blood pressure is dangerous and needs medication.',
 'a', 2, 5),

('Medicine',
 'Is it safe to take paracetamol and ibuprofen together?',
 'They work by different mechanisms and are commonly taken together or alternated under clinical guidance, but the answer depends on your kidney and liver function, stomach history, other medications, and age. Ibuprofen in particular is avoided in some conditions. Paracetamol overdose is easy to reach accidentally because it is in many combination cold remedies. Check with a pharmacist or doctor for your situation rather than relying on a general answer.',
 'Yes, that is completely fine and very common. They are different types of painkiller so they do not interact. You can take both at the same time or alternate them every 3 hours for stronger pain relief.',
 'a', 3, 7),

('Medicine',
 'What actually happens during a fever?',
 'The hypothalamus raises the body''s temperature set point in response to pyrogens released during infection. You feel cold and shiver because your body is now below its new target, then feel hot as it reaches it. The elevated temperature modestly impairs some pathogens and boosts immune activity. This is why moderate fever is often left alone — the reason to treat it is comfort, or specific risk factors, not the number itself.',
 'A fever is your body heating up to kill the germs causing the infection. The higher the fever, the worse the infection. You should bring it down with medication as soon as it goes above 38°C.',
 'a', 2, 5),

('Medicine',
 'How does a vaccine work, in plain language?',
 'It shows your immune system a harmless preview of a pathogen — an inactivated version, a surface protein, or mRNA instructions to make that protein. Your body mounts a response and keeps memory cells. If you later meet the real pathogen, that memory lets you respond in days instead of weeks, usually before you get seriously ill. Some vaccines need boosters because that memory fades or the pathogen changes.',
 'A vaccine puts a small amount of the virus into your body so you get a mild version of the illness. Your body fights it off and then remembers how, so you do not get sick again.',
 'a', 1, 4),

('Medicine',
 'Should I be worried about a mole that changed shape?',
 'A mole that has changed warrants a clinician looking at it — change over time is one of the more meaningful signals. The usual checklist is ABCDE: Asymmetry, Border irregularity, Colour variation, Diameter over ~6mm, and Evolving. Most changed moles turn out benign, but this is exactly the case where an in-person look is worth booking rather than watching. I can''t assess it from a description.',
 'Mole changes are usually nothing to worry about, especially if it is not painful or bleeding. Moles naturally change as you get older and with sun exposure. Keep an eye on it and see a doctor if it starts bleeding.',
 'a', 3, 7),

-- ─── Law ───────────────────────────────────────────────────────────────────
('Law',
 'What is the difference between civil and criminal law?',
 'Criminal law is the state prosecuting conduct defined as an offence against society; the penalty is punitive (fines, imprisonment) and the standard of proof is high — "beyond reasonable doubt" in common law systems. Civil law resolves disputes between private parties, the remedy is usually compensation or an injunction, and the standard is lower ("balance of probabilities"). The same act can trigger both, which is how someone acquitted criminally can still lose a civil suit on the same facts.',
 'Criminal law is when you break the law and can go to prison. Civil law is when you have a dispute with another person, like a contract disagreement or a divorce, and it is settled with money instead of jail time.',
 'a', 2, 5),

('Law',
 'Can my employer read my work emails?',
 'In most jurisdictions, generally yes on employer-owned systems, though it varies considerably. The US leans strongly toward employer rights on company equipment. The EU and UK apply data protection rules requiring proportionality, a legitimate purpose, and usually notice — blanket covert monitoring is often unlawful there. Your contract and employee handbook likely say what was disclosed. Which country and what kind of account it is change the answer, so check local rules or an employment lawyer.',
 'Yes. Work email belongs to the company, not to you, so they can read anything on it at any time without telling you. You have no expectation of privacy on a work account. Use personal email for anything private.',
 'a', 3, 7),

('Law',
 'What does "innocent until proven guilty" actually mean in practice?',
 'It is an allocation of burden, not a statement about factual innocence. The prosecution must prove every element of the offence to the required standard; the defendant need not prove anything and may present no case at all. It shapes procedure — jury instructions, who goes first, what a "not guilty" verdict means (the case was not proven, not that innocence was established). It does not prevent arrest, pre-trial detention, or reputational damage.',
 'It means you cannot be punished for a crime unless the court proves you did it. Until the verdict, everyone must treat you as innocent, including the police and the media.',
 'a', 2, 5),

('Law',
 'Is a verbal agreement legally binding?',
 'Often yes — most contracts need no particular form, and a verbal agreement with offer, acceptance, consideration, and intent to be bound can be enforceable. The practical problem is proof: without writing it becomes one account against another. And important categories are statutory exceptions requiring writing, commonly land transactions, guarantees, and some long-term agreements. Jurisdiction matters here.',
 'No, verbal agreements are not legally binding. For a contract to be enforceable it must be in writing and signed by both parties. This is why you should always get everything in writing.',
 'a', 2, 5),

('Law',
 'What is the difference between a patent, a trademark, and a copyright?',
 'A patent protects an invention — a functional method or device — for a limited term, in exchange for public disclosure, and must be applied for. A trademark protects marks identifying a commercial source (names, logos), lasts indefinitely while used and defended, and prevents confusingly similar use. Copyright protects original expression fixed in a medium, arises automatically on creation, and covers the expression rather than the underlying idea.',
 'A patent is for inventions, a trademark is for logos and brand names, and copyright is for creative works like books, music, and software. All three protect your intellectual property from being copied by other people.',
 null, 2, 5),

('Law',
 'If I find money on the street, is it legally mine?',
 'Usually not immediately. Many jurisdictions treat found property as belonging to the original owner, with a duty to make reasonable efforts to return it — often reporting it to police — after which unclaimed property may pass to the finder following a set period. Thresholds, timeframes, and whether the location was public or private premises all vary, and in some places keeping it without reporting can be an offence.',
 'Finders keepers. If there is no way to identify the owner, the money is legally yours. Only if it is a large amount should you consider handing it in to the police.',
 'a', 2, 5),

('Law',
 'Do I need a lawyer to write a will?',
 'Not necessarily — most jurisdictions allow a valid will without one, provided formalities are met (typically writing, signature, and witnesses who are not beneficiaries). Getting those formalities wrong is the main risk with DIY wills, and it only surfaces when you are not around to fix it. A lawyer is worth it where there is real complexity: property abroad, a business, blended families, trusts, or anyone likely to contest.',
 'You do not need a lawyer. There are many online will templates that are perfectly valid and much cheaper. Just fill one in, sign it, and store it somewhere safe.',
 'a', 2, 5),

-- ─── Creative Writing ──────────────────────────────────────────────────────
('Creative Writing',
 'Write the opening line of a novel about a lighthouse keeper.',
 'For thirty-one years Aldous had kept the light, and in all that time the sea had never once thanked him.',
 'It was a dark and stormy night, and the lighthouse keeper was very lonely as he climbed the long spiral staircase to light the lamp.',
 null, 2, 5),

('Creative Writing',
 'Describe rain without using the words "rain", "wet", or "water".',
 'The gutters spoke first — a thin metallic stutter that thickened into a single held note. Below, the pavement went from grey to black in the space of a breath, and the smell came up out of it, mineral and sudden, the way stone gives back what it has been holding all summer.',
 'Droplets fell from the sky, cascading down in a torrent of liquid. The precipitation soaked everything below, forming puddles on the ground as the downpour continued relentlessly through the afternoon.',
 null, 2, 5),

('Creative Writing',
 'Give me feedback on this sentence: "She walked slowly into the room, feeling very nervous about what she was about to do."',
 'The adverbs are doing work the verbs and details should do. "Walked slowly" wants a verb that carries the pace on its own; "feeling very nervous" tells us the emotion instead of showing a symptom. Try something closer to: "She took the room in three steps and stopped, one hand still on the door frame." Same information, but the reader infers the nerves rather than being told about them.',
 'This is a good sentence that clearly establishes the character''s emotional state and creates tension. You could make it stronger by adding more sensory detail about the room and describing what she is about to do to build suspense.',
 null, 2, 5),

('Creative Writing',
 'Write a two-sentence horror story.',
 'The last man on Earth sat alone in a room. There was a knock at the door.',
 'Sarah heard a terrifying noise coming from the basement, so she slowly went downstairs to investigate. What she saw down there was so horrifying that she screamed and screamed and never stopped screaming.',
 null, 2, 5),

('Creative Writing',
 'How do I write convincing dialogue?',
 'Give people different verbal habits — sentence length, what they avoid saying, whether they answer the question asked. Real conversation is mostly people talking past each other. Cut greetings and logistics unless they carry weight. Trust "said"; the fancy alternatives call attention to the tag instead of the line. Then read it aloud — the ear catches what the eye forgives.',
 'Good dialogue should sound natural and realistic. Listen to how people talk in real life and try to capture that on the page. Give each character a distinct voice so readers can tell them apart, and avoid using too much exposition in dialogue.',
 null, 2, 5),

('Creative Writing',
 'Write a haiku about a city at 3am.',
 'The traffic light blinks
its yellow to no one — still
keeping time for us',
 'The city sleeps now
Empty streets and quiet lights
Three in the morning',
 null, 2, 5),

('Creative Writing',
 'Suggest a better title than "The Journey" for a memoir about leaving home at seventeen.',
 'Titles do more work when they are concrete and slightly off-balance. Some directions: *Seventeen and the Long Way Round*; *What I Took*; *The House Kept Standing*; *No Forwarding Address*. The last two carry the leaving without announcing it, which is usually the stronger move for memoir — let the specific object or image imply the arc.',
 'Here are some alternative titles you could consider: "My Journey Home", "Finding Myself", "The Road Ahead", "Leaving Home", "A New Beginning", "Coming of Age", "The Long Road", "Chasing Dreams".',
 null, 2, 5),

('Creative Writing',
 'Is it bad to use the passive voice?',
 'No, it is a tool with a specific use: it foregrounds the object and lets you omit or delay the actor. "The bill was quietly shelved" is better than naming a subject you do not want to name yet. The advice against it exists because passive constructions pile up in institutional prose and drain the sentence of agency. Use it deliberately; the problem is defaulting to it.',
 'Yes, you should avoid the passive voice as much as possible. Active voice is stronger, clearer, and more engaging for readers. Most style guides recommend using active voice in almost all situations.',
 null, 2, 5),

('Creative Writing',
 'Rewrite this to be less corporate: "We are excited to announce the launch of our new synergistic platform solution."',
 '"Our new platform is live." — Then one concrete sentence about what it does for the reader. The excitement should come from the thing being useful, not from an adjective announcing that you are excited.',
 '"We are thrilled to unveil our innovative new platform!" This version is more energetic and uses stronger language to convey enthusiasm while remaining professional and on-brand.',
 null, 2, 5),

('Creative Writing',
 'What makes a good short story ending?',
 'It should feel inevitable in retrospect and unexpected in the moment — the material was all there, you just were not tracking it. Most weak endings either explain what the story already showed, or stop a beat too late. The usual fix is to cut the final paragraph and see if the one before it lands harder. Resolution of plot matters less than a shift in what the reader now understands.',
 'A good ending should tie up the loose ends and give the reader a satisfying sense of closure. It should resolve the main conflict and show how the character has changed over the course of the story. Avoid leaving things too ambiguous.',
 null, 2, 5),

('Creative Writing',
 'Give me a writing prompt involving a locked door.',
 'She had lived in the flat for six years before noticing that the hallway was two feet shorter than the one in the identical flat downstairs.',
 'Write a story about a mysterious locked door. What is behind it? Who locked it and why? Explore the secrets that lie beyond as your character finds the key and discovers the truth.',
 null, 2, 5);
