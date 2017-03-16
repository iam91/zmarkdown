/**
 * Created by zwy on 17-3-13.
 */
;(function(){

    "use strict";

    //block indicator
    var oneLineLeaf = {
        thematic          : /^ {0,3}([*-_]){3}\s*$/,
        atx               : /^ {0,3}#{1,6}($| +)/,
    };

    var multiLineLeaf = {
        indented_code     : /^ {4,}/,
        fenced_code       : /^ {0,3}(`|~)\1{2,}/
    };

    var container = {
        block_quote       : /^ {0,3}> /,
        u_list_item       : /^ {0,3}[-_*] /,
        o_list_item       : /^ {0,3}\d{1,9}(\.|\)) /
    };

    var other = {
        blank_line        : /^\s*$/,
        fenced_code_end   : /^ {0,3}(`|~)\1{2,}\s*/,
        se_text           : /^ {0,3}(-|=)\1{2,}\s*$/,
        not_paragraph     : /^ {0,3}[*-_#`~>\d]/
    };

    //inline indicator
    var inline = {
        code_span       : /(`([^`]*)`)/g,
        emphasis        : /((\*|_)([^*]*)\2)/g,
        strong_emphasis : /((\*\*|__)([^*]*)\2)/g,
        link            : /\[(.*?)]\s*\((.*?)\)/g,
        image           : /!\[(.*?)]\s*\((.*?)\)/g
    };

    //used to blockCapture the content
    var blockCapture = {
        atx               : /^ {0,3}(#{1,6})(.* (?=#)|.*$)/,
        se_text           : /^ {0,3}(-|=)/,
        u_list_item       : /^ {0,3}([-_*])/,
        o_list_item       : /^ {0,3}(\d{1,9})(\.|\))/,
        fenced_code_start : /^ {0,3}(`|~)\1{2,}(.*)/
    };

    var helpers = {
        indentWidth: function(line){
            var cap = /^ */.exec(line);
            return cap[0].length;
        },

        setHardBreak: function(line){
            var trimWidth = line.length - line.trim().length;
            if(trimWidth > 1){
                line = line.trim() + '\n';
            }
            return line;
        }
    };

    /**
     *
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
        this.idx = idx;
        this.src = src.slice();

        this.open = isMulti;
        this.children = [];
        this.content = '';
        this.misc = {};
    }

    Block.prototype.parse = function(){
        //only container can parse its content
        if(this._isContainer){
            while(this.idx < this.src.length){
                var line = this.src[this.idx];
                var child = null;
                var indicator = null;

                if(other.blank_line.test(line)){
                    this.idx ++;
                    continue;
                }

                for(indicator in oneLineLeaf){
                    if(child){ break; }
                    if(oneLineLeaf[indicator].test(line)){
                        child = new Block(indicator, false, false, this.idx, this.src);
                        break;
                    }
                }

                for(indicator in multiLineLeaf){
                    if(child){ break; }
                    if(multiLineLeaf[indicator].test(line)){
                        if(other.blank_line.test(line)){
                            continue;
                        }
                        child = new Block(indicator, false, true, this.idx, this.src);
                        break;
                    }
                }

                for(indicator in container){
                    if(child){ break; }
                    if(container[indicator].test(line)){
                        child = new Block(indicator, true, true, this.idx, this.src);
                        break;
                    }
                }

                if(!child){
                    child = new Block('paragraph', false, true, this.idx, this.src);
                }

                this.idx = child.consume();
                this.children.push(child);
            }
        }
    };

    Block.prototype.resetCtx = function(){
        this.src = this.content;
        this.idx = 0;
    };

    Block.prototype.consume = function(){
        var retIdx = 0;
        if(this._isMulti){
            this.consumeFirst();
            this.consumeRemain();
            retIdx = this.idx;
            if(this._isContainer){
                this.resetCtx();
                this.parse();
            }
        }else{
            this.consumeFirst();
            retIdx = this.idx;
        }
        return retIdx;
    };

    Block.prototype.consumeFirst = function(){
        var line = this.src[this.idx ++];
        var indentWidth = helpers.indentWidth(line);
        if(this._type === 'atx'){

            var cap = blockCapture.atx.exec(line);
            this.misc.lvl = cap[1].length;
            this.content += cap[2].trim();

        }else if(this._type === 'u_list_item' || this._type === 'o_list_item'){

            var cap = blockCapture[this._type].exec(line);
            this.misc.bullet = cap[1];
            this.misc.bulletWidth = indentWidth + cap[1].length + 1;

            var content = line.substring(this.misc.bulletWidth);
            var contentIndent = helpers.indentWidth(content);

            this.misc.itemIndent = this.misc.bulletWidth + contentIndent;
            this.content = [content];
        }else if(this._type === 'block_quote'){

            this.content = [line.substring(indentWidth + 2)];

        }else if(this._type === 'indented_code'){

            this.content = line.substring(4) + '\n';

        }else if(this._type === 'fenced_code'){

            var cap = blockCapture.fenced_code_start.exec(line);
            this.misc.indentWidth = indentWidth;
            this.misc.lang = cap[2].trim();

        }else{
            //paragraph
            this.content = helpers.setHardBreak(line.substring(indentWidth));
        }
    };

    Block.prototype.consumeRemain = function(){

        while(this.idx < this.src.length){
            var line = this.src[this.idx];
            var indentWidth = helpers.indentWidth(line);

            if(this._type === 'fenced_code'){
                if(other.fenced_code_end.test(line)){
                    this.open = false;
                }else{
                    this.content += line.substring(Math.min(indentWidth, this.misc.indentWidth)) + '\n';
                }
                this.idx ++;
            }else if(this._type.indexOf('list_item') > 0 && indentWidth >= this.misc.itemIndent){

                this.content.push(line.substring(indentWidth));
                this.idx++;
            }else if(this._type === 'block_quote' && container.block_quote.test(line)){

                this.content.push(line.substring(indentWidth + 2));
                this.idx ++;
            }else if(this._type === 'paragraph' && other.se_text.test(line)){

                var cap = blockCapture.se_text.exec(line);
                this._type = 'se_text';
                this.misc.lvl = cap[1] === '-' ? 2 : 1;
                this.idx ++;
            }else if(this._type === 'indented_code' && multiLineLeaf.indented_code.test(line)){
                this.content += line.substring(4) + '\n';
                this.idx ++;
            }else if(this._type === 'paragraph'
                && !other.not_paragraph.test(line) && !other.blank_line.test(line)){
                this.content += helpers.setHardBreak(line.substring(indentWidth));
                this.idx ++;
            }else{ this.open = false; }
            if(!this.open){ break; }
        }
        this.open = false;
    };


    function parseBlock(src){
        //pre-process
        src = src
            .replace(/\r\n?|\n/g, '\n')
            .replace(/\t/g, '    ')
            .split(/\n/);

        var doc = new Block('doc', true, true, 0, src);
        doc.parse();
        return doc;
    }

    function parseInline(content){
        content = content
            .replace(inline.strong_emphasis, '<strong>$3</strong>')
            .replace(inline.emphasis, '<em>$3</em>')
            .replace(inline.code_span, '<code>$2</code>')
            .replace(inline.image, '<img src="$2" alt="$1">')
            .replace(inline.link, '<a href="$2">$1</a>');

        return content;
    }

    function translate(block){
        return translate.doTranslate(block);
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
        }else if(type === 'se_text'){
            var lvl = block.misc.lvl;
            return '<h' + lvl + '>{}</h' + lvl + '>\n';
        }else if(type === 'fenced_code'){
            var lang = block.misc.lang;
            return '<pre class="prettyprint lang-' + lang + '"><code>{}</code></pre>\n';
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
            var type = block._type;
            if(type.indexOf('code') < 0){
                html = parseInline(block.content);
            }
            if(type === 'paragraph'){
                html = html.trim().replace(/\n/g, '<br>');
            }
            html = tpl.replace('{}', html);
        }
        return html;
    };

    var mdparser = {
        compile: function(src){
            return translate(parseBlock(src));
        }
    };

    window.mdparser = mdparser;

})();