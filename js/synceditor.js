/**
 * Created by Elnur Kurtaliev on 2018-12-13.
 */

var SE = function ($) {
    var alertPopup = new AlertPopup();
    var popup = alertPopup.alert.bind(alertPopup);
    var loadButton = '#load';
    var loadUrl = '#url';
    var result = '#result';

    /*
    * https://developer.github.com/v3/repos/contents/#get-contents
    * $.get('https://api.github.com/repos/prosvita/QIRIMTATARTILI/contents/text/')
    * $.get('https://api.github.com/repos/prosvita/QIRIMTATARTILI/contents/text/halq_masalları/__demir_ayuv/')
    * $.get('https://raw.githubusercontent.com/prosvita/QIRIMTATARTILI/master/text/halq_masallar%C4%B1/__demir_ayuv/halq_masallar%C4%B1__demir_ayuv.ru.md')
    * */

    this._texts = {};

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
    this.render = function() {
        var textView = Object.keys(this._texts).map(function (lang) {
            return this.templateEditor(lang, this._texts[lang])
        }.bind(this));
        $(result).html(textView.join('<hr>'));
    };

    //-----------------

    $(loadButton).on('click',function(){
        this.getTexts();
    }.bind(this));
};