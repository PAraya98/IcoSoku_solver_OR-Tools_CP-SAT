/*
 * Initialization and handling of the clingo emscripten module (named Clingo) to
 * solve instances of IcoSoku; the only global thing this code sets is function
 * solve()
 */
let Clingo = {};
let output = "";

Clingo = {
	'preRun': [],
	'postRun': [],
	'print': (function() {
		return function(text) {
			if (arguments.length > 1) text = Array.prototype.slice.call(arguments).join(' ');
			output += text + "\n";
		};
	})(),
	'printErr': function(text) { alert('stderr: ' + text) }
};

// Initialize Emscripten Module
Module( Clingo );

/* solve, given an array of 12 integers specifying an instance of IcoSoKu, calls
 * the clingo emscripten module on the correspoding ASP model (generated with
 * function generateInput) */
function solve( input_cap ) {
	options = "";
	output = "";
	Clingo.ccall('run', 'number', ['string', 'string'], [generateInput( input_cap ), options]);
	return output;
};

// local function 
let generateInput = function ( input_cap ) {
	let input = aspmodel;
	// Capacities
	for (let i = 0; i < input_cap.length; i++) {
		input = input + "cap(" + aspvertices[i] + ", " + input_cap[i] + ").\n";
	}
	return input;
};

let aspvertices = "abcdefghijklmnopqrstuvwxyz";
let aspmodel = `tile(1..n).
rotation(0..2).
#const m = 12.
#const n = 20.
vertex(a; b; c; d; e; f; g; h; i; j; k; l).
face(abc; acd; ade; aef; afb; bfk; bgc; bkg; cgh; chd; dhi; die; eij; ejf; fjk; gkl; glh; hli; ilj; jlk).
vrtx(a, abc, 0;  b, abc, 1;  c, abc, 2;   a, acd, 0;  c, acd, 1;  d, acd, 2; a, ade, 0;  d, ade, 1;  e, ade, 2;   a, aef, 0;  e, aef, 1;  f, aef, 2; a, afb, 0;  f, afb, 1;  b, afb, 2;   b, bfk, 0;  f, bfk, 1;  k, bfk, 2; b, bgc, 0;  g, bgc, 1;  c, bgc, 2;   b, bkg, 0;  k, bkg, 1;  g, bkg, 2; c, cgh, 0;  g, cgh, 1;  h, cgh, 2;   c, chd, 0;  h, chd, 1;  d, chd, 2; d, dhi, 0;  h, dhi, 1;  i, dhi, 2;   d, die, 0;  i, die, 1;  e, die, 2; e, eij, 0;  i, eij, 1;  j, eij, 2;   e, ejf, 0;  j, ejf, 1;  f, ejf, 2; f, fjk, 0;  j, fjk, 1;  k, fjk, 2;   g, gkl, 0;  k, gkl, 1;  l, gkl, 2; g, glh, 0;  l, glh, 1;  h, glh, 2;   h, hli, 0;  l, hli, 1;  i, hli, 2; i, ilj, 0;  l, ilj, 1;  j, ilj, 2;   j, jlk, 0;  l, jlk, 1;  k, jlk, 2).
1 { assign(T, F): face(F) } 1 :- tile(T).
1 { assign(T, F): tile(T) } 1 :- face(F).
1 { rotate(T, R) : rotation(R) } 1 :- tile(T).
:- #sum{ P,F : vrtx(V, F, A), assign(T, F), rotate(T, R), weight(T, (A - R + 3) \\ 3, P) } != C, cap(V, C).
rotate(T, 0) :- weight(T, 0, I), weight(T, 1, I), weight(T, 2, I).
F1 < F2 :- assign(T1, F1), assign(T2, F2), weight(T1, 0, I1),
  weight(T2, 0 ,I1), weight(T1, 1, I2), weight(T2, 1, I2), weight(T1, 2, I3),
  weight(T2, 2, I3), T1 < T2.
weight(1,  0, 0;  1,  1, 0;  1,  2, 0;  2,  0, 0;  2,  1, 0;  2,  2, 1;  3,  0, 0;  3,  1, 0;  3,  2, 2;  4,  0, 0;  4,  1, 0;  4,  2, 3; 5,  0, 0;  5,  1, 1;  5,  2, 1;  6,  0, 0;  6,  1, 1;  6,  2, 2;  7,  0, 0;  7,  1, 1;  7,  2, 2;  8,  0, 0;  8,  1, 1;  8,  2, 2;  9,  0, 0;  9,  1, 2;  9,  2, 1; 10, 0, 0;  10, 1, 2;  10, 2, 1; 11, 0, 0;  11, 1, 2;  11, 2, 1; 12, 0, 0;  12, 1, 2;  12, 2, 2; 13, 0, 0;  13, 1, 3;  13, 2, 3; 14, 0, 1;  14, 1, 1;  14, 2, 1; 15, 0, 1;  15, 1, 2;  15, 2, 3; 16, 0, 1;  16, 1, 2;  16, 2, 3; 17, 0, 1;  17, 1, 3;  17, 2, 2; 18, 0, 1;  18, 1, 3;  18, 2, 2; 19, 0, 2;  19, 1, 2;  19, 2, 2; 20, 0, 3;  20, 1, 3;  20, 2, 3).
#show cap/2.
#show assign/2.
#show rotate/2.`;
