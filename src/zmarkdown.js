(function(global){
    'use strict';

    var Reg = {
        indent: /^ */g,
        blank_line: /^ *$/g,

        block_quote: /^>/g,
        u_list: /^[-_\*]/g,
        o_list: /^\d{1,9}\./g,

        atx: /^#{1,6}/g,
        thematic: / /g,
        paragraph: /^[^\#-_\*\s]/g,
        indented_code: / /g
    };

    var INDENT_MAX = 3;

    function consumeIndent(line){
        var cap = Reg.indent.exec(line);
        if(cap[0].length <=  INDENT_MAX){
            line = line.substring(cap[0].length);
        }
        return line;
    }

    function blankLine(line){
        return Reg.blank_line.test(line);
    }

    var Block = {
        doc: {
            canContain: function(line){ return true; },
            rest: function(line){ return line; }
        },
        block_quote: {
            canContain: function(line){
                // console.log('----');
                // console.log(/^>/.test(line));
                // console.log(Reg.block_quote.test(line));
                // console.log(line);
                // console.log(/^>/.test(line));
                // console.log(Reg.block_quote.test(line));
                // console.log(line);
                // console.log('----');
                return (/^>/.test(line));
                return Reg.block_quote.test(line);
            },
            rest: function(line){
                //>XXXXX
                line = line.substring(1);
                return line;
            }
        },
        u_list: {
            canContain: function(line){
                return Reg.u_list.test(line);
            },
            rest: function(line){
                //-XXXX
                line = line.substring(1);
                return line;
            }
        },
        o_list: {
            canContain: function(line){
                return Reg.o_list.test(line);
            },
            rest: function(line){
                line = line.substring(1);
                return line;
            }
        },
        thematic: {
            canAppend: function(line){
                return Reg.thematic.test(line);
            },
            rest: function(line){

            }
        },
        atx: {
            canAppend: function(line){
                return Reg.atx.test(line);
            },
            rest: function(line){

            }
        },
        paragraph: {
            canAppend: function(line){
                // return Reg.atx.test(line);
                return false;
            },
            rest: function(line){

            }
        }
    };

    //doc node definition
    function Node(type, container, open){
        this.type = type;
        this.container = container;
        this.open = open;
        this.children = [];
    }

    Node.transverse = function(node, line){
        line = consumeIndent(line);

        if(node.container){
            var canContain = Block[node.type].canContain(line);
            if(!canContain){
                node.open = false;
                return false;
            }

            var rest = Block[node.type].rest(line);
            var n = node.children.length;
            if(n){
                var lastChild = node.children[n - 1];
                var consumed = Node.transverse(lastChild, rest);
            }
            if(!n || !consumed){
                var newNode = Node.factory(rest);
                node.children.push(newNode);
                return true;
            }
        }else{
            var canAppend = Block[node.type].canAppend(line);
            console.log(node);
            console.log(canAppend)
            if(!canAppend){
                node.open = false;
                return false;
            }else{
                return true;
            }
        }
    };

    Node.factory = function(line){
        var node = null;
        if(Reg.block_quote.test(line)){
            node = new Node('block_quote', true, true);
            Node.transverse(node, line);
        }else if(Reg.u_list.test(line)){
            node = new Node('list', true, true);
            node.children.push(new Node('u_list', true, true));
        }else if(Reg.o_list.test(line)){
            node = new Node('list', true, true);
            node.children.push(new Node('o_list', true, true));
        }else if(Reg.thematic.test(line)){
            node = new Node('thematic', false, false);
        }else if(Reg.atx.test(line)){
            node = new Node('atx', false, false);
        }else if(Reg.indented_code.test(line)){
            node = new Node('indented_code', false, true);
        }else{
            //paragraph
            node = new Node('paragraph', false, true);
        }
        return node;
    };


    //parser definition
    function Parser(){
        this.lines = null;
        this.lineIdx = 0;
        this.doc = null;
    }

    Parser.prototype = {
        constructor: Parser,

        preprocess: function(src){
            //whitespaces should all be transformed to ' '
            src = src
                .replace(/\r\n?|\n/g, '\n')
                .replace(/\t/g, '    ');
            this.lines = src.split(/\n/);
            this.doc = new Node('doc', true, true);
            this.lineIdx = 0;
        },

        parse: function(src){
            this.preprocess(src);

            while(this.lines.length){
                var line = this.lines.shift();
                Node.transverse(this.doc, line);

            }
        }
    }

    global.test = Parser;

})(typeof global === 'undefined' ? this : global);
/*
thematic breaks
    0-3 indentation
    -_*{3,}
        can be seperated,
        can interrupt a paragraph,
        setext heading takes precedence,
        takes precedence over list item,

        can interrupt paragraphs,

setext heading
    0-3 indentation
        = h1, - h2
indented code blocks
    composed of one or more indented chunks
    each chunk indented four or more spaces
        list item takes precedence
        cannot interrupt a paragraph

fenced code blocks

link

paragraphs
    0-3 indentation

blank lines

block quotes
    0-3 indentation
    > *
    can interrupt paragraphs

list items*/
