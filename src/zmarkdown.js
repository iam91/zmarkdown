/**
 * Created by zwy on 17-3-7.
 */
(function(global){
    "use strict";

    var Marker = {
        blank_line: /^\s*$/,

        thematic: /^ {0,3}([*-_]) *\1 *\1 *(\1 *)*$/,
        atx: /^ {0,3}#{1,6}($| +)/,
        indented_code: /^ {4,}/,

        block_quote: /^ {0,3}> /,
        u_list_item: /^ {0,3}[-_*] /,
        o_list_item: /^ {0,3}\d{1,9}\. /
    };

    //var Capture;

    var helpers = {
        indentWidth: function(line){
            var cap = /^ */.exec(line);
            return cap[0].length;
        }
    };

    function Block(type, isContainer, lines){
        this.type = type;
        this.isContainer = isContainer;
        this.lines = lines;

        this.children = [];

        this.cache = [];
        this.prevType = null;
        this.listItemMarkerWidth = 0;
        this.listItemIndentWidth = 0;
    }
    
    Block.prototype.isAtx = function(line){
        return Marker.atx.test(line);
    };
    
    Block.prototype.isThematic = function(line){
        return Marker.thematic.test(line);
    };
    
    Block.prototype.isBlockQuote = function(line){
        return Marker.thematic.test(line);
    };

    Block.prototype.isIndentedCode = function(line){
        return !this.isUListItemContent(line)
            && !this.isOListItemContent(line)
            && Marker.indented_code.test(line);
    }

    Block.prototype.isUListItemStart = function(line){
        return Marker.u_list_item.test(line);
    };

    Block.prototype.isUListItemContent = function(line){
        var indentWidth = helpers.indentWidth(line);
        var _prevIsList = this.prevType === 'u_list_start' || this.prevType === 'u_list_content';
        return _prevIsList && indentWidth >= this.listItemIndentWidth;
    };

    Block.prototype.isOListItemStart = function(line){
        return Marker.o_list_item.test(line);
    };

    Block.prototype.isOListItemContent = function(line){
        var indentWidth = helpers.indentWidth(line);
        var _prevIsList = this.prevType === 'o_list_start' || this.prevType === 'o_list_content';
        return _prevIsList && indentWidth >= this.listItemIndentWidth;
    };


    Block.prototype.parse = function(){
        var lines = this.lines;
        if(this.isContainer) {
            while (lines.length) {
                var line = lines.shift();

                if (this.isAtx(line)) {
                    this.oneLineBlock('atx', line);
                } else if (this.isThematic(line)) {
                    this.oneLineBlock('thematic', line);
                } else if (this.isBlockQuote(line)) {
                    this.multiLineBlock('block_quote', line);
                } else if (this.isUListItemStart(line)) {
                    this.multiLineBlock('u_list_start', line);
                } else if (this.isUListItemContent(line)) {
                    this.multiLineBlock('u_list_content', line);
                } else if (this.isOListItemStart(line)){
                    this.multiLineBlock('o_list_start', line);
                } else if (this.isOListItemContent(line)){
                    this.multiLineBlock('o_list_content', line);
                } else if (this.isIndentedCode(line)) {
                    this.multiLineBlock('indented_code', line);
                } else {
                    //paragraph
                    this.multiLineBlock('paragraph', line);
                }
            }
            this.closePrev();
            return this.children.slice();
        }else{
            //parse inline
            return null;
        }
    };
    
    Block.prototype.closePrev = function(){
        if(this.prevType){
            var _cache = [];
            var _type = this.prevType;
            while(this.cache.length){
                _cache.push(this.cache.shift());
            }

            _type = _type === 'u_list_start' || _type === 'u_list_content'
                ? 'u_list_item' : _type;

            _type = _type === 'o_list_start' || _type === 'o_list_content'
                ? 'o_list_item' : _type;

            var container = _type === 'block_quote'
                || _type === 'u_list_item'
                || _type === 'o_list_item';

            var prev = new Block(_type, container, _cache);

            this.prevType = null;
            this.listItemMarkerWidth = 0;
            this.listItemIndentWidth = 0;
            this.children.push(prev);
        }
    };
    
    Block.prototype.multiLineBlock = function(type, line){

        if(!this.prevType){
            this.prevType = type;
        }else if(type === 'u_list_start' || type === 'o_list_start'){
            this.closePrev();
        }else if(type !== this.prevType
            && !(type === 'u_list_content' && this.prevType === 'u_list_start')
            && !(type === 'o_list_content' && this.prevType === 'o_list_start')){
            this.closePrev();
        }

        var indentWidth = helpers.indentWidth(line);
        
        if(type === 'block_quote'){
            this.cache.push(line.substring(indentWidth + 2));
            this.prevType = 'block_quote';
        }else if(type === 'u_list_start'){
            this.listItemMarkerWidth = indentWidth + 2;

            var markerTrimmed = line.substring(this.listItemMarkerWidth);
            var markerTrimmedIndent = helpers.indentWidth(markerTrimmed);
            this.listItemIndentWidth = this.listItemMarkerWidth + markerTrimmedIndent;

            this.cache.push(markerTrimmed);
            this.prevType = 'u_list_start';
        }else if(type === 'u_list_content'){
            this.cache.push(line.substring(this.listItemMarkerWidth));
            this.prevType = 'u_list_content';
        }else if(type === 'o_list_start'){
            var cap = /^ {0,3}(\d{1,9}\.)/.exec(line);
            this.listItemMarkerWidth = indentWidth + cap[1].length;

            var markerTrimmed = line.substring(this.listItemMarkerWidth);
            var markerTrimmedIndent = helpers.indentWidth(markerTrimmed);
            this.listItemIndentWidth = this.listItemMarkerWidth + markerTrimmedIndent;

            this.cache.push(markerTrimmed);
            this.prevType = 'o_list_start';
        }else if(type === 'o_list_content'){
            this.cache.push(line.substring(this.listItemMarkerWidth));
            this.prevType = 'o_list_content';
        }else if(type === 'indented_code'){
            this.cache.push(line.substring(4));
            this.prevType = 'indented_code';
        }else{
            //paragraph
            this.cache.push(line);
            this.prevType = 'paragraph';
        }
    };

    Block.prototype.oneLineBlock = function(type, line){

        this.closePrev();

        var child = null;
        if(type === 'atx'){
            var cap = /^ {0,3}#{1,6}($| +)/.exec(line);
            child = new Block('atx', false, ['']);
        }else if(type === 'thematic'){
            child = new Block('thematic', false, ['']);
        }
        this.children.push(child);
    };


    function Parser(){
        this.lines = null;
        this.doc = null;
    }

    Parser.prototype.parse = function(src){
        //pre-process
        src = src
            .replace(/\r\n?|\n/g, '\n')
            .replace(/\t/g, '    ');
        this.lines = src.split(/\n/);

        var queue = [];
        var doc = new Block('doc', true, this.lines.slice());
        this.doc = doc;
        queue.push(doc);

        while(queue.length){
            var block = queue.shift();
            var childBlocks = block.parse() || [];
            queue = queue.concat(childBlocks);
        }
    };

    global.Parser = Parser;

})(this);
