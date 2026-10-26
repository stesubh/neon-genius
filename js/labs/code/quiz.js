// Quick-check questions for Robot Run concepts (blocks and robot JavaScript). Tracked with app.memory.track for spaced review.
// a: [correct, wrong1, wrong2], each 32 characters or less. Items must make sense without the 3D scene.
export const CONCEPT_QUIZ = {
  seq: [
    { id: 'code:seq-order', b: 'kids', q: 'A computer program runs its steps...', a: ['In order, top to bottom', 'In a random order', 'All at the same time'], f: 'Computers follow a sequence: one step, then the next, exactly as written.' },
    { id: 'code:bug', b: 'kids', q: 'A mistake in a program is called a...', a: ['Bug', 'Loop', 'Variable'], f: 'Finding and fixing bugs is called debugging. Every programmer does it.' },
  ],
  loop: [
    { id: 'code:loop-what', b: 'kids', q: 'In coding, what does a loop do?', a: ['Repeats steps', 'Makes a choice', 'Stores a number'], f: 'A loop runs the code inside it again and again, so you do not have to copy it.' },
    { id: 'code:nested-loop', b: 'kids', q: 'Repeat 3 times (repeat 4 times: step). How many steps?', a: ['12', '7', '4'], f: 'The inner loop runs fully each time the outer loop runs: 3 times 4 is 12.' },
  ],
  cond: [
    { id: 'code:if-what', b: 'kids', q: 'In coding, an if block runs its inside when...', a: ['Its condition is true', 'The program starts', 'It is the last block'], f: 'if checks a condition. True: run the inside. False: skip it.' },
    { id: 'code:while-what', b: 'kids', q: 'A while loop stops when...', a: ['Its condition becomes false', 'It has run 10 times', 'The computer gets tired'], f: 'while checks its condition before every round and stops as soon as it is false.' },
  ],
  fn: [
    { id: 'code:fn-what', b: 'kids', q: 'In coding, a function is...', a: ['A named group of steps', 'A kind of number', 'A broken loop'], f: 'Build it once, then use it by its name as many times as you like.' },
  ],
  var: [
    { id: 'code:var-what', b: 'kids', q: 'In coding, a variable is like...', a: ['A named box for a value', 'A loop that never ends', 'A robot sensor'], f: 'Variables store values your program can read and change, like a score in a game.' },
  ],
  boss: [
    { id: 'code:algorithm', b: 'kids', q: 'A step-by-step plan to solve a problem is...', a: ['An algorithm', 'A variable', 'A syntax error'], f: 'Algorithms are recipes for solving problems. Maze rules, sorting and searching are all algorithms.' },
  ],
};

export const JS_QUIZ = {
  seq: [
    { id: 'code:js-call', b: 'middle', q: 'In robot.forward(); what do the () do?', a: ['Run the function now', 'Start a comment', 'Make a new variable'], f: 'Brackets after a function name call it: they tell it to run right now.' },
    { id: 'code:js-semicolon', b: 'middle', q: 'In JavaScript, what does ; usually mark?', a: ['The end of a statement', 'The start of a loop', 'A comment'], f: 'A semicolon ends one command, like a full stop ends a sentence.' },
  ],
  loop: [
    { id: 'code:js-for', b: 'middle', q: 'for (let i = 0; i < 5; i++) runs the body...', a: ['5 times', '4 times', '6 times'], f: 'i takes the values 0, 1, 2, 3 and 4. That is 5 rounds.' },
  ],
  cond: [
    { id: 'code:js-not', b: 'middle', q: 'In JavaScript, what does ! mean in !robot.atGoal()?', a: ['NOT', 'Very important', 'Call it twice'], f: '! flips true to false and false to true.' },
  ],
  fn: [
    { id: 'code:js-function', b: 'middle', q: 'Which line defines a function?', a: ['function hop() { ... }', 'hop();', 'let hop = 5;'], f: 'The keyword function creates it. hop(); then calls (runs) it.' },
  ],
  var: [
    { id: 'code:js-plusplus', b: 'middle', q: 'let n = 4; n++; Now n is...', a: ['5', '4', '8'], f: 'n++ adds 1 to n. n-- takes 1 away.' },
  ],
  boss: [
    { id: 'code:right-hand', b: 'middle', q: 'Keep one hand on the wall to solve a maze. This is...', a: ['The wall-follower rule', 'A sorting algorithm', 'A syntax error'], f: 'Following one wall always finds the exit of a maze whose walls are all connected.' },
  ],
};
