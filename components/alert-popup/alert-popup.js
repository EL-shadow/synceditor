/**
 * Created by Elnur Kurtaliev on 2018-12-13.
 */

var AlertPopup = function (selector) {
    var alertTime = null;
    var container;

    if (!selector) {
        container =$('<div id="alertPlaceholder" class="alert-placeholder"></div>');
        $('body').append(container);
    } else {
        container = $(selector);
    }

    this._alertTypes = {
        info: {
            glyph: 'glyphicon-info-sign',
            container: 'alert-info',
            text: 'Info:',
            time: 3000
        },
        danger: {
            glyph: 'glyphicon-exclamation-sign',
            container: 'alert-danger',
            text: 'Error:',
            time: 0
        },
        success: {
            glyph: 'glyphicon-ok-sign',
            container: 'alert-success',
            text: 'OK:',
            time: 3000
        },
        warning: {
            glyph: 'glyphicon-question-sign',
            container: 'alert-warning',
            text: 'Warning',
            time: 5000
        }
    };

    this.alert = function (message, type) {
        type = type ? this._alertTypes[type] : this._alertTypes.info;

        container.html(
            '<div class="alert ' + type.container + '" role="alert">' +
            '<a class="close" data-dismiss="alert">×</a>' +
            '<span class="glyphicon ' + type.glyph + '" aria-hidden="true"></span>' +
            '<i class="fas fa-info-circle"></i>'+
            '<span class="sr-only">' + type.text + '</span>' +
            '<span> ' + message + '</span></div>');

        if (alertTime) {
            clearTimeout(alertTime);
        }
        if (type.time) {
            alertTime = setTimeout(function () {
                $('#alertPlaceholder').find('div[role="alert"]').slideUp(1000);
            }, type.time);
        }
    };
};