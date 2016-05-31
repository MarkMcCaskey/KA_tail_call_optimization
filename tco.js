/*
 * Mark McCaskey 2016
 * Graphical aspects inspired by:
//https://www.khanacademy.org/computer-programming/interact-absorption-lines/2226438064
//https://www.khanacademy.org/science/chemistry/chemical-reactions-stoichiome/balancing-chemical-equations/p/balancing-chemical-equations-intuition
*/

/*
 * Tiny 'lisp' grammar:
 * Inspired by www.scheme.com/tspl2d/grammar.html
 * 
 * program     = <func>
 * func        = (defun <identifier> (<identifier>*) <expression>*)
 * identifier  = <initial><subsequent>* | + | - | / | *
 * expression  = <constant>
 *             | <variable>
 *             | (if <expression><expression><expression>) | (if <expression><expression>)
 *             | <application>
 *             | (quote <datum>) | '<datum>
 * application = (<expression><expression>*)
 *
 * initial     = <letter> | ! | $ | & | * | / | : | < | = | > | ? | ~ | _ | ^
 * subsequent  = <initial> | <digit> | . | + | - 
 * letter      = a | b | ... | z
 * digit       = 0 | 1 | ... | 9
 * datum       = <boolean> | <number> | <list>
 * constant    = <boolean> | <number> | <list>
 * boolean     = #t | #f
 * number      = <sign><digit>*
 * sign        = - | 
 * variable    = <identifier>
 * list        = (<datum>*)
*/

/*
 * Global definitions
*/

var global_symbol;
var global_lvalue;

var symbol_enum = Object.freeze({
    datum: 1, lparen: 5, rparen: 6, if_sym: 7, defun: 8, quote: 9, identifier: 10, application: 11
});

/*
 * Tiny 'lisp' lexer
 */

