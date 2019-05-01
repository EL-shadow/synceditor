/**
 * Created by Elnur Kurtaliev on 2018-12-13.
 */

var SE = function ($) {
    var alertPopup = new AlertPopup();
    var popup = alertPopup.alert.bind(alertPopup);
    var loadButton = '#load';
    var loadUrl = '#url';

    /**
     * @typedef {number} SyncState
     **/

    /**
     * @enum {SyncState}
     */
    var SYNC = {
        NORMAL: 0,
        NOT_MATCH: -1,
        MATCH: 1
    };

    /*
    * https://developer.github.com/v3/repos/contents/#get-contents
    * $.get('https://api.github.com/repos/prosvita/QIRIMTATARTILI/contents/text/')
    * $.get('https://api.github.com/repos/prosvita/QIRIMTATARTILI/contents/text/halq_masalları/__demir_ayuv/')
    * $.get('https://raw.githubusercontent.com/prosvita/QIRIMTATARTILI/master/text/halq_masallar%C4%B1/__demir_ayuv/halq_masallar%C4%B1__demir_ayuv.ru.md')
    * */

    this._texts = {};

    this._lines = [];

    this._linesWordCount = [];

    this._longerLangLength = 0;

    this.getTexts = function() {
        var url = $(loadUrl).val();
        var _loadText;
        var _render;

        if (!url) {
            popup('Ошибка: не введен адрес для загрузки!','danger');
            return;
        }

        _loadText = this.loadText.bind(this);
        _render = this.render.bind(this);

        this.loadLangsList(url)
            .then(function (data) {
                if (!data) {
                    return popup('Неверный формат данных', 'warning');
                }

                var langLoadingList = Object.keys(data).map(function (lang) {
                    var langUrl = data[lang];

                    return _loadText(lang, langUrl);
                });

                $.when.apply($, langLoadingList)
                    .done(function () {
                        popup('Все тексты загружены', 'success');
                        _render();
                    });
            });
    };



    this.loadLangsList = function (url) {
        popup('Загружается список переводов...', 'info');
        return $.get(url, )
            .then(function (data) {
                var items = {},
                    length,
                    itemsName;

                if (data && data.length) {
                    length = data.length;
                    itemsName = data.map(function(item) {
                        items[item.name] = item.download_url;

                        return item.name;
                    }).join('<br>');
                }

                if (length && itemsName) {
                    popup('Найдено '+ length + ':<br>' + itemsName, 'success');

                    return items;
                }
            }, function () {
                popup('Не удалось загрузить ' + url, 'danger');
            });
    };

    this.loadText = function (textTitle, textUrl) {
        return $.get(textUrl)
            .done(function (data) {
                this._texts[textTitle] = data;
                popup('Загружен текст: ' + textTitle);
            }.bind(this))
    };

    this.templateEditor = function (title, text) {
        return'<h3>' + title + '</h3><textarea>' + text + '</textarea>';
    };

    /**
     * Проверяет совпадение двух строк из переводов
     *
     * @param {Number} lineId
     * @returns {SyncState}
     */
    this.getLineSync = function (lineId) {
        var line0 = this._lines[0][lineId];
        var line1 = this._lines[1][lineId];
        if (line0 === line1) {
            return SYNC.MATCH;
        }

        /**
         * Задаем правило что если количество слов отличается больше чем лимит то перевод не соответствует
         * @constant
         * @type {number}
         */
        var WORDS_DIFF_COUNT_LIMIT = 2;
        var line0wordsCount = this._linesWordCount[0][lineId];
        var line1wordsCount = this._linesWordCount[1][lineId];
        var countDiff = line0wordsCount > line1wordsCount ?
            line0wordsCount / line1wordsCount :
            line1wordsCount / line0wordsCount;
        if (countDiff >= WORDS_DIFF_COUNT_LIMIT) {
            return SYNC.NOT_MATCH;
        }

        return SYNC.NORMAL;
    };

    /**
     *
     * @param {SyncState} syncState
     *
     * @returns {String}
     */
    this.getLineSyncClassName = function (syncState) {
        if (syncState === SYNC.MATCH) {
            return 'line-sync-match';
        }

        if (syncState === SYNC.NOT_MATCH) {
            return 'line-sync-not-match';
        }

        return '';
    };

    this.templateEditor2 = function () {
        var length = this._longerLangLength;
        var langs = this._lines;
        var head = '';
        var body = '';

        for (var langId = 0; langId < langs.length; langId++) {
            head += '<th colspan="2" class="column-' + langId + '">' + langs[langId][0] + '</th>';
        }

        for (var x = 1; x < length; x++) {
            var rowContent = '';
            body += '';
            for (langId = 0; langId < langs.length; langId++) {
                rowContent += '<td class="line-num column-' + langId + '">' + x + '</td>';
                var cssClass = 'line-text column-' + langId;
                var content = '';
                // var line = x - 1;
                if (x < langs[langId].length) {
                    content = langs[langId][x];
                } else {
                    cssClass += ' empty-row';
                }
                rowContent += '<td ' +
                    'contenteditable="true" spellcheck="false"' +
                    'class="'+ cssClass + '" ' +
                    'id="lang'+ langId + 'line' + x + '" ' +
                    'data-lang-id="' + langId + '" ' +
                    'data-line="' + x + '"' +
                    '>' + content + '</td>';
            }

            var lineSyncMatch = this.getLineSync(x);
            var rowClass = this.getLineSyncClassName(lineSyncMatch);
            body +=
                '<tr class="' + rowClass + '">' +
                    rowContent +
                '</tr>';
        }

        var table =
            '<table class="se-table">' +
            '    <thead>' +
            '    <tr>' +
                    head +
            '    </tr>' +
            '    </thead>' +
            '    <tbody>' +
                    body +
            '    </tbody>' +
            '</table>';

        return table;
    };

    /**
     *
     * @param {Boolean} [reuseLines=false]
     */
    this.render = function(reuseLines) {
        // вывод в textarea
        // var textView = Object.keys(this._texts).map(function (lang) {
        //     return this.templateEditor(lang, this._texts[lang])
        // }.bind(this));
        // $(result).html(textView.join('<hr>'));

        if (!reuseLines) {
            this.parseRawTexts();
        }

        $(result).html(this.templateEditor2());
    };

    this.getWordsCount = function (text) {
        var wordDelimiter = ' ';

        return text.split(wordDelimiter).length;
    };

    this.parseRawTexts = function () {
        var longerLangLength = 0;

        this._lines = Object.keys(this._texts).map(function (lang) {
            var arr = [lang].concat(this._texts[lang].split('\n'));
            longerLangLength = arr.length > longerLangLength ? arr.length : longerLangLength;

            return arr;
        }.bind(this));

        var getWordsCount = this.getWordsCount;

        this._linesWordCount = this._lines.map(function (lang){
            return lang.map(getWordsCount);
        });

        this._longerLangLength = longerLangLength;
    };

    this.updateLine = function(lang, line, newText) {
        if (typeof lang !== 'number' || typeof line !== 'number' || !newText) {
            return;
        }

        if (newText.indexOf('\n') > -1) {
            newText = newText.replace(/\n+/g,'\n');
            var newLines = newText.split('\n');
            Array.prototype.splice.apply(this._lines[lang], [line, 1].concat(newLines));
            this.updateLongerLangLength();

            var newLinesWordCount = newLines.map(this.getWordsCount);
            Array.prototype.splice.apply(this._linesWordCount[lang], [line, 1].concat(newLinesWordCount));

        } else {
            this._lines[lang][line] = newText;
            this._linesWordCount[lang][line] = this.getWordsCount(newText);
        }
    };

    this.mergeLineToPrev = function (langId, line) {
        var lang = this._lines[langId];

        // Здесь проверка на больше 1 т.к. в 0 лежит имя файла, строки начинаются с 1-го индекса
        if (line > 1 && line < lang.length) {
            var prevLine = line -1;
            var newCursorPos = lang[prevLine].length;
            var mergedText = lang[prevLine] + lang[line];

            lang.splice(prevLine, 2, mergedText);

            this.updateLongerLangLength();

            this._linesWordCount[langId].splice(prevLine, 2, this.getWordsCount(mergedText));

            return newCursorPos;
        }

        return false;
    };

    this.updateLongerLangLength = function () {
        this._longerLangLength = this._lines.reduce(function (longerLength, lang) {
            return lang.length > longerLength ? lang.length : longerLength;
        }, 0);
    };

    //-----------------

    $(loadButton).on('click',function(){
        this.getTexts();
    }.bind(this));

    $(document).on('keyup', '.line-text', function(e) {
        var key = e.originalEvent.keyCode;
        var pos = window.getSelection().getRangeAt(0).startOffset;
        var domNode = e.target;
        var langId = parseInt(domNode.dataset.langId, 10);
        var line = parseInt(domNode.dataset.line, 10);
        var updateView = false;
        var reuseLines = true;
        var focus = line;
        var focusPos = 0;

        this.updateLine(langId, line, domNode.innerText);

        if (key === 13) {
            updateView = true;
            focus += 1;
        }

        if (key === 8 && pos === 0) {
            var mergedLinePos = this.mergeLineToPrev(langId, line);
            if (typeof mergedLinePos === 'number') {
                updateView = true;
                focus -= 1;
                focusPos = mergedLinePos;
            }

        }

        if (!updateView) {
            return;
        }

        this.render(reuseLines);

        var editableCell = document.querySelector('#lang'+ langId + 'line' + focus);
        editableCell.focus();

        if (focusPos && window.getSelection && document.createRange) {
            var range = document.createRange();
            var sel = window.getSelection();
            range.setStart(editableCell.childNodes[0], focusPos);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
            editableCell.focus();
        }
    }.bind(this));
};
