/**
 * Created by zwy on 17-3-7.
 */
;(function(global){

    "use strict";

    /* todo `blank line` 不会截断 `indented code` */
    /* todo `blank line` 造成 `loose list` */

    var marker = {
        blank_line: /^\s*$/,

        thematic: /^ {0,3}([*-_]){3}\s*$/,
        atx: /^ {0,3}#{1,6}($| +)/,
        indented_code: /^ {4,}/,

        block_quote: /^ {0,3}> /,
        u_list_item: /^ {0,3}[-_*] /,
        o_list_item: /^ {0,3}\d{1,9}(\.|\)) /
    };

    //After passing marker test, use capture to the parse the content.
    var capture = {
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
        if(marker.u_list_item.test(line)){
            var cap = capture.u_list_item.exec(line);
            this.misc.bullet = cap[1];
            this.misc.markerWidth = indentWidth + 2;

            var markerTrimmed = line.substring(this.misc.markerWidth);
            var markerTrimmedIndent = helpers.indentWidth(markerTrimmed);
            this.misc.itemIndent = this.misc.markerWidth + markerTrimmedIndent;
            this.content = [markerTrimmed];
            
        }else if(marker.o_list_item.test(line)){
            var cap = capture.o_list_item.exec(line);
            this.misc.bullet = cap[2];
            this.misc.markerWidth = indentWidth + cap[1].length + 1;

            var markerTrimmed = line.substring(this.misc.markerWidth);
            var markerTrimmedIndent = helpers.indentWidth(markerTrimmed);
            this.misc.itemIndent = this.misc.markerWidth + markerTrimmedIndent;
            this.content = [markerTrimmed];
            
        }else if(marker.indented_code.test(line)){
            this.content = line.substring(4) + '\n';
        }else if(marker.block_quote.test(line)){
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

            if(marker.u_list_item.test(line)){
                this.open = false;
            }else if(marker.o_list_item.test(line)){
                this.open = false;
            }else if(this._type === 'u_list_item' && indentWidth >= this.misc.itemIndent){
                this.content.push(line.substring(this.misc.markerWidth));
                this.idx ++;
            }else if(this._type === 'o_list_item' && indentWidth >= this.misc.itemIndent){
                this.content.push(line.substring(this.misc.markerWidth));
                this.idx ++;
            }else if(marker.block_quote.test(line)){
                if(this._type === 'block_quote') {
                    this.content.push(line.substring(indentWidth + 2));
                    this.idx++;
                }else{ this.open = false; }
            }else if(marker.indented_code.test(line)){
                if(this._type === 'indented_code') {
                    this.content += line + '\n';
                    this.idx++;
                }else{ this.open = false; }
            }else if(this._type === 'paragraph'){
                this.content += line + '\n';
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

                if (marker.atx.test(line)) {
                    child = new Block('atx', false, false, this.idx, this.src);
                } else if (marker.thematic.test(line)) {
                    child = new Block('thematic', false, false, this.idx, this.src);
                } else if (marker.block_quote.test(line)) {
                    child = new Block('block_quote', true, true, this.idx, this.src);
                } else if (marker.u_list_item.test(line)) {
                    child = new Block('u_list_item', true, true, this.idx, this.src);
                } else if (marker.o_list_item.test(line)){
                    child = new Block('o_list_item', true, true, this.idx, this.src);
                } else if (marker.indented_code.test(line)) {
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
                if (!inList && (type === 'u_list_item' || type === 'o_list_item')){
                    html += type === 'u_list_item' ? '</ul>' : '</ol>';
                    inList = true;
                    listType = type;
                    bullet = child.misc.bullet;
                }

                if (inList && (type !== listType
                    || child.misc.bullet !== bullet)) {
                    html += listType === 'u_list_item' ? '</ul>' : '</ol>';
                    inList = false;
                    listType = null;
                    bullet = null;
                    continue;
                } else {
                    html += this.doTranslate(child);
                }
            }
            if(inList){ html += listType === 'u_list_item' ? '</ul>' : '</ol>'; }
            html = tpl.replace('{}', html);
        }else{
            html = tpl.replace('{}', block.content);
        }
        return html;
    };



    global.zmarkdown = {
        compile: function(src){
            var doc = parse(src);
            return translate(doc);
        }
    };

})(this);