var rparen_regex = /\)/;
var lparen_regex = /\(/;
var number_regex = /-?\d+/;
var boolean_regex = /#(t|f)/;
var initial_regex = /[a-zA-Z]|!|\$|&|\*|\/|:|<|=|>|\?|~|_|\^/;
var subsequent_regex = /([a-zA-Z]|!|\$|&|\*|\/|:|<|=|>|\?|~|_|\^)|[0-9]|\.|\+|-/;
var identifier_regex = new RegExp(initial_regex.source + "(" + subsequent_regex.source + ")*|\\+|\\-|\\/|\\*");
var if_regex = /if/;
var quote_regex = /('|quote)/;
var defun_regex = /defun/;
var whitespace_regex = /\s*/;
   


var lexer = function(string) {
    this.input = string;
    this.start = 0;
    this.end = 1;
};

lexer.prototype.nextSymbol = function() {
    if(this.start >= this.input.length) {
	return false;
    }
	
    var end = this.start+1;
    var i;

    for( ; this.end < this.input.length; this.end++ ) {
	//remove whitespace before attempting to lex anything
	if( this.input.substring(this.start,this.end).match(whitespace_regex)) {
	    for( i = this.end; i < this.input.length && this.input.substring(this.start, i).match(whitespace_regex); ++i ) { }
	    this.start = i;
	    this.end = i+1;
	}

	var search_string = this.input.substring(this.start,this.end);

	if(search_string.match(rparen_regex) ) {
	    global_symbol = symbol_enum.rparen;
	    global_lvalue = 0;
	    break;
	}
	else if(search_string.match(lparen_regex) ) {
	    global_symbol = symbol_enum.lparen;
	    global_lvalue = 0;
	    break;
	}
	else if(search_string.match(number_regex).length ) {
	    //find biggest substring that matches number_regex
	    for( i = this.end; i < this.input.length && this.input.substring(this.start, i).match(number_regex).length > 1; ++i ) { }

	    this.end = i-1;
	    global_symbol = symbol_enum.number;
	    global_lvalue = parseInt(this.input.substring(this.start,this.end),10);
	    break;
	}
	else if(search_string.match(boolean_regex) ) {
	    global_symbol = symbol_enum.boolean;
	    global_lvalue = this.input[this.start+1] === 't';
	    break;
	}
	//this handles all tokens with text
	else if(search_string.match(identifier_regex) ) {
	    //find largest substring that matches identifier_regex
	    for( i = this.end; i < this.input.length && this.input.substring(this.start,i).match(identifier_regex) !== null; ++i ) {}

	    this.end = i-1;
	    var new_search_string = this.input.substring(this.start,i);

	    //figure out if it's a plain identifier or something else
	    if( new_search_string.match(if_regex) ) {
		global_symbol = symbol_enum.if_sym;
		global_lvalue = 0;
		break;
	    }
	    else if( new_search_string.match(quote_regex) ) {
		global_symbol = symbol_enum.quote;
		global_lvalue = 0;
		break;
	    }
	    else if( new_search_string.match(defun_regex) ) {
		global_symbol = symbol_enum.defun;
		global_lvalue = 0;
		break;
	    }

	    //if we're here then it's an identifier
	    global_symbol = symbol_enum.identifier;
	    global_lvalue = new_search_string;
	    break;
	    }
    }
    this.start = this.end;
    this.end += 1;
    return true;

};


/*************************************************************************/


/*
 * Tiny 'lisp' parser:
 */

var AST = function(parent, symbol, value) {
    this.parent = parent;
    this.list_of_children = [];
    this.symbol = symbol;
    this.value = value;
};

AST.prototype.addChild = function(child) {
    this.list_of_children.push(child);
};

var input_string = "(defun test_function (x) + (- 5 3) (+ 2 x) (/ 8 (+ 2 2)))";
var lex = new lexer(input_string);
var input;


var error = function(error_message) {
    println(error_message);
    exit();
};
var accept = function(symbol) {
    if( global_symbol === symbol ) {
	return true;
    }
    return false;
};

var expect = function(symbol) {
    if( accept(symbol) ) {
	return true;
    }
    error("Expected " + symbol + " but found " + global_symbol);
    return false;
};


var identifier = function(in_ast) {
    expect(identifier);
    var id_ast = new AST(id_ast, symbol_enum.identifier, global_lvalue);
    in_ast.addChild(id_ast);
};

var datum = function(in_ast) {
    if( accept(symbol_enum.number) ) {}
    else if( accept(symbol_enum.boolean) ) {}
    else {
	//accept list, do later
    }
    var dat_ast = new AST(in_ast, global_symbol, global_lvalue);
};

var application; //is that how this works?

var expression = function(in_ast) {
    if (accept(symbol_enum.constant)) {
	//add constant to AST
	var exp_ast = new AST(in_ast, symbol_enum.constant, global_lvalue);
	in_ast.addChild(exp_ast);
	return;
    }
    else {
	expect(symbol_enum.lparen);
	
	if( accept(symbol_enum.if_sym) ) {
	    var exp_ast = new AST(in_ast, symbol_enum.if_sym, null );
	    expression(exp_ast);
	    expression(exp_ast);
	    if( accept(symbol_enum.rparen) ) {
		return;
	    }
	    else  //there's an else clause
	    {
		expression(exp_ast);
		return;
	    }
	}
	else if( accept(symbol_enum.quote) ) {
	    datum(in_ast);
	}
	else if( accept( identifier ) ) {
	    var exp_ast = new AST(in_ast, symbol_enum.identifier, global_lvalue);
	    //call function
	    application(exp_ast);
	}
	else {
	    error("Review this later");
	}
	
	
    }
    expect(symbol_enum.rparen);
};

var application = function(in_ast) {
    //build AST entry
    var app_ast = new AST(in_ast, symbol_enum.application, null);
    in_ast.addChild(app_ast);
    while( ! accept(symbol_enum.rparen) ) {
	expression(app_ast);
    }
};

var func = function(prog_ast) {
    var func_ast = new AST(func_ast, symbol_enum.defun, null);
    expect(symbol_enum.lparen);
    expect(symbol_enum.defun);
    identifier(func_ast);
    
    while( ! accept(symbol_enum.rparen) ) {
	expression(func_ast);
    }
};

var program = function() {
    var prog_ast = new AST(null,null,null);
    func(prog_ast);
    println(prog_ast);
};

lex.nextSymbol();
program();



/*
  testing grahpical code:
rect(0,0,10,10);

var code = function(initial_value,x,y){
    this.value = initial_value;
    this.x = x;
    this.y = y;
};

code.prototype.draw = function() {
    textAlign(LEFT,TOP);
    textSize(12);
     fill(0, 0, 0);
     strokeWeight(1);
     text(this.value,this.x,this.y);
};


var func = function(next_instruction){
    this.next_instruction = next_instruction;
};

var functionButton = function(name,func,x,y) {
    this.name = name;
    this.func = func;
    this.down = false;
    this.x = x;
    this.y = y;
    this.w = 80;
    this.h = 30;
};
functionButton.prototype.draw = function() {
    stroke(0, 0, 0);
    strokeWeight(1.5);
    fill(173, 105, 56);
    if (this.down === true) {
        fill(224, 177, 119);
    }
    rect(this.x,this.y,this.w,this.h,5);
    strokeWeight(1);
    fill(255, 255, 255);
    text(this.name,this.x + 13,this.y + 15);
};
functionButton.prototype.clicked = function() {
};
functionButton.prototype.mouseDragged = function() {
    this.x = mouseX;
    this.y = mouseY;
};

var test_func = new func(null);
var new_function = new functionButton("Function",test_func, 50, 50);
var test_code = new code("abc\n123\nccc\n", 20, 20);
draw = function(){

    new_function.draw();
    test_code.draw();
};
*/
