/**
 * Created by zwy on 17-3-9.
 */
;(function(window){

    "use strict";

    if(typeof $ === 'undefined'){
        return;
    }

    function Mdeditor(){}

    Mdeditor.editor = function(el, options){

        var defaults = {
            'mode'  : 'markdown',
            'theme' : 'mdn-like',
            'path'  : 'src/',
            'height': '640px'
        };

        options = $.extend({}, defaults, options);
        return new Mdeditor().init(el, options);
    };

    Mdeditor.$codeEditor = null;
    Mdeditor.$markdown = null;
    Mdeditor.$prettify = null;

    Mdeditor.prototype = {
        constructor: Mdeditor,

        init: function(el, options){
            var options =  this.options = options || {};

            var classPrefix = options.classPrefix || 'mde-';
            var className = this.className = {
                code    : classPrefix + 'code',
                wrapper : classPrefix + 'wrapper',
                preview : classPrefix + 'preview'
            };


            var elements = [
                '<div class="' + className.wrapper + '">',
                    '<div class="' + className.code + '"></div>',
                    '<div class="' + className.preview + ' markdown-body"></div>',
                '</div>'
            ].join('\n');
            $(el).append(elements);

            this.codeEditorEl = $('.' + className.code);
            this.previewEl = $('.' + className.preview);
            this.wrapperEl = $('.' + className.wrapper);

            $(this.wrapperEl).css({
                height: options.height
            });

            this.loadDep();

            var self = this;
            $('button').click(function(){
                self.compile();
            });
        },

        loadDep: function(){
            var path = this.options.path;
            var self = this;
            
            Mdeditor.loadCss(path + 'style/mdeditor.css');
            Mdeditor.loadCss(path + 'style/preview.css');
            
            if(Mdeditor.$codeEditor === null){
                Mdeditor.loadCss(path + 'lib/codemirror/codemirror.css');
                Mdeditor.loadCss(path + 'lib/codemirror/theme/' + this.options.theme + '.css');
                Mdeditor.loadScript(path + 'lib/codemirror/codemirror.js', function(){

                    if(CodeMirror){
                        Mdeditor.$codeEditor = CodeMirror;
                        self.initEditor();
                    }

                    Mdeditor.loadScript(path + 'lib/codemirror/mode/markdown/markdown.js');
                });
            }else{
                Mdeditor.$codeEditor = CodeMirror;
                self.initEditor();
            }

            if(Mdeditor.$markdown === null){
                Mdeditor.loadScript(path + 'mdparser.js', function(){
                    if(mdparser){ Mdeditor.$markdown = mdparser; }
                });
            }else{ Mdeditor.$markdown = mdparser; }

            if(Mdeditor.$prettify === null){
                Mdeditor.loadCss(path + 'lib/prettify/prettify.css');
                Mdeditor.loadScript(path + 'lib/prettify/prettify.js');
            }
        },

        initEditor: function(){
            this.initCodeEditor();
            this.bindCodeEditor();
        },

        initCodeEditor: function(){

            var options = {
                mode         : 'markdown',
                theme        : 'mdn-like',
                lineNumbers  : true,
                lineWrapping : true
            };

            var codeEl = this.codeEditorEl;

            this.codeEditor = Mdeditor.$codeEditor($(codeEl)[0], options);

            $(codeEl).children('.CodeMirror').css({
                height: '100%'
            });
        },

        bindCodeEditor: function(){
            var ce = this.codeEditor;
            var self = this;

            ce.on('change', function(){
                self.compile();
            });
        },

        compile: function(){

            var code = this.codeEditor.getValue();
            var html = Mdeditor.$markdown.compile(code);
            $(this.previewEl).html(html);
            PR.prettyPrint();
        }
    };

    Mdeditor.loadScript = function(fileName, callback){

        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = fileName;

        script.onload = function(){
            typeof callback === 'function' ? callback() : null;
        };

        document.getElementsByTagName('head')[0].appendChild(script);
    }

    Mdeditor.loadCss = function(fileName){

        var css = document.createElement('link');
        css.type = 'text/css';
        css.rel = 'stylesheet';
        css.href = fileName;

        document.getElementsByTagName('head')[0].appendChild(css);
    }

    window.Mdeditor = Mdeditor;

})(window);
