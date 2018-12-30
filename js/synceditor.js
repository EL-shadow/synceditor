/**
 * Created by Elnur Kurtaliev on 2018-12-13.
 */

var SE = function () {
    var alertPopup = new AlertPopup();

    this.load = function (url) {
        if (!url) {
            alertPopup.alert('Ошибка: не введен адрес для загрузки!','danger');
            return;
        }
        console.log('url', url);
    };
};