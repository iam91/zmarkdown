(function(global){
    'use strict';

    var Marker = {
        indent: /^ */,
        blank_line: /^ *$/,
        list_item_width: /^([-_*]|\d{1,9}\.)( +)(\S+|$)/,

        block_quote: /^> /,
        list: /^([-_*]|\d{1,9}\.) /,
        u_list: /^[-_*] /,
        o_list: /^\d{1,9}\. /,

        thematic: /^([*-_]) *\1 *\1 *(\1 *)*$/,
        atx: /^#{1,6}($| +)/,
        indented_code: /^ {4,}/
    };

    global.Marker = Marker;

    var INDENT_MAX = 3;

    var Util = {
        indentWidth: function(line){
            var cap = Marker.indent.exec(line);
            return cap[0].length;
        },
        consumeExtraIndent: function(line, indentWidth){
            if(indentWidth <= INDENT_MAX){
                line = line.substring(indentWidth);
            }
            return line;
        },
        listMarkerWidth: function(line){
            var cap = Marker.list_item_width.exec(line);
             return cap[1].length + (cap[3] ? cap[2].length : 1);
        },
        isBlankLine: function(line){
            return Marker.blank_line.test(line);
        }
    };

    var Node = {
        /**
         *
         * @param node
         * @param line
         * @returns {Boolean}
         */
        transverse: function(node, line){
            var indentWidth = Util.indentWidth(line);
            line = Util.consumeExtraIndent(line);
            if(node instanceof ContainerNode){
                if(node.open && node.isContent(line)){
                    var n = node.children.length;
                    var rest = node.rest(line);
                    if(n){
                        var r = Node.transverse(node.children[n - 1], rest);
                        if(r){ return true; }
                    }
                    var contentType = Node.contentType(node, rest);
                    var newNode = Node.factory(contentType, rest, indentWidth);
                    if(contentType.container){
                        Node.transverse(newNode, rest);
                    }
                    node.children.push(newNode);
                    return true;
                }else{
                    return false;
                }
            }else if(node instanceof LeafNode){
                if(node.open && node.isContent(line)){
                    //append
                    return true;
                }else{
                    return false;
                }
            }
        },

        contentType: function(node, line){
            if(Marker.block_quote.test(line)){
                return { type: 'block_quote', container: true };
            }else if(Marker.u_list.test(line)){
                if(node.type === 'u_list'){
                    return { type: 'u_list_item', container: true };
                }else{
                    return { type: 'u_list', container: true };
                }
            }else if(Marker.o_list.test(line)){
                if(node.type === 'o_list'){
                    return { type: 'o_list_item', container: true };
                }else{
                    return { type: 'o_list', container: true };
                }
            }else if(Marker.thematic.test(line)){
                return { type: 'thematic', container: false };
            }else if(Marker.atx.test(line)){
                return { type: 'atx', container: false };
            }else if(Marker.indented_code.test(line)){
                return { type: 'indented_code', container: false };
            }else{
                return { type: 'paragraph', container: false };
            }
        },

        factory: function(contentType, line, indentWidth){
            var node = null;
            if(contentType.container){
                if(contentType.type === 'block_quote'){
                    return new ContainerNode('block_quote', null);
                }else if(contentType.type === 'u_list'){
                    var markerWidth = Util.listMarkerWidth(line);
                    return new ContainerNode('u_list', {markerWidth: markerWidth + indentWidth});
                }else if(contentType.type === 'o_list'){
                    var markerWidth = Util.listMarkerWidth(line);
                    return new ContainerNode('o_list', {markerWidth: markerWidth + indentWidth});
                }else if(contentType.type === 'u_list_item'){
                    return new ContainerNode('u_list_item', null);
                }else if(contentType.type === 'o_list_item'){
                    return new ContainerNode('o_list_item', null);
                }
            }else{
                if(contentType.type === 'thematic'){
                    return new LeafNode('thematic', null);
                }else if(contentType.type === 'atx'){
                    return new LeafNode('atx', null);
                }else if(contentType.type === 'indented_code'){
                    return new LeafNode('indented_code', null);
                }else if(contentType.type === 'paragraph'){
                    return new LeafNode('paragraph', null);
                }
            }
        }
    };

    /**
     * ContainerNode
     * @param {String} type
     * @param {Object} misc
     * @constructor
     */
    function ContainerNode(type, misc){
        this.type = type;
        this.open = true;
        this.misc = misc || null;
        this.children = [];
    }

    ContainerNode.prototype.isContent = function(line){
        return ContainerNode.helpers.isContent[this.type](line);
    };

    ContainerNode.prototype.rest = function(line){
        return ContainerNode.helpers.rest[this.type](line);
    };

    ContainerNode.prototype.close = function(){
        this.open = false;
        var n = this.children.length;
        this.children[n - 1].close();
    };

    ContainerNode.helpers = {
        isContent: {
            'doc': function(){ return true; },
            'block_quote': function(line){
                return !Util.isBlankLine(line) && Marker.block_quote.test(line);
            },
            'u_list': function(line){ return Marker.u_list.test(line); },
            'o_list': function(line){ return Marker.o_list.test(line); }
        },
        rest: {
            'doc': function(line){ return line; },
            'block_quote': function(line){
                return line.substring(2);
            },
            'u_list': function(line){ return line; },
            'o_list': function(line){ return line; }
        }
    };

    /**
     * LeafNode
     * @param {String} type
     * @param {String} misc
     * @constructor
     */
    function LeafNode(type, misc){
        this.type = type;
        this.open = type !== 'thematic' || type !== 'atx' || type !== 'setext';
        this.misc = misc;
    }

    LeafNode.prototype.isContent = function(line){
        return LeafNode.helpers.isContent[this.type](line);
    };

    LeafNode.prototype.setText = function(line){};

    LeafNode.prototype.close = function(){
        this.open = false;
    };

    LeafNode.helpers = {
        isContent: {
            'thematic': function(line){ return Marker.thematic.test(line); },
            'atx': function(line){ return Marker.atx.test(line); },
            'indented_code': function(line){
                return Marker.indented_code.test(line) || Util.isBlankLine(line);
            },
            'paragraph': function(line){
                return !Util.isBlankLine(line)
                    && !Marker.block_quote.test(line)
                    && !Marker.u_list.test(line)
                    && !Marker.o_list.test(line)
                    && !Marker.thematic.test(line)
                    && !Marker.atx.test(line)
                    && !Marker.indented_code.test(line);
            }
        }
    };

    /**
     * Parser
     * @constructor
     */
    function Parser(){
        this.lines = null;
        this.doc = null;
    }

    Parser.prototype = {
        constructor: Parser,

        init: function(src){
            //whitespaces should all be transformed to ' '
            src = src
                .replace(/\r\n?|\n/g, '\n')
                .replace(/\t/g, '    ');
            this.lines = src.split(/\n/);
            this.doc = new ContainerNode('doc', null);
        },

        parse: function(src){
            this.init(src);

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
