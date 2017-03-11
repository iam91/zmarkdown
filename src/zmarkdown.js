/**
 * Created by zwy on 17-3-7.
 */
;(function(global){

    "use strict";

    // todo `blank line` 造成 `loose list`
    // todo fenced code

    var blockMarker = {
        blank_line: /^\s*$/,

        thematic: /^ {0,3}([*-_]){3}\s*$/,
        atx: /^ {0,3}#{1,6}($| +)/,
        setext: /^ {0,3}(-|=)\1{2,}\s*$/,
        indented_code: /^ {4,}/,
        fenced_code: /^ {0,3}(`|~)\1{2,}/,

        block_quote: /^ {0,3}> /,
        u_list_item: /^ {0,3}[-_*] /,
        o_list_item: /^ {0,3}\d{1,9}(\.|\)) /
    };

    var inlineMarker = {
        code_span: /(`([^`]*)`)/g,
        emphasis: /((\*|_)([^*]*)\2)/g,
        strong_emphasis: /((\*\*|__)([^*]*)\2)/g
    };


    //After passing blockMarker test, use capture to the parse the content.
    var capture = {
        atx: /^ {0,3}(#{1,6})(.* (?=#)|.*$)/,
        setext: /^ {0,3}(-|=)/,
        u_list_item: /^ {0,3}([-_*])/,
        o_list_item: /^ {0,3}(\d{1,9})(\.|\))/,
    };

    var helpers = {
        indentWidth: function(line){
            var cap = /^ */.exec(line);
            return cap[0].length;
        }
    };

    /**
     * Block
     * @param type
     * @param isContainer
     * @param isMulti
     * @param idx
     * @param src
     * @constructor
     */
    function Block(type, isContainer, isMulti, idx, src){
        this._type = type;
        this._isContainer = isContainer;
        this._isMulti = isMulti;
        this.src = src.slice();

        this.idx = idx;
        this.open = isMulti;

        this.children = [];
        this.content = '';
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
        if(blockMarker.u_list_item.test(line)){
            var cap = capture.u_list_item.exec(line);
            this.misc.bullet = cap[1];
            this.misc.blockMarkerWidth = indentWidth + 2;

            var blockMarkerTrimmed = line.substring(this.misc.blockMarkerWidth);
            var blockMarkerTrimmedIndent = helpers.indentWidth(blockMarkerTrimmed);
            this.misc.itemIndent = this.misc.blockMarkerWidth + blockMarkerTrimmedIndent;
            this.content = [blockMarkerTrimmed];
            
        }else if(blockMarker.o_list_item.test(line)){
            var cap = capture.o_list_item.exec(line);
            this.misc.bullet = cap[2];
            this.misc.blockMarkerWidth = indentWidth + cap[1].length + 1;

            var blockMarkerTrimmed = line.substring(this.misc.blockMarkerWidth);
            var blockMarkerTrimmedIndent = helpers.indentWidth(blockMarkerTrimmed);
            this.misc.itemIndent = this.misc.blockMarkerWidth + blockMarkerTrimmedIndent;
            this.content = [blockMarkerTrimmed];
            
        }else if(blockMarker.indented_code.test(line)){
            this.content = line.substring(4) + '\n';
        }else if(blockMarker.fenced_code.test(line)){

            //todo get info string
            this.misc.indentWidth = indentWidth;

        }else if(blockMarker.block_quote.test(line)){
            this.content = [line.substring(indentWidth + 2)];
        }else{
            //paragraph
            this.content = line.trim();
        }
    };

    Block.prototype.consumeMulti = function(){

        while(this.idx < this.src.length){
            var line = this.src[this.idx];
            var indentWidth = helpers.indentWidth(line);

            if(this._type === 'fenced_code'){
                if(blockMarker.fenced_code.test(line)){
                    this.open = false;
                }else{
                    this.content += line.substring(Math.min(indentWidth, this.misc.indentWidth)) + '\n';
                    this.idx ++;
                }
            }else if(this._type === 'u_list_item' && indentWidth >= this.misc.itemIndent){
                this.content.push(line.substring(this.misc.blockMarkerWidth));
                this.idx ++;
            }else if(this._type === 'o_list_item' && indentWidth >= this.misc.itemIndent){
                this.content.push(line.substring(this.misc.blockMarkerWidth));
                this.idx ++;
            }else if(blockMarker.u_list_item.test(line)){
                this.open = false;
            }else if(blockMarker.o_list_item.test(line)){
                this.open = false;
            }else if(blockMarker.block_quote.test(line)){
                if(this._type === 'block_quote') {
                    this.content.push(line.substring(indentWidth + 2));
                    this.idx++;
                }else{ this.open = false; }
            }else if(blockMarker.setext.test(line) && this._type === 'paragraph'){

                var cap = capture.setext.exec(line);
                this._type = 'setext';
                this.misc.lvl = cap[1] === '-' ? 2 : 1;
                this.idx ++;
            }else if(blockMarker.indented_code.test(line)){
                if(this._type === 'indented_code') {
                    this.content += line.substring(4) + '\n';
                    this.idx++;
                }else{ this.open = false; }
            }else if(!blockMarker.blank_line.test(line) && this._type === 'paragraph'){
                this.content += line;
                this.idx ++;
            }else{ this.open = false; }
            if(!this.open){ break; }
        }
        this.open = false;
    };

    Block.prototype.consumeOne = function(){
        var line = this.src[this.idx ++];
        if(this._type === 'atx'){

            var cap = capture.atx.exec(line);
            this.misc.lvl = cap[1].length;
            this.content += cap[2].trim();
        }else if(this._type === 'thematic'){
            //no op
        }
    };
    
    Block.prototype.parse = function(){

        if(this._isContainer) {
            while (this.idx < this.src.length) {
                var line = this.src[this.idx];
                var child = null;

                if (blockMarker.atx.test(line)) {
                    child = new Block('atx', false, false, this.idx, this.src);
                } else if (blockMarker.thematic.test(line)) {
                    child = new Block('thematic', false, false, this.idx, this.src);
                } else if (blockMarker.block_quote.test(line)) {
                    child = new Block('block_quote', true, true, this.idx, this.src);
                } else if (blockMarker.u_list_item.test(line)) {
                    child = new Block('u_list_item', true, true, this.idx, this.src);
                } else if (blockMarker.o_list_item.test(line)) {
                    child = new Block('o_list_item', true, true, this.idx, this.src);
                } else if (blockMarker.indented_code.test(line)) {
                    child = new Block('indented_code', false, true, this.idx, this.src);
                } else if (blockMarker.fenced_code.test(line)){
                    child = new Block('fenced_code', false, true, this.idx, this.src);
                } else if (!blockMarker.blank_line.test(line)) {
                    //paragraph
                    child = new Block('paragraph', false, true, this.idx, this.src);
                } else {
                    //blank line
                    this.idx ++;
                    continue;
                }
                this.idx = child.consume();
                child.parse();
                this.children.push(child);
            }
        }
    };

    function parse(src){
        //pre-process
        src = src
            .replace(/\r\n?|\n/g, '\n')
            .replace(/\t/g, '    ')
            .split(/\n/);

        var doc = new Block('doc', true, true, 0, src);
        doc.parse();
        return doc;
    }

    function translate(doc){
        return translate.doTranslate(doc);
    }

    translate.tpl = function(block) {
        var type = block._type;
        if(type === 'doc'){
            return '{}';
        }else if(type === 'thematic'){
            return '<hr>\n';
        }else if(type === 'atx'){
            var lvl = block.misc.lvl;
            return '<h' + lvl + '>{}</h' + lvl + '>\n';
        }else if(type === 'setext'){
            var lvl = block.misc.lvl;
            return '<h' + lvl + '>{}</h' + lvl + '>\n';
        }else if(type === 'indented_code'){
            return '<pre><code>{}</code></pre>\n';
        }else if(type === 'paragraph'){
            return '<p>{}</p>\n';
        }else if(type === 'block_quote'){
            return '<blockquote>{}</blockquote>\n';
        }else if(type === 'u_list_item' || type === 'o_list_item'){
            return '<li>{}</li>\n';
        }
    };
    
    translate.parseInline = function(content){
        content = content
            .replace(inlineMarker.strong_emphasis, '<strong>$3</strong>')
            .replace(inlineMarker.emphasis, '<em>$3</em>')
            .replace(inlineMarker.code_span, '<code>$2</code>');
        return content;
    };

    translate.doTranslate = function(block){
        var tpl = translate.tpl(block);
        var html = '';

        if(block._isContainer) {

            var inList = false;
            var listType = null;
            var bullet = null;

            for (var i = 0; i < block.children.length; i++) {
                var child = block.children[i];
                var type = child._type;

                //wrap list items width '<ul>' or '<ol>'
                if (!inList && (type === 'u_list_item' || type === 'o_list_item')) {
                    html += type === 'u_list_item' ? '<ul>\n' : '<ol>\n';
                    inList = true;
                    listType = type;
                    bullet = child.misc.bullet;
                }

                if (inList && (type !== listType
                    || child.misc.bullet !== bullet)) {
                    html += listType === 'u_list_item' ? '</ul>\n' : '</ol>\n';
                    inList = false;
                    listType = null;
                    bullet = null;
                    i --;
                    continue;
                } else {
                    html += this.doTranslate(child);
                }
            }
            if(inList){ html += listType === 'u_list_item' ? '</ul>\n' : '</ol>\n'; }
            html = tpl.replace('{}', html);
        }else{
            html = translate.parseInline(block.content);
            html = tpl.replace('{}', html);
        }
        return html;
    };

    global.zmarkdown = {
        compile: function(src){
            var doc = parse(src);
            console.log(doc);
            return translate(doc);
        }
    };

    global.inlineMarker = inlineMarker;

})(this);