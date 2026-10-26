// Money & Life quiz bank. a[0] is the correct answer (each answer at most 32 characters).
// Every item makes sense on its own, because the Memory Lab re-asks it later.
// Rates in questions are examples ("say 10%"), never current real rates.
const K = 'kids', M = 'middle', H = 'high', A = 'adult';
const q = (id, b, question, a, f) => ({ id, b, q: question, a, f });

export const QUIZ = [
  // ---------- kids (class 1 to 5) ----------
  q('k-need-food', K, 'Which one is a NEED?', ['Food and water', 'A new video game', 'A fifth toy car'], 'Needs are things we must have to live, stay healthy and learn.'),
  q('k-want-toy', K, 'A new toy when you already have many is a...', ['Want', 'Need', 'Bill'], 'Wants are nice extras. We can live without them.'),
  q('k-save-why', K, 'Why do we save some money?', ['For later and for problems', 'To throw it away', 'Because coins are heavy'], 'Savings help with big goals and with surprises, like a broken bottle.'),
  q('k-bank-safe', K, 'Where is a safe place to keep savings?', ['A bank account', 'Under a loose stone', 'In your school bag'], 'A bank keeps money safe and records it in your name.'),
  q('k-otp-stranger', K, 'A stranger asks for the OTP on mum\'s phone. You...', ['Say no and tell mum', 'Read it out', 'Text it to them'], 'An OTP is a secret key. Never share it. Tell a grown up.'),
  q('k-secret-pin', K, 'Should you tell a stranger a PIN or OTP?', ['Never', 'Only if they are polite', 'Yes, if they call'], 'PINs and OTPs are like keys to a house. Keep them secret.'),
  q('k-rupee', K, 'What is the symbol for the Indian rupee?', ['₹', '$', '€'], 'The rupee symbol is ₹. $ is the dollar and € is the euro.'),
  q('k-coins-100', K, 'How many ₹10 coins make ₹100?', ['10', '5', '100'], '10 + 10 + ... ten times is 100.'),
  q('k-change', K, 'You pay ₹50 for a ₹35 pen. Your change is...', ['₹15', '₹25', '₹5'], '50 take away 35 is 15. Always count your change.'),
  q('k-bill', K, 'After you buy something, the shop should give a...', ['Bill', 'Medal', 'Ticket'], 'A bill shows what you bought and what you paid.'),
  q('k-mrp', K, 'MRP printed on a packet means...', ['Most a shop can charge', 'Least you must pay', 'Price for kids only'], 'MRP is the Maximum Retail Price. Shops should not charge more.'),
  q('k-rte', K, 'Children aged 6 to 14 have a right to...', ['Free school education', 'A free phone', 'Free toys'], 'The Right to Education (RTE) says every child 6 to 14 gets free schooling.'),
  q('k-prize', K, '"You won a prize! Pay ₹500 to get it." This is...', ['Probably a scam', 'A real gift', 'A school test'], 'Real prizes never ask you to pay first.'),
  q('k-interest', K, 'Extra money a bank adds to your savings is...', ['Interest', 'A fine', 'Change'], 'Banks pay interest because they use your money to lend to others.'),
  q('k-budget', K, 'A plan for how to use your money is a...', ['Budget', 'Bonus', 'Bargain'], 'A budget splits money into needs, wants and savings before you spend.'),

  // ---------- middle (class 6 to 8) ----------
  q('m-want', M, 'Which one is a WANT?', ['Branded shoes you do not need', 'School shoes that fit', 'Medicine when sick'], 'If your shoes already work, a brand name is a want.'),
  q('m-emergency', M, 'An emergency fund is money kept for...', ['Unexpected problems', 'Weekend shopping', 'Buying gifts'], 'It saves you when something breaks or someone falls sick.'),
  q('m-upi-receive', M, 'To RECEIVE money on UPI you must...', ['Do nothing, no PIN needed', 'Enter your UPI PIN', 'Scan their QR code'], 'Receiving never needs a PIN. A PIN is only for sending money.'),
  q('m-collect', M, 'Approving a UPI collect request with your PIN...', ['Sends your money out', 'Brings money in', 'Only checks balance'], 'A collect request asks YOU to pay. Your PIN approves the payment.'),
  q('m-bank-otp', M, 'Does a real bank ever ask for your OTP?', ['Never', 'Yes, on phone calls', 'Only by SMS'], 'Banks never ask for OTP, PIN or CVV. Anyone who asks is a scammer.'),
  q('m-simple', M, '₹1,000 at say 10% simple interest for 2 years. Interest?', ['₹200', '₹210', '₹100'], 'Simple: 10% of 1,000 is 100 each year, so 2 years give 200.'),
  q('m-compound', M, '₹1,000 at say 10% compound for 2 years. Total?', ['₹1,210', '₹1,200', '₹1,100'], 'Year 1: 1,100. Year 2: 1,100 + 110 = 1,210. Interest earns interest.'),
  q('m-compound-what', M, 'Compound interest is interest on...', ['Money plus past interest', 'Only the first amount', 'Only the last year'], 'Each year, the interest is added in and starts earning too.'),
  q('m-ifsc', M, 'An IFSC code tells you which...', ['Bank branch', 'Mobile network', 'School'], 'IFSC identifies a bank branch, so money goes to the right place.'),
  q('m-qr-receive', M, 'A buyer says "scan my QR to get paid". That is...', ['A scam trick', 'The normal way', 'Safe if it is quick'], 'Scanning a QR and entering a PIN pays money out, it never receives.'),
  q('m-1930', M, 'Which helpline number is for cyber fraud in India?', ['1930', '1234', '5050'], 'Call 1930 quickly, or report at cybercrime.gov.in. Also tell your bank.'),
  q('m-vote', M, 'At what age can you vote in India?', ['18', '16', '21'], 'Indian citizens can vote from the age of 18.'),
  q('m-minor-contract', M, 'Can a 15 year old sign a binding contract?', ['No, you must be 18', 'Yes, anytime', 'Only on weekends'], 'A contract with a minor (under 18) is not valid in India.'),
  q('m-fd', M, 'A Fixed Deposit keeps money in the bank for a...', ['Set time at a set rate', 'Shopping trip', 'Single day only'], 'You lock money for a time and earn interest at the rate agreed.'),
  q('m-duty', M, 'Which one is a fundamental DUTY?', ['Protect the environment', 'Get free toys', 'Skip school'], 'Protecting nature, lakes, forests and wildlife is a duty of every citizen.'),
  q('m-faulty', M, 'New earphones under warranty break in a week. You...', ['Go back with bill and warranty', 'Just throw them away', 'Quietly buy new ones'], 'Under warranty they should be repaired or replaced. Keep the bill.'),

  // ---------- high (class 9 to 12) ----------
  q('h-503020', H, 'In a 50/30/20 budget, the 20% usually goes to...', ['Savings', 'Wants', 'Needs'], '50% needs, 30% wants, 20% savings. A starting rule you can adjust.'),
  q('h-rule72', H, 'At say 8% a year compound, money doubles in about...', ['9 years', '4 years', '20 years'], 'Rule of 72: 72 divided by 8 is 9 years.'),
  q('h-emi', H, 'EMI stands for...', ['Equated Monthly Instalment', 'Extra Money Interest', 'Easy Money Income'], 'An EMI is the same amount paid every month until a loan is cleared.'),
  q('h-longer-loan', H, 'A longer loan usually means...', ['Lower EMI, more interest', 'Higher EMI, less interest', 'No interest at all'], 'Stretching a loan lowers each EMI but you pay interest for longer.'),
  q('h-inflation', H, 'With inflation, prices over time usually...', ['Go up', 'Go down', 'Never change'], 'Inflation means the same things cost more later.'),
  q('h-real', H, 'Savings earn 4%, prices rise 6%. Your buying power...', ['Falls', 'Rises', 'Stays the same'], 'Prices grew faster than your money, so it buys less.'),
  q('h-never-share', H, 'Which should you NEVER share with anyone?', ['OTP, PIN or CVV', 'Your bank\'s name', 'Your city'], 'These secrets let someone take your money. Banks never ask for them.'),
  q('h-pan', H, 'A PAN card is mainly used for...', ['Tax and money records', 'Train tickets', 'School marks'], 'PAN is a Permanent Account Number used for income tax and big money deals.'),
  q('h-aadhaar', H, 'Aadhaar is a...', ['12 digit identity number', 'Bank balance', 'Tax rate'], 'Aadhaar is a 12 digit identity number for residents of India.'),
  q('h-min-due', H, 'Paying only the minimum due on a credit card...', ['Leaves costly interest', 'Is free forever', 'Closes the card'], 'The unpaid part keeps growing with high interest. Pay the full bill if you can.'),
  q('h-insurance', H, 'Insurance works by...', ['Many people pooling risk', 'Banks giving free money', 'Stopping all accidents'], 'Many pay a small premium. The few who face a loss get paid from the pool.'),
  q('h-premium', H, 'The amount you pay for insurance is called the...', ['Premium', 'Claim', 'Refund'], 'You pay the premium. When something goes wrong, you make a claim.'),
  q('h-motor', H, 'Which insurance is required by law for vehicles on roads?', ['Third party insurance', 'Pet insurance', 'Phone insurance'], 'In India, third party motor insurance is compulsory for vehicles on public roads.'),
  q('h-digital-arrest', H, 'A "police" video call demands money to avoid arrest. It is...', ['A scam, hang up', 'Normal procedure', 'A real court order'], 'There is no "digital arrest". Police never ask you to transfer money on a call.'),
  q('h-start-early', H, 'Same amount, same rate, same end year. Who ends with more?', ['The one who starts early', 'The one who starts late', 'Both end the same'], 'More years means more rounds of interest on interest.'),
  q('h-mrp-tax', H, 'Are taxes included in the MRP?', ['Yes, MRP includes taxes', 'No, add them on top', 'Only on Sundays'], 'MRP is inclusive of all taxes. Nothing extra should be added.'),

  // ---------- adult (college / adult) ----------
  q('a-emi-n', A, 'In the EMI formula, n is the...', ['Number of months', 'Interest rate', 'Loan amount'], 'EMI = P r (1 + r)^n / ((1 + r)^n - 1), with r the monthly rate.'),
  q('a-emi-zero', A, '₹1,20,000 at 0% interest over 12 months. EMI?', ['₹10,000', '₹12,000', '₹1,000'], 'With no interest, just divide: 1,20,000 / 12 = 10,000.'),
  q('a-total-int', A, 'Total interest paid on a loan equals...', ['EMI × months minus loan', 'Loan × rate, once', 'EMI minus the rate'], 'Everything you paid back, minus what you borrowed, is interest.'),
  q('a-freq', A, 'Same yearly rate, compounded monthly instead of yearly...', ['Gives slightly more', 'Gives less', 'Gives exactly the same'], 'Interest is added sooner, so it starts earning sooner.'),
  q('a-real-return', A, 'Your real return is roughly...', ['Return minus inflation', 'Return plus inflation', 'Return times tax'], 'Earn 7% while prices rise 5%, and you are only about 2% richer.'),
  q('a-emergency-size', A, 'An emergency fund is often said to cover...', ['A few months of expenses', 'One day of expenses', 'Ten years of salary'], 'Many planners suggest about 3 to 6 months of needs. Adjust to your life.'),
  q('a-credit-score', A, 'Paying EMIs and card bills on time helps your...', ['Credit score', 'Phone battery', 'Tax rate'], 'Lenders check your credit history before giving loans.'),
  q('a-sim-swap', A, 'Your SIM suddenly stops working, then bank alerts. Do...', ['Call your bank and telco', 'Wait a week', 'Post it online'], 'It could be a SIM swap fraud. Block quickly, then report at 1930.'),
  q('a-check-msg', A, 'Safest way to check a "bank" message?', ['Use the official app', 'Click the SMS link', 'Call the SMS number'], 'Go to the bank yourself, through its official app or website.'),
  q('a-term', A, 'Term life insurance pays out if the insured...', ['Dies within the term', 'Gets a new job', 'Buys a car'], 'It protects the family who depend on that person\'s income.'),
  q('a-health', A, 'Health insurance mainly helps pay...', ['Hospital bills', 'Grocery bills', 'School fees'], 'A hospital stay can cost more than many months of savings.'),
  q('a-consumer', A, 'Where can buyers file consumer complaints?', ['Consumer commission', 'Cricket board', 'Post office only'], 'District, state and national consumer commissions hear complaints.'),
  q('a-keep-bill', A, 'Why keep the bill after a purchase?', ['Proof for warranty', 'It looks nice', 'Shops ask later'], 'The bill proves when and where you bought it, and the price.'),
  q('a-infl-calc', A, 'At say 6% inflation, ₹100 of groceries next year cost about...', ['₹106', '₹94', '₹160'], '6% of 100 is 6, so about 106.'),
  q('a-flat', A, 'Flat 10% vs reducing balance 10%. Which costs more?', ['Flat rate', 'Reducing balance', 'They are equal'], 'Flat rate charges interest on the full loan even as you repay it.'),
  q('a-comp3', A, '₹10,000 at say 10% compound for 3 years becomes...', ['₹13,310', '₹13,000', '₹13,100'], '10,000 to 11,000 to 12,100 to 13,310.'),
];
