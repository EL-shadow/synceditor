/**
 *
 * @param {jQuery} $
 * @param {AlertPopup.alert} popup
 * @constructor
 */
var GitHubAPI = function ($, popup) {

    /**
     * Возвращает тексты из папки
     * @param directoryURL
     * @returns {*|PromiseLike<T>|Promise<T>}
     */
    this.checkoutTexts = function(directoryURL){
        var textsLoading = $.Deferred();
        var ghAPIgetFile = this.getFile.bind(this);

        this
            .getFolderContent(directoryURL)
            .done(function (files) {
                var fileNames = Object.keys(files);

                // Вызывае when через apply чтобы передать массивом загрузчики
                $.when.apply($, fileNames.map(function (fileName) {
                    var fileUrl = files[fileName];

                    return ghAPIgetFile(fileUrl);
                })).done(function () {
                    if (fileNames.length !== arguments.length) {
                        textsLoading.reject('Ошибка загрузки файлов [ghAPI:checkoutTexts]');
                        return;
                    }

                    var allFiles = Array.prototype.reduce.call(arguments, function (allFilesContent, fileContent, index) {
                        var fileName = fileNames[index];

                        allFilesContent[fileName] = fileContent[0];

                        return allFilesContent;
                    }, {});

                    textsLoading.resolve(allFiles);
                }).fail(function () {
                    textsLoading.reject('Ошибка загрузки всех файлов');
                })
            })
            .fail(function () {
                textsLoading.reject('Ошибка загрузки директории [' + directoryURL + ']');
            });

        return textsLoading.promise();
    };

    /**
     * Возвращает jQuery promise и при успешном результате данные в формате имя_файла=url
     * @param directoryURL
     * @returns {*|PromiseLike<T>|Promise<T>}
     */
    this.getFolderContent = function(directoryURL) {
        popup('Загружается список переводов...', 'info');
        return $.get(directoryURL)
            .then(function (data) {
                var filesCount = data && data.length;
                var files;
                var allFileNames;

                if (filesCount) {
                    files = data.reduce(function (acc, file) {
                        acc[file.name] = file.download_url;

                        return acc;
                    }, {});

                    allFileNames = Object.keys(files).join('<br>');
                    popup('Найдено '+ filesCount + ':<br>' + allFileNames, 'success');

                    return files;
                }
            }, function () {
                popup('Не удалось загрузить ' + url, 'danger');
            });
    };

    this.getFile = function(fileURL) {
        return $.get(fileURL);
    };
};