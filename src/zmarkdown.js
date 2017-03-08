/**
 * Created by zwy on 17-3-7.
 */
;(function(global){
    "use strict";

    /* todo `blank line`不会截断`indented code` */
    /* todo `blank line`造成`loose list` */

    /**
     * Parse markdown to block tree.
     */

    var Marker = {
        blank_line: /^\s*$/,

        thematic: /^ {0,3}([*-_]){3}\s*$/,
        atx: /^ {0,3}#{1,6}($| +)/,
        indented_code: /^ {4,}/,

        block_quote: /^ {0,3}> /,
        u_list_item: /^ {0,3}[-_*] /,
        o_list_item: /^ {0,3}\d{1,9}(\.|\)) /
    };

    //After passing marker test, use Capture to the parse the content.
    var Capture = {
        atx: /^ {0,3}(#{1,6})(.* (?=#)|.*$)/,
        u_list_item: /^ {0,3}([-_*])/,
        o_list_item: /^ {0,3}(\d{1,9})(\.|\))/
    };

    var helpers = {
        indentWidth: function(line){
            var cap = /^ */.exec(line);
            return cap[0].length;
        }
    };

    function Block(type, isContainer, isMulti, idx, src){
        this._type = type;
        this._isContainer = isContainer;
        this._isMulti = isMulti;
        this.src = src.slice();

        this.idx = idx;
        this.open = isMulti;

        this.children = [];
        this.content = null;
        this.misc = {};
    }

    Block.prototype.consume = function(){
        var retIdx = 0;
        if(this._isMulti){
            this.consumeFirst();
            this.consumeMulti();
            retIdx = this.idx;
            if(this._isContainer){
                //content needs to be parsed
                this.src = this.content;
                this.idx = 0;
                this.parse(); 
            }
        }else{
            this.consumeOne();
            retIdx = this.idx;
        }
        return retIdx;
    };

    Block.prototype.consumeFirst = function(){
        var line = this.src[this.idx ++];
        var indentWidth = helpers.indentWidth(line);
        if(this.isUListItemStart(line)){
            var cap = Capture.u_list_item.exec(line);
            this.misc.bullet = cap[1];
            this.misc.markerWidth = indentWidth + 2;

            var markerTrimmed = line.substring(this.misc.markerWidth);
            var markerTrimmedIndent = helpers.indentWidth(markerTrimmed);
            this.misc.itemIndent = this.misc.markerWidth + markerTrimmedIndent;
            this.content = [markerTrimmed];
            
        }else if(this.isOListItemStart(line)){
            var cap = Capture.o_list_item.exec(line);
            this.misc.bullet = cap[2];
            this.misc.markerWidth = indentWidth + cap[1].length + 1;

            var markerTrimmed = line.substring(this.misc.markerWidth);
            var markerTrimmedIndent = helpers.indentWidth(markerTrimmed);
            this.misc.itemIndent = this.misc.markerWidth + markerTrimmedIndent;
            this.content = [markerTrimmed];
            
        }else if(this.isIndentedCode(line)){
            this.content = line.substring(4) + '\n';
        }else if(this.isBlockQuote(line)){
            this.content = [line.substring(indentWidth + 2)];
        }else{
            //paragraph
            this.content = line.trim() + '\n';
        }
    };

    Block.prototype.consumeMulti = function(){

        while(this.idx < this.src.length){
            var line = this.src[this.idx];
            var indentWidth = helpers.indentWidth(line);
            console.log('oops');

            if(this.isOListItemStart(line)){
                this.open = false;
            }else if(this.isUListItemStart(line)){
                this.open = false;
            }else if(this._type === 'u_list_item' && indentWidth >= this.misc.itemIndent){
                this.content.push(line.substring(this.misc.markerWidth));
                this.idx ++;
            }else if(this._type === 'o_list_item' && indentWidth >= this.misc.itemIndent){
                this.content.push(line.substring(this.misc.markerWidth));
                this.idx ++;
            }else if(this.isBlockQuote(line)){
                if(this._type === 'block_quote') {
                    this.content.push(line.substring(indentWidth + 2));
                    this.idx++;
                }else{
                    this.open = false;
                }
            }else if(this.isIndentedCode(line)){
                if(this._type === 'indented_code') {
                    this.content += line + '\n';
                    this.idx++;
                }else{
                    this.open = false;
                }
            }else if(this._type === 'paragraph'){
                this.content += line + '\n';
                this.idx ++;
            }else{
                this.open = false;
            }
            if(!this.open){ break; }
        }
        this.open = false;
    };

    Block.prototype.consumeOne = function(){
        var line = this.src[this.idx ++];
        if(this._type === 'atx'){

            var cap = Capture.atx.exec(line);
            this.misc.lvl = cap[1].length;
            this.content += cap[2].trim();
        }else if(this._type === 'thematic'){
            //no op
        }
    };
    
    Block.prototype.isAtx = function(line){
        return Marker.atx.test(line);
    };
    
    Block.prototype.isThematic = function(line){
        return Marker.thematic.test(line);
    };
    
    Block.prototype.isBlockQuote = function(line){
        return Marker.block_quote.test(line);
    };

    Block.prototype.isIndentedCode = function(line){
        return Marker.indented_code.test(line);
    };

    Block.prototype.isUListItemStart = function(line){
        return Marker.u_list_item.test(line);
    };

    Block.prototype.isOListItemStart = function(line){
        return Marker.o_list_item.test(line);
    };
    
    Block.prototype.parse = function(){

        if(this._isContainer) {
            while (this.idx < this.src.length) {
                var line = this.src[this.idx];
                var child = null;

                if (this.isAtx(line)) {
                    child = new Block('atx', false, false, this.idx, this.src);
                } else if (this.isThematic(line)) {
                    child = new Block('thematic', false, false, this.idx, this.src);
                } else if (this.isBlockQuote(line)) {
                    child = new Block('block_quote', true, true, this.idx, this.src);
                } else if (this.isUListItemStart(line)) {
                    child = new Block('u_list_item', true, true, this.idx, this.src);
                } else if (this.isOListItemStart(line)){
                    child = new Block('o_list_item', true, true, this.idx, this.src);
                } else if (this.isIndentedCode(line)) {
                    child = new Block('indented_code', false, true, this.idx, this.src);
                } else {
                    //paragraph
                    child = new Block('paragraph', false, true, this.idx, this.src);
                }
                this.idx = child.consume();
                child.parse();
                this.children.push(child);
            }
        }
    };

    function Parser(){
        this.doc = null;
    }

    Parser.prototype.preProc = function(src){
        //pre-process
        src = src
            .replace(/\r\n?|\n/g, '\n')
            .replace(/\t/g, '    ');
        return src.split(/\n/);
    };

    Parser.prototype.parse = function(src){
        src = this.preProc(src);
        var doc = new Block('doc', true, true, 0, src);
        doc.parse();
        this.doc = doc;
    };

    global.Parser = Parser;
    global.Capture = Capture;

})(this);

(function(global){
    "use strict";

    /**
     * Transfer block tree to html.
     */

    function Translator(doc){
        this.doc = doc;
    }

    Translator.prototype.translate = function(){
        this.doTranslate(this.doc);
    };

    Translator.prototype.doTranslate = function(block){

        var tpl = this.tpl(block);
        var html = '';

        var inList = false;
        for(var i = 0; i < block.children.length; i++){
            var child = block.children[i];
            
            html += this.doTranslate(child);

        }
        html = tpl.replace('{}', html);
        return html;
    };

    Translator.prototype.tpl = function(block){
        var type = block.type;
        if(type === 'thematic'){
            return '<hr>';
        }else if(type === 'atx'){
            var lvl = block.misc.lvl;
            return '<h' + lvl + '>{}</h' + lvl + '>';
        }else if(type === 'indented_code'){
            return '<pre><code>{}</code></pre>';
        }else if(type === 'paragraph'){
            return '<p>{}</p>';
        }else if(type === 'block_quote'){
            return '<blockquote>{}</blockquote>';
        }else if(type === 'u_list_item' || type === 'o_list_item'){
            return '<li>{}</li>';
        }
    };

    global.Translator = Translator;
})(this);