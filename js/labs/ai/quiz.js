// AI quiz bank. a[0] is the correct answer. Every item must make sense on its own (the Memory Lab re-asks it).
// Answers are at most 32 characters. Stored as 'ai:<id>'.
const K = 'kids', M = 'middle', H = 'high', A = 'adult';
const q = (id, b, question, a, f) => ({ id, b, q: question, a, f });

export const QUIZ = [
  // ---------- kids (class 1 to 5) ----------
  q('k-what', K, 'What does AI stand for?', ['Artificial intelligence', 'Animal instinct', 'Automatic internet'], 'AI means artificial intelligence: computers doing tasks that seem smart.'),
  q('k-learn', K, 'How does a robot learn to tell fruits from vegetables?', ['From many labelled examples', 'By tasting them', 'It already knows at birth'], 'We show it examples with the right answers. It finds patterns in them.'),
  q('k-example', K, 'To teach an AI cats from dogs, you need lots of...', ['Pictures with labels', 'Batteries', 'Loud music'], 'Labelled pictures are its training data. More variety helps it learn.'),
  q('k-wrong', K, 'Can an AI make mistakes?', ['Yes, it can be wrong', 'No, never', 'Only on Sundays'], 'AI makes guesses from patterns. Guesses can be wrong, so we check.'),
  q('k-more', K, 'What usually helps an AI guess better?', ['More and varied examples', 'A brighter screen', 'Fewer examples'], 'More examples, and different kinds of them, help it learn the real pattern.'),
  q('k-clue', K, 'Which clue helps most to tell a lemon from a banana?', ['Its shape', 'Its colour', 'Its name tag size'], 'Both are yellow, so colour does not help. Shape does: round vs long.'),
  q('k-feel', K, 'A chatbot types "I am sad". Does it feel sad like you?', ['No, it makes words', 'Yes, just like you', 'Only when it rains'], 'Chatbots put words together from patterns. They do not have feelings like people.'),
  q('k-private', K, 'An app asks for your home address. What should you do?', ['Ask a trusted adult first', 'Type it in right away', 'Share it with friends too'], 'Your address is private. Always ask a trusted adult before sharing it.'),
  q('k-check', K, 'A chatbot tells you a fact for homework. What next?', ['Check it in a good book', 'Copy it, it is always right', 'Ask it to shout louder'], 'Chatbots can be wrong. Check facts in a trusted book or website.'),
  q('k-voice', K, 'Which of these uses AI to understand your words?', ['A voice assistant', 'A paper book', 'A wooden spoon'], 'Voice assistants use AI to turn your speech into words and answer.'),
  q('k-brain', K, 'A neural network is a computer idea inspired by...', ['The brain', 'A tree root', 'A rainbow'], 'It is made of many tiny "neurons" that pass numbers along, a bit like brain cells.'),
  q('k-train', K, 'Giving an AI examples so it can learn is called...', ['Training', 'Painting', 'Sleeping'], 'Training means learning from examples, then guessing on new things.'),
  q('k-same', K, 'A robot only saw red apples. It may get confused by...', ['A green apple', 'A red apple', 'Another red apple'], 'It never saw green apples, so it may think apples must be red.'),
  q('k-people', K, 'Who decides what an AI is used for?', ['People', 'The AI itself', 'The weather'], 'People build AI and choose how to use it, so people are responsible.'),

  // ---------- middle (class 6 to 8) ----------
  q('m-ml', M, 'Machine learning means a computer...', ['Learns patterns from data', 'Follows only fixed rules', 'Repairs its own machine'], 'Instead of writing every rule, we let it find patterns in examples.'),
  q('m-label', M, 'In training data, the correct answer for an example is its...', ['Label', 'Pixel', 'Password'], 'A label is the answer we attach, like "fruit" or "spam".'),
  q('m-feature', M, 'A measurable clue an AI uses, like colour or size, is a...', ['Feature', 'Folder', 'Firewall'], 'Features are the inputs the model looks at to make its guess.'),
  q('m-neuron', M, 'An artificial neuron adds up its inputs times...', ['Weights', 'Colours', 'Passwords'], 'Each input is multiplied by a weight, added up with a bias, then squashed.'),
  q('m-learnrate', M, 'In training, the learning rate controls...', ['How big each step is', 'How many pixels there are', 'The screen brightness'], 'Too small learns slowly. Too big overshoots and can blow up.'),
  q('m-loss', M, 'During training, the loss going down means...', ['Errors are getting smaller', 'The battery is draining', 'The AI is forgetting'], 'Loss measures how wrong the model is. Lower loss, fewer mistakes.'),
  q('m-bias', M, 'A face app works badly for some groups. Likely cause?', ['Unbalanced training data', 'The phone was too cold', 'Too many colours'], 'If some groups are missing from the data, the model learns less about them.'),
  q('m-chatbot', M, 'A chatbot writes text mainly by...', ['Predicting likely next words', 'Searching one fixed answer', 'Copying a random book'], 'Language models predict the next word piece again and again.'),
  q('m-confident', M, 'A chatbot answers in a very confident tone. This means...', ['Nothing: it can still be wrong', 'It is surely correct', 'It checked every source'], 'Confident wording is not proof. Check important facts.'),
  q('m-recommend', M, 'Why does a video app keep showing similar videos?', ['It learns from what you watch', 'It has only a few videos', 'Videos choose you'], 'Recommendation systems predict what you will click from your history.'),
  q('m-deepfake', M, 'A realistic fake video made with AI is called a...', ['Deepfake', 'Screensaver', 'Firewall'], 'Deepfakes can look real. Check trusted sources before believing or sharing.'),
  q('m-test', M, 'Why test an AI on examples it never saw?', ['To check it really learned', 'To make it slower', 'To save electricity'], 'A model can memorise. New examples show if it learned the real pattern.'),
  q('m-nearest', M, 'A nearest neighbour classifier labels a new drawing by...', ['Finding the most similar one', 'Counting its letters', 'Asking the internet'], 'It compares the new example to stored ones and copies the closest label.'),
  q('m-sure', M, 'A spam filter is 90% sure an email is spam. It is...', ['Usually right, not always', 'Always right', 'Always wrong'], 'A probability is not a promise. About 1 in 10 such guesses could be wrong.'),

  // ---------- high (class 9 to 12) ----------
  q('h-layers', H, 'Why can a network with hidden layers solve XOR?', ['It can make curved boundaries', 'It stores every answer', 'It uses more electricity'], 'One straight line cannot split XOR. Hidden neurons combine lines into curves.'),
  q('h-linear', H, 'A single neuron with no hidden layer can only draw a...', ['Straight line boundary', 'Circle boundary', 'Spiral boundary'], 'Without hidden layers the decision boundary is a straight line (or plane).'),
  q('h-backprop', H, 'Which algorithm sends the error backward to fix weights?', ['Backpropagation', 'Bubble sort', 'Binary search'], 'Backprop uses the chain rule to find how each weight changed the error.'),
  q('h-gradient', H, 'Gradient descent changes weights in the direction that...', ['Lowers the loss', 'Raises the loss', 'Keeps them random'], 'It steps downhill on the loss, a bit like walking down a valley.'),
  q('h-activation', H, 'Why do neurons use activations like tanh or ReLU?', ['To add non linearity', 'To add colour', 'To save disk space'], 'Without a non linear activation, stacked layers act like one straight line.'),
  q('h-overfit', H, 'Training accuracy 100%, test accuracy low. This is...', ['Overfitting', 'Underfitting', 'Perfect learning'], 'The model memorised the training points, including their noise.'),
  q('h-underfit', H, 'A model too simple to capture the pattern is...', ['Underfitting', 'Overfitting', 'Overclocking'], 'Like fitting a straight line to a ring of points. Add capacity.'),
  q('h-lr-big', H, 'The loss jumps up and down wildly. Most likely fix?', ['Lower the learning rate', 'Add more pixels', 'Remove the test set'], 'Big steps overshoot the minimum. Smaller steps settle down.'),
  q('h-token', H, 'Large language models predict the next...', ['Token (a word piece)', 'Whole book', 'Pixel colour'], 'Text is split into tokens: words or pieces of words.'),
  q('h-temp', H, 'Raising the temperature when sampling makes text...', ['More random and surprising', 'Always identical', 'Shorter'], 'High temperature flattens the probabilities, so rarer words get picked more.'),
  q('h-hallucinate', H, 'When a chatbot invents a false fact, it is called a...', ['Hallucination', 'Compilation', 'Calibration'], 'Fluent text is not the same as true text. Verify claims.'),
  q('h-softmax', H, 'Which function turns scores into probabilities that sum to 1?', ['Softmax', 'Square root', 'Absolute value'], 'Softmax exponentiates each score and divides by the total.'),
  q('h-split', H, 'Why keep a separate test set?', ['To measure unseen accuracy', 'To make training faster', 'To store backups'], 'Test data stays unseen in training, so it shows real performance.'),
  q('h-privacy', H, 'Safest choice before pasting text into a public chatbot?', ['Remove personal details', 'Add your password', 'Include your address'], 'Text you share may be stored. Leave out private or sensitive data.'),

  // ---------- adult (college / adult) ----------
  q('a-chain', A, 'Backpropagation computes gradients using the...', ['Chain rule', 'Pythagoras theorem', 'Bayes theorem'], 'Each layer passes back dL/da times its local derivative.'),
  q('a-bce', A, 'A common loss for binary classification is...', ['Binary cross entropy', 'Mean absolute pixel', 'Edit distance'], 'BCE = -[y log p + (1 - y) log(1 - p)]. It punishes confident wrong answers.'),
  q('a-l2', A, 'Adding L2 regularisation to the loss tends to...', ['Shrink weights, reduce overfit', 'Grow weights faster', 'Remove the bias terms'], 'Weight decay prefers smoother functions that generalise better.'),
  q('a-vanish', A, 'Deep sigmoid networks can learn slowly because of...', ['Vanishing gradients', 'Exploding pixels', 'Low disk space'], 'Sigmoid slopes are at most 0.25, so gradients shrink layer after layer.'),
  q('a-relu', A, 'ReLU outputs...', ['max(0, z)', '1 / (1 + e^-z)', 'z squared'], 'ReLU is cheap and does not saturate for positive inputs.'),
  q('a-momentum', A, 'Momentum in gradient descent...', ['Smooths steps using past ones', 'Resets weights each step', 'Doubles the dataset'], 'It keeps a running velocity, damping zigzags and speeding up flat areas.'),
  q('a-knn', A, 'k nearest neighbours does almost all its work at...', ['Prediction time', 'Training time', 'Install time'], 'Training just stores examples. Prediction compares to all of them.'),
  q('a-nb', A, 'Naive Bayes assumes features are...', ['Independent given the class', 'Always continuous', 'Sorted alphabetically'], 'The "naive" part. It is often wrong but still works surprisingly well.'),
  q('a-ngram', A, 'A bigram model predicts the next word from...', ['The previous word only', 'The whole document', 'A random dictionary'], 'It counts word pairs. LLMs use far longer context via neural networks.'),
  q('a-greedy', A, 'Sampling at temperature near 0 approaches...', ['Always picking the top token', 'Uniform random picks', 'Picking the rarest token'], 'Dividing logits by a tiny T makes the largest one dominate.'),
  q('a-proxy', A, 'A hiring model trained on past decisions may...', ['Repeat past unfairness', 'Become unbiased automatically', 'Ignore all its inputs'], 'Models learn patterns in the data, including historical bias.'),
  q('a-calib', A, 'A well calibrated model saying 70% is right about...', ['70% of the time', '100% of the time', '7% of the time'], 'Calibration means stated confidence matches real frequency.'),
  q('a-scale', A, 'Compared with a toy n gram, an LLM mainly differs by...', ['Huge neural nets and data', 'Using no probabilities', 'Never making errors'], 'Same next token idea, vastly more parameters, data and context.'),
  q('a-human', A, 'For high stakes AI decisions, good practice is...', ['A human reviews and decides', 'Fully automatic approval', 'Hide how it works'], 'Keep people accountable, check errors and allow appeals.'),
];
