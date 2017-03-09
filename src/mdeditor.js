/**
 * Created by zwy on 17-3-9.
 */
;(function(window){

    "use strict";

    function Mdeditor(){
        this.codeEditor;
    }

    Mdeditor.$codeEditor = null;
    Mdeditor.$markdown = null;

    Mdeditor.prototype = {
        constructor: Mdeditor,

        init: function(editor, options){
            Mdeditor.$codeEditor = CodeMirror;
            Mdeditor.$markdown = zmarkdown;

            var options     = options || {};
            var classPrefix = options.classPrefix || 'mde-';

            var className = {
                code    : classPrefix + 'code',
                wrapper : classPrefix + 'wrapper',
                preview : classPrefix + 'preview'
            };

            var selector = {};
            for(var cl in className){
                selector[cl] = '.' + className[cl];
            }
            this.selector = selector;

            var elements = [
                '<div class="' + className.wrapper + '">',
                    '<div class="' + className.code + '"></div>',
                    '<div class="' + className.preview + '"></div>',
                '</div>'
            ].join('\n');

            $(editor).html(elements);

            this.initCodeEditor($('.' + className.code)[0]);
            this.bind();
            this.compile();
        },

        initCodeEditor: function(code){

            var options = {
                mode         : 'markdown',
                theme        : 'mdn-like',
                lineNumbers  : true,
                lineWrapping : true
            };

            this.codeEditor = Mdeditor.$codeEditor(code, options);
        },

        compile: function(){

            var code = this.codeEditor.getValue();
            var html = Mdeditor.$markdown.compile(code);
            var selector = this.selector;
            $(selector.preview).html(html);
        },

        bind: function(){
            var ce = this.codeEditor;
            var self = this;

            ce.on('change', function(){
                self.compile();
            });
        }
    };

    Mdeditor.loadScript = function(fileName, callback){

        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = fileName;

        script.onload = function(){
            callback();
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